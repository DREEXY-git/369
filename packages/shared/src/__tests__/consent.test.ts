import { describe, it, expect } from 'vitest';
import {
  evaluateConsent,
  consentBlocksAccess,
  isConsentValid,
  isConsentRequired,
  type ConsentGrantLike,
} from '../consent';

const now = new Date('2026-06-23T10:00:00');

describe('consent', () => {
  it('consent required check', () => {
    expect(isConsentRequired('location_tracking')).toBe(true);
    expect(isConsentRequired('recording')).toBe(true);
    expect(isConsentRequired('external_llm')).toBe(true);
    // ai_reference は内部参照として同意必須リストに含めていない
    expect(isConsentRequired('ai_reference')).toBe(false);
  });

  it('granted consent is valid and unblocks access', () => {
    const grants: ConsentGrantLike[] = [
      { purpose: 'location_tracking', status: 'granted', grantedAt: new Date('2026-06-01') },
    ];
    expect(evaluateConsent(grants, 'location_tracking', now).status).toBe('granted');
    expect(consentBlocksAccess(grants, 'location_tracking', now)).toBe(false);
  });

  it('consent withdrawal blocks access', () => {
    const grants: ConsentGrantLike[] = [
      {
        purpose: 'recording',
        status: 'withdrawn',
        grantedAt: new Date('2026-06-01'),
        withdrawnAt: new Date('2026-06-10'),
      },
    ];
    expect(evaluateConsent(grants, 'recording', now).status).toBe('withdrawn');
    expect(consentBlocksAccess(grants, 'recording', now)).toBe(true);
  });

  it('expired consent blocks access', () => {
    const grants: ConsentGrantLike[] = [
      {
        purpose: 'location_tracking',
        status: 'granted',
        grantedAt: new Date('2026-01-01'),
        expiresAt: new Date('2026-06-01'),
      },
    ];
    expect(isConsentValid(grants[0]!, now)).toBe(false);
    expect(consentBlocksAccess(grants, 'location_tracking', now)).toBe(true);
  });

  it('missing consent blocks required purpose', () => {
    expect(consentBlocksAccess([], 'location_tracking', now)).toBe(true);
    expect(evaluateConsent([], 'location_tracking', now).status).toBe('missing');
  });

  it('latest valid grant wins over an earlier withdrawal', () => {
    const grants: ConsentGrantLike[] = [
      { purpose: 'line', status: 'withdrawn', withdrawnAt: new Date('2026-05-01') },
      { purpose: 'line', status: 'granted', grantedAt: new Date('2026-06-01') },
    ];
    expect(evaluateConsent(grants, 'line', now).status).toBe('granted');
    expect(consentBlocksAccess(grants, 'line', now)).toBe(false);
  });
});
