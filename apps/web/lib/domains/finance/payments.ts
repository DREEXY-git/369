// 入金消込（Payment）と Invoice/Receivable/FinanceEvent/イベントの連動。Phase 1-10。
// 実績（Payment / FinanceEvent payment_received posted）と予定（FinanceEvent payment_expected）を分離。
// 設計: docs/audit/12_maintenance_architecture.md。
import { prisma } from '@/lib/db';
import { emitDomainEventInTx } from '@/lib/events';
import { toNumber } from '@/lib/utils';
import {
  invoiceStatusAfterPayment,
  receivableStatusAfterPayment,
  growthCategoryOf,
  PAYMENT_REQUEST_KEY_RE,
  derivePaymentRequestId,
  paymentReceivedIdentity,
  receivableCollectedIdentity,
  EventIdentityCollisionError,
  type DomainEventIdentity,
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
  /** request-level 冪等キー（client 発行 requestKey・^c[a-z0-9]{20,32}$）。フォーム mount 時に 1 回発行。
   *  Payment.id はこの値そのものではなく derivePaymentRequestId(tenantId, requestKey) の
   *  **server-derived 単射 ID**（ID-1・tenant-bound。client が global PK を支配しない）。 */
  idempotencyKey?: string;
  /** test-only: tx 内の副次イベント作成後に例外を注入し、全 rollback（Payment/Event 孤児0）を検証する。
   *  Server Action は設定しないため本番経路からは到達不能。 */
  __faultAfterEventsForTest?: () => void;
}

/** 入金記録 tx を業務理由（VOID/DRAFT 検出・payload mismatch）で中止する内部エラー。 */
class PaymentAbort extends Error {
  constructor(public readonly reason: string) {
    super(reason);
    this.name = 'PaymentAbort';
  }
}

/** 同一 request（requestKey）が既に完全一致で記録済み → 二重計上せず既存へ収束させる内部シグナル。 */
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

/** 正式 Invoice に入金を記録し、Invoice / Receivable / FinanceEvent / Domain・Growth イベントを連動させる。
 *  修正版 Phase A（369-PADN-V5 / PA-BLK-2 解消・ID-1..ID-5）:
 *   - AI は財務実績の確定を持たない → DB 接触前に一律拒否（二重防御）。
 *   - **request-level 冪等性**: client requestKey（必須・RE 検証）から
 *     Payment.id = derivePaymentRequestId(tenantId, requestKey) を server 側で導出（単射・tenant-bound・
 *     schema 変更なし）。同一 request の逐次/並行 retry・fault 後の再送・**Phase B 作成行への rollback 後
 *     再送**を 1 Payment / 1 Audit / 1 FinanceEvent / 1 DomainEvent+Outbox+Growth へ収束する。
 *     収束は tx 冒頭 barrier（FOR UPDATE 下）で derived ID の既存 Payment を取得し、
 *     **tenantId === actor.tenantId 検証（fail-closed）＋ invoice/amount/method 完全照合**が成立した
 *     場合のみ（不一致は `idempotency-mismatch` で fail-closed）。P2002 後も同一 derived ID を再照合する。
 *   - FOR UPDATE ロック後に status を再読込し、並行 VOID/DRAFT を検出。
 *   - paidAmount は Payment 実体の SUM から再導出（lost update を構造的に排除）。
 *   - **transactional outbox**: Growth/DomainEvent(+Outbox) を payment tx 内で原子的に作成し、
 *     post-commit の副次処理消失（fault window）を排除する。tx 失敗時は Payment ごと rollback。
 *     emit は emitDomainEventInTx（advisory barrier・canonical/legacy 検証付き dual-read）経由で、
 *     identity は契約関数（paymentReceivedIdentity / receivableCollectedIdentity）でのみ表現する（PA-BLK-1）。
 *     ロック順は「Invoice 行ロック → advisory event lock（PAYMENT_RECEIVED → RECEIVABLE_COLLECTED の固定順）」。
 *   - RECEIVABLE_COLLECTED は **非PAID→PAID の遷移時のみ**発火（PAID 済みへの追加入金では再発火しない）。 */
export async function recordInvoicePayment(
  actor: Actor,
  invoiceId: string,
  amount: number,
  method = 'bank',
  opts: RecordPaymentOptions = {},
): Promise<RecordPaymentResult> {
  if (opts.actorIsAi) return { ok: false, reason: 'forbidden' };
  if (!(amount > 0)) return { ok: false, reason: 'invalid-amount' };
  const requestKey = opts.idempotencyKey ?? '';
  if (!PAYMENT_REQUEST_KEY_RE.test(requestKey)) return { ok: false, reason: 'invalid-request' };
  // server-derived 単射 Payment ID（ID-1）。tenantId は必ずセッション actor 側の値（client 入力不使用）。
  const derivedPaymentId = derivePaymentRequestId(actor.tenantId, requestKey);

  const inv = await prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId: actor.tenantId },
    select: { id: true, number: true, total: true, status: true },
  });
  if (!inv) return { ok: false, reason: 'not-found' };
  if (inv.status === 'VOID' || inv.status === 'DRAFT') return { ok: false, reason: 'not-payable' };

  const total = toNumber(inv.total);

  // 既存 Payment が「この request」と完全一致か（tenant/invoice/amount/method）。収束の唯一条件。
  // tenantId 検証は derived ID の単射性に加えた fail-closed の二重防御（ID-1）。
  const matchesRequest = (p: { tenantId: string; invoiceId: string; amount: unknown; method: string }) =>
    p.tenantId === actor.tenantId && p.invoiceId === invoiceId && toNumber(p.amount) === amount && p.method === method;
  const convergeOk = async (): Promise<RecordPaymentResult> => {
    const cur = await prisma.invoice.findFirst({ where: { id: invoiceId, tenantId: actor.tenantId }, select: { status: true } });
    return { ok: true, fullyPaid: cur?.status === 'PAID', idempotent: true };
  };

  let txResult: { fullyPaid: boolean; paymentId: string };
  try {
    txResult = await prisma.$transaction(
      async (tx) => {
        // FOR UPDATE ロック + ロック後 status 再読込（並行 VOID/DRAFT 検出）。phase 混在でも同一 invoice の
        // 全 writer を直列化する encoding 非依存の直列化点（PA-BLK-3 の第一直列化点）。
        const locked = await tx.$queryRaw<Array<{ status: string }>>`
        SELECT status FROM "Invoice" WHERE id = ${invoiceId} AND "tenantId" = ${actor.tenantId} FOR UPDATE`;
        const current = locked[0];
        if (!current) throw new PaymentAbort('not-found');
        if (current.status === 'VOID' || current.status === 'DRAFT') throw new PaymentAbort('not-payable');
        // ロック下の「入金前」status。RECEIVABLE_COLLECTED は 未回収→回収済み(=非PAID→PAID) の
        // 状態遷移イベントであり、PAID 済み invoice への追加入金では再発火させない。
        const wasPaidBefore = current.status === 'PAID';

        // request-level 冪等 barrier（第一 barrier・PA-BLK-2）: derived ID の既存 Payment を
        // tenantId 検証 + 完全 payload 照合。Phase B（改訂 #57・同一 derive 契約）が作成した行にも
        // ここで converge し、以降の書込（6系）へ一切到達しない＝rollback 往復の増分 0。
        const dup = await tx.payment.findUnique({
          where: { id: derivedPaymentId },
          select: { id: true, tenantId: true, invoiceId: true, amount: true, method: true },
        });
        if (dup) {
          if (dup.tenantId !== actor.tenantId || !matchesRequest(dup)) throw new PaymentAbort('idempotency-mismatch');
          throw new PaymentConverge();
        }

        const payment = await tx.payment.create({
          data: { id: derivedPaymentId, tenantId: actor.tenantId, invoiceId, amount, method },
        });
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

        // transactional outbox（PA-BLK-2）: Domain/Growth イベントを payment tx に同梱。
        // identity は契約関数の戻り値のみ（PA-BLK-1）。emit は advisory barrier + 検証付き dual-read
        //（emitDomainEventInTx・PA-BLK-3/4）。dual-read hit（既存イベントあり）の場合は
        // DomainEvent/Outbox/GrowthEvent の 3 点とも作成しない（hit なら 3 点 skip）。
        const emitWithGrowth = async (
          identity: DomainEventIdentity,
          growthType: string,
          entityType: string,
          entityId: string,
          title: string,
          evAmount: number,
          revenueImpact: number | null,
        ) => {
          const r = await emitDomainEventInTx(tx, {
            tenantId: identity.tenantId,
            eventType: identity.eventType,
            aggregateType: identity.aggregateType,
            aggregateId: identity.aggregateId,
            actorId: actor.userId ?? null,
            actorType: 'user',
            payload: { growthType },
            dedupe: identity.dedupe,
          });
          if (r.duplicated) return;
          await tx.growthEvent.create({
            data: { tenantId: actor.tenantId, type: growthType, category: growthCategoryOf(growthType), title, description: '', actorId: actor.userId ?? null, actorType: 'user', entityType, entityId, amount: evAmount, revenueImpact, domainEventId: r.eventId },
          });
        };
        // dedupe 契約（凍結・PR #57 実経路と同値）: PAYMENT_RECEIVED = 入金 request 単位
        //（dedupe=requestKey）/ RECEIVABLE_COLLECTED = invoice 状態遷移（dedupe='receivable-collected'）。
        await emitWithGrowth(
          paymentReceivedIdentity({ tenantId: actor.tenantId, invoiceId, requestKey }),
          'finance.payment.received',
          'Payment',
          payment.id,
          `入金: ${inv.number}`,
          amount,
          amount,
        );
        // 回収イベントは **非PAID→PAID の遷移時のみ**（PAID 済みへの追加入金では再発火しない）。
        if (paidFull && !wasPaidBefore) {
          await emitWithGrowth(
            receivableCollectedIdentity({ tenantId: actor.tenantId, invoiceId }),
            'finance.receivable.collected',
            'Receivable',
            invoiceId,
            `売掛金回収: ${inv.number}`,
            total,
            null,
          );
        }

        // test-only fault injection（本番不到達）: イベント作成後に例外→全 rollback を検証。
        if (opts.__faultAfterEventsForTest) opts.__faultAfterEventsForTest();

        return { fullyPaid: paidFull, paymentId: payment.id };
      },
      { timeout: 20_000 },
    );
  } catch (e) {
    if (e instanceof PaymentConverge) return convergeOk();
    // legacy FNV キーの真の衝突は typed fail-closed（ID-3）。tx は全 rollback 済み（Payment/Event 孤児 0）。
    // 誤収束・キー変形・握り潰しをしない。復旧経路は Phase B canonical writer（無衝突 encoding）。
    if (e instanceof EventIdentityCollisionError) throw e;
    if (isUniqueViolation(e)) {
      // P2002 を constraint/model 別に扱う。Payment PK（= derived ID）の並行競合なら、勝者の Payment が
      // 同一 derived ID で必ずコミット済み。それを再取得し tenantId 検証＋完全照合して converge/mismatch を
      // 決める。別 constraint の unique 違反では derived ID の Payment は存在しない（tx rollback）→
      // real error として再送出する（任意 P2002 の無条件 success を禁止）。
      const dup = await prisma.payment.findUnique({
        where: { id: derivedPaymentId },
        select: { tenantId: true, invoiceId: true, amount: true, method: true },
      });
      if (dup) {
        return dup.tenantId === actor.tenantId && matchesRequest(dup)
          ? convergeOk()
          : { ok: false, reason: 'idempotency-mismatch' };
      }
      throw e;
    }
    if (e instanceof PaymentAbort) return { ok: false, reason: e.reason };
    throw e;
  }
  return { ok: true, fullyPaid: txResult.fullyPaid };
}
