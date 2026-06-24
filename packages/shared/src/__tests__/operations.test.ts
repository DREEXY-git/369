import { describe, it, expect } from 'vitest';
import {
  inventoryUtilizationRate,
  rentalAvailabilityStatus,
  eventProfitMargin,
  salesGrossProfitRate,
  isOperationalGrowthEvent,
  classifyOperationCategory,
} from '../operations';
import { growthCategoryOf, isGrowthEventType, isRevenueRelated } from '../growth';

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
