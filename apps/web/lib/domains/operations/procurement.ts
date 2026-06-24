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
    await prisma.purchaseOrder.update({ where: { id: poId }, data: { status: 'pending_approval', approvalId: gate.approvalId } });
    return { found: true, requiresApproval: true };
  }
  await prisma.purchaseOrder.update({ where: { id: poId }, data: { status: 'ordered' } });
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

/** 入庫処理。各ラインの数量を ProductAsset へ入庫（InventoryMovement type=receive）。 */
export async function receivePurchaseOrder(actor: Actor, poId: string): Promise<boolean> {
  const po = await prisma.purchaseOrder.findFirst({ where: { id: poId, tenantId: actor.tenantId }, include: { lines: true } });
  if (!po) return false;
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
  await prisma.purchaseOrder.update({ where: { id: poId }, data: { status: 'received', receivedAt: new Date() } });
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
