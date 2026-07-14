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
  /** 同一 request の再送/並行で既存 Payment に収束した場合 true（新規 Payment を作っていない）。 */
  idempotent?: boolean;
}

export interface RecordPaymentOptions {
  /** 実行主体が AI か（true は DB 接触前に一律拒否）。 */
  actorIsAi?: boolean;
  /** request-level 冪等キー（= Payment の deterministic PK）。フォーム描画時に1度だけ発行し ^c[a-z0-9]{20,32}$ を渡す。 */
  idempotencyKey?: string;
}

/** 入金記録 tx を業務理由（VOID/DRAFT 検出など）で中止する内部エラー。
 *  throw で $transaction 全体を rollback し、呼び出し側で RecordPaymentResult へ変換する。 */
class PaymentAbort extends Error {
  constructor(public readonly reason: string) {
    super(reason);
    this.name = 'PaymentAbort';
  }
}

/** 同一 request（idempotencyKey）が既に記録済み → 二重計上せず既存へ収束させる内部シグナル。 */
class PaymentConverge extends Error {
  constructor() {
    super('already-recorded');
    this.name = 'PaymentConverge';
  }
}

/** Prisma unique violation（P2002）判定（並行同一キーの DB backstop・test mock からも同形で注入可能）。 */
function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: string }).code === 'P2002';
}

const IDEMPOTENCY_KEY_RE = /^c[a-z0-9]{20,32}$/;

/** 正式 Invoice に入金を記録し、Invoice / Receivable / FinanceEvent を連動させる。
 *  堅牢化（P3-Q2C hardening 踏襲 + Codex P3-FIN-1 対応）:
 *   - AI は財務実績の確定を持たない → DB 接触前に一律拒否（二重防御）。
 *   - **request-level 冪等性**: idempotencyKey を Payment の deterministic PK にする。同一 request の
 *     逐次/並行 retry・post-commit 副次処理失敗後の再送は、PK unique 制約で **1 Payment / 1 Audit /
 *     1 FinanceEvent** に収束する（schema 変更なし・C19 と同型）。異なる key の同額支払は別 Payment。
 *     別 invoice/tenant/amount へ同一 key を渡す payload mismatch は fail-closed。
 *   - Payment 作成・Invoice/Receivable 更新・FinanceEvent・監査を**単一 $transaction**で確定。
 *   - FOR UPDATE ロック後に status を再読込し、並行 VOID/DRAFT を検出（C1）。
 *   - paidAmount は Payment 実体の **SUM から再導出**（lost update を構造的に排除）。
 *  growth/DomainEvent（非クリティカル）は commit 後に best-effort emit。失敗しても入金（Payment /
 *  FinanceEvent）は tx 内で確定済みで、冪等キーにより再送も二重計上しない（財務真実は FinanceEvent が正本）。 */
export async function recordInvoicePayment(
  actor: Actor,
  invoiceId: string,
  amount: number,
  method = 'bank',
  opts: RecordPaymentOptions = {},
): Promise<RecordPaymentResult> {
  if (opts.actorIsAi) return { ok: false, reason: 'forbidden' };
  if (!(amount > 0)) return { ok: false, reason: 'invalid-amount' };
  const idempotencyKey = opts.idempotencyKey ?? '';
  // 明示的 request ID を入口で必須化（fail-closed）。key が無ければ retry を1件へ収束できない。
  if (!IDEMPOTENCY_KEY_RE.test(idempotencyKey)) return { ok: false, reason: 'invalid-request' };

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
      //  (b) findFirst（ロック前 snapshot）と FOR UPDATE 取得の間に承認・実行された VOID/DRAFT を検出。
      const locked = await tx.$queryRaw<Array<{ status: string }>>`
        SELECT status FROM "Invoice" WHERE id = ${invoiceId} AND "tenantId" = ${actor.tenantId} FOR UPDATE`;
      const current = locked[0];
      if (!current) throw new PaymentAbort('not-found');
      if (current.status === 'VOID' || current.status === 'DRAFT') throw new PaymentAbort('not-payable');

      // request-level 冪等性（Codex P3-FIN-1）: 同一 idempotencyKey の Payment が既にあれば収束する。
      // FOR UPDATE で同一 invoice への入金は直列化されるため、先行 commit の同一キー Payment がここで見える。
      const dup = await tx.payment.findUnique({
        where: { id: idempotencyKey },
        select: { id: true, tenantId: true, invoiceId: true, amount: true },
      });
      if (dup) {
        // payload mismatch は fail-closed（別 tenant/invoice/amount への同一キー転用を拒否）。
        if (dup.tenantId !== actor.tenantId || dup.invoiceId !== invoiceId || toNumber(dup.amount) !== amount) {
          throw new PaymentAbort('idempotency-mismatch');
        }
        // 同一 request の再送/並行 → 二重計上しない。
        throw new PaymentConverge();
      }

      // Payment の PK を idempotencyKey にする（deterministic PK）。並行同一キーは PK unique が最終 barrier。
      const payment = await tx.payment.create({ data: { id: idempotencyKey, tenantId: actor.tenantId, invoiceId, amount, method } });
      // paidAmount は Payment 実体の合計から再導出（この tx で作成した分＋先行 commit 分を含む・lost update 防止）。
      const agg = await tx.payment.aggregate({ where: { tenantId: actor.tenantId, invoiceId }, _sum: { amount: true } });
      const paidSum = toNumber(agg._sum.amount ?? 0);
      const status = invoiceStatusAfterPayment(total, paidSum);
      const paidFull = status === 'PAID';

      // 多層防御: 条件付き更新で VOID/DRAFT を最終ガード（ロック保持中のため通常は count===1）。
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
    // 同一 request の収束（既記録 or 並行敗者の P2002 backstop）: 二重計上せず現在状態から idempotent に ok。
    if (e instanceof PaymentConverge || isUniqueViolation(e)) {
      const cur = await prisma.invoice.findFirst({ where: { id: invoiceId, tenantId: actor.tenantId }, select: { status: true } });
      return { ok: true, fullyPaid: cur?.status === 'PAID', idempotent: true };
    }
    // 業務理由の中止（VOID/DRAFT 検出・対象消失・payload mismatch）は rollback 済みで結果へ変換。
    if (e instanceof PaymentAbort) return { ok: false, reason: e.reason };
    throw e;
  }
  const { fullyPaid, paymentId } = txResult;

  // post-commit の非クリティカル副次処理（Growth/DomainEvent）は best-effort。失敗しても入金は tx 内で確定済み・
  // 冪等キーにより再送も二重計上しない（財務真実は FinanceEvent が正本＝reconcile 可能）。失敗はログのみ。
  try {
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
  } catch (err) {
    console.error('[recordInvoicePayment] post-commit growth emit failed (best-effort):', err);
  }
  return { ok: true, fullyPaid };
}
