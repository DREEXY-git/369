// 顧客事例（Case Study）の許諾・匿名化の純粋判定（Phase 2-C-4・doc71 §6-4 準拠）。
// - 顧客名・取引先名・成果数値・顧客の声は許諾なしに扱わない。
// - 匿名化（anonymized）を外せるのは consentStatus が 'granted'（許諾あり）のときだけ。
// - この判定は actions 層（apps/web/app/(app)/brain/case-studies/actions.ts）で必ず通す。
// - ConsentRecord テーブルとの連携は後続の別承認（ここでは CaseStudy フィールド上の状態のみを扱う）。

export const CASE_STUDY_CONSENT_STATUSES = ['none', 'requested', 'granted', 'revoked'] as const;
export type CaseStudyConsentStatus = (typeof CASE_STUDY_CONSENT_STATUSES)[number];

export function isCaseStudyConsentStatus(value: string): value is CaseStudyConsentStatus {
  return (CASE_STUDY_CONSENT_STATUSES as readonly string[]).includes(value);
}

/** 匿名化を外してよいか。許諾が記録されている（granted）ときだけ true。 */
export function canDisableAnonymization(consentStatus: string): boolean {
  return consentStatus === 'granted';
}

/**
 * 許諾状態と匿名化フラグの組み合わせ検証。
 * - consentStatus が既知の4値以外 → NG
 * - anonymized=false は consentStatus='granted' のときだけ許可（それ以外は安全側で拒否）
 */
export function validateCaseStudyConsent(input: { consentStatus: string; anonymized: boolean }):
  | { ok: true }
  | { ok: false; error: 'consentStatus' | 'anonymized' } {
  if (!isCaseStudyConsentStatus(input.consentStatus)) return { ok: false, error: 'consentStatus' };
  if (!input.anonymized && !canDisableAnonymization(input.consentStatus)) {
    return { ok: false, error: 'anonymized' };
  }
  return { ok: true };
}
