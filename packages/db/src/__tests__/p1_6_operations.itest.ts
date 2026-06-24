// Phase 1-6 統合テスト（要DB）: 在庫移動→ProductAsset更新→GrowthEvent / リース予約・重複 /
// イベント案件→割当→原価→粗利スナップショット / tenant分離 / 危険操作の承認必須。
import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '../client';
import {
  inventoryEffectOfMovement,
  growthTypeOfMovement,
  eventProfitMargin,
  hasReservationConflict,
  requiresApproval,
  type InventoryMovementType,
} from '@hokko/shared';

const T = `itest-p16-${Date.now()}`;
const T2 = `itest-p16b-${Date.now()}`;

// apps/web lib/operations.applyInventoryMovement と同等のDB効果（単一の真実源）。
async function applyMovement(
  tenantId: string,
  assetId: string,
  type: InventoryMovementType,
  opts: { quantity?: number } = {},
) {
  const asset = await prisma.productAsset.findFirstOrThrow({ where: { id: assetId, tenantId } });
  const effect = inventoryEffectOfMovement(type);
  const data: Record<string, unknown> = {};
  if (effect.status) data.status = effect.status;
  if (effect.condition) data.condition = effect.condition;
  if (effect.changesQuantity && type === 'receive') data.quantity = asset.quantity + (opts.quantity ?? 1);
  const updated =
    Object.keys(data).length > 0 ? await prisma.productAsset.update({ where: { id: assetId }, data }) : asset;
  const mv = await prisma.inventoryMovement.create({
    data: { tenantId, assetId, type, quantity: opts.quantity ?? 1, beforeStatus: asset.status, afterStatus: updated.status },
  });
  await prisma.growthEvent.create({
    data: { tenantId, type: growthTypeOfMovement(type), category: 'operations', title: type, entityType: 'InventoryMovement', entityId: mv.id },
  });
  return { mv, updated };
}

async function makeAsset(tenantId: string, name: string, quantity = 5) {
  const cat = await prisma.productCategory.create({ data: { tenantId, name: 'テスト機材' } });
  return prisma.productAsset.create({
    data: { tenantId, code: `C-${Math.random().toString(36).slice(2, 7)}`, name, categoryId: cat.id, quantity, status: 'available', condition: 'good' },
  });
}

afterAll(async () => {
  for (const tid of [T, T2]) {
    await prisma.inventoryMovement.deleteMany({ where: { tenantId: tid } });
    await prisma.leaseReservationLine.deleteMany({ where: { tenantId: tid } });
    await prisma.leaseReservation.deleteMany({ where: { tenantId: tid } });
    await prisma.eventGrossProfitSnapshot.deleteMany({ where: { tenantId: tid } });
    await prisma.eventCost.deleteMany({ where: { tenantId: tid } });
    await prisma.eventProductUsage.deleteMany({ where: { tenantId: tid } });
    await prisma.eventNextProposal.deleteMany({ where: { tenantId: tid } });
    await prisma.eventProject.deleteMany({ where: { tenantId: tid } });
    await prisma.damageLossRecord.deleteMany({ where: { tenantId: tid } });
    await prisma.assetProfitabilitySnapshot.deleteMany({ where: { tenantId: tid } });
    await prisma.productAsset.deleteMany({ where: { tenantId: tid } });
    await prisma.productCategory.deleteMany({ where: { tenantId: tid } });
    await prisma.growthEvent.deleteMany({ where: { tenantId: tid } });
  }
  await prisma.$disconnect();
});

describe('Inventory movement → ProductAsset → GrowthEvent', () => {
  it('receive increases quantity, records movement and operations growth event', async () => {
    const asset = await makeAsset(T, '受入テスト', 5);
    const { updated, mv } = await applyMovement(T, asset.id, 'receive', { quantity: 3 });
    expect(updated.quantity).toBe(8);
    expect(updated.status).toBe('available');
    expect(mv.afterStatus).toBe('available');
    const ge = await prisma.growthEvent.findFirst({ where: { tenantId: T, entityId: mv.id } });
    expect(ge?.type).toBe('inventory.stock.received');
    expect(ge?.category).toBe('operations');
  });

  it('dispatch sets status out, return sets it back to available', async () => {
    const asset = await makeAsset(T, '貸出テスト', 2);
    const d = await applyMovement(T, asset.id, 'dispatch');
    expect(d.updated.status).toBe('out');
    const r = await applyMovement(T, asset.id, 'return');
    expect(r.updated.status).toBe('available');
    const types = (await prisma.growthEvent.findMany({ where: { tenantId: T, entityType: 'InventoryMovement' } })).map((g) => g.type);
    expect(types).toContain('inventory.stock.dispatched');
    expect(types).toContain('inventory.stock.returned');
  });
});

describe('Lease reservation and conflict detection', () => {
  it('creates reservation, adds asset line, and detects stock-exceeding conflict', async () => {
    const asset = await makeAsset(T, 'テント', 2);
    const res = await prisma.leaseReservation.create({
      data: { tenantId: T, eventName: '夏祭り', status: 'reserved', startAt: new Date('2026-08-01'), endAt: new Date('2026-08-03') },
    });
    await prisma.leaseReservationLine.create({ data: { tenantId: T, reservationId: res.id, assetId: asset.id, quantity: 2 } });

    // 既存2件で在庫2を使い切っているため、重なる期間に+1は重複
    const existing = [{ assetId: asset.id, quantity: 2, startAt: res.startAt, endAt: res.endAt }];
    const conflict = hasReservationConflict(
      { assetId: asset.id, quantity: 1, startAt: new Date('2026-08-02'), endAt: new Date('2026-08-02') },
      existing,
      asset.quantity,
    );
    expect(conflict).toBe(true);
    // 重ならない期間なら衝突しない
    const noConflict = hasReservationConflict(
      { assetId: asset.id, quantity: 2, startAt: new Date('2026-09-01'), endAt: new Date('2026-09-02') },
      existing,
      asset.quantity,
    );
    expect(noConflict).toBe(false);
  });
});

describe('Event project profitability', () => {
  it('assigns asset, records cost, computes gross + snapshot + growth event', async () => {
    const asset = await makeAsset(T, 'ステージ', 1);
    const event = await prisma.eventProject.create({
      data: { tenantId: T, name: '周年式典', venue: 'ホール', status: 'planned', revenue: 1000000 },
    });
    await prisma.eventProductUsage.create({ data: { tenantId: T, eventId: event.id, assetId: asset.id, assetName: asset.name, quantity: 1 } });
    await prisma.eventCost.createMany({
      data: [
        { tenantId: T, eventId: event.id, category: '人件費', amount: 300000 },
        { tenantId: T, eventId: event.id, category: '機材', amount: 300000 },
      ],
    });

    const costs = await prisma.eventCost.findMany({ where: { tenantId: T, eventId: event.id } });
    const cost = costs.reduce((s, c) => s + Number(c.amount), 0);
    const revenue = 1000000;
    const gross = revenue - cost;
    const marginRate = eventProfitMargin(revenue, cost);
    expect(gross).toBe(400000);
    expect(marginRate).toBe(40);

    await prisma.eventProject.update({ where: { id: event.id }, data: { cost, gross } });
    const snap = await prisma.eventGrossProfitSnapshot.create({
      data: { tenantId: T, eventId: event.id, revenue, cost, gross, marginRate },
    });
    await prisma.growthEvent.create({
      data: { tenantId: T, type: 'event.profitability.recorded', category: 'operations', title: event.name, revenueImpact: gross, entityId: event.id },
    });

    expect(Number(snap.gross)).toBe(400000);
    const ge = await prisma.growthEvent.findFirst({ where: { tenantId: T, type: 'event.profitability.recorded', entityId: event.id } });
    expect(Number(ge?.revenueImpact)).toBe(400000);
  });
});

describe('tenant isolation', () => {
  it('does not leak assets/movements across tenants', async () => {
    const a2 = await makeAsset(T2, '別テナント資産', 1);
    await applyMovement(T2, a2.id, 'dispatch');
    const fromT = await prisma.inventoryMovement.findMany({ where: { tenantId: T, assetId: a2.id } });
    expect(fromT.length).toBe(0);
    const t2Assets = await prisma.productAsset.findMany({ where: { tenantId: T, name: '別テナント資産' } });
    expect(t2Assets.length).toBe(0);
  });
});

describe('dangerous operations require approval', () => {
  it('large inventory adjust and force release are gated', () => {
    expect(requiresApproval('inventory_adjust', { amount: 25 })).toBe(true);
    expect(requiresApproval('inventory_adjust', { amount: 2 })).toBe(false);
    expect(requiresApproval('inventory_force_release')).toBe(true);
  });
});
