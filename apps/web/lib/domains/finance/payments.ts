// 入金消込（Payment）と Invoice/Receivable/FinanceEvent の連動。Phase 1-10。
// 実績（Payment / FinanceEvent payment_received posted）と予定（FinanceEvent payment_expected）を分離。
// 設計: docs/audit/12_maintenance_architecture.md。
import { prisma, writeAudit } from '@/lib/db';
import { emitGrowthEvent } from '@/lib/growth';
import { toNumber } from '@/lib/utils';
import { invoiceStatusAfterPayment, receivableStatusAfterPayment, type DomainEventType } from '@hokko/shared';

export interface Actor {
  tenantId: string;
  userId?: string | null;
}

export interface RecordPaymentResult {
  ok: boolean;
  reason?: string;
  fullyPaid?: boolean;
}

/** 正式 Invoice に入金を記録し、Invoice / Receivable / FinanceEvent を連動させる。 */
export async function recordInvoicePayment(actor: Actor, invoiceId: string, amount: number, method = 'bank'): Promise<RecordPaymentResult> {
  const inv = await prisma.invoice.findFirst({ where: { id: invoiceId, tenantId: actor.tenantId } });
  if (!inv) return { ok: false, reason: 'not-found' };
  if (amount <= 0) return { ok: false, reason: 'invalid-amount' };

  const payment = await prisma.payment.create({ data: { tenantId: actor.tenantId, invoiceId, amount, method } });
  const total = toNumber(inv.total);
  const paid = toNumber(inv.paidAmount) + amount;
  const status = invoiceStatusAfterPayment(total, paid);
  const fullyPaid = status === 'PAID';

  await prisma.invoice.update({ where: { id: invoiceId }, data: { paidAmount: paid, status } });
  await prisma.receivable.updateMany({ where: { invoiceId, tenantId: actor.tenantId }, data: { status: receivableStatusAfterPayment(total, paid) } });

  // 入金実績（FinanceEvent posted = actual）。
  await prisma.financeEvent.create({
    data: { tenantId: actor.tenantId, type: 'payment_received', sourceType: 'Invoice', sourceId: invoiceId, direction: 'inflow', amount, status: 'posted', occurredAt: new Date(), description: `入金: ${inv.number}` },
  });
  // 全額入金なら、関連する入金予定（payment_expected/cashflow_expected）を posted（実績化）に更新。
  if (fullyPaid) {
    await prisma.financeEvent.updateMany({
      where: { tenantId: actor.tenantId, sourceId: invoiceId, type: { in: ['payment_expected', 'cashflow_expected'] }, direction: 'inflow', status: { not: 'posted' } },
      data: { status: 'posted' },
    });
  }

  await writeAudit({ tenantId: actor.tenantId, actorId: actor.userId, action: 'payment_record', entityType: 'Invoice', entityId: invoiceId, summary: `入金記録 ${amount.toLocaleString()}円（${fullyPaid ? '全額入金' : '一部入金'}）` });
  await emitGrowthEvent({
    tenantId: actor.tenantId,
    type: 'finance.payment.received',
    title: `入金: ${inv.number}`,
    actorId: actor.userId,
    entityType: 'Payment',
    entityId: payment.id,
    amount,
    revenueImpact: amount,
    alsoDomainEvent: { domainType: 'PAYMENT_RECEIVED' as DomainEventType, aggregateType: 'Invoice', aggregateId: invoiceId },
  });
  if (fullyPaid) {
    await emitGrowthEvent({
      tenantId: actor.tenantId,
      type: 'finance.receivable.collected',
      title: `売掛金回収: ${inv.number}`,
      actorId: actor.userId,
      entityType: 'Receivable',
      entityId: invoiceId,
      amount: total,
      alsoDomainEvent: { domainType: 'RECEIVABLE_COLLECTED' as DomainEventType, aggregateType: 'Invoice', aggregateId: invoiceId },
    });
  }
  return { ok: true, fullyPaid };
}
