import { describe, it, expect } from 'vitest';
import {
  makeIdempotencyKey,
  makeLegacyIdempotencyKey,
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

  it('異なる aggregate は衝突しない（旧 FNV-1a 32bit の決定論的衝突 fixture・Codex PR#57 R4 #1）', () => {
    // Codex が提示した、旧実装（FNV-1a 32bit 縮約）で同一キー `RECEIVABLE_COLLECTED:0df3fbed` へ
    // 決定論的に衝突する 2 invoice。完全 canonical key では別キーになる（衝突しない）。
    const a = makeIdempotencyKey({ tenantId: 'tenant-evidence', eventType: 'RECEIVABLE_COLLECTED', aggregateId: 'cq9iaml5de11dumtx4u1esvz6', dedupe: 'receivable-collected' });
    const b = makeIdempotencyKey({ tenantId: 'tenant-evidence', eventType: 'RECEIVABLE_COLLECTED', aggregateId: 'cvo49ccci03xjt8an4vyr0u9p', dedupe: 'receivable-collected' });
    expect(a).not.toBe(b);
    // 完全 canonical key は identity 成分を無損失で保持する（32bit へ縮約しない）。
    expect(a).toContain('cq9iaml5de11dumtx4u1esvz6');
    expect(b).toContain('cvo49ccci03xjt8an4vyr0u9p');
  });

  it('区切り injection でも別 identity は衝突しない（encodeURIComponent 符号化）', () => {
    // dedupe に区切り文字 `:` を含めても、符号化により (aggregateId=a, dedupe=b:c) と
    // (aggregateId=a:b, dedupe=c) が同一キーへ潰れない。
    const x = makeIdempotencyKey({ tenantId: 't', eventType: 'PAYMENT_RECEIVED', aggregateId: 'a', dedupe: 'b:c' });
    const y = makeIdempotencyKey({ tenantId: 't', eventType: 'PAYMENT_RECEIVED', aggregateId: 'a:b', dedupe: 'c' });
    expect(x).not.toBe(y);
  });

  it('legacy key は旧 FNV 形式を再現する（dual-read 用・Codex PR#57 R5 #1）', () => {
    // 旧実装（FNV-1a 32bit）の値を保持する: Codex 衝突 fixture は legacy では同一キー、canonical では別キー。
    const A = { tenantId: 'tenant-evidence', eventType: 'RECEIVABLE_COLLECTED', aggregateId: 'cq9iaml5de11dumtx4u1esvz6', dedupe: 'receivable-collected' };
    const B = { ...A, aggregateId: 'cvo49ccci03xjt8an4vyr0u9p' };
    expect(makeLegacyIdempotencyKey(A)).toBe('RECEIVABLE_COLLECTED:0df3fbed');
    expect(makeLegacyIdempotencyKey(A)).toBe(makeLegacyIdempotencyKey(B));
    expect(makeIdempotencyKey(A)).not.toBe(makeIdempotencyKey(B));
    // 同一 identity では legacy key も決定的。
    expect(makeLegacyIdempotencyKey(A)).toBe(makeLegacyIdempotencyKey({ ...A }));
  });

  it('retry backoff grows and is capped', () => {
    expect(nextRetryDelayMs(0)).toBe(2000);
    expect(nextRetryDelayMs(1)).toBe(4000);
    expect(nextRetryDelayMs(2)).toBe(8000);
    expect(nextRetryDelayMs(100)).toBeLessThanOrEqual(3_600_000);
  });
});
