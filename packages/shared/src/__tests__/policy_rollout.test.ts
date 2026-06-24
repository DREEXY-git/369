import { describe, it, expect } from 'vitest';
import { evaluatePolicy, type PolicySubject } from '../policy';
import { requiresApproval } from '../approval';
import { nextRetryDelayMs } from '../events';

const staff: PolicySubject = { roles: ['STAFF'], actorType: 'user', userId: 's1' };
const admin: PolicySubject = { roles: ['ADMIN'], actorType: 'user', userId: 'a1' };
const owner: PolicySubject = { roles: ['OWNER'], actorType: 'user', userId: 'o1' };
const hours = new Date('2026-06-23T10:00:00');

describe('Phase 1-3: approval gate on dangerous actions', () => {
  it('approval gate for export', () => {
    expect(requiresApproval('data_export', { external: true })).toBe(true);
  });
  it('approval gate for external send', () => {
    expect(requiresApproval('customer_email_send', { external: true })).toBe(true);
  });
  it('approval gate for high-confidential AI send', () => {
    expect(requiresApproval('ai_high_confidential_send', { actorIsAi: true, external: true })).toBe(true);
  });
});

describe('Phase 1-3: ABAC rollout to financial domains', () => {
  it('policy decision denies invoice (financial confidential) for staff', () => {
    const d = evaluatePolicy(staff, { dataType: 'invoice', label: 'FINANCIAL_CONFIDENTIAL' }, 'view_confidential', { now: hours });
    expect(d.allow).toBe(false);
    expect(d.reason).toBe('label-denied');
  });
  it('policy decision allows admin finance access', () => {
    const d = evaluatePolicy(admin, { dataType: 'finance', label: 'FINANCIAL_CONFIDENTIAL' }, 'view_confidential', { now: hours });
    expect(d.allow).toBe(true);
  });
  it('policy decision allows owner finance access', () => {
    const d = evaluatePolicy(owner, { dataType: 'finance', label: 'FINANCIAL_CONFIDENTIAL' }, 'view_confidential', { now: hours });
    expect(d.allow).toBe(true);
  });
});

describe('Phase 1-3: outbox retry backoff', () => {
  it('retry delay grows with attempts', () => {
    expect(nextRetryDelayMs(1)).toBeGreaterThan(nextRetryDelayMs(0));
    expect(nextRetryDelayMs(3)).toBeGreaterThan(nextRetryDelayMs(2));
  });
});
