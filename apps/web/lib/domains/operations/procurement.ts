// 発注（PurchaseOrder）の業務ロジック。Phase 1-9 保守リファクタ（action から切り出し）。
// 設計ルール: docs/audit/12_maintenance_architecture.md。Server Action はこのサービスを呼ぶだけ。
import { prisma, writeAudit } from '@/lib/db';
import { emitGrowthEvent } from '@/lib/growth';
import { createApprovalRequestTx, executeApprovedAction } from '@/lib/approval';
import { applyInventoryMovement } from '@/lib/operations';
import { toNumber } from '@/lib/utils';
import { requiresApproval, type DomainEventType } from '@hokko/shared';

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
}

export interface ConfirmPurchaseOrderResult {
  found: boolean;
  requiresApproval: boolean;
}

/** 発注確定。高額（閾値以上）は承認申請（pending_approval）。少額は即 ordered。 */
export async function confirmPurchaseOrder(actor: Actor, poId: string): Promise<ConfirmPurchaseOrderResult> {
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

/** 承認済み高額発注を確定（pending_approval→ordered）。二重実行防止つき。
 *  堅牢化（Codex PR#58 R2 #2）: `status='pending_approval' AND approvalId=この承認` の CAS でのみ ordered 化。
 *  received/cancelled/ordered や別 approval の PO は count!==1 で弾き、received→ordered の差し戻し
 *  （＝二重入庫の再開）を構造的に不可能にする。executeApprovedAction が executedAt を原子 claim し
 *  二重 submit / stale 実行を防ぐため、CAS と併せ多層防御になる。 */
export async function executeApprovedPurchaseOrderIssue(
  actor: Actor,
  approvalId: string,
  poId: string,
): Promise<ExecuteApprovedPoResult> {
  try {
    const r = await executeApprovedAction(
      approvalId,
      async () => {
        const claim = await prisma.purchaseOrder.updateMany({
          where: { id: poId, tenantId: actor.tenantId, status: 'pending_approval', approvalId },
          data: { status: 'ordered' },
        });
        if (claim.count !== 1) throw new PoNotClaimable();
        const po = await prisma.purchaseOrder.findFirst({ where: { id: poId, tenantId: actor.tenantId } });
        await writeAudit({
          tenantId: actor.tenantId,
          actorId: actor.userId,
          action: 'purchase_order_issue',
          entityType: 'PurchaseOrder',
          entityId: poId,
          summary: `高額発注を承認確定: ${po?.orderNo ?? poId}（approval=${approvalId}）`,
        });
        await emitGrowthEvent({
          tenantId: actor.tenantId,
          type: 'inventory.purchase_order.created',
          title: `発注確定: ${po?.orderNo ?? poId}`,
          actorId: actor.userId,
          entityType: 'PurchaseOrder',
          entityId: poId,
          amount: Number(po?.totalAmount ?? 0),
          alsoDomainEvent: { domainType: 'PURCHASE_ORDER_APPROVED' as DomainEventType, aggregateType: 'PurchaseOrder', aggregateId: poId },
        });
        return poId;
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
