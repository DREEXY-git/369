'use server';

import { redirect } from 'next/navigation';
import type { DomainEventType } from '@hokko/shared';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { isHumanUser } from '@hokko/shared';
import { prisma, writeAudit } from '@/lib/db';
import { emitGrowthEvent } from '@/lib/growth';
import { confirmPurchaseOrder, receivePurchaseOrder } from '@/lib/domains/operations/procurement';

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

/** 発注確定。業務ロジックは lib/domains/operations/procurement.ts。 */
export async function confirmPurchaseOrderAction(formData: FormData) {
  const user = await requireUser();
  // 発注確定は人間専用。role 由来 fail-closed（isHumanUser: AI_AGENT/AI_ASSISTANT を1つでも含む混在・
  // 空roles を拒否）。session の isAi boolean は User.isAiAgent 由来で role と整合制約がないため、
  // boolean 単独では判定しない（Codex PR#58 R3 P2-1 / R8）。
  if (!hasPermission(user, 'inventory', 'update') || user.isAi || !isHumanUser({ roles: user.roles })) redirect('/operations/purchase-orders?denied=1');
  const id = String(formData.get('purchaseOrderId') ?? '');
  const res = await confirmPurchaseOrder({ tenantId: user.tenantId, userId: user.userId, roles: user.roles, sessionIsAi: user.isAi }, id);
  if (res.forbidden) redirect('/operations/purchase-orders?denied=1');
  if (!res.found) redirect('/operations/purchase-orders');
  redirect(res.requiresApproval ? `/operations/purchase-orders/${id}?pending=1` : `/operations/purchase-orders/${id}?ordered=1`);
}

/** 入庫処理。業務ロジックは lib/domains/operations/procurement.ts。 */
export async function receivePurchaseOrderAction(formData: FormData) {
  const user = await requireUser();
  // 入庫も人間専用（role 由来 fail-closed・Codex PR#58 R3 P2-1 / R8）。
  if (!hasPermission(user, 'inventory', 'update') || user.isAi || !isHumanUser({ roles: user.roles })) redirect('/operations/purchase-orders?denied=1');
  const id = String(formData.get('purchaseOrderId') ?? '');
  const ok = await receivePurchaseOrder({ tenantId: user.tenantId, userId: user.userId, roles: user.roles, sessionIsAi: user.isAi }, id);
  redirect(ok ? `/operations/purchase-orders/${id}?received=1` : '/operations/purchase-orders');
}
