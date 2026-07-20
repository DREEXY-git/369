'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { DEAL_STAGES, type DealStage } from '@hokko/shared';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeAudit } from '@/lib/db';

/** M1-b 証拠用 test-only fault フック（本番未指定時は無作用）。 */
export interface DealStageTestHooks {
  /** tx 内で History 作成後・Audit 作成前に throw させ、CAS ごと全 rollback（stage 不変）を実証する。 */
  __faultBetweenWritesForTest?: () => void;
}

export type UpdateDealStageResult =
  | { ok: true }
  | { ok: false; reason: 'notfound' | 'invalid-stage' | 'already' };

/**
 * 案件ステージ変更の testable core（Server Action から切り出し・fault 注入で証拠化）。
 * enum 検証（任意文字列の書き込み排除）→ 現ステージ CAS（fromStage 一致時のみ・並行変更を1本に収束）→
 * 履歴＋監査を単一 $transaction で確定。CAS count≠1（並行敗者/replay）は書き込みゼロで already。
 */
export async function updateDealStageCore(
  actor: { tenantId: string; userId?: string | null },
  input: { dealId: string; stage: string },
  opts: DealStageTestHooks = {},
): Promise<UpdateDealStageResult> {
  if (!(DEAL_STAGES as readonly string[]).includes(input.stage)) return { ok: false, reason: 'invalid-stage' };
  const deal = await prisma.deal.findFirst({ where: { id: input.dealId, tenantId: actor.tenantId } });
  if (!deal) return { ok: false, reason: 'notfound' };

  const changed = await prisma.$transaction(async (tx) => {
    const claim = await tx.deal.updateMany({
      where: { id: input.dealId, tenantId: actor.tenantId, stage: deal.stage },
      data: { stage: input.stage as DealStage },
    });
    if (claim.count !== 1) return false;
    await tx.dealStageHistory.create({
      data: { tenantId: actor.tenantId, dealId: input.dealId, fromStage: deal.stage, toStage: input.stage as DealStage, changedById: actor.userId ?? null },
    });
    if (opts.__faultBetweenWritesForTest) opts.__faultBetweenWritesForTest();
    await tx.auditLog.create({
      data: { tenantId: actor.tenantId, actorId: actor.userId ?? null, actorType: 'user', action: 'update', entityType: 'Deal', entityId: input.dealId, summary: `案件「${deal.title}」のステージを ${input.stage} に変更` },
    });
    return true;
  });
  return changed ? { ok: true } : { ok: false, reason: 'already' };
}

export async function updateDealStageAction(formData: FormData) {
  const user = await requireUser();
  const dealId = String(formData.get('dealId') ?? '');
  const stage = String(formData.get('stage') ?? '');
  if (!hasPermission(user, 'deal', 'update')) redirect(`/deals/${dealId}?denied=1`);

  const result = await updateDealStageCore({ tenantId: user.tenantId, userId: user.userId }, { dealId, stage });
  if (!result.ok && result.reason === 'invalid-stage') redirect(`/deals/${dealId}?error=stage`);
  if (!result.ok && result.reason === 'notfound') redirect('/deals/kanban');
  if (!result.ok && result.reason === 'already') redirect(`/deals/${dealId}?already=1`);
  revalidatePath('/deals/kanban');
  revalidatePath(`/deals/${dealId}`);
}

export async function updateDealAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get('id') ?? '');
  if (!hasPermission(user, 'deal', 'update')) redirect(`/deals/${id}?denied=1`);

  const existing = await prisma.deal.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!existing) redirect('/deals');

  const amount = Math.max(0, Number(formData.get('amount') ?? 0) || 0);
  const cost = Math.max(0, Number(formData.get('cost') ?? 0) || 0);
  const probability = Math.max(0, Math.min(100, Number(formData.get('probability') ?? 0) || 0));
  const nextActionAtRaw = String(formData.get('nextActionAt') ?? '');

  await prisma.deal.update({
    where: { id },
    data: {
      title: String(formData.get('title') ?? '').trim() || existing.title,
      amount,
      cost,
      probability,
      nextAction: String(formData.get('nextAction') ?? ''),
      nextActionAt: nextActionAtRaw ? new Date(nextActionAtRaw) : null,
      competitor: String(formData.get('competitor') ?? '') || null,
    },
  });
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: 'update',
    entityType: 'Deal',
    entityId: id,
    summary: `案件「${existing.title}」を編集（金額 ${amount.toLocaleString()}円）`,
  });
  revalidatePath(`/deals/${id}`);
  redirect(`/deals/${id}`);
}
