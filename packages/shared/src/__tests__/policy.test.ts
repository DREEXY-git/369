import { describe, it, expect } from 'vitest';
import { evaluatePolicy, type PolicySubject, type PolicyResource } from '../policy';

const owner: PolicySubject = { roles: ['OWNER'], actorType: 'user', userId: 'u-owner' };
const staff: PolicySubject = { roles: ['STAFF'], actorType: 'user', userId: 'u-staff' };
const manager: PolicySubject = { roles: ['DEPARTMENT_MANAGER'], actorType: 'user', userId: 'u-mgr' };
const aiAgent: PolicySubject = { roles: ['AI_AGENT'], actorType: 'ai_agent', userId: 'u-ai' };

const customer = (ownerId?: string): PolicyResource => ({
  dataType: 'customer',
  label: 'CUSTOMER_CONFIDENTIAL',
  ownerId: ownerId ?? null,
});
const hrConfidential: PolicyResource = { dataType: 'hr', label: 'HR_CONFIDENTIAL' };
const strictSecret: PolicyResource = { dataType: 'finance', label: 'STRICT_SECRET' };
const location: PolicyResource = { dataType: 'location', label: 'CONFIDENTIAL' };
const recording: PolicyResource = { dataType: 'recording', label: 'CONFIDENTIAL' };

// 営業時間内の固定日時（火曜 10:00）
const businessHours = new Date('2026-06-23T10:00:00');
// 営業時間外（火曜 23:00）
const afterHours = new Date('2026-06-23T23:00:00');

describe('evaluatePolicy — ABAC', () => {
  it('ABAC allows owner of record to read', () => {
    const d = evaluatePolicy(staff, customer('u-staff'), 'read', { now: businessHours });
    expect(d.allow).toBe(true);
  });

  it('ABAC allows OWNER role to read confidential', () => {
    const d = evaluatePolicy(owner, customer('someone'), 'read', { now: businessHours });
    expect(d.allow).toBe(true);
  });

  it('ABAC denies staff for HR confidential', () => {
    const d = evaluatePolicy(staff, hrConfidential, 'read', { now: businessHours });
    expect(d.allow).toBe(false);
    expect(d.reason).toBe('label-denied');
  });

  it('ABAC denies AI agent unauthorized (label) access', () => {
    const d = evaluatePolicy(aiAgent, strictSecret, 'ai_read', { now: businessHours });
    expect(d.allow).toBe(false);
    expect(d.reason).toBe('label-denied');
  });

  it('ABAC denies AI agent forbidden action (external_send)', () => {
    const d = evaluatePolicy(aiAgent, customer(), 'external_send', {
      approvalStatus: 'approved',
      now: businessHours,
    });
    expect(d.allow).toBe(false);
    expect(d.reason).toBe('ai-forbidden-action');
  });

  it('location access requires consent', () => {
    const denied = evaluatePolicy(manager, location, 'view_location', {
      consentStatus: 'missing',
      now: businessHours,
    });
    expect(denied.allow).toBe(false);
    expect(denied.reason).toBe('consent-required');
    expect(denied.requiredConsent).toBe(true);

    const ok = evaluatePolicy(manager, location, 'view_location', {
      consentStatus: 'granted',
      now: businessHours,
    });
    expect(ok.allow).toBe(true);
  });

  it('location access outside working hours is denied', () => {
    const d = evaluatePolicy(manager, location, 'view_location', {
      consentStatus: 'granted',
      now: afterHours,
    });
    expect(d.allow).toBe(false);
    expect(d.reason).toBe('outside-business-hours');
  });

  it('recording access requires consent', () => {
    const denied = evaluatePolicy(manager, recording, 'view_recording', {
      consentStatus: 'withdrawn',
      now: businessHours,
    });
    expect(denied.allow).toBe(false);
    expect(denied.reason).toBe('consent-required');

    const ok = evaluatePolicy(manager, recording, 'view_recording', {
      consentStatus: 'granted',
      now: businessHours,
    });
    expect(ok.allow).toBe(true);
  });

  it('external send requires approval', () => {
    const denied = evaluatePolicy(staff, customer('u-staff'), 'external_send', {
      approvalStatus: 'none',
      now: businessHours,
    });
    expect(denied.allow).toBe(false);
    expect(denied.reason).toBe('approval-required');
    expect(denied.requiredApproval).toBe(true);

    const ok = evaluatePolicy(staff, customer('u-staff'), 'external_send', {
      approvalStatus: 'approved',
      now: businessHours,
    });
    expect(ok.allow).toBe(true);
  });

  it('export requires approval', () => {
    const denied = evaluatePolicy(manager, customer(), 'export', {
      approvalStatus: 'pending',
      now: businessHours,
    });
    expect(denied.allow).toBe(false);
    expect(denied.reason).toBe('approval-required');
  });

  it('expired retention denies read', () => {
    const d = evaluatePolicy(owner, { ...customer(), retentionState: 'expired' }, 'read', {
      now: businessHours,
    });
    expect(d.allow).toBe(false);
    expect(d.reason).toBe('retention-expired');
  });

  it('non-manager (external expert) viewing other high-confidential requires a reason', () => {
    // EXTERNAL_EXPERT は LEGAL_CONFIDENTIAL を閲覧可能（ラベルOK）だが、非マネージャ・非所有者
    const expert: PolicySubject = { roles: ['EXTERNAL_EXPERT'], actorType: 'user', userId: 'e1' };
    const legal: PolicyResource = { dataType: 'legal', label: 'LEGAL_CONFIDENTIAL', ownerId: 'other' };
    const d = evaluatePolicy(expert, legal, 'view_confidential', { now: businessHours });
    expect(d.allow).toBe(false);
    expect(d.reason).toBe('sensitive-reason-required');
    const withReason = evaluatePolicy(expert, legal, 'view_confidential', {
      now: businessHours,
      sensitiveAccessReasonProvided: true,
    });
    expect(withReason.allow).toBe(true);
    expect(withReason.requiredSensitiveAccessReason).toBe(true);
  });
});
