// 発注（PurchaseOrder）の業務ロジック。Phase 1-9 保守リファクタ（action から切り出し）。
// 設計ルール: docs/audit/12_maintenance_architecture.md。Server Action はこのサービスを呼ぶだけ。
import { prisma } from '@/lib/db';
import { emitGrowthEvent } from '@/lib/growth';
import { requireApprovalForDangerousAction } from '@/lib/approval';
import { applyInventoryMovement } from '@/lib/operations';
import { toNumber } from '@/lib/utils';
import type { DomainEventType } from '@hokko/shared';

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

  const gate = await requireApprovalForDangerousAction({
    tenantId: actor.tenantId,
    action: 'purchase_order_issue',
    title: `発注確定: ${po.orderNo}（${amount}円）`,
    targetType: 'PurchaseOrder',
    targetId: poId,
    requestedById: actor.userId,
    riskLevel: 'MEDIUM',
    amount,
    payloadAfter: { purchaseOrderId: poId },
  });
  if (gate.requiresApproval) {
    // draft → pending_approval を条件付き単一更新で claim（並行二重確定を1本に絞る）。差し戻しは起きない。
    const claim = await prisma.purchaseOrder.updateMany({
      where: { id: poId, tenantId: actor.tenantId, status: 'draft' },
      data: { status: 'pending_approval', approvalId: gate.approvalId },
    });
    if (claim.count !== 1) return { found: true, requiresApproval: true };
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
