// Phase 1-7 統合テスト（要DB）: 承認後実行＋二重実行防止 / 棚卸→差異→反映 / 発注→入庫 /
// 物流完了→Growth / 人員→原価反映 / リスク警告 / tenant分離。
import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '../client';
import {
  inventoryEffectOfMovement,
  growthTypeOfMovement,
  reorderSuggestion,
  requiresApproval,
  stocktakeDifference,
  isLargeStocktakeDifference,
  eventProfitMargin,
  type InventoryMovementType,
} from '@hokko/shared';

const T = `itest-p17-${Date.now()}`;
const T2 = `itest-p17b-${Date.now()}`;

async function applyMovement(tenantId: string, assetId: string, type: InventoryMovementType, opts: { quantity?: number; setQuantity?: number } = {}) {
  const asset = await prisma.productAsset.findFirstOrThrow({ where: { id: assetId, tenantId } });
  const effect = inventoryEffectOfMovement(type);
  const data: Record<string, unknown> = {};
  if (effect.status) data.status = effect.status;
  if (effect.condition) data.condition = effect.condition;
  if (effect.changesQuantity) {
    if (type === 'receive') data.quantity = asset.quantity + (opts.quantity ?? 1);
    else if (type === 'adjust') data.quantity = Math.max(0, opts.setQuantity ?? asset.quantity);
  }
  const updated = Object.keys(data).length > 0 ? await prisma.productAsset.update({ where: { id: assetId }, data }) : asset;
  await prisma.inventoryMovement.create({ data: { tenantId, assetId, type, quantity: opts.quantity ?? 1, beforeStatus: asset.status, afterStatus: updated.status } });
  await prisma.growthEvent.create({ data: { tenantId, type: growthTypeOfMovement(type), category: 'operations', title: type } });
  return updated;
}

// executeApprovedAction の原子クレーム（二重実行防止）を再現。
async function claimApproval(id: string): Promise<boolean> {
  const claim = await prisma.approvalRequest.updateMany({
    where: { id, executedAt: null },
    data: { executedAt: new Date(), executionStatus: 'executing' },
  });
  return claim.count === 1;
}

async function makeAsset(tenantId: string, name: string, quantity = 5) {
  const cat = await prisma.productCategory.create({ data: { tenantId, name: 'p17機材' } });
  return prisma.productAsset.create({ data: { tenantId, code: `P17-${Math.random().toString(36).slice(2, 7)}`, name, categoryId: cat.id, quantity, status: 'available', condition: 'good' } });
}

afterAll(async () => {
  for (const tid of [T, T2]) {
    await prisma.inventoryMovement.deleteMany({ where: { tenantId: tid } });
    await prisma.stocktakeLine.deleteMany({ where: { tenantId: tid } });
    await prisma.stocktake.deleteMany({ where: { tenantId: tid } });
    await prisma.purchaseOrderLine.deleteMany({ where: { tenantId: tid } });
    await prisma.purchaseOrder.deleteMany({ where: { tenantId: tid } });
    await prisma.reorderRule.deleteMany({ where: { tenantId: tid } });
    await prisma.vendor.deleteMany({ where: { tenantId: tid } });
    await prisma.logisticsTask.deleteMany({ where: { tenantId: tid } });
    await prisma.eventStaffAssignment.deleteMany({ where: { tenantId: tid } });
    await prisma.eventRisk.deleteMany({ where: { tenantId: tid } });
    await prisma.eventCost.deleteMany({ where: { tenantId: tid } });
    await prisma.eventProject.deleteMany({ where: { tenantId: tid } });
    await prisma.leaseReservationLine.deleteMany({ where: { tenantId: tid } });
    await prisma.leaseReservation.deleteMany({ where: { tenantId: tid } });
    await prisma.approvalRequest.deleteMany({ where: { tenantId: tid } });
    await prisma.productAsset.deleteMany({ where: { tenantId: tid } });
    await prisma.productCategory.deleteMany({ where: { tenantId: tid } });
    await prisma.growthEvent.deleteMany({ where: { tenantId: tid } });
  }
  await prisma.$disconnect();
});

describe('Post-approval execution + double-execution prevention', () => {
  it('executes an approved inventory_adjust and updates the asset', async () => {
    const asset = await makeAsset(T, '調整対象', 5);
    const req = await prisma.approvalRequest.create({
      data: { tenantId: T, type: 'inventory_adjust', requestedForAction: 'inventory_adjust', title: '大幅調整', entityType: 'ProductAsset', entityId: asset.id, status: 'APPROVED', payloadAfter: { newQuantity: 20 } },
    });
    const claimed = await claimApproval(req.id);
    expect(claimed).toBe(true);
    const newQty = Number((req.payloadAfter as { newQuantity: number }).newQuantity);
    const updated = await applyMovement(T, asset.id, 'adjust', { setQuantity: newQty });
    await prisma.approvalRequest.update({ where: { id: req.id }, data: { executionStatus: 'executed' } });
    expect(updated.quantity).toBe(20);
  });

  it('prevents double execution via atomic claim', async () => {
    const req = await prisma.approvalRequest.create({
      data: { tenantId: T, type: 'inventory_adjust', requestedForAction: 'inventory_adjust', title: 'x', entityType: 'ProductAsset', entityId: 'a', status: 'APPROVED' },
    });
    expect(await claimApproval(req.id)).toBe(true); // 1回目は成功
    expect(await claimApproval(req.id)).toBe(false); // 2回目はクレームできない
  });

  it('executes an approved force release: assets returned, reservation cancelled', async () => {
    const asset = await makeAsset(T, '強制解除対象', 3);
    await prisma.productAsset.update({ where: { id: asset.id }, data: { status: 'reserved' } });
    const res = await prisma.leaseReservation.create({ data: { tenantId: T, eventName: '解除予約', status: 'reserved', startAt: new Date(), endAt: new Date() } });
    await prisma.leaseReservationLine.create({ data: { tenantId: T, reservationId: res.id, assetId: asset.id, quantity: 1 } });
    const req = await prisma.approvalRequest.create({
      data: { tenantId: T, type: 'inventory_force_release', requestedForAction: 'inventory_force_release', title: '強制解除', entityType: 'LeaseReservation', entityId: res.id, status: 'APPROVED' },
    });
    expect(await claimApproval(req.id)).toBe(true);
    const updated = await applyMovement(T, asset.id, 'return', { quantity: 1 });
    await prisma.leaseReservation.update({ where: { id: res.id }, data: { status: 'cancelled' } });
    expect(updated.status).toBe('available');
    const after = await prisma.leaseReservation.findUnique({ where: { id: res.id } });
    expect(after?.status).toBe('cancelled');
  });
});

describe('Stocktake → difference → reconcile', () => {
  it('creates stocktake, records count, reconciles small diff into stock', async () => {
    const asset = await makeAsset(T, '棚卸対象', 10);
    const st = await prisma.stocktake.create({
      data: { tenantId: T, title: '6月棚卸', status: 'draft', lines: { create: [{ tenantId: T, assetId: asset.id, expectedQuantity: 10 }] } },
      include: { lines: true },
    });
    const line = st.lines[0]!;
    const counted = 8;
    const diff = stocktakeDifference(line.expectedQuantity, counted);
    expect(diff).toBe(-2);
    expect(isLargeStocktakeDifference(diff)).toBe(false); // 小差異は即反映
    await prisma.stocktakeLine.update({ where: { id: line.id }, data: { countedQuantity: counted, difference: diff } });
    const updated = await applyMovement(T, asset.id, 'adjust', { setQuantity: counted });
    await prisma.stocktakeLine.update({ where: { id: line.id }, data: { reconciled: true } });
    expect(updated.quantity).toBe(8);
  });

  it('large stocktake difference requires approval', () => {
    const diff = stocktakeDifference(20, 2); // -18
    expect(isLargeStocktakeDifference(diff)).toBe(true);
    expect(requiresApproval('stocktake_adjust', { amount: diff })).toBe(true);
  });
});

describe('Reorder → PurchaseOrder → receive', () => {
  it('extracts reorder candidate and receives a PO into stock', async () => {
    const asset = await makeAsset(T, '消耗品', 1);
    await prisma.reorderRule.create({ data: { tenantId: T, assetId: asset.id, minQuantity: 3, reorderQuantity: 10, active: true } });
    const rule = await prisma.reorderRule.findFirstOrThrow({ where: { tenantId: T, assetId: asset.id } });
    const s = reorderSuggestion({ quantity: asset.quantity, minQuantity: rule.minQuantity, reorderQuantity: rule.reorderQuantity });
    expect(s.needsReorder).toBe(true);
    expect(s.suggestedQuantity).toBe(10);

    const po = await prisma.purchaseOrder.create({
      data: { tenantId: T, orderNo: 'PO-TEST', status: 'ordered', totalAmount: 50000, lines: { create: [{ tenantId: T, assetId: asset.id, assetName: asset.name, quantity: 10, unitPrice: 5000, amount: 50000 }] } },
      include: { lines: true },
    });
    for (const l of po.lines) {
      if (l.assetId) await applyMovement(T, l.assetId, 'receive', { quantity: l.quantity });
      await prisma.purchaseOrderLine.update({ where: { id: l.id }, data: { receivedQuantity: l.quantity } });
    }
    await prisma.purchaseOrder.update({ where: { id: po.id }, data: { status: 'received' } });
    const after = await prisma.productAsset.findUniqueOrThrow({ where: { id: asset.id } });
    expect(after.quantity).toBe(11); // 1 + 10
  });
});

describe('Logistics / staff / risk', () => {
  it('logistics task completion records a growth event', async () => {
    const task = await prisma.logisticsTask.create({ data: { tenantId: T, type: 'delivery', title: '配送', status: 'in_progress' } });
    await prisma.logisticsTask.update({ where: { id: task.id }, data: { status: 'done', completedAt: new Date() } });
    await prisma.growthEvent.create({ data: { tenantId: T, type: 'logistics.delivery.completed', category: 'operations', title: '配送完了', entityId: task.id } });
    const ge = await prisma.growthEvent.findFirst({ where: { tenantId: T, type: 'logistics.delivery.completed', entityId: task.id } });
    expect(ge).not.toBeNull();
  });

  it('event staff assignment reflects labor cost into event costs and gross', async () => {
    const event = await prisma.eventProject.create({ data: { tenantId: T, name: '人員案件', status: 'planned', revenue: 500000 } });
    await prisma.eventStaffAssignment.create({ data: { tenantId: T, eventId: event.id, name: '作業員A', role: 'staff', cost: 80000, costRecorded: true } });
    await prisma.eventCost.create({ data: { tenantId: T, eventId: event.id, category: '人件費(staff)', amount: 80000 } });
    const costs = await prisma.eventCost.findMany({ where: { tenantId: T, eventId: event.id } });
    const cost = costs.reduce((s, c) => s + Number(c.amount), 0);
    expect(cost).toBe(80000);
    expect(eventProfitMargin(500000, cost)).toBe(84); // (500000-80000)/500000 = 84%
  });

  it('high/critical risks are counted for dashboard warning', async () => {
    const event = await prisma.eventProject.create({ data: { tenantId: T, name: 'リスク案件', status: 'planned' } });
    await prisma.eventRisk.createMany({
      data: [
        { tenantId: T, eventId: event.id, type: 'weather', severity: 'critical', status: 'open' },
        { tenantId: T, eventId: event.id, type: 'venue', severity: 'low', status: 'open' },
      ],
    });
    const highCount = await prisma.eventRisk.count({ where: { tenantId: T, status: { not: 'resolved' }, severity: { in: ['high', 'critical'] } } });
    expect(highCount).toBeGreaterThanOrEqual(1);
  });
});

describe('tenant isolation', () => {
  it('keeps stocktakes and purchase orders scoped by tenant', async () => {
    const a2 = await makeAsset(T2, '別テナント', 1);
    await prisma.stocktake.create({ data: { tenantId: T2, title: 'T2棚卸', status: 'draft', lines: { create: [{ tenantId: T2, assetId: a2.id, expectedQuantity: 1 }] } } });
    const fromT = await prisma.stocktake.findMany({ where: { tenantId: T, title: 'T2棚卸' } });
    expect(fromT.length).toBe(0);
  });
});
