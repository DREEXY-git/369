// 正式 Invoice の外部送信ゲート（承認後のみ）。Phase 1-10。
// 鉄則: 外部送信は必ず承認後。送信前に prepareExternalPayload でPIIマスク。
//       AI は送信主体になれない（assertAiToolAllowed で多重防御）。設計: docs/audit/12。
import { prisma, writeAudit } from '@/lib/db';
import { recordUsageEvent } from '@/lib/usage-events';
import { emitGrowthEvent } from '@/lib/growth';
import { requireApprovalForDangerousAction } from '@/lib/approval';
import { prepareExternalPayload } from '@/lib/safe-external-send';
import { assertAiToolAllowed } from '@/lib/ai-safety-server';
import { toNumber } from '@/lib/utils';
import { canSendInvoice, type DomainEventType } from '@hokko/shared';
import { getEmailProvider, isExternalSendEnabled } from '@hokko/integrations';

export interface Actor {
  tenantId: string;
  userId?: string | null;
}

interface InvoiceLike {
  number: string;
  total: unknown;
  dueDate: Date | null;
}

function invoiceBody(inv: InvoiceLike): string {
  return [
    `請求書 ${inv.number}`,
    `金額（税込）: ${toNumber(inv.total).toLocaleString()}円`,
    `お支払期日: ${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('ja-JP') : '別途ご相談'}`,
    'いつもお世話になっております。上記のとおりご請求申し上げます。',
  ].join('\n');
}

export interface SendGateResult {
  ok: boolean;
  reason?: string;
  requiresApproval?: boolean;
  approvalId?: string;
}

/** 正式 Invoice の外部送信を申請（invoice_send 承認）。PIIマスク済プレビューを AISafetyLog に記録。 */
export async function requestInvoiceExternalSend(actor: Actor, invoiceId: string): Promise<SendGateResult> {
  // AI は外部送信を起動できない（多重防御。actions は人間起動）。
  await assertAiToolAllowed({ tenantId: actor.tenantId, actorId: actor.userId, actorType: 'user', tool: 'external_send', entityType: 'Invoice', entityId: invoiceId });
  const inv = await prisma.invoice.findFirst({ where: { id: invoiceId, tenantId: actor.tenantId }, include: { customer: { select: { email: true } } } });
  if (!inv) return { ok: false, reason: 'not-found' };
  if (!canSendInvoice(inv.status)) return { ok: false, reason: 'not-sendable' };

  const recipient = inv.customer?.email ?? undefined;
  const prepared = await prepareExternalPayload({
    tenantId: actor.tenantId,
    actorId: actor.userId,
    channel: 'email',
    subject: `請求書 ${inv.number}`,
    body: invoiceBody(inv),
    recipient,
    entityType: 'Invoice',
    entityId: invoiceId,
    purpose: 'invoice_send',
    logSharing: true,
  });
  const gate = await requireApprovalForDangerousAction({
    tenantId: actor.tenantId,
    action: 'invoice_send',
    title: `請求書送信: ${inv.number}（${toNumber(inv.total).toLocaleString()}円）`,
    targetType: 'Invoice',
    targetId: invoiceId,
    requestedById: actor.userId,
    riskLevel: 'HIGH',
    external: true,
    payloadAfter: { invoiceId, recipient, maskedPreview: prepared.maskedBody.slice(0, 200) },
  });
  await writeAudit({ tenantId: actor.tenantId, actorId: actor.userId, action: 'invoice_send_request', entityType: 'Invoice', entityId: invoiceId, summary: `請求書 ${inv.number} の送信を申請（承認後に送信）` });
  return { ok: true, requiresApproval: gate.requiresApproval, approvalId: gate.approvalId };
}

/** 承認済み Invoice を外部送信し SENT へ。EXTERNAL_SEND_ENABLED 時のみ実送信、それ以外は監査のみ。冪等。 */
export async function executeInvoiceExternalSend(actor: Actor, invoiceId: string): Promise<{ ok: boolean; reason?: string }> {
  const inv = await prisma.invoice.findFirst({ where: { id: invoiceId, tenantId: actor.tenantId }, include: { customer: { select: { email: true } } } });
  if (!inv) return { ok: false, reason: 'not-found' };
  if (!canSendInvoice(inv.status)) return { ok: false, reason: 'already-sent' };

  const recipient = inv.customer?.email ?? `billing@${invoiceId}.example.jp`;
  // 送信直前に再度 PII マスク。
  const prepared = await prepareExternalPayload({
    tenantId: actor.tenantId,
    actorId: actor.userId,
    channel: 'email',
    subject: `請求書 ${inv.number}`,
    body: invoiceBody(inv),
    recipient,
    entityType: 'Invoice',
    entityId: invoiceId,
    purpose: 'invoice_send_execute',
  });

  let sendStatus = 'logged';
  let provider = 'log';
  if (isExternalSendEnabled()) {
    const email = getEmailProvider();
    const res = await email.send({ to: recipient, from: process.env.MAIL_FROM ?? 'billing@dreexy.example.jp', subject: `請求書 ${inv.number}`, text: prepared.maskedBody });
    sendStatus = res.status;
    provider = res.provider;
  }
  await prisma.invoice.update({ where: { id: invoiceId }, data: { status: 'SENT' } });
  // 送信＝入金予定（売掛回収見込み）を計上。
  await prisma.financeEvent.create({
    data: { tenantId: actor.tenantId, type: 'payment_expected', sourceType: 'Invoice', sourceId: invoiceId, direction: 'inflow', amount: toNumber(inv.total), dueAt: inv.dueDate, status: 'approved', description: `入金予定: ${inv.number}` },
  });
  await writeAudit({ tenantId: actor.tenantId, actorId: actor.userId, action: 'invoice_send', entityType: 'Invoice', entityId: invoiceId, summary: `請求書 ${inv.number} を送信（${sendStatus}/${provider}）` });
  await emitGrowthEvent({
    tenantId: actor.tenantId,
    type: 'finance.invoice.sent',
    title: `請求書送信: ${inv.number}`,
    actorId: actor.userId,
    entityType: 'Invoice',
    entityId: invoiceId,
    amount: toNumber(inv.total),
    alsoDomainEvent: { domainType: 'INVOICE_SENT' as DomainEventType, aggregateType: 'Invoice', aggregateId: invoiceId },
  });
  // Phase 1-31: 非課金の利用量記録（invoice send が logged/sent として確定した事実のみ）。課金ではない・billing=usage_only 固定。
  // failed / その他 status は emit しない（送れていない＝never_billable 相当）。
  // metadata は非PIIの channel/status/kind のみ（recipient/顧客情報/請求番号/請求金額/inv.total/inv.number/maskedBody/本文/金額/secret は入れない）。
  // 記録失敗は送信主処理・financeEvent・writeAudit・戻り値を壊さない（recordUsageEvent は例外を投げず ok:false を返すだけ）。
  if (sendStatus === 'logged' || sendStatus === 'sent') {
    await recordUsageEvent({
      tenantId: actor.tenantId,
      actorId: actor.userId,
      actorType: 'user',
      eventType: 'external_send.invoice',
      category: 'external_send',
      billing: 'usage_only',
      unit: 'count',
      quantity: 1,
      sourceType: 'Invoice',
      sourceId: invoiceId,
      idempotencyKey: `usage:external_send.invoice:${invoiceId}`,
      metadata: { channel: 'email', status: sendStatus, kind: 'invoice' },
    });
  }
  return { ok: true };
}
