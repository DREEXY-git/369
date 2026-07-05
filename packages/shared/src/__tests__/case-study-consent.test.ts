import { describe, expect, it } from 'vitest';
import {
  CASE_STUDY_CONSENT_PURPOSES,
  isCaseStudyConsentPurpose,
  validateCaseStudyConsentInput,
} from '../case-study-consent';

// 許諾台帳（CaseStudyConsent）入力検証の否定系テスト（doc86 §10 準拠）。
// 「用途未記載は不許可」「期限なし許諾は認めない」「期限逆転拒否」を恒久固定する。

const VALID = {
  purposes: ['internal_view'],
  evidence: '証跡所在: 2026-07-01 受領の許諾書面（保管場所メモ）',
  grantedAt: new Date('2026-07-01T00:00:00Z'),
  expiresAt: new Date('2027-07-01T00:00:00Z'),
};

describe('case-study-consent', () => {
  it('purpose は6区分の明示列挙', () => {
    expect(CASE_STUDY_CONSENT_PURPOSES).toEqual([
      'internal_view',
      'ai_reference',
      'external_publish',
      'pr',
      'seo',
      'customer_voice',
    ]);
    for (const p of CASE_STUDY_CONSENT_PURPOSES) expect(isCaseStudyConsentPurpose(p)).toBe(true);
    expect(isCaseStudyConsentPurpose('everything')).toBe(false);
    expect(isCaseStudyConsentPurpose('')).toBe(false);
    expect(isCaseStudyConsentPurpose('AI_REFERENCE')).toBe(false); // 大文字などの揺れも安全側で拒否
  });

  it('valid input は OK', () => {
    expect(validateCaseStudyConsentInput(VALID)).toEqual({ ok: true });
  });

  it('purpose 空（用途未記載）は拒否される（否定系）', () => {
    expect(validateCaseStudyConsentInput({ ...VALID, purposes: [] })).toEqual({ ok: false, error: 'purpose' });
  });

  it('未知の purpose は拒否される（否定系）', () => {
    expect(validateCaseStudyConsentInput({ ...VALID, purposes: ['internal_view', 'public_everything'] })).toEqual({
      ok: false,
      error: 'purpose',
    });
  });

  it('evidence 空は拒否される（否定系）', () => {
    expect(validateCaseStudyConsentInput({ ...VALID, evidence: '' })).toEqual({ ok: false, error: 'evidence' });
    expect(validateCaseStudyConsentInput({ ...VALID, evidence: '   ' })).toEqual({ ok: false, error: 'evidence' });
  });

  it('grantedAt 欠落・不正は拒否される（否定系）', () => {
    expect(validateCaseStudyConsentInput({ ...VALID, grantedAt: null })).toEqual({ ok: false, error: 'grantedAt' });
    expect(validateCaseStudyConsentInput({ ...VALID, grantedAt: new Date('invalid') })).toEqual({
      ok: false,
      error: 'grantedAt',
    });
  });

  it('expiresAt 欠落・不正は拒否される（期限なし許諾は認めない・否定系）', () => {
    expect(validateCaseStudyConsentInput({ ...VALID, expiresAt: null })).toEqual({ ok: false, error: 'expiresAt' });
    expect(validateCaseStudyConsentInput({ ...VALID, expiresAt: new Date('invalid') })).toEqual({
      ok: false,
      error: 'expiresAt',
    });
  });

  it('expiresAt が grantedAt 以前なら拒否される（否定系）', () => {
    expect(
      validateCaseStudyConsentInput({ ...VALID, expiresAt: new Date('2026-07-01T00:00:00Z') }),
    ).toEqual({ ok: false, error: 'expiresBeforeGranted' });
    expect(
      validateCaseStudyConsentInput({ ...VALID, expiresAt: new Date('2026-06-30T00:00:00Z') }),
    ).toEqual({ ok: false, error: 'expiresBeforeGranted' });
  });
});

// ── 突合判定（validateCaseStudyConsentReconciliation・doc89 §11 の否定系テスト案・doc90） ──
// granted（申告値）を本物とみなす前の照合。reject 条件を1つも落とさないことを恒久固定する。

import {
  validateCaseStudyConsentReconciliation,
  type CaseStudyReconciliationCaseStudy,
  type CaseStudyReconciliationConsentRow,
} from '../case-study-consent';

const NOW = new Date('2026-07-05T00:00:00Z');

const CASE_STUDY: CaseStudyReconciliationCaseStudy = {
  id: 'cs-1',
  tenantId: 't-1',
  consentStatus: 'granted',
  archivedAt: null,
  publishStatus: 'private',
  label: 'INTERNAL',
};

const ROW: CaseStudyReconciliationConsentRow = {
  tenantId: 't-1',
  caseStudyId: 'cs-1',
  status: 'granted',
  purpose: ['internal_view'],
  evidence: '証跡所在: 2026-07-01 受領の許諾書面（保管場所メモ）',
  expiresAt: new Date('2027-07-01T00:00:00Z'),
  revokedAt: null,
  grantedById: 'user-1',
};

const BASE = {
  caseStudy: CASE_STUDY,
  consents: [ROW],
  targetPurpose: 'internal_view',
  now: NOW,
  suppressed: false,
};

describe('validateCaseStudyConsentReconciliation（突合判定）', () => {
  it('全条件が揃っている場合は OK（肯定系）', () => {
    expect(validateCaseStudyConsentReconciliation(BASE)).toEqual({ ok: true });
  });

  it('targetPurpose unknown → reject', () => {
    expect(validateCaseStudyConsentReconciliation({ ...BASE, targetPurpose: 'everything' })).toEqual({
      ok: false,
      reason: 'unknownTargetPurpose',
    });
  });

  it('consentStatus が granted ではない → reject', () => {
    for (const s of ['none', 'requested', 'revoked']) {
      expect(
        validateCaseStudyConsentReconciliation({ ...BASE, caseStudy: { ...CASE_STUDY, consentStatus: s } }),
      ).toEqual({ ok: false, reason: 'consentStatusNotGranted' });
    }
  });

  it('archived CaseStudy → reject', () => {
    expect(
      validateCaseStudyConsentReconciliation({ ...BASE, caseStudy: { ...CASE_STUDY, archivedAt: NOW } }),
    ).toEqual({ ok: false, reason: 'caseStudyArchived' });
  });

  it('publishStatus が private ではない → reject', () => {
    expect(
      validateCaseStudyConsentReconciliation({ ...BASE, caseStudy: { ...CASE_STUDY, publishStatus: 'published' } }),
    ).toEqual({ ok: false, reason: 'caseStudyNotPrivate' });
  });

  it('label が NORMAL / INTERNAL 以外（高機密） → reject', () => {
    expect(
      validateCaseStudyConsentReconciliation({ ...BASE, caseStudy: { ...CASE_STUDY, label: 'CONFIDENTIAL' } }),
    ).toEqual({ ok: false, reason: 'labelNotAllowed' });
  });

  it('suppressed = true → reject', () => {
    expect(validateCaseStudyConsentReconciliation({ ...BASE, suppressed: true })).toEqual({
      ok: false,
      reason: 'suppressed',
    });
  });

  it('台帳行なし → reject', () => {
    expect(validateCaseStudyConsentReconciliation({ ...BASE, consents: [] })).toEqual({
      ok: false,
      reason: 'noConsentRecord',
    });
  });

  it('tenantId 不一致 → reject', () => {
    expect(
      validateCaseStudyConsentReconciliation({ ...BASE, consents: [{ ...ROW, tenantId: 't-other' }] }),
    ).toEqual({ ok: false, reason: 'tenantMismatch' });
  });

  it('caseStudyId 不一致 → reject', () => {
    expect(
      validateCaseStudyConsentReconciliation({ ...BASE, consents: [{ ...ROW, caseStudyId: 'cs-other' }] }),
    ).toEqual({ ok: false, reason: 'caseStudyMismatch' });
  });

  it('status が revoked → reject', () => {
    expect(
      validateCaseStudyConsentReconciliation({ ...BASE, consents: [{ ...ROW, status: 'revoked' }] }),
    ).toEqual({ ok: false, reason: 'revoked' });
  });

  it('unknown status → reject', () => {
    expect(
      validateCaseStudyConsentReconciliation({ ...BASE, consents: [{ ...ROW, status: 'pending' }] }),
    ).toEqual({ ok: false, reason: 'unknownStatus' });
  });

  it('revokedAt あり → reject', () => {
    expect(
      validateCaseStudyConsentReconciliation({ ...BASE, consents: [{ ...ROW, revokedAt: NOW }] }),
    ).toEqual({ ok: false, reason: 'revoked' });
  });

  it('expired（expiresAt <= now） → reject', () => {
    expect(
      validateCaseStudyConsentReconciliation({ ...BASE, consents: [{ ...ROW, expiresAt: NOW }] }),
    ).toEqual({ ok: false, reason: 'expired' });
    expect(
      validateCaseStudyConsentReconciliation({
        ...BASE,
        consents: [{ ...ROW, expiresAt: new Date('2026-07-04T00:00:00Z') }],
      }),
    ).toEqual({ ok: false, reason: 'expired' });
  });

  it('purpose 空 → reject', () => {
    expect(
      validateCaseStudyConsentReconciliation({ ...BASE, consents: [{ ...ROW, purpose: [] }] }),
    ).toEqual({ ok: false, reason: 'purposeEmpty' });
  });

  it('purpose mismatch（対象用途が含まれない） → reject', () => {
    expect(
      validateCaseStudyConsentReconciliation({
        ...BASE,
        consents: [{ ...ROW, purpose: ['ai_reference'] }],
      }),
    ).toEqual({ ok: false, reason: 'purposeMismatch' });
  });

  it('unknown purpose（台帳の用途に未知値） → reject', () => {
    expect(
      validateCaseStudyConsentReconciliation({
        ...BASE,
        consents: [{ ...ROW, purpose: ['internal_view', 'everything'] }],
      }),
    ).toEqual({ ok: false, reason: 'unknownPurposeInLedger' });
  });

  it('evidence 空 → reject', () => {
    expect(
      validateCaseStudyConsentReconciliation({ ...BASE, consents: [{ ...ROW, evidence: '   ' }] }),
    ).toEqual({ ok: false, reason: 'evidenceEmpty' });
  });

  it('grantedById なし → reject', () => {
    expect(
      validateCaseStudyConsentReconciliation({ ...BASE, consents: [{ ...ROW, grantedById: null }] }),
    ).toEqual({ ok: false, reason: 'grantedByMissing' });
  });

  it('無効行と有効行が混在する場合は有効行で OK（1行でも全条件を満たせばよい）', () => {
    expect(
      validateCaseStudyConsentReconciliation({
        ...BASE,
        consents: [{ ...ROW, status: 'revoked' }, ROW],
      }),
    ).toEqual({ ok: true });
  });
});
