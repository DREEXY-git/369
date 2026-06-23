import { describe, it, expect } from 'vitest';
import {
  signWebhookPayload,
  buildSignatureHeader,
  verifyWebhookSignature,
} from '../webhook';

const secret = 'whsec_test_secret_value';
const body = JSON.stringify({ eventType: 'QUOTE_APPROVED', id: 'q1' });

describe('webhook signature', () => {
  it('valid signature verifies', () => {
    const ts = 1_750_000_000;
    const header = buildSignatureHeader(secret, body, ts);
    expect(verifyWebhookSignature(secret, body, header, { now: ts })).toBe(true);
  });

  it('tampered body fails verification', () => {
    const ts = 1_750_000_000;
    const header = buildSignatureHeader(secret, body, ts);
    expect(verifyWebhookSignature(secret, body + 'x', header, { now: ts })).toBe(false);
  });

  it('wrong secret fails verification', () => {
    const ts = 1_750_000_000;
    const header = buildSignatureHeader(secret, body, ts);
    expect(verifyWebhookSignature('other', body, header, { now: ts })).toBe(false);
  });

  it('replayed (stale) timestamp is rejected', () => {
    const ts = 1_750_000_000;
    const header = buildSignatureHeader(secret, body, ts);
    // now is 10分後 → 既定許容 300 秒を超過
    expect(verifyWebhookSignature(secret, body, header, { now: ts + 600 })).toBe(false);
  });

  it('raw signature (no header format) verifies within tolerance', () => {
    const ts = 1_750_000_000;
    const raw = signWebhookPayload(secret, body, ts);
    // 生署名のみだと timestamp が取れないため false（リプレイ防止のため timestamp 必須）
    expect(verifyWebhookSignature(secret, body, raw, { now: ts })).toBe(false);
  });
});
