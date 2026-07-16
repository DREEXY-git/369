// 入金消込（Payment）と Invoice/Receivable/FinanceEvent/イベントの連動。Phase 1-10。
// 実績（Payment / FinanceEvent payment_received posted）と予定（FinanceEvent payment_expected）を分離。
// 設計: docs/audit/12_maintenance_architecture.md。
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import {
  invoiceStatusAfterPayment,
  receivableStatusAfterPayment,
  growthCategoryOf,
  makeIdempotencyKey,
  type DomainEventType,
} from '@hokko/shared';

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
  /** test-only: tx 内の副次イベント作成後に例外を注入し、全 rollback（Payment/Event 孤児0）を検証する。
   *  Server Action は設定しないため本番経路からは到達不能（Codex P3-FIN-1 R2 #3 の fault injection 用）。 */
  __faultAfterEventsForTest?: () => void;
}

/** 入金記録 tx を業務理由（VOID/DRAFT 検出・payload mismatch）で中止する内部エラー。 */
class PaymentAbort extends Error {
  constructor(public readonly reason: string) {
    super(reason);
    this.name = 'PaymentAbort';
  }
}

/** 同一 request（idempotencyKey）が既に完全一致で記録済み → 二重計上せず既存へ収束させる内部シグナル。 */
class PaymentConverge extends Error {
  constructor() {
    super('already-recorded');
    this.name = 'PaymentConverge';
  }
}

/** Prisma unique violation（P2002）判定。 */
function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: string }).code === 'P2002';
}

const IDEMPOTENCY_KEY_RE = /^c[a-z0-9]{20,32}$/;

/** 正式 Invoice に入金を記録し、Invoice / Receivable / FinanceEvent / Domain・Growth イベントを連動させる。
 *  堅牢化（P3-Q2C hardening + Codex P3-FIN-1 R1/R2 対応）:
 *   - AI は財務実績の確定を持たない → DB 接触前に一律拒否（二重防御）。
 *   - **request-level 冪等性**: idempotencyKey を Payment の deterministic PK にし、同一 request の
 *     逐次/並行 retry・fault 後の再送を 1 Payment / 1 Audit / 1 FinanceEvent / 1 DomainEvent へ収束。
 *     収束は **tenant/invoice/amount/method 完全一致時のみ**（method 差異や別 invoice/tenant への同一キーは
 *     `idempotency-mismatch` で fail-closed）。P2002（別 invoice の同一キー衝突等）は競合 Payment を
 *     再取得し完全照合し、一致しなければ fail-closed（任意 P2002 の無条件 success を禁止）。
 *   - FOR UPDATE ロック後に status を再読込し、並行 VOID/DRAFT を検出。
 *   - paidAmount は Payment 実体の SUM から再導出（lost update を構造的に排除）。
 *   - **transactional outbox**: Growth/DomainEvent（+Outbox）を payment tx 内で原子的に作成し、
 *     post-commit の副次処理消失（fault window）を排除する。tx 失敗時は Payment ごと rollback。 */
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
  if (!IDEMPOTENCY_KEY_RE.test(idempotencyKey)) return { ok: false, reason: 'invalid-request' };

  const inv = await prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId: actor.tenantId },
    select: { id: true, number: true, total: true, status: true },
  });
  if (!inv) return { ok: false, reason: 'not-found' };
  if (inv.status === 'VOID' || inv.status === 'DRAFT') return { ok: false, reason: 'not-payable' };

  const total = toNumber(inv.total);

  // 既存 Payment が「この request」と完全一致か（tenant/invoice/amount/method）。収束の唯一条件。
  const matchesRequest = (p: { tenantId: string; invoiceId: string; amount: unknown; method: string }) =>
    p.tenantId === actor.tenantId && p.invoiceId === invoiceId && toNumber(p.amount) === amount && p.method === method;
  const convergeOk = async (): Promise<RecordPaymentResult> => {
    const cur = await prisma.invoice.findFirst({ where: { id: invoiceId, tenantId: actor.tenantId }, select: { status: true } });
    return { ok: true, fullyPaid: cur?.status === 'PAID', idempotent: true };
  };

  let txResult: { fullyPaid: boolean; paymentId: string };
  try {
    txResult = await prisma.$transaction(async (tx) => {
      // FOR UPDATE ロック + ロック後 status 再読込（並行 VOID/DRAFT 検出・C1）。
      const locked = await tx.$queryRaw<Array<{ status: string }>>`
        SELECT status FROM "Invoice" WHERE id = ${invoiceId} AND "tenantId" = ${actor.tenantId} FOR UPDATE`;
      const current = locked[0];
      if (!current) throw new PaymentAbort('not-found');
      if (current.status === 'VOID' || current.status === 'DRAFT') throw new PaymentAbort('not-payable');

      // request-level 冪等: 同一キーの既存 Payment を method 含む完全 payload で照合。
      const dup = await tx.payment.findUnique({
        where: { id: idempotencyKey },
        select: { id: true, tenantId: true, invoiceId: true, amount: true, method: true },
      });
      if (dup) {
        if (!matchesRequest(dup)) throw new PaymentAbort('idempotency-mismatch');
        throw new PaymentConverge();
      }

      const payment = await tx.payment.create({ data: { id: idempotencyKey, tenantId: actor.tenantId, invoiceId, amount, method } });
      const agg = await tx.payment.aggregate({ where: { tenantId: actor.tenantId, invoiceId }, _sum: { amount: true } });
      const paidSum = toNumber(agg._sum.amount ?? 0);
      const status = invoiceStatusAfterPayment(total, paidSum);
      const paidFull = status === 'PAID';

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

      // transactional outbox（Codex P3-FIN-1 R2 #3）: Growth/DomainEvent(+Outbox) を payment tx に同梱。
      // DomainEvent は (tenant, eventType, aggregateId, dedupe=idempotencyKey) で per-request 冪等。
      const emitEv = async (
        domainType: DomainEventType,
        growthType: string,
        entityType: string,
        entityId: string,
        title: string,
        evAmount: number,
        revenueImpact: number | null,
      ) => {
        const key = makeIdempotencyKey({ tenantId: actor.tenantId, eventType: domainType, aggregateId: invoiceId, dedupe: idempotencyKey });
        const ev = await tx.domainEvent.create({
          data: { tenantId: actor.tenantId, eventType: domainType, aggregateType: 'Invoice', aggregateId: invoiceId, actorId: actor.userId ?? null, actorType: 'user', payload: { growthType } as any, idempotencyKey: key, status: 'pending' },
        });
        await tx.outboxMessage.create({ data: { tenantId: actor.tenantId, eventId: ev.id, eventType: domainType, payload: { growthType } as any, status: 'pending' } });
        await tx.growthEvent.create({
          data: { tenantId: actor.tenantId, type: growthType, category: growthCategoryOf(growthType), title, description: '', actorId: actor.userId ?? null, actorType: 'user', entityType, entityId, amount: evAmount, revenueImpact, domainEventId: ev.id },
        });
      };
      await emitEv('PAYMENT_RECEIVED' as DomainEventType, 'finance.payment.received', 'Payment', payment.id, `入金: ${inv.number}`, amount, amount);
      if (paidFull) await emitEv('RECEIVABLE_COLLECTED' as DomainEventType, 'finance.receivable.collected', 'Receivable', invoiceId, `売掛金回収: ${inv.number}`, total, null);

      // test-only fault injection（本番不到達）: イベント作成後に例外→全 rollback を検証。
      if (opts.__faultAfterEventsForTest) opts.__faultAfterEventsForTest();

      return { fullyPaid: paidFull, paymentId: payment.id };
    });
  } catch (e) {
    if (e instanceof PaymentConverge) return convergeOk();
    if (isUniqueViolation(e)) {
      // Payment PK の並行競合（別 invoice の同一キー衝突等）。既存 Payment を再取得し完全照合。
      // 完全一致なら converge、一致しなければ fail-closed（任意 P2002 の無条件 success を禁止）。
      const dup = await prisma.payment.findUnique({ where: { id: idempotencyKey }, select: { tenantId: true, invoiceId: true, amount: true, method: true } });
      if (dup && matchesRequest(dup)) return convergeOk();
      return { ok: false, reason: 'idempotency-mismatch' };
    }
    if (e instanceof PaymentAbort) return { ok: false, reason: e.reason };
    throw e;
  }
  return { ok: true, fullyPaid: txResult.fullyPaid };
}
