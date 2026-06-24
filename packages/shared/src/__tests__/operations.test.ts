import { describe, it, expect } from 'vitest';
import {
  inventoryUtilizationRate,
  rentalAvailabilityStatus,
  eventProfitMargin,
  salesGrossProfitRate,
  isOperationalGrowthEvent,
  classifyOperationCategory,
  inventoryEffectOfMovement,
  growthTypeOfMovement,
  isInventoryMovementType,
  isLargeInventoryAdjustment,
  INVENTORY_MOVEMENT_TYPES,
  stocktakeDifference,
  isLargeStocktakeDifference,
  reorderSuggestion,
  canTransitionLogistics,
  growthTypeOfLogisticsCompletion,
  isLogisticsTaskType,
  eventStaffCost,
  isHighSeverityRisk,
  riskSeverityRank,
} from '../operations';
import { growthCategoryOf, isGrowthEventType, isRevenueRelated } from '../growth';
import { requiresApproval, canExecuteApproval } from '../approval';

describe('operations metrics', () => {
  it('computes inventory utilization rate with clamp and zero-guard', () => {
    expect(inventoryUtilizationRate(15, 30)).toBe(50);
    expect(inventoryUtilizationRate(40, 30)).toBe(100); // clamp
    expect(inventoryUtilizationRate(5, 0)).toBe(0); // zero-guard
    expect(inventoryUtilizationRate(-5, 30)).toBe(0); // negative used
  });

  it('determines rental availability status', () => {
    expect(rentalAvailabilityStatus({ totalQuantity: 10, reservedQuantity: 0 })).toBe('available');
    expect(rentalAvailabilityStatus({ totalQuantity: 10, reservedQuantity: 9 })).toBe('limited'); // 1/10 <= 20%
    expect(rentalAvailabilityStatus({ totalQuantity: 10, reservedQuantity: 10 })).toBe('unavailable');
    expect(rentalAvailabilityStatus({ totalQuantity: 10, reservedQuantity: 5, maintenanceQuantity: 5 })).toBe(
      'unavailable',
    );
  });

  it('computes event profit margin and sales gross profit rate', () => {
    expect(eventProfitMargin(1000000, 600000)).toBe(40);
    expect(eventProfitMargin(0, 100)).toBe(0);
    expect(salesGrossProfitRate(200000, 120000)).toBe(40);
    expect(salesGrossProfitRate(0, 0)).toBe(0);
  });
});

describe('operational growth classification', () => {
  it('flags operational event types', () => {
    expect(isOperationalGrowthEvent('inventory.stock.received')).toBe(true);
    expect(isOperationalGrowthEvent('rental.reservation.created')).toBe(true);
    expect(isOperationalGrowthEvent('event.project.completed')).toBe(true);
    expect(isOperationalGrowthEvent('logistics.delivery.completed')).toBe(true);
    expect(isOperationalGrowthEvent('sales.deal.won')).toBe(false);
    expect(isOperationalGrowthEvent('marketing.campaign.created')).toBe(false);
  });

  it('maps types to operation categories', () => {
    expect(classifyOperationCategory('inventory.stock.adjusted')).toBe('inventory');
    expect(classifyOperationCategory('rental.asset.damaged')).toBe('rental');
    expect(classifyOperationCategory('event.proposal.created')).toBe('event');
    expect(classifyOperationCategory('sales.order.fulfilled')).toBe('sales');
    expect(classifyOperationCategory('logistics.delivery.completed')).toBe('logistics');
    expect(classifyOperationCategory('management.decision.recorded')).toBe('other');
  });
});

describe('growth integration with new operational types', () => {
  it('recognizes new growth event types', () => {
    expect(isGrowthEventType('inventory.stock.received')).toBe(true);
    expect(isGrowthEventType('rental.reservation.returned')).toBe(true);
    expect(isGrowthEventType('event.project.created')).toBe(true);
    expect(isGrowthEventType('sales.order.created')).toBe(true);
  });

  it('maps operational heads to the operations category', () => {
    expect(growthCategoryOf('inventory.stock.received')).toBe('operations');
    expect(growthCategoryOf('rental.reservation.created')).toBe('operations');
    expect(growthCategoryOf('event.project.completed')).toBe('operations');
    expect(growthCategoryOf('logistics.delivery.completed')).toBe('operations');
    // sales stays in sales, not operations
    expect(growthCategoryOf('sales.order.fulfilled')).toBe('sales');
  });

  it('counts sales.order.fulfilled as revenue-related', () => {
    expect(isRevenueRelated('sales.order.fulfilled')).toBe(true);
    expect(isRevenueRelated('sales.order.created')).toBe(false);
  });
});

describe('inventory movement pure logic', () => {
  it('maps movement type to ProductAsset effect (single source of truth)', () => {
    expect(inventoryEffectOfMovement('receive')).toEqual({ status: 'available', changesQuantity: true });
    expect(inventoryEffectOfMovement('reserve')).toEqual({ status: 'reserved' });
    expect(inventoryEffectOfMovement('dispatch')).toEqual({ status: 'out' });
    expect(inventoryEffectOfMovement('return')).toEqual({ status: 'available' });
    expect(inventoryEffectOfMovement('damage')).toEqual({ status: 'maintenance', condition: 'broken' });
    expect(inventoryEffectOfMovement('maintenance_start')).toEqual({ status: 'maintenance', condition: 'repair' });
    expect(inventoryEffectOfMovement('maintenance_complete')).toEqual({ status: 'available', condition: 'good' });
    expect(inventoryEffectOfMovement('move')).toEqual({ setsLocation: true });
    expect(inventoryEffectOfMovement('adjust')).toEqual({ changesQuantity: true });
  });

  it('maps movement type to growth event type (all are valid + operational)', () => {
    for (const t of INVENTORY_MOVEMENT_TYPES) {
      const g = growthTypeOfMovement(t);
      expect(isGrowthEventType(g)).toBe(true);
      expect(growthCategoryOf(g)).toBe('operations');
    }
  });

  it('validates movement type strings', () => {
    expect(isInventoryMovementType('dispatch')).toBe(true);
    expect(isInventoryMovementType('teleport')).toBe(false);
  });

  it('flags large inventory adjustments (>= threshold)', () => {
    expect(isLargeInventoryAdjustment(10)).toBe(true);
    expect(isLargeInventoryAdjustment(-15)).toBe(true);
    expect(isLargeInventoryAdjustment(3)).toBe(false);
  });
});

describe('operations dangerous operations require approval', () => {
  it('inventory_adjust needs approval only above threshold', () => {
    expect(requiresApproval('inventory_adjust', { amount: 20 })).toBe(true);
    expect(requiresApproval('inventory_adjust', { amount: -12 })).toBe(true);
    expect(requiresApproval('inventory_adjust', { amount: 3 })).toBe(false);
  });
  it('inventory_force_release and damage_charge_finalize always need approval', () => {
    expect(requiresApproval('inventory_force_release')).toBe(true);
    expect(requiresApproval('damage_charge_finalize')).toBe(true);
  });
});

describe('Phase 1-7 — stocktake / reorder / logistics / staff / risk', () => {
  it('computes stocktake difference and flags large diffs', () => {
    expect(stocktakeDifference(10, 7)).toBe(-3);
    expect(stocktakeDifference(5, 9)).toBe(4);
    expect(isLargeStocktakeDifference(-12)).toBe(true);
    expect(isLargeStocktakeDifference(4)).toBe(false);
  });

  it('suggests reorder when stock at or below min', () => {
    expect(reorderSuggestion({ quantity: 2, minQuantity: 3, reorderQuantity: 5 })).toEqual({ needsReorder: true, suggestedQuantity: 5, shortBy: 1 });
    expect(reorderSuggestion({ quantity: 3, minQuantity: 3, reorderQuantity: 5 }).needsReorder).toBe(true);
    expect(reorderSuggestion({ quantity: 9, minQuantity: 3, reorderQuantity: 5 }).needsReorder).toBe(false);
    expect(reorderSuggestion({ quantity: 0, minQuantity: 3, reorderQuantity: 5, active: false }).needsReorder).toBe(false);
  });

  it('validates logistics status transitions (done is terminal)', () => {
    expect(canTransitionLogistics('todo', 'in_progress')).toBe(true);
    expect(canTransitionLogistics('in_progress', 'done')).toBe(true);
    expect(canTransitionLogistics('done', 'todo')).toBe(false);
    expect(canTransitionLogistics('todo', 'todo')).toBe(false);
    expect(canTransitionLogistics('blocked', 'done')).toBe(false);
  });

  it('maps logistics completion to valid operations growth types', () => {
    expect(isLogisticsTaskType('delivery')).toBe(true);
    expect(isLogisticsTaskType('teleport')).toBe(false);
    for (const t of ['delivery', 'setup', 'teardown', 'pickup'] as const) {
      const g = growthTypeOfLogisticsCompletion(t);
      expect(isGrowthEventType(g)).toBe(true);
      expect(growthCategoryOf(g)).toBe('operations');
    }
  });

  it('sums event staff cost and ranks risk severity', () => {
    expect(eventStaffCost([{ cost: 10000 }, { cost: 5000 }, { cost: -3 }])).toBe(15000);
    expect(riskSeverityRank('critical')).toBeGreaterThan(riskSeverityRank('high'));
    expect(isHighSeverityRisk('high')).toBe(true);
    expect(isHighSeverityRisk('critical')).toBe(true);
    expect(isHighSeverityRisk('medium')).toBe(false);
  });
});

describe('Phase 1-7 — approval thresholds and post-approval execution', () => {
  it('purchase_order_issue and stocktake_adjust need approval above thresholds', () => {
    expect(requiresApproval('purchase_order_issue', { amount: 150000 })).toBe(true);
    expect(requiresApproval('purchase_order_issue', { amount: 50000 })).toBe(false);
    expect(requiresApproval('stocktake_adjust', { amount: 20 })).toBe(true);
    expect(requiresApproval('stocktake_adjust', { amount: 3 })).toBe(false);
  });

  it('canExecuteApproval guards status / double-execution / expiry', () => {
    const now = new Date('2026-06-24T00:00:00Z');
    expect(canExecuteApproval({ status: 'APPROVED', executedAt: null }, now)).toEqual({ ok: true, reason: 'ok' });
    expect(canExecuteApproval({ status: 'PENDING' }, now).reason).toBe('not-approved');
    expect(canExecuteApproval({ status: 'APPROVED', executedAt: new Date('2026-06-23') }, now).reason).toBe('already-executed');
    expect(canExecuteApproval({ status: 'APPROVED', expiresAt: new Date('2026-06-23') }, now).reason).toBe('expired');
  });
});

describe('Phase 1-7 — new growth event types are valid and operational', () => {
  it('recognizes new operations growth types', () => {
    for (const t of [
      'inventory.stocktake.created',
      'inventory.stocktake.reconciled',
      'inventory.purchase_order.created',
      'inventory.purchase_order.received',
      'logistics.task.created',
      'logistics.setup.completed',
      'event.risk.created',
      'event.risk.resolved',
    ]) {
      expect(isGrowthEventType(t)).toBe(true);
      expect(growthCategoryOf(t)).toBe('operations');
    }
  });
});
