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

/** 入金記録 tx を業務理由（VOID/DRAFT 検出など）で中止する内部エラー。
 *  throw で $transaction 全体を rollback し、呼び出し側で RecordPaymentResult へ変換する。 */
class PaymentAbort extends Error {
  constructor(public readonly reason: string) {
    super(reason);
    this.name = 'PaymentAbort';
  }
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

  let txResult: { fullyPaid: boolean; paymentId: string };
  try {
    txResult = await prisma.$transaction(async (tx) => {
      // 並列/二重入金の直列化 + ロック後の再読込（Codex STATE2 C1 対応）:
      // 対象 Invoice 行を FOR UPDATE でロックし、同一 tx 内で「現在の」status を再取得する。これにより
      //  (a) 同時 recordInvoicePayment が直列化され後続 tx が先行 commit の Payment を SUM に含められる、
      //  (b) findFirst（ロック前 snapshot・L44）と FOR UPDATE 取得の間に承認・実行された VOID/DRAFT を
      //      検出できる。ロック前 snapshot だけで判断すると、並行 VOID 承認済みの請求書を入金で PAID に
      //      復活させ、幻の売掛・入金実績・成長イベントを生む（READ COMMITTED では防げない）。
      const locked = await tx.$queryRaw<Array<{ status: string }>>`
        SELECT status FROM "Invoice" WHERE id = ${invoiceId} AND "tenantId" = ${actor.tenantId} FOR UPDATE`;
      const current = locked[0];
      if (!current) throw new PaymentAbort('not-found');
      if (current.status === 'VOID' || current.status === 'DRAFT') throw new PaymentAbort('not-payable');

      const payment = await tx.payment.create({ data: { tenantId: actor.tenantId, invoiceId, amount, method } });
      // paidAmount は Payment 実体の合計から再導出（この tx で作成した分＋先行 commit 分を含む・lost update 防止）。
      const agg = await tx.payment.aggregate({ where: { tenantId: actor.tenantId, invoiceId }, _sum: { amount: true } });
      const paidSum = toNumber(agg._sum.amount ?? 0);
      const status = invoiceStatusAfterPayment(total, paidSum);
      const paidFull = status === 'PAID';

      // 多層防御: 条件付き更新で VOID/DRAFT を最終ガード（ロック保持中のため通常は count===1。
      // 万一 payable でなくなっていれば count!==1 で throw し Payment ごと全 rollback）。
      const upd = await tx.invoice.updateMany({
        where: { id: invoiceId, tenantId: actor.tenantId, status: { notIn: ['VOID', 'DRAFT'] } },
        data: { paidAmount: paidSum, status },
      });
      if (upd.count !== 1) throw new PaymentAbort('not-payable');
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
      return { fullyPaid: paidFull, paymentId: payment.id };
    });
  } catch (e) {
    // 業務理由の中止（VOID/DRAFT 検出・対象消失）は rollback 済みで結果へ変換。それ以外は再 throw。
    if (e instanceof PaymentAbort) return { ok: false, reason: e.reason };
    throw e;
  }
  const { fullyPaid, paymentId } = txResult;

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
