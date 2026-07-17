import { describe, it, expect } from 'vitest';
import {
  makeIdempotencyKey,
  makeCanonicalIdempotencyKey,
  classifyIdempotencyKey,
  idempotencyKeyMatchesIdentity,
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

  it('legacy key generation is unchanged (writer invariance, pinned values)', () => {
    // Phase A（WIP-PADN-PHASEA-001）: writer は legacy FNV キーのまま。書式が 1 byte でも
    // 変わると既存行との照合が全滅するため、値そのものを pin する。
    expect(
      makeIdempotencyKey({ tenantId: 't1', eventType: 'QUOTE_APPROVED', aggregateId: 'q1' }),
    ).toBe('QUOTE_APPROVED:ac35127c');
    expect(
      makeIdempotencyKey({ tenantId: 't1', eventType: 'QUOTE_APPROVED', aggregateId: 'q1', dedupe: 'd1' }),
    ).toBe('QUOTE_APPROVED:d19428fb');
    expect(makeIdempotencyKey({ tenantId: 't1', eventType: 'QUOTE_APPROVED', aggregateId: 'q1' })).toMatch(
      /^QUOTE_APPROVED:[0-9a-f]{8}$/,
    );
  });

  it('canonical key follows the PR #57 format (encodeURIComponent-joined, byte-exact)', () => {
    // PR #57（claude/q2c-payment-void-race-fix-v1 packages/shared/src/events.ts）の書式:
    // `${eventType}:${enc(tenantId)}:${enc(aggregateId)}:${enc(dedupe ?? '')}`
    expect(
      makeCanonicalIdempotencyKey({ tenantId: 't1', eventType: 'QUOTE_APPROVED', aggregateId: 'q1' }),
    ).toBe('QUOTE_APPROVED:t1:q1:');
    expect(
      makeCanonicalIdempotencyKey({ tenantId: 't1', eventType: 'QUOTE_APPROVED', aggregateId: 'q1', dedupe: 'd:1' }),
    ).toBe('QUOTE_APPROVED:t1:q1:d%3A1');
    expect(
      makeCanonicalIdempotencyKey({ tenantId: 't:x', eventType: 'CUSTOMER_CREATED', aggregateId: 'a/b c' }),
    ).toBe('CUSTOMER_CREATED:t%3Ax:a%2Fb%20c:');
  });

  it('canonical key is injective under delimiter injection (components containing ":")', () => {
    // 素の `:` 連結なら衝突するペアが、符号化により必ず別キーになる（単射性）。
    const a = makeCanonicalIdempotencyKey({ tenantId: 't:1', eventType: 'CUSTOMER_CREATED', aggregateId: 'a' });
    const b = makeCanonicalIdempotencyKey({ tenantId: 't', eventType: 'CUSTOMER_CREATED', aggregateId: '1:a' });
    expect(a).not.toBe(b);
    const c = makeCanonicalIdempotencyKey({ tenantId: 't1', eventType: 'CUSTOMER_CREATED', aggregateId: 'a:', dedupe: '' });
    const d = makeCanonicalIdempotencyKey({ tenantId: 't1', eventType: 'CUSTOMER_CREATED', aggregateId: 'a', dedupe: ':' });
    expect(c).not.toBe(d);
    // どのキーも常に 4 セグメント（符号化成分は `:` を含まない）
    for (const k of [a, b, c, d]) expect(k.split(':')).toHaveLength(4);
  });

  it('classifyIdempotencyKey distinguishes canonical / legacy / unknown', () => {
    const identity = { tenantId: 't1', eventType: 'QUOTE_APPROVED', aggregateId: 'q1' };
    expect(classifyIdempotencyKey(makeCanonicalIdempotencyKey(identity))).toBe('canonical');
    expect(classifyIdempotencyKey(makeIdempotencyKey(identity))).toBe('legacy');
    // 成分に `:` を含む identity の canonical キーも符号化により 4 セグメントのまま
    expect(
      classifyIdempotencyKey(
        makeCanonicalIdempotencyKey({ tenantId: 't:1', eventType: 'QUOTE_APPROVED', aggregateId: 'q:1', dedupe: ':' }),
      ),
    ).toBe('canonical');
    expect(classifyIdempotencyKey('')).toBe('unknown');
    expect(classifyIdempotencyKey('QUOTE_APPROVED')).toBe('unknown');
    expect(classifyIdempotencyKey('QUOTE_APPROVED:nothex99')).toBe('unknown');
    expect(classifyIdempotencyKey('QUOTE_APPROVED:AC35127C')).toBe('unknown'); // 大文字 hex は生成されない
  });

  it('dual-read equivalence: both canonical and legacy keys of the same identity match it', () => {
    const identity = { tenantId: 't1', eventType: 'PAYMENT_RECEIVED', aggregateId: 'inv-1', dedupe: 'x' };
    expect(idempotencyKeyMatchesIdentity(makeCanonicalIdempotencyKey(identity), identity)).toBe(true);
    expect(idempotencyKeyMatchesIdentity(makeIdempotencyKey(identity), identity)).toBe(true);
    const dedupeless = { tenantId: 't1', eventType: 'PAYMENT_RECEIVED', aggregateId: 'inv-1' };
    expect(idempotencyKeyMatchesIdentity(makeCanonicalIdempotencyKey(dedupeless), dedupeless)).toBe(true);
    expect(idempotencyKeyMatchesIdentity(makeIdempotencyKey(dedupeless), dedupeless)).toBe(true);
  });

  it('dual-read does not false-positive on unrelated keys or identities', () => {
    const identity = { tenantId: 't1', eventType: 'PAYMENT_RECEIVED', aggregateId: 'inv-1' };
    const other = { tenantId: 't1', eventType: 'PAYMENT_RECEIVED', aggregateId: 'inv-2' };
    // 別 identity のキー（両形式）は一致しない
    expect(idempotencyKeyMatchesIdentity(makeCanonicalIdempotencyKey(other), identity)).toBe(false);
    expect(idempotencyKeyMatchesIdentity(makeIdempotencyKey(other), identity)).toBe(false);
    // 区切り文字混入で「素の連結なら同一文字列」になる identity も canonical では別（単射）
    const injA = { tenantId: 't:1', eventType: 'PAYMENT_RECEIVED', aggregateId: 'a' };
    const injB = { tenantId: 't', eventType: 'PAYMENT_RECEIVED', aggregateId: '1:a' };
    expect(idempotencyKeyMatchesIdentity(makeCanonicalIdempotencyKey(injA), injB)).toBe(false);
    // unknown 形式の文字列は同値扱いしない
    expect(idempotencyKeyMatchesIdentity('garbage', identity)).toBe(false);
    expect(idempotencyKeyMatchesIdentity('', identity)).toBe(false);
  });

  it('retry backoff grows and is capped', () => {
    expect(nextRetryDelayMs(0)).toBe(2000);
    expect(nextRetryDelayMs(1)).toBe(4000);
    expect(nextRetryDelayMs(2)).toBe(8000);
    expect(nextRetryDelayMs(100)).toBeLessThanOrEqual(3_600_000);
  });
});
