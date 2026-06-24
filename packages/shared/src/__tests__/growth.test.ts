import { describe, it, expect } from 'vitest';
import {
  isGrowthEventType,
  growthCategoryOf,
  isRevenueRelated,
  dxMonetaryImpact,
  dxPriorityScore,
  summarizeGrowth,
} from '../growth';

describe('growth event types', () => {
  it('recognizes valid types and categories', () => {
    expect(isGrowthEventType('marketing.campaign.created')).toBe(true);
    expect(isGrowthEventType('nope')).toBe(false);
    expect(growthCategoryOf('dx.automation.completed')).toBe('dx');
    expect(growthCategoryOf('finance.invoice.paid')).toBe('finance');
    expect(growthCategoryOf('weird')).toBe('management');
  });
  it('flags revenue-related events', () => {
    expect(isRevenueRelated('finance.invoice.paid')).toBe(true);
    expect(isRevenueRelated('sales.deal.won')).toBe(true);
    expect(isRevenueRelated('marketing.campaign.created')).toBe(false);
  });
});

describe('DX impact / priority', () => {
  it('converts time saving to money and sums impacts', () => {
    // 600分/月 = 10時間 × 3000円 = 30,000 + costSaving 20,000 + revenue 0 = 50,000
    const impact = dxMonetaryImpact({ estimatedTimeSavingMinutes: 600, estimatedCostSaving: 20000, estimatedRevenueImpact: 0, difficulty: 'low' });
    expect(impact).toBe(50000);
  });
  it('priority is higher for low difficulty than high for same impact', () => {
    const base = { estimatedTimeSavingMinutes: 6000, estimatedCostSaving: 500000, estimatedRevenueImpact: 0 };
    const low = dxPriorityScore({ ...base, difficulty: 'low' });
    const high = dxPriorityScore({ ...base, difficulty: 'high' });
    expect(low).toBeGreaterThan(high);
    expect(low).toBeLessThanOrEqual(100);
  });
});

describe('summarizeGrowth', () => {
  it('aggregates counts and impacts', () => {
    const s = summarizeGrowth([
      { type: 'finance.invoice.paid', revenueImpact: 100000 },
      { type: 'dx.automation.completed', costSaving: 50000, timeSavingMinutes: 120 },
      { type: 'marketing.campaign.created' },
    ]);
    expect(s.total).toBe(3);
    expect(s.revenueRelated).toBe(1);
    expect(s.byCategory.finance).toBe(1);
    expect(s.byCategory.dx).toBe(1);
    expect(s.totalRevenueImpact).toBe(100000);
    expect(s.totalCostSaving).toBe(50000);
    expect(s.totalTimeSavingMinutes).toBe(120);
  });
});
