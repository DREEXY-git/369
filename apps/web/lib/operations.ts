// Operations OS（在庫/リース/イベント会社）の共通処理。Phase 1-6。
// 在庫移動を単一の真実源として ProductAsset を更新し、Audit / DomainEvent / GrowthEvent に接続する。
import { prisma, writeAudit } from './db';
import type { Prisma } from '@hokko/db';
import { emitGrowthEvent, type EmitGrowthInput } from './growth';
import { toNumber } from './utils';
import {
  inventoryEffectOfMovement,
  growthTypeOfMovement,
  eventProfitMargin,
  reorderSuggestion,
  INVENTORY_MOVEMENT_LABEL,
  type InventoryMovementType,
  type DomainEventType,
} from '@hokko/shared';

// ============ 在庫移動の適用 ============

export interface ApplyMovementInput {
  tenantId: string;
  actorId?: string | null;
  assetId: string;
  type: InventoryMovementType;
  quantity?: number;
  fromLocationId?: string | null;
  toLocationId?: string | null;
  reservationId?: string | null;
  eventId?: string | null;
  note?: string;
  /** adjust 用: 設定する絶対数量。 */
  setQuantity?: number;
}

/**
 * 在庫移動の書き込み実体（transaction 合成可能版・P3-INV-2）。呼び出し側の `$transaction` に参加でき、
 * 予約ライン等の業務レコードと InventoryMovement / ProductAsset 更新 / 監査を all-or-nothing で確定できる。
 * 対象 ProductAsset 行を FOR UPDATE でロックし、**ロック取得後に同 tx で資産を再読取**してから
 * 数量更新・移動台帳・監査を書く（receive/adjust の read-modify-write を lost update から守る）。
 * Growth/DomainEvent は行わない — caller が commit 後 emit するか、同 tx 内で outbox 行を直接作成すること。
 */
export async function applyInventoryMovementTx(tx: Prisma.TransactionClient, input: ApplyMovementInput) {
  const effect = inventoryEffectOfMovement(input.type);
  const qty = Math.max(0, input.quantity ?? 1);

  const locked = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM "ProductAsset" WHERE id = ${input.assetId} AND "tenantId" = ${input.tenantId} FOR UPDATE`;
  if (locked.length === 0) throw new Error('asset not found');
  const asset = await tx.productAsset.findFirst({ where: { id: input.assetId, tenantId: input.tenantId } });
  if (!asset) throw new Error('asset not found');

  const beforeStatus = asset.status;
  const data: Record<string, unknown> = {};
  if (effect.status) data.status = effect.status;
  if (effect.condition) data.condition = effect.condition;
  if (effect.setsLocation && input.toLocationId) data.locationId = input.toLocationId;
  if (effect.changesQuantity) {
    if (input.type === 'receive') data.quantity = asset.quantity + qty;
    else if (input.type === 'adjust') data.quantity = Math.max(0, input.setQuantity ?? asset.quantity);
  }
  if (input.type === 'dispatch') {
    data.usageCount = asset.usageCount + 1;
    data.lastUsedAt = new Date();
  }

  const updated =
    Object.keys(data).length > 0
      ? await tx.productAsset.update({ where: { id: asset.id }, data })
      : asset;

  const movement = await tx.inventoryMovement.create({
    data: {
      tenantId: input.tenantId,
      assetId: asset.id,
      type: input.type,
      quantity: qty,
      fromLocationId: input.fromLocationId ?? asset.locationId ?? null,
      toLocationId: input.toLocationId ?? null,
      reservationId: input.reservationId ?? null,
      eventId: input.eventId ?? null,
      beforeStatus,
      afterStatus: updated.status,
      note: input.note ?? '',
      actorId: input.actorId ?? null,
    },
  });

  await tx.auditLog.create({
    data: {
      tenantId: input.tenantId,
      actorId: input.actorId ?? null,
      actorType: 'user',
      action: 'inventory_movement',
      entityType: 'InventoryMovement',
      entityId: movement.id,
      summary: `${INVENTORY_MOVEMENT_LABEL[input.type]}: ${asset.name}（${beforeStatus}→${updated.status}）`,
    },
  });

  return { movement, updated, asset, beforeStatus };
}

/**
 * 在庫移動を適用する。InventoryMovement を記録し ProductAsset を更新、
 * Audit ＋ DomainEvent（INVENTORY_MOVEMENT_CREATED / STATUS_CHANGED）＋ GrowthEvent を発火する。
 * ProductAsset の status/condition/locationId/quantity を一元更新（単一の真実源）。
 */
export async function applyInventoryMovement(input: ApplyMovementInput) {
  const qty = Math.max(0, input.quantity ?? 1);

  // 原子性＋並列直列化（在庫破損の根絶）: 対象 ProductAsset 行を FOR UPDATE でロックし、資産読取・
  // 数量更新・移動台帳・監査を単一 $transaction で確定する。receive の quantity=asset.quantity+qty は
  // read-modify-write のため、行ロックが無いと同一資産への並行入庫で lost update（在庫数破損）を起こす。
  const { movement, updated, asset, beforeStatus } = await prisma.$transaction((tx) =>
    applyInventoryMovementTx(tx, input),
  );

  // growth event（成果可視化・非クリティカル）は commit 後に emit（失敗しても在庫確定は済み）。
  const statusChanged = beforeStatus !== updated.status;
  await emitGrowthEvent({
    tenantId: input.tenantId,
    type: growthTypeOfMovement(input.type),
    title: `${INVENTORY_MOVEMENT_LABEL[input.type]}: ${asset.name}`,
    description: input.note ?? '',
    actorId: input.actorId,
    entityType: 'InventoryMovement',
    entityId: movement.id,
    metric: { assetId: asset.id, quantity: qty, beforeStatus, afterStatus: updated.status },
    alsoDomainEvent: {
      domainType: (statusChanged ? 'INVENTORY_STATUS_CHANGED' : 'INVENTORY_MOVEMENT_CREATED') as DomainEventType,
      aggregateType: 'ProductAsset',
      aggregateId: asset.id,
    },
  });

  return { movement, asset: updated };
}

/** Operations 系の成長イベントを記録（emitGrowthEvent の薄いラッパ）。 */
export async function emitOperationsGrowthEvent(input: EmitGrowthInput) {
  return emitGrowthEvent(input);
}

// ============ 発注候補の抽出（ReorderRule × 在庫） ============

/** 有効な発注点ルールのうち、在庫が発注点以下のものを発注候補として返す。 */
export async function reorderCandidates(tenantId: string) {
  const rules = await prisma.reorderRule.findMany({
    where: { tenantId, active: true },
    include: { asset: true, vendor: true },
  });
  return rules
    .map((r) => {
      const s = reorderSuggestion({
        quantity: r.asset.quantity,
        minQuantity: r.minQuantity,
        reorderQuantity: r.reorderQuantity,
        active: r.active,
      });
      return { rule: r, asset: r.asset, vendor: r.vendor, ...s };
    })
    .filter((c) => c.needsReorder);
}

// ============ イベント案件の粗利スナップショット ============

/**
 * イベント案件の売上・原価・粗利を確定し EventGrossProfitSnapshot を作成。
 * EventProject.gross を更新し、GrowthEvent(event.profitability.recorded)＋DomainEvent を発火。
 */
export async function recordEventProfitabilitySnapshot(input: {
  tenantId: string;
  eventId: string;
  actorId?: string | null;
}) {
  const event = await prisma.eventProject.findFirst({
    where: { id: input.eventId, tenantId: input.tenantId },
    include: { costs: true },
  });
  if (!event) throw new Error('event not found');

  const revenue = toNumber(event.revenue);
  const costFromLines = event.costs.reduce((s, c) => s + toNumber(c.amount), 0);
  const cost = Math.max(toNumber(event.cost), costFromLines);
  const gross = revenue - cost;
  const marginRate = eventProfitMargin(revenue, cost);

  await prisma.eventProject.update({ where: { id: event.id }, data: { cost, gross } });
  const snap = await prisma.eventGrossProfitSnapshot.create({
    data: { tenantId: input.tenantId, eventId: event.id, revenue, cost, gross, marginRate },
  });

  await writeAudit({
    tenantId: input.tenantId,
    actorId: input.actorId,
    action: 'event_profitability',
    entityType: 'EventProject',
    entityId: event.id,
    summary: `案件粗利を記録: ${event.name}（売上${revenue} / 原価${cost} / 粗利${gross} / 率${marginRate}%）`,
  });

  await emitGrowthEvent({
    tenantId: input.tenantId,
    type: 'event.profitability.recorded',
    title: `案件粗利: ${event.name}`,
    actorId: input.actorId,
    entityType: 'EventProject',
    entityId: event.id,
    amount: revenue,
    revenueImpact: gross,
    metric: { marginRate, cost },
    alsoDomainEvent: {
      domainType: 'EVENT_PROFITABILITY_RECORDED' as DomainEventType,
      aggregateType: 'EventProject',
      aggregateId: event.id,
    },
  });

  return { snapshot: snap, revenue, cost, gross, marginRate };
}

// ============ ダッシュボード集計 ============

export interface OperationsDashboardSummary {
  assetCount: number;
  available: number;
  reserved: number;
  out: number;
  maintenance: number;
  broken: number;
  totalAcquisitionValue: number;
  cumulativeRevenue: number;
  cumulativeGross: number;
  avgUtilization: number;
  idleAssets: number;
  reservationsThisMonth: number;
  eventsThisMonth: number;
  eventGrossTotal: number;
  // Phase 1-7
  stocktakesInProgress: number;
  stocktakeDiffLines: number;
  reorderCandidates: number;
  purchaseOrdersPending: number;
  logisticsOpen: number;
  logisticsThisWeek: number;
  highRisks: number;
  eventsWithoutStaff: number;
  movementsThisMonth: number;
}

/** Operations ダッシュボードの集計（在庫状態・稼働・案件粗利・棚卸/発注/物流/リスク）。 */
export async function summarizeOperationsDashboard(tenantId: string): Promise<OperationsDashboardSummary> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const weekAhead = new Date(Date.now() + 7 * 86_400_000);

  const [
    assets,
    reservationsThisMonth,
    events,
    stocktakesInProgress,
    stocktakeDiffLines,
    candidates,
    purchaseOrdersPending,
    logisticsOpen,
    logisticsThisWeek,
    highRisks,
    eventsWithoutStaff,
    movementsThisMonth,
  ] = await Promise.all([
    prisma.productAsset.findMany({ where: { tenantId } }),
    prisma.leaseReservation.count({ where: { tenantId, startAt: { gte: monthStart } } }),
    prisma.eventProject.findMany({ where: { tenantId } }),
    prisma.stocktake.count({ where: { tenantId, status: { in: ['draft', 'counted'] } } }),
    prisma.stocktakeLine.count({ where: { tenantId, reconciled: false, difference: { not: 0 } } }),
    reorderCandidates(tenantId),
    prisma.purchaseOrder.count({ where: { tenantId, status: 'pending_approval' } }),
    prisma.logisticsTask.count({ where: { tenantId, status: { in: ['todo', 'in_progress', 'blocked'] } } }),
    prisma.logisticsTask.count({ where: { tenantId, status: { not: 'done' }, scheduledAt: { gte: new Date(), lte: weekAhead } } }),
    prisma.eventRisk.count({ where: { tenantId, status: { not: 'resolved' }, severity: { in: ['high', 'critical'] } } }),
    prisma.eventProject.count({ where: { tenantId, status: { notIn: ['completed', 'cancelled'] }, staffAssignments: { none: {} } } }),
    prisma.inventoryMovement.count({ where: { tenantId, occurredAt: { gte: monthStart } } }),
  ]);

  const countStatus = (s: string) => assets.filter((a) => a.status === s).length;
  const avgUtilization =
    assets.length > 0 ? Math.round(assets.reduce((s, a) => s + toNumber(a.utilizationRate), 0) / assets.length) : 0;
  const eventsThisMonth = events.filter((e) => e.eventDate && e.eventDate >= monthStart).length;

  return {
    assetCount: assets.length,
    available: countStatus('available'),
    reserved: countStatus('reserved'),
    out: countStatus('out'),
    maintenance: countStatus('maintenance'),
    broken: assets.filter((a) => a.condition === 'broken').length,
    totalAcquisitionValue: assets.reduce((s, a) => s + toNumber(a.acquisitionCost), 0),
    cumulativeRevenue: assets.reduce((s, a) => s + toNumber(a.cumulativeRevenue), 0),
    cumulativeGross: assets.reduce((s, a) => s + toNumber(a.cumulativeGross), 0),
    avgUtilization,
    idleAssets: assets.filter((a) => toNumber(a.utilizationRate) < 30).length,
    reservationsThisMonth,
    eventsThisMonth,
    eventGrossTotal: events.reduce((s, e) => s + toNumber(e.gross), 0),
    stocktakesInProgress,
    stocktakeDiffLines,
    reorderCandidates: candidates.length,
    purchaseOrdersPending,
    logisticsOpen,
    logisticsThisWeek,
    highRisks,
    eventsWithoutStaff,
    movementsThisMonth,
  };
}
