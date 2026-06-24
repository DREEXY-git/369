'use server';

import { redirect } from 'next/navigation';
import type { DomainEventType } from '@hokko/shared';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeAudit } from '@/lib/db';
import { emitGrowthEvent } from '@/lib/growth';
import { requireApprovalForDangerousAction } from '@/lib/approval';
import { applyInventoryMovement } from '@/lib/operations';

// ============ 発注先（Vendor）============

export async function createVendorAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'create')) redirect('/operations/vendors?denied=1');
  const name = String(formData.get('name') ?? '').trim();
  if (!name) redirect('/operations/vendors?error=name');
  await prisma.vendor.create({
    data: {
      tenantId: user.tenantId,
      name,
      contactName: String(formData.get('contactName') ?? '') || null,
      email: String(formData.get('email') ?? '') || null,
      phone: String(formData.get('phone') ?? '') || null,
      note: String(formData.get('note') ?? ''),
    },
  });
  await writeAudit({ tenantId: user.tenantId, actorId: user.userId, action: 'create', entityType: 'Vendor', summary: `発注先を登録: ${name}` });
  redirect('/operations/vendors?created=1');
}

// ============ 発注点ルール（ReorderRule）============

export async function createReorderRuleAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'create')) redirect('/operations/reorder?denied=1');
  const assetId = String(formData.get('assetId') ?? '');
  const asset = await prisma.productAsset.findFirst({ where: { id: assetId, tenantId: user.tenantId } });
  if (!asset) redirect('/operations/reorder?error=notfound');
  await prisma.reorderRule.create({
    data: {
      tenantId: user.tenantId,
      assetId,
      minQuantity: Math.max(0, Number(formData.get('minQuantity') ?? 0) || 0),
      reorderQuantity: Math.max(1, Number(formData.get('reorderQuantity') ?? 1) || 1),
      vendorId: String(formData.get('vendorId') ?? '') || null,
      active: true,
    },
  });
  redirect('/operations/reorder?created=1');
}

// ============ 発注書（PurchaseOrder）============

export async function createPurchaseOrderAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'create')) redirect('/operations/purchase-orders?denied=1');
  const vendorId = String(formData.get('vendorId') ?? '') || null;
  const assetId = String(formData.get('assetId') ?? '') || null;
  const assetName = String(formData.get('assetName') ?? '').trim();
  const quantity = Math.max(1, Number(formData.get('quantity') ?? 1) || 1);
  const unitPrice = Math.max(0, Number(formData.get('unitPrice') ?? 0) || 0);
  const asset = assetId ? await prisma.productAsset.findFirst({ where: { id: assetId, tenantId: user.tenantId } }) : null;
  const name = asset?.name ?? assetName ?? '商品';
  if (!asset && !assetName) redirect('/operations/purchase-orders/new?error=item');
  const amount = quantity * unitPrice;

  const po = await prisma.purchaseOrder.create({
    data: {
      tenantId: user.tenantId,
      vendorId,
      orderNo: `PO-${Date.now().toString().slice(-8)}`,
      status: 'draft',
      totalAmount: amount,
      createdById: user.userId,
      lines: { create: [{ tenantId: user.tenantId, assetId: asset?.id ?? null, assetName: name, quantity, unitPrice, amount }] },
    },
  });
  await writeAudit({ tenantId: user.tenantId, actorId: user.userId, action: 'create', entityType: 'PurchaseOrder', entityId: po.id, summary: `発注書を作成: ${po.orderNo}（${amount}円）` });
  await emitGrowthEvent({
    tenantId: user.tenantId,
    type: 'inventory.purchase_order.created',
    title: `発注書作成: ${po.orderNo}`,
    actorId: user.userId,
    entityType: 'PurchaseOrder',
    entityId: po.id,
    amount,
    alsoDomainEvent: { domainType: 'PURCHASE_ORDER_CREATED' as DomainEventType, aggregateType: 'PurchaseOrder', aggregateId: po.id },
  });
  redirect(`/operations/purchase-orders/${po.id}`);
}

/** 発注確定。高額（閾値以上）は承認申請（pending_approval）。少額は即 ordered。 */
export async function confirmPurchaseOrderAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'update')) redirect('/operations/purchase-orders?denied=1');
  const id = String(formData.get('purchaseOrderId') ?? '');
  const po = await prisma.purchaseOrder.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!po) redirect('/operations/purchase-orders');
  const amount = Number(po!.totalAmount);

  const gate = await requireApprovalForDangerousAction({
    tenantId: user.tenantId,
    action: 'purchase_order_issue',
    title: `発注確定: ${po!.orderNo}（${amount}円）`,
    targetType: 'PurchaseOrder',
    targetId: id,
    requestedById: user.userId,
    riskLevel: 'MEDIUM',
    amount,
    payloadAfter: { purchaseOrderId: id },
  });
  if (gate.requiresApproval) {
    await prisma.purchaseOrder.update({ where: { id }, data: { status: 'pending_approval', approvalId: gate.approvalId } });
    redirect(`/operations/purchase-orders/${id}?pending=1`);
  }
  await prisma.purchaseOrder.update({ where: { id }, data: { status: 'ordered' } });
  await emitGrowthEvent({
    tenantId: user.tenantId,
    type: 'inventory.purchase_order.created',
    title: `発注確定: ${po!.orderNo}`,
    actorId: user.userId,
    entityType: 'PurchaseOrder',
    entityId: id,
    amount,
    alsoDomainEvent: { domainType: 'PURCHASE_ORDER_APPROVED' as DomainEventType, aggregateType: 'PurchaseOrder', aggregateId: id },
  });
  redirect(`/operations/purchase-orders/${id}?ordered=1`);
}

/** 入庫処理。各ラインの数量を ProductAsset へ入庫（InventoryMovement type=receive）。 */
export async function receivePurchaseOrderAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'update')) redirect('/operations/purchase-orders?denied=1');
  const id = String(formData.get('purchaseOrderId') ?? '');
  const po = await prisma.purchaseOrder.findFirst({ where: { id, tenantId: user.tenantId }, include: { lines: true } });
  if (!po) redirect('/operations/purchase-orders');
  for (const l of po!.lines) {
    if (l.assetId) {
      await applyInventoryMovement({
        tenantId: user.tenantId,
        actorId: user.userId,
        assetId: l.assetId,
        type: 'receive',
        quantity: l.quantity,
        note: `発注入庫: ${po!.orderNo}`,
      });
    }
    await prisma.purchaseOrderLine.update({ where: { id: l.id }, data: { receivedQuantity: l.quantity } });
  }
  await prisma.purchaseOrder.update({ where: { id }, data: { status: 'received', receivedAt: new Date() } });
  await emitGrowthEvent({
    tenantId: user.tenantId,
    type: 'inventory.purchase_order.received',
    title: `入庫完了: ${po!.orderNo}`,
    actorId: user.userId,
    entityType: 'PurchaseOrder',
    entityId: id,
    alsoDomainEvent: { domainType: 'PURCHASE_ORDER_RECEIVED' as DomainEventType, aggregateType: 'PurchaseOrder', aggregateId: id },
  });
  redirect(`/operations/purchase-orders/${id}?received=1`);
}
