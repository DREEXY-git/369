import { describe, it, expect } from 'vitest';
import {
  makeIdempotencyKey,
  isDomainEventType,
  nextRetryDelayMs,
  DOMAIN_EVENT_TYPES,
} from '../events';

describe('events', () => {
  it('domain event types include the required set', () => {
    for (const t of [
      'CUSTOMER_CREATED',
      'QUOTE_APPROVED',
      'CONTRACT_SIGNED',
      'PAYMENT_RECEIVED',
      'MEETING_MINUTES_CREATED',
      'CONFIDENTIAL_DATA_VIEWED',
    ]) {
      expect(isDomainEventType(t)).toBe(true);
    }
    expect(isDomainEventType('NOPE')).toBe(false);
    expect(DOMAIN_EVENT_TYPES.length).toBeGreaterThanOrEqual(24);
  });

  it('idempotency key is deterministic for the same input', () => {
    const a = makeIdempotencyKey({ tenantId: 't1', eventType: 'QUOTE_APPROVED', aggregateId: 'q1' });
    const b = makeIdempotencyKey({ tenantId: 't1', eventType: 'QUOTE_APPROVED', aggregateId: 'q1' });
    expect(a).toBe(b);
  });

  it('idempotency key differs for different aggregates/tenants/dedupe', () => {
    const base = { tenantId: 't1', eventType: 'QUOTE_APPROVED', aggregateId: 'q1' };
    expect(makeIdempotencyKey(base)).not.toBe(makeIdempotencyKey({ ...base, aggregateId: 'q2' }));
    expect(makeIdempotencyKey(base)).not.toBe(makeIdempotencyKey({ ...base, tenantId: 't2' }));
    expect(makeIdempotencyKey(base)).not.toBe(makeIdempotencyKey({ ...base, dedupe: 'x' }));
  });

  it('retry backoff grows and is capped', () => {
    expect(nextRetryDelayMs(0)).toBe(2000);
    expect(nextRetryDelayMs(1)).toBe(4000);
    expect(nextRetryDelayMs(2)).toBe(8000);
    expect(nextRetryDelayMs(100)).toBeLessThanOrEqual(3_600_000);
  });
});
