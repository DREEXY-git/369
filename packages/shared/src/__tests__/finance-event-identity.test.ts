import { describe, it, expect } from 'vitest';
import {
  PAYMENT_REQUEST_KEY_RE,
  RECEIVABLE_COLLECTED_DEDUPE,
  paymentReceivedIdentity,
  receivableCollectedIdentity,
  derivePaymentRequestId,
  makeIdemMetadata,
  readIdemMetadata,
  legacyRowMatchesIdentity,
} from '../finance-event-identity';
import { makeCanonicalIdempotencyKey, makeLegacyIdempotencyKey } from '../events';

describe('finance-event-identity（修正版 Phase A・PA-BLK-1 契約正本）', () => {
  it('PAYMENT_REQUEST_KEY_RE accepts cuid-like request keys and rejects others', () => {
    expect(PAYMENT_REQUEST_KEY_RE.test('cabcdef0123456789abcd')).toBe(true); // c+20
    expect(PAYMENT_REQUEST_KEY_RE.test(`c${'a'.repeat(24)}`)).toBe(true);
    expect(PAYMENT_REQUEST_KEY_RE.test(`c${'a'.repeat(32)}`)).toBe(true);
    expect(PAYMENT_REQUEST_KEY_RE.test('')).toBe(false);
    expect(PAYMENT_REQUEST_KEY_RE.test(`c${'a'.repeat(19)}`)).toBe(false); // 短すぎ
    expect(PAYMENT_REQUEST_KEY_RE.test(`c${'a'.repeat(33)}`)).toBe(false); // 長すぎ
    expect(PAYMENT_REQUEST_KEY_RE.test(`x${'a'.repeat(24)}`)).toBe(false); // prefix 不一致
    expect(PAYMENT_REQUEST_KEY_RE.test(`c${'A'.repeat(24)}`)).toBe(false); // 大文字不可
    expect(PAYMENT_REQUEST_KEY_RE.test('cabc def0123456789abcdef0')).toBe(false); // 空白不可
  });

  it('paymentReceivedIdentity: dedupe = client requestKey（request 単位・凍結契約）', () => {
    const id = paymentReceivedIdentity({ tenantId: 't1', invoiceId: 'inv-1', requestKey: 'cabcdef0123456789abcdef01' });
    expect(id).toEqual({
      tenantId: 't1',
      eventType: 'PAYMENT_RECEIVED',
      aggregateType: 'Invoice',
      aggregateId: 'inv-1',
      dedupe: 'cabcdef0123456789abcdef01',
    });
    // 契約 identity → canonical/legacy 両 encoding が決定的に定まる（emit 側の唯一の入口）。
    expect(makeCanonicalIdempotencyKey(id)).toBe('PAYMENT_RECEIVED:t1:inv-1:cabcdef0123456789abcdef01');
    expect(makeLegacyIdempotencyKey(id)).toMatch(/^PAYMENT_RECEIVED:[0-9a-f]{8}$/);
  });

  it('receivableCollectedIdentity: dedupe = 定数 receivable-collected（invoice 状態遷移・凍結契約）', () => {
    expect(RECEIVABLE_COLLECTED_DEDUPE).toBe('receivable-collected');
    const id = receivableCollectedIdentity({ tenantId: 't1', invoiceId: 'inv-1' });
    expect(id).toEqual({
      tenantId: 't1',
      eventType: 'RECEIVABLE_COLLECTED',
      aggregateType: 'Invoice',
      aggregateId: 'inv-1',
      dedupe: 'receivable-collected',
    });
    expect(makeCanonicalIdempotencyKey(id)).toBe('RECEIVABLE_COLLECTED:t1:inv-1:receivable-collected');
  });

  it('derivePaymentRequestId is server-derived, injective, tenant-bound (golden pin)', () => {
    // 書式凍結（ID-1）: 'pay:' + enc(tenantId) + ':' + enc(requestKey)
    expect(derivePaymentRequestId('t1', 'cabcdef0123456789abcdef01')).toBe('pay:t1:cabcdef0123456789abcdef01');
    // encodeURIComponent により delimiter injection でも単射（別 (tenant,key) 組は必ず別 ID）。
    expect(derivePaymentRequestId('t:1', 'ca')).toBe('pay:t%3A1:ca');
    expect(derivePaymentRequestId('t', '1:ca')).toBe('pay:t:1%3Aca');
    expect(derivePaymentRequestId('t:1', 'ca')).not.toBe(derivePaymentRequestId('t', '1:ca'));
    // 別 tenant の同一 requestKey は構造的に別 ID（ID-5 完全独立性の基盤）。
    const key = 'cabcdef0123456789abcdef01';
    expect(derivePaymentRequestId('tenant-a', key)).not.toBe(derivePaymentRequestId('tenant-b', key));
    // 'pay:' prefix は cuid 形状（^c[a-z0-9]+$）と互いに素 → 既存 @default(cuid()) 行と衝突しない。
    expect(derivePaymentRequestId('tenant-a', key).startsWith('pay:')).toBe(true);
    expect(/^c[a-z0-9]+$/.test(derivePaymentRequestId('tenant-a', key))).toBe(false);
  });

  it('makeIdemMetadata / readIdemMetadata roundtrip（payload.idem 無損失保存・ID-2）', () => {
    const idem = makeIdemMetadata({ aggregateType: 'Invoice', aggregateId: 'inv-1', dedupe: 'd1', enc: 'legacy' });
    expect(idem).toEqual({ aggregateType: 'Invoice', aggregateId: 'inv-1', dedupe: 'd1', enc: 'legacy', v: 1 });
    expect(readIdemMetadata({ growthType: 'x', idem })).toEqual({ dedupe: 'd1' });
    // 不正/欠落 payload は null（fail-safe: 検証側は「idem 無し=契約導入前の行」として扱う）。
    expect(readIdemMetadata(undefined)).toBeNull();
    expect(readIdemMetadata(null)).toBeNull();
    expect(readIdemMetadata('str')).toBeNull();
    expect(readIdemMetadata({})).toBeNull();
    expect(readIdemMetadata({ idem: { dedupe: 42 } })).toBeNull();
  });

  it('legacyRowMatchesIdentity: idem あり → 保存 dedupe の完全一致のみ既存（決定的照合）', () => {
    const identity = { eventType: 'PAYMENT_RECEIVED', aggregateType: 'Invoice', aggregateId: 'inv-1', dedupe: 'd1' };
    const row = (dedupe: string) => ({
      eventType: 'PAYMENT_RECEIVED',
      aggregateType: 'Invoice',
      aggregateId: 'inv-1',
      payload: { idem: makeIdemMetadata({ aggregateType: 'Invoice', aggregateId: 'inv-1', dedupe, enc: 'legacy' }) },
    });
    expect(legacyRowMatchesIdentity(row('d1'), identity)).toBe(true);
    expect(legacyRowMatchesIdentity(row('d2'), identity)).toBe(false);
    expect(legacyRowMatchesIdentity(row(''), identity)).toBe(false);
    expect(legacyRowMatchesIdentity(row('d1'), { ...identity, dedupe: '' })).toBe(false);
  });

  it('legacyRowMatchesIdentity: idem 無し（契約導入前の行）→ dedupe なし emit とのみ一致', () => {
    const row = { eventType: 'PAYMENT_RECEIVED', aggregateType: 'Invoice', aggregateId: 'inv-1', payload: { growthType: 'x' } };
    expect(
      legacyRowMatchesIdentity(row, { eventType: 'PAYMENT_RECEIVED', aggregateType: 'Invoice', aggregateId: 'inv-1', dedupe: '' }),
    ).toBe(true);
    expect(
      legacyRowMatchesIdentity(row, { eventType: 'PAYMENT_RECEIVED', aggregateType: 'Invoice', aggregateId: 'inv-1', dedupe: 'd1' }),
    ).toBe(false);
  });

  it('legacyRowMatchesIdentity: 識別列（eventType/aggregateType/aggregateId）不一致は常に false（FNV 衝突行の排除）', () => {
    const identity = { eventType: 'PAYMENT_RECEIVED', aggregateType: 'Invoice', aggregateId: 'inv-1', dedupe: '' };
    const base = { eventType: 'PAYMENT_RECEIVED', aggregateType: 'Invoice', aggregateId: 'inv-1', payload: undefined };
    expect(legacyRowMatchesIdentity(base, identity)).toBe(true);
    expect(legacyRowMatchesIdentity({ ...base, eventType: 'RECEIVABLE_COLLECTED' }, identity)).toBe(false);
    expect(legacyRowMatchesIdentity({ ...base, aggregateType: 'Receivable' }, identity)).toBe(false);
    // FNV 衝突ペア（別 aggregateId・同一 legacy key）は列不一致で既存として返らない（PA-BLK-4）。
    expect(legacyRowMatchesIdentity({ ...base, aggregateId: 'cwkr44pwctu472mwavgtao6ix' }, identity)).toBe(false);
  });
});
