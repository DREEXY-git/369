import { describe, expect, it } from 'vitest';
import {
  CASE_STUDY_CONSENT_STATUSES,
  canDisableAnonymization,
  isCaseStudyConsentStatus,
  validateCaseStudyConsent,
} from '../case-study';

// Phase 2-C-4 否定系テスト: 「許諾なしに匿名化を外せない」を恒久固定する。
// 顧客名・取引先名・成果数値・顧客の声は許諾なしに扱わない（doc71 §6-1）の機械検証部分。
describe('CaseStudy 許諾・匿名化判定（許諾なしに匿名化を外せない・Phase 2-C-4）', () => {
  it('consentStatus は none / requested / granted / revoked の4値', () => {
    expect(CASE_STUDY_CONSENT_STATUSES).toEqual(['none', 'requested', 'granted', 'revoked']);
    for (const s of CASE_STUDY_CONSENT_STATUSES) expect(isCaseStudyConsentStatus(s)).toBe(true);
    expect(isCaseStudyConsentStatus('public')).toBe(false);
    expect(isCaseStudyConsentStatus('')).toBe(false);
  });

  it('匿名化を外せるのは granted のときだけ', () => {
    expect(canDisableAnonymization('granted')).toBe(true);
    expect(canDisableAnonymization('none')).toBe(false);
    expect(canDisableAnonymization('requested')).toBe(false);
    expect(canDisableAnonymization('revoked')).toBe(false);
    expect(canDisableAnonymization('GRANTED')).toBe(false); // 大文字などの揺れも安全側で拒否
  });

  it('anonymized=false は consentStatus=granted 以外では拒否される（否定系）', () => {
    expect(validateCaseStudyConsent({ consentStatus: 'none', anonymized: false })).toEqual({
      ok: false,
      error: 'anonymized',
    });
    expect(validateCaseStudyConsent({ consentStatus: 'requested', anonymized: false })).toEqual({
      ok: false,
      error: 'anonymized',
    });
    expect(validateCaseStudyConsent({ consentStatus: 'revoked', anonymized: false })).toEqual({
      ok: false,
      error: 'anonymized',
    });
  });

  it('anonymized=false は consentStatus=granted のときだけ許可される', () => {
    expect(validateCaseStudyConsent({ consentStatus: 'granted', anonymized: false })).toEqual({ ok: true });
  });

  it('anonymized=true（匿名のまま）はどの許諾状態でも許可される', () => {
    for (const s of CASE_STUDY_CONSENT_STATUSES) {
      expect(validateCaseStudyConsent({ consentStatus: s, anonymized: true })).toEqual({ ok: true });
    }
  });

  it('未知の consentStatus は匿名化の状態にかかわらず拒否される（否定系）', () => {
    expect(validateCaseStudyConsent({ consentStatus: 'unknown', anonymized: true })).toEqual({
      ok: false,
      error: 'consentStatus',
    });
    expect(validateCaseStudyConsent({ consentStatus: '', anonymized: false })).toEqual({
      ok: false,
      error: 'consentStatus',
    });
  });
});
