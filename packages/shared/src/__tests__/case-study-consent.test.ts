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
