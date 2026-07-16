// 発注（PurchaseOrder）の業務ロジック。Phase 1-9 保守リファクタ（action から切り出し）。
// 設計ルール: docs/audit/12_maintenance_architecture.md。Server Action はこのサービスを呼ぶだけ。
import { prisma, writeAudit } from '@/lib/db';
import { emitGrowthEvent } from '@/lib/growth';
import { createApprovalRequestTx, executeApprovedAction } from '@/lib/approval';
import { applyInventoryMovement } from '@/lib/operations';
import { toNumber } from '@/lib/utils';
import { requiresApproval, growthCategoryOf, makeIdempotencyKey, type DomainEventType } from '@hokko/shared';

/** high-value 発注確定の tx 内で PO の draft→pending_approval claim に敗れた敗者シグナル。
 *  throw で承認申請＋監査ごと rollback し、孤児 PENDING/Audit を残さない。 */
class PoClaimLost extends Error {
  constructor() {
    super('po-claim-lost');
    this.name = 'PoClaimLost';
  }
}

/** 承認実行時の PO status/approvalId CAS 敗北（received/cancelled/別 approval/既 ordered）。差し戻さず fail-closed。 */
class PoNotClaimable extends Error {
  constructor() {
    super('po-not-claimable');
    this.name = 'PoNotClaimable';
  }
}

export interface Actor {
  tenantId: string;
  userId?: string | null;
  /** 実行主体が AI か（true は DB 接触前に一律拒否。発注確定/入庫/承認実行は人間専用・Codex PR#58 R3 P2-1）。 */
  actorIsAi?: boolean;
}

export interface ConfirmPurchaseOrderResult {
  found: boolean;
  requiresApproval: boolean;
  /** AI 主体（実確定不可）で DB 接触前に拒否した場合 true。 */
  forbidden?: boolean;
}

/** 発注確定。高額（閾値以上）は承認申請（pending_approval）。少額は即 ordered。 */
export async function confirmPurchaseOrder(actor: Actor, poId: string): Promise<ConfirmPurchaseOrderResult> {
  // 発注確定は人間専用（AI/mixed-role は action 境界に加え domain でも DB 接触前に拒否・Codex PR#58 R3 P2-1）。
  if (actor.actorIsAi) return { found: false, requiresApproval: false, forbidden: true };
  const po = await prisma.purchaseOrder.findFirst({ where: { id: poId, tenantId: actor.tenantId } });
  if (!po) return { found: false, requiresApproval: false };
  // 発注確定は draft からのみ許可する（STATE2 C2）。ordered/received/cancelled/pending_approval を
  // draft 前提の無条件 update で上書きすると、received 済み PO を ordered へ差し戻し、
  // receivePurchaseOrder の status CAS（ordered→received）を再成立させて在庫を二重計上できてしまう。
  // 確定ボタンは UI 上 draft のみ表示されるが、Server Action は直接 POST で到達可能なため server 側で弾く。
  if (po.status !== 'draft') return { found: true, requiresApproval: po.status === 'pending_approval' };
  const amount = toNumber(po.totalAmount);

  // 高額（閾値以上）は承認必須。承認申請＋監査の作成と PO の draft→pending_approval claim を
  // **単一 transaction** で原子化する（Codex PR#58 R2 #1）。従来は承認申請を PO CAS より先に prisma
  // 直で作っていたため、並行 confirm の CAS 敗者側で孤児 PENDING/Audit が残り、後段の承認実行から
  // received を ordered へ差し戻して二重入庫できた。tx 化により敗者は throw で承認ごと rollback され孤児 0。
  if (requiresApproval('purchase_order_issue', { amount })) {
    try {
      await prisma.$transaction(async (tx) => {
        const req = await createApprovalRequestTx(tx, {
          tenantId: actor.tenantId,
          action: 'purchase_order_issue',
          title: `発注確定: ${po.orderNo}（${amount}円）`,
          targetType: 'PurchaseOrder',
          targetId: poId,
          requestedById: actor.userId,
          riskLevel: 'MEDIUM',
          payloadAfter: { purchaseOrderId: poId },
        });
        // draft からのみ claim。並行敗者/非 draft は count!==1 → throw で承認申請＋監査を rollback。
        const claim = await tx.purchaseOrder.updateMany({
          where: { id: poId, tenantId: actor.tenantId, status: 'draft' },
          data: { status: 'pending_approval', approvalId: req.id },
        });
        if (claim.count !== 1) throw new PoClaimLost();
      });
    } catch (e) {
      if (e instanceof PoClaimLost) return { found: true, requiresApproval: true }; // 既に他者が pending_approval 化・孤児なし
      throw e;
    }
    return { found: true, requiresApproval: true };
  }
  // draft → ordered を条件付き単一更新で claim（received 等からの差し戻し不可・並行は1本に収束）。
  const orderedClaim = await prisma.purchaseOrder.updateMany({
    where: { id: poId, tenantId: actor.tenantId, status: 'draft' },
    data: { status: 'ordered' },
  });
  if (orderedClaim.count !== 1) return { found: true, requiresApproval: false };
  await emitGrowthEvent({
    tenantId: actor.tenantId,
    type: 'inventory.purchase_order.created',
    title: `発注確定: ${po.orderNo}`,
    actorId: actor.userId,
    entityType: 'PurchaseOrder',
    entityId: poId,
    amount,
    alsoDomainEvent: { domainType: 'PURCHASE_ORDER_APPROVED' as DomainEventType, aggregateType: 'PurchaseOrder', aggregateId: poId },
  });
  return { found: true, requiresApproval: false };
}

export interface ExecuteApprovedPoResult {
  executed: boolean;
  reason?: string;
}

export interface ExecuteApprovedPoOptions {
  /** test-only: PO CAS 後・Audit 前に例外を注入し、tx 全 rollback（半確定なし）を検証（Codex PR#58 R4 #3）。 */
  __faultAfterCasForTest?: () => void;
  /** test-only: DomainEvent/Outbox 作成後・GrowthEvent 作成時に例外を注入し、全 rollback を検証（Codex PR#58 R4 #3）。 */
  __faultAfterEventsForTest?: () => void;
}

/** 承認済み高額発注を確定（pending_approval→ordered）。二重実行防止つき。
 *  堅牢化（Codex PR#58 R2 #2 / R4）: `status='pending_approval' AND approvalId=この承認` の CAS でのみ ordered 化。
 *  received/cancelled/ordered や別 approval の PO は count!==1 で弾き、received→ordered の差し戻し
 *  （＝二重入庫の再開）を構造的に不可能にする。executeApprovedAction が executedAt を原子 claim し
 *  二重 submit / stale 実行を防ぐ。
 *  **R4 all-or-nothing**: PO CAS・Audit・DomainEvent(+Outbox)・GrowthEvent を **単一 $transaction** で確定する。
 *  途中 fault は PO=ordered を含め全 rollback され、半確定（PO=ordered だが Audit/Growth 欠落）を残さない。
 *  DomainEvent は (tenant, PURCHASE_ORDER_APPROVED, poId, dedupe=approvalId) の固定 idempotency key で作られ、
 *  Outbox 経由 worker 配送が失敗しても既存 outbox 機構で再開可能（Evidence lineage を保つ）。 */
export async function executeApprovedPurchaseOrderIssue(
  actor: Actor,
  approvalId: string,
  poId: string,
  opts: ExecuteApprovedPoOptions = {},
): Promise<ExecuteApprovedPoResult> {
  // 承認済み発注の実行も人間専用（AI/mixed-role は DB 接触前に拒否・Codex PR#58 R3 P2-1）。
  if (actor.actorIsAi) return { executed: false, reason: 'forbidden' };
  try {
    const r = await executeApprovedAction(
      approvalId,
      async () => {
        // PO CAS + Audit + Domain/Outbox/Growth を単一 tx で確定（R4: 途中 fault は全 rollback）。
        return prisma.$transaction(async (tx) => {
          const claim = await tx.purchaseOrder.updateMany({
            where: { id: poId, tenantId: actor.tenantId, status: 'pending_approval', approvalId },
            data: { status: 'ordered' },
          });
          if (claim.count !== 1) throw new PoNotClaimable();

          // test-only: PO CAS 後・Audit 前 fault（本番不到達）。
          if (opts.__faultAfterCasForTest) opts.__faultAfterCasForTest();

          const po = await tx.purchaseOrder.findFirst({ where: { id: poId, tenantId: actor.tenantId }, select: { orderNo: true, totalAmount: true } });
          await tx.auditLog.create({
            data: {
              tenantId: actor.tenantId,
              actorId: actor.userId ?? null,
              actorType: 'user',
              action: 'purchase_order_issue',
              entityType: 'PurchaseOrder',
              entityId: poId,
              summary: `高額発注を承認確定: ${po?.orderNo ?? poId}（approval=${approvalId}）`,
            },
          });

          // transactional outbox: DomainEvent(+Outbox)+GrowthEvent を tx 内で原子的に作成。
          // 固定 idempotency key（dedupe=approvalId）で 1 実行=1 lineage。post-commit 消失（fault window）を排除。
          const growthType = 'inventory.purchase_order.created';
          const key = makeIdempotencyKey({ tenantId: actor.tenantId, eventType: 'PURCHASE_ORDER_APPROVED', aggregateId: poId, dedupe: approvalId });
          const ev = await tx.domainEvent.create({
            data: { tenantId: actor.tenantId, eventType: 'PURCHASE_ORDER_APPROVED', aggregateType: 'PurchaseOrder', aggregateId: poId, actorId: actor.userId ?? null, actorType: 'user', payload: { growthType } as any, idempotencyKey: key, status: 'pending' },
          });
          await tx.outboxMessage.create({ data: { tenantId: actor.tenantId, eventId: ev.id, eventType: 'PURCHASE_ORDER_APPROVED', payload: { growthType } as any, status: 'pending' } });

          // test-only: DomainEvent/Outbox 作成後・GrowthEvent 作成時 fault（本番不到達）。
          if (opts.__faultAfterEventsForTest) opts.__faultAfterEventsForTest();

          await tx.growthEvent.create({
            data: { tenantId: actor.tenantId, type: growthType, category: growthCategoryOf(growthType), title: `発注確定: ${po?.orderNo ?? poId}`, description: '', actorId: actor.userId ?? null, actorType: 'user', entityType: 'PurchaseOrder', entityId: poId, amount: Number(po?.totalAmount ?? 0), revenueImpact: null, domainEventId: ev.id },
          });
          return poId;
        });
      },
      { executedById: actor.userId },
    );
    return { executed: r.executed, reason: r.reason };
  } catch (e) {
    if (e instanceof PoNotClaimable) return { executed: false, reason: 'po-not-claimable' };
    throw e;
  }
}

/** 入庫処理。各ラインの数量を ProductAsset へ入庫（InventoryMovement type=receive）。
 *  二重入庫（在庫水増し）の根絶: status を `ordered → received` へ**条件付き単一更新でclaim**してから
 *  入庫処理を行う。二重クリック / リトライ / 並行呼び出しは claim.count=0 となり入庫をスキップ（冪等）。
 *  claim を勝ち取った1回だけが InventoryMovement を発行するため、同一 PO の再入庫で在庫が水増しされない。
 *  （applyInventoryMovement 自体は PR#47 で行ロック＋単一transaction 済み＝各入庫は原子的。） */
export async function receivePurchaseOrder(actor: Actor, poId: string): Promise<boolean> {
  // 入庫も人間専用（AI/mixed-role は DB 接触前に拒否・Codex PR#58 R3 P2-1）。
  if (actor.actorIsAi) return false;
  const po = await prisma.purchaseOrder.findFirst({ where: { id: poId, tenantId: actor.tenantId }, include: { lines: true } });
  if (!po) return false;

  // ordered のときのみ received へ遷移させる atomic claim。ここで勝者を1本に絞り、二重入庫を構造的に排除する。
  const claim = await prisma.purchaseOrder.updateMany({
    where: { id: poId, tenantId: actor.tenantId, status: 'ordered' },
    data: { status: 'received', receivedAt: new Date() },
  });
  if (claim.count !== 1) return false; // 既に received / cancelled / 未確定（draft・承認待ち）→ no-op（二重入庫なし）。

  for (const l of po.lines) {
    if (l.assetId) {
      await applyInventoryMovement({
        tenantId: actor.tenantId,
        actorId: actor.userId,
        assetId: l.assetId,
        type: 'receive',
        quantity: l.quantity,
        note: `発注入庫: ${po.orderNo}`,
      });
    }
    await prisma.purchaseOrderLine.update({ where: { id: l.id }, data: { receivedQuantity: l.quantity } });
  }
  // status/receivedAt は上の claim で確定済み（重複更新しない）。
  await emitGrowthEvent({
    tenantId: actor.tenantId,
    type: 'inventory.purchase_order.received',
    title: `入庫完了: ${po.orderNo}`,
    actorId: actor.userId,
    entityType: 'PurchaseOrder',
    entityId: poId,
    alsoDomainEvent: { domainType: 'PURCHASE_ORDER_RECEIVED' as DomainEventType, aggregateType: 'PurchaseOrder', aggregateId: poId },
  });
  return true;
}
