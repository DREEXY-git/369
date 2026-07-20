'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { MockCommunicationConnector } from '@hokko/integrations';
import { classifyBusinessRelevance } from '@hokko/shared';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeAudit } from '@/lib/db';
import { safeAiInput } from '@/lib/ai-safety-server';

/** Mockコネクタから取り込み、AIで業務関連性を判定して二段階保存に振り分ける。 */
export async function ingestMockMessagesAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'communication', 'create')) redirect('/communications/inbox?denied=1');
  const provider = String(formData.get('provider') ?? 'gmail');

  const connector = new MockCommunicationConnector(provider);
  const messages = await connector.fetchRecent(10);
  const customers = await prisma.customer.findMany({ where: { tenantId: user.tenantId }, select: { name: true, email: true } });

  let relevant = 0;
  let review = 0;
  let discarded = 0;

  for (const m of messages) {
    // 重複取り込みを避ける
    const already = await prisma.businessRelevanceDecision.count({ where: { tenantId: user.tenantId, itemRef: `${provider}:${m.externalId}` } });
    if (already > 0) continue;

    // 外部受信本文は間接注入の主要面。検出して AISafetyLog に記録（取り込み判定は継続）。
    await safeAiInput({
      tenantId: user.tenantId,
      actorId: user.userId,
      actorType: 'ai_agent',
      purpose: 'communication_ingestion',
      text: `${m.subject}\n${m.body}`,
      entityType: 'CommunicationMessage',
      detail: provider,
    });

    const domain = m.sender.includes('@') ? m.sender.slice(m.sender.indexOf('@') + 1) : '';
    const knownDomain = customers.some((c) => c.email && c.email.includes(domain) && domain.length > 0);
    const matchedCustomer = customers.find((c) => m.body.includes(c.name) || m.subject.includes(c.name));
    const res = classifyBusinessRelevance(`${m.subject} ${m.body}`, {
      customerName: matchedCustomer?.name,
      knownDomain,
    });

    await prisma.businessRelevanceDecision.create({
      data: { tenantId: user.tenantId, itemRef: `${provider}:${m.externalId}`, relevance: res.relevance, reason: res.reason, confidence: res.confidence },
    });

    if (res.relevance === 'relevant') {
      await prisma.communicationThread.create({
        data: {
          tenantId: user.tenantId,
          channel: m.channel,
          subject: m.subject,
          relevance: 'relevant',
          messages: { create: [{ tenantId: user.tenantId, sender: m.sender, direction: 'inbound', body: m.body }] },
        },
      });
      relevant++;
    } else if (res.relevance === 'review') {
      await prisma.temporaryIngestionItem.create({
        data: { tenantId: user.tenantId, channel: m.channel, preview: `${m.subject} — ${res.reason}`, status: 'review' },
      });
      review++;
    } else {
      await prisma.temporaryIngestionItem.create({
        data: { tenantId: user.tenantId, channel: m.channel, preview: `${m.subject} — ${res.reason}`, status: 'discarded' },
      });
      discarded++;
    }
  }

  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    actorType: 'ai_agent',
    action: 'ai_run',
    entityType: 'CommunicationThread',
    summary: `Mockコネクタ(${provider})から取り込み: 自動保存${relevant}/確認待ち${review}/非保存${discarded}`,
  });
  revalidatePath('/communications/inbox');
  revalidatePath('/communications/temp');
  redirect(`/communications/inbox?ingested=${relevant}&review=${review}&discarded=${discarded}`);
}

/** M1-b 証拠用 test-only fault フック（本番未指定時は無作用）。 */
export interface TempItemTestHooks {
  /** tx 内で（save の Thread 作成後・）Audit 作成前に throw させ、CAS ごと全 rollback（status 不変）を実証する。 */
  __faultBetweenWritesForTest?: () => void;
}

export type DecideTempItemResult =
  | { ok: true; decision: 'save' | 'discard' }
  | { ok: false; reason: 'notfound' | 'already' };

/**
 * 一時保管アイテムの保存/破棄の testable core（Server Action から切り出し・fault 注入で証拠化）。
 * status CAS（未確定＝saved/discarded 以外のときだけ claim）→ save なら Thread 作成 → 監査を単一
 * $transaction で確定。CAS count≠1（並行敗者/replay）は書き込みゼロで already。
 */
export async function decideTempItemCore(
  actor: { tenantId: string; userId?: string | null },
  input: { itemId: string; decision: string },
  opts: TempItemTestHooks = {},
): Promise<DecideTempItemResult> {
  const decision: 'save' | 'discard' = input.decision === 'save' ? 'save' : 'discard';
  const item = await prisma.temporaryIngestionItem.findFirst({ where: { id: input.itemId, tenantId: actor.tenantId } });
  if (!item) return { ok: false, reason: 'notfound' };

  const done = await prisma.$transaction(async (tx) => {
    const claim = await tx.temporaryIngestionItem.updateMany({
      where: { id: input.itemId, tenantId: actor.tenantId, status: { notIn: ['saved', 'discarded'] } },
      data: { status: decision === 'save' ? 'saved' : 'discarded' },
    });
    if (claim.count !== 1) return false;
    if (decision === 'save') {
      await tx.communicationThread.create({
        data: { tenantId: actor.tenantId, channel: item.channel, subject: item.preview.split(' — ')[0] ?? item.preview, relevance: 'relevant' },
      });
    }
    if (opts.__faultBetweenWritesForTest) opts.__faultBetweenWritesForTest();
    await tx.auditLog.create({
      data: { tenantId: actor.tenantId, actorId: actor.userId ?? null, actorType: 'user', action: 'update', entityType: 'TemporaryIngestionItem', entityId: input.itemId, summary: `一時保管アイテムを${decision === 'save' ? '保存' : '破棄'}` },
    });
    return true;
  });
  return done ? { ok: true, decision } : { ok: false, reason: 'already' };
}

/** 一時保管アイテムの保存/破棄（二段階保存の確認）。 */
export async function decideTempItemAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'communication', 'update')) redirect('/communications/temp?denied=1');
  const itemId = String(formData.get('itemId') ?? '');
  const decision = String(formData.get('decision') ?? '');

  const result = await decideTempItemCore({ tenantId: user.tenantId, userId: user.userId }, { itemId, decision });
  if (!result.ok && result.reason === 'notfound') redirect('/communications/temp');
  if (!result.ok && result.reason === 'already') redirect('/communications/temp?already=1');
  revalidatePath('/communications/temp');
  redirect('/communications/temp');
}
