// 入金消込（Payment）と Invoice/Receivable/FinanceEvent の連動。Phase 1-10。
// 実績（Payment / FinanceEvent payment_received posted）と予定（FinanceEvent payment_expected）を分離。
// 設計: docs/audit/12_maintenance_architecture.md。
import { prisma } from '@/lib/db';
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

export interface RecordPaymentOptions {
  /** 実行主体が AI か（true は DB 接触前に一律拒否）。 */
  actorIsAi?: boolean;
}

/** 正式 Invoice に入金を記録し、Invoice / Receivable / FinanceEvent を連動させる。
 *  堅牢化（P3-Q2C hardening 踏襲）:
 *   - AI は財務実績の確定を持たない → DB 接触前に一律拒否（二重防御）。
 *   - Payment 作成・Invoice/Receivable 更新・FinanceEvent・監査を**単一 $transaction**で確定
 *     （途中失敗で「Payment だけ残る／請求だけ PAID になる」等の不整合を出さない）。
 *   - paidAmount は Payment 実体の **SUM から再導出**する（read-modify-write を避け、並行/二重入金でも
 *     Invoice.paidAmount と Payment 合計が常に一致・lost update を構造的に排除）。
 *   - VOID / DRAFT は入金記録の対象外（発行前・無効化済みに実績を作らない）。
 *  growth event（成果可視化・非クリティカル）は commit 後に emit（失敗しても入金実績は確定済み）。 */
export async function recordInvoicePayment(
  actor: Actor,
  invoiceId: string,
  amount: number,
  method = 'bank',
  opts: RecordPaymentOptions = {},
): Promise<RecordPaymentResult> {
  if (opts.actorIsAi) return { ok: false, reason: 'forbidden' };
  if (!(amount > 0)) return { ok: false, reason: 'invalid-amount' };

  const inv = await prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId: actor.tenantId },
    select: { id: true, number: true, total: true, status: true },
  });
  if (!inv) return { ok: false, reason: 'not-found' };
  if (inv.status === 'VOID' || inv.status === 'DRAFT') return { ok: false, reason: 'not-payable' };

  const total = toNumber(inv.total);

  const { fullyPaid, paymentId } = await prisma.$transaction(async (tx) => {
    // 並列/二重入金の直列化: 対象 Invoice 行を FOR UPDATE でロックする。これにより同一請求への
    // 同時 recordInvoicePayment が直列化され、後続 tx は先行 tx の commit 後の Payment を SUM に含められる
    // （READ COMMITTED では未コミット insert が見えず SUM だけでは lost update を防げないため）。
    await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${invoiceId} AND "tenantId" = ${actor.tenantId} FOR UPDATE`;
    const payment = await tx.payment.create({ data: { tenantId: actor.tenantId, invoiceId, amount, method } });
    // paidAmount は Payment 実体の合計から再導出（この tx で作成した分＋先行 commit 分を含む・lost update 防止）。
    const agg = await tx.payment.aggregate({ where: { tenantId: actor.tenantId, invoiceId }, _sum: { amount: true } });
    const paidSum = toNumber(agg._sum.amount ?? 0);
    const status = invoiceStatusAfterPayment(total, paidSum);
    const paidFull = status === 'PAID';

    await tx.invoice.update({ where: { id: invoiceId }, data: { paidAmount: paidSum, status } });
    await tx.receivable.updateMany({ where: { invoiceId, tenantId: actor.tenantId }, data: { status: receivableStatusAfterPayment(total, paidSum) } });

    // 入金実績（FinanceEvent posted = actual）。
    await tx.financeEvent.create({
      data: { tenantId: actor.tenantId, type: 'payment_received', sourceType: 'Invoice', sourceId: invoiceId, direction: 'inflow', amount, status: 'posted', occurredAt: new Date(), description: `入金: ${inv.number}` },
    });
    // 全額入金なら、関連する入金予定（payment_expected/cashflow_expected）を posted（実績化）に更新。
    if (paidFull) {
      await tx.financeEvent.updateMany({
        where: { tenantId: actor.tenantId, sourceId: invoiceId, type: { in: ['payment_expected', 'cashflow_expected'] }, direction: 'inflow', status: { not: 'posted' } },
        data: { status: 'posted' },
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        actorId: actor.userId ?? null,
        actorType: 'user',
        action: 'payment_record',
        entityType: 'Invoice',
        entityId: invoiceId,
        summary: `入金記録 ${amount.toLocaleString()}円（${paidFull ? '全額入金' : '一部入金'}）`,
      },
    });
    return { paid: paidSum, fullyPaid: paidFull, paymentId: payment.id };
  });

  await emitGrowthEvent({
    tenantId: actor.tenantId,
    type: 'finance.payment.received',
    title: `入金: ${inv.number}`,
    actorId: actor.userId,
    entityType: 'Payment',
    entityId: paymentId,
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
