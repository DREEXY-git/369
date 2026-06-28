// 督促（お支払い状況のご確認）の下書き作成・承認申請・送信実行。Phase 1-15。
// 鉄則（invoice-send.ts と同一の安全パターン）:
//   - 外部送信は必ず人間承認後（dunning_send）。AI は送信主体になれない（assertAiToolAllowed）。
//   - 送信前に prepareExternalPayload で PII マスク。EXTERNAL_SEND_ENABLED=false なら logged/監査のみ。
//   - 二重実行防止は action 側の executeApprovedAction。送信しても Receivable は collected にしない（入金時のみ）。
//   - 新規DBモデル/フィールドなし: CollectionReminder を使用。件名は決定論導出（非保存）、
//     承認状態は ApprovalRequest(entityType='CollectionReminder') 逆引き、実行者は writeAudit で記録。
import { prisma, writeAudit } from '@/lib/db';
import { emitGrowthEvent } from '@/lib/growth';
import { requireApprovalForDangerousAction } from '@/lib/approval';
import { prepareExternalPayload } from '@/lib/safe-external-send';
import { assertAiToolAllowed } from '@/lib/ai-safety-server';
import { toNumber } from '@/lib/utils';
import { buildDunningDraft, isDunningEligible } from '@hokko/shared';
import { getEmailProvider, isExternalSendEnabled } from '@hokko/integrations';

export interface Actor {
  tenantId: string;
  userId?: string | null;
}

// 送信者（自社）表示。将来 SystemSetting 化可。
const COMPANY_NAME = 'プランニングホッコー';

interface InvoiceWithRel {
  id: string;
  number: string;
  status: string;
  total: unknown;
  paidAmount: unknown;
  dueDate: Date | null;
  customer: { name: string; email: string | null } | null;
  receivable: { id: string; status: string } | null;
}

function draftBodyFromInvoice(inv: InvoiceWithRel): { subject: string; body: string } {
  const total = toNumber(inv.total);
  const paid = toNumber(inv.paidAmount);
  return buildDunningDraft({
    customerName: inv.customer?.name ?? null,
    companyName: COMPANY_NAME,
    invoiceNumber: inv.number,
    total,
    paidAmount: paid,
    outstanding: Math.max(total - paid, 0),
    dueDate: inv.dueDate,
  });
}

export interface DunningContext {
  eligible: boolean;
  invoiceId: string;
  invoiceNumber: string;
  outstanding: number;
  recipient: string | null; // 顧客メール（無ければ null → 送信不可）
  draft: { subject: string; body: string } | null; // 対象時のみ
  reminder: { id: string; status: string; draftMessage: string; createdAt: Date } | null; // 最新下書き
  pendingApprovalId: string | null; // PENDING の dunning_send
  approvedApprovalId: string | null; // APPROVED かつ未実行
}

/** Invoice 詳細の督促セクション表示に必要な情報を集約（読み取り専用）。 */
export async function getDunningContext(actor: Actor, invoiceId: string): Promise<DunningContext | null> {
  const inv = (await prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId: actor.tenantId },
    include: { customer: { select: { name: true, email: true } }, receivable: { select: { id: true, status: true } } },
  })) as InvoiceWithRel | null;
  if (!inv) return null;

  const total = toNumber(inv.total);
  const paid = toNumber(inv.paidAmount);
  const eligible = isDunningEligible(inv.status, paid, total, inv.receivable?.status ?? null);

  const reminder = inv.receivable
    ? await prisma.collectionReminder.findFirst({
        where: { tenantId: actor.tenantId, receivableId: inv.receivable.id },
        orderBy: { createdAt: 'desc' },
      })
    : null;

  let pendingApprovalId: string | null = null;
  let approvedApprovalId: string | null = null;
  if (reminder) {
    const approvals = await prisma.approvalRequest.findMany({
      where: { tenantId: actor.tenantId, entityType: 'CollectionReminder', entityId: reminder.id, requestedForAction: 'dunning_send' },
      orderBy: { createdAt: 'desc' },
    });
    pendingApprovalId = approvals.find((a) => a.status === 'PENDING')?.id ?? null;
    approvedApprovalId = approvals.find((a) => a.status === 'APPROVED' && a.executedAt == null)?.id ?? null;
  }

  return {
    eligible,
    invoiceId: inv.id,
    invoiceNumber: inv.number,
    outstanding: Math.max(total - paid, 0),
    recipient: inv.customer?.email ?? null,
    draft: eligible ? draftBodyFromInvoice(inv) : null,
    reminder: reminder ? { id: reminder.id, status: reminder.status, draftMessage: reminder.draftMessage, createdAt: reminder.createdAt } : null,
    pendingApprovalId,
    approvedApprovalId,
  };
}

/** 督促下書きを get-or-create（重複下書き防止: draft/pending_approval の既存があれば再利用）。 */
export async function createDunningDraft(actor: Actor, invoiceId: string): Promise<{ ok: boolean; reason?: string; reminderId?: string }> {
  const inv = (await prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId: actor.tenantId },
    include: { customer: { select: { name: true, email: true } }, receivable: { select: { id: true, status: true } } },
  })) as InvoiceWithRel | null;
  if (!inv) return { ok: false, reason: 'not-found' };
  if (!inv.receivable) return { ok: false, reason: 'no-receivable' };
  const total = toNumber(inv.total);
  const paid = toNumber(inv.paidAmount);
  if (!isDunningEligible(inv.status, paid, total, inv.receivable.status)) return { ok: false, reason: 'not-eligible' };

  const existing = await prisma.collectionReminder.findFirst({
    where: { tenantId: actor.tenantId, receivableId: inv.receivable.id, status: { in: ['draft', 'pending_approval'] } },
    orderBy: { createdAt: 'desc' },
  });
  if (existing) return { ok: true, reminderId: existing.id };

  const { body } = draftBodyFromInvoice(inv);
  const reminder = await prisma.collectionReminder.create({
    data: { tenantId: actor.tenantId, receivableId: inv.receivable.id, draftMessage: body, status: 'draft' },
  });
  await writeAudit({ tenantId: actor.tenantId, actorId: actor.userId, action: 'dunning_draft_create', entityType: 'CollectionReminder', entityId: reminder.id, summary: `督促下書きを作成: 請求書 ${inv.number}` });
  return { ok: true, reminderId: reminder.id };
}

async function loadReminderChain(tenantId: string, reminderId: string) {
  const reminder = await prisma.collectionReminder.findFirst({ where: { id: reminderId, tenantId } });
  if (!reminder) return null;
  const receivable = await prisma.receivable.findFirst({
    where: { id: reminder.receivableId, tenantId },
    include: { invoice: { include: { customer: { select: { name: true, email: true } } } } },
  });
  if (!receivable) return null;
  return { reminder, receivable, invoice: receivable.invoice };
}

/** 督促下書きの外部送信を申請（dunning_send 承認）。重複（PENDING）があれば再申請しない。 */
export async function requestDunningSend(actor: Actor, reminderId: string): Promise<{ ok: boolean; reason?: string; requiresApproval?: boolean; approvalId?: string }> {
  // AI は外部送信を起動できない（多重防御）。
  await assertAiToolAllowed({ tenantId: actor.tenantId, actorId: actor.userId, actorType: 'user', tool: 'external_send', entityType: 'CollectionReminder', entityId: reminderId });

  const existingPending = await prisma.approvalRequest.findFirst({
    where: { tenantId: actor.tenantId, entityType: 'CollectionReminder', entityId: reminderId, requestedForAction: 'dunning_send', status: 'PENDING' },
  });
  if (existingPending) return { ok: true, requiresApproval: true, approvalId: existingPending.id };

  const chain = await loadReminderChain(actor.tenantId, reminderId);
  if (!chain) return { ok: false, reason: 'not-found' };
  const { reminder, receivable, invoice: inv } = chain;
  const recipient = inv.customer?.email ?? undefined;
  const subject = `【お支払い状況のご確認】請求書 ${inv.number}`;
  const prepared = await prepareExternalPayload({
    tenantId: actor.tenantId,
    actorId: actor.userId,
    channel: 'email',
    subject,
    body: reminder.draftMessage,
    recipient,
    entityType: 'CollectionReminder',
    entityId: reminderId,
    purpose: 'dunning_send',
    logSharing: true,
  });
  const gate = await requireApprovalForDangerousAction({
    tenantId: actor.tenantId,
    action: 'dunning_send',
    title: `督促送信（お支払い状況の確認）: 請求書 ${inv.number}`,
    targetType: 'CollectionReminder',
    targetId: reminderId,
    requestedById: actor.userId,
    riskLevel: 'MEDIUM',
    external: true,
    payloadAfter: { invoiceId: inv.id, receivableId: receivable.id, reminderId, recipient, maskedPreview: prepared.maskedBody.slice(0, 200) },
  });
  await prisma.collectionReminder.update({ where: { id: reminderId }, data: { status: 'pending_approval' } });
  await writeAudit({ tenantId: actor.tenantId, actorId: actor.userId, action: 'dunning_send_request', entityType: 'CollectionReminder', entityId: reminderId, summary: `督促送信を申請（承認後に送信）: 請求書 ${inv.number}` });
  return { ok: true, requiresApproval: gate.requiresApproval, approvalId: gate.approvalId };
}

/**
 * 承認済み督促を送信/記録（invoice-send パターン）。
 * EXTERNAL_SEND_ENABLED=false は logged/監査のみ。宛先メール無は送信不可。
 * Receivable は触らない（送信だけで collected にしない）。二重実行防止は呼び出し側 executeApprovedAction。
 */
export async function executeDunningSend(actor: Actor, reminderId: string): Promise<{ ok: boolean; reason?: string }> {
  const chain = await loadReminderChain(actor.tenantId, reminderId);
  if (!chain) return { ok: false, reason: 'not-found' };
  const { reminder, invoice: inv } = chain;
  if (reminder.status === 'sent' || reminder.status === 'logged') return { ok: false, reason: 'already-sent' };

  const recipient = inv.customer?.email ?? null;
  if (!recipient) return { ok: false, reason: 'no-recipient' }; // メール未登録 → 送信しない

  const subject = `【お支払い状況のご確認】請求書 ${inv.number}`;
  const prepared = await prepareExternalPayload({
    tenantId: actor.tenantId,
    actorId: actor.userId,
    channel: 'email',
    subject,
    body: reminder.draftMessage,
    recipient,
    entityType: 'CollectionReminder',
    entityId: reminderId,
    purpose: 'dunning_send_execute',
  });

  const enabled = isExternalSendEnabled();
  let sendStatus = 'logged';
  let provider = 'log';
  if (enabled) {
    const email = getEmailProvider();
    const res = await email.send({ to: recipient, from: process.env.MAIL_FROM ?? 'billing@dreexy.example.jp', subject, text: prepared.maskedBody });
    sendStatus = res.status;
    provider = res.provider;
  }
  const newStatus = enabled ? 'sent' : 'logged';
  await prisma.collectionReminder.update({ where: { id: reminderId }, data: { status: newStatus } });
  // 注意: Receivable.status は変更しない（送信だけで collected にしない。入金時のみ collected）。
  await writeAudit({ tenantId: actor.tenantId, actorId: actor.userId, action: 'dunning_send', entityType: 'CollectionReminder', entityId: reminderId, summary: `督促を${newStatus === 'sent' ? '送信' : '記録'}: 請求書 ${inv.number}（${sendStatus}/${provider}）` });
  await emitGrowthEvent({
    tenantId: actor.tenantId,
    type: 'finance.dunning.sent',
    title: `督促送信（お支払い状況の確認）: 請求書 ${inv.number}`,
    actorId: actor.userId,
    entityType: 'CollectionReminder',
    entityId: reminderId,
  });
  return { ok: true };
}
