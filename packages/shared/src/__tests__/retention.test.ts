import { describe, it, expect } from 'vitest';
import { isExpired, retentionState, daysUntilExpiry } from '../retention';

const now = new Date('2026-06-23T00:00:00');

describe('retention', () => {
  it('retention policy marks expired data', () => {
    const old = new Date('2025-06-23T00:00:00'); // 365日前
    expect(isExpired(old, 180, now)).toBe(true);
    expect(retentionState(old, 180, now)).toBe('expired');
  });

  it('recent data within retention is active', () => {
    const recent = new Date('2026-06-01T00:00:00');
    expect(isExpired(recent, 180, now)).toBe(false);
    expect(retentionState(recent, 180, now)).toBe('active');
  });

  it('zero/invalid retention never expires', () => {
    const old = new Date('2000-01-01T00:00:00');
    expect(isExpired(old, 0, now)).toBe(false);
    expect(isExpired(old, -5, now)).toBe(false);
  });

  it('daysUntilExpiry counts down and goes negative when over', () => {
    const created = new Date('2026-06-13T00:00:00'); // 10日前
    expect(daysUntilExpiry(created, 30, now)).toBe(20);
    expect(daysUntilExpiry(created, 5, now)).toBeLessThan(0);
  });
});
