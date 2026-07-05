// 顧客事例の許諾台帳（CaseStudyConsent）の入力検証（doc86 §5 準拠・純粋関数）。
// - purpose は6区分の明示列挙のみ許可。空（未選択）や未知の値は安全側で拒否する（用途未記載は不許可・doc82 §6）。
// - evidence は「証跡の所在説明」のみ（TEXT_POINTER_ONLY・doc84 §0）。空は拒否。原本本文・PII を貼らない運用は UI ガイドで担保。
// - expiresAt は必須（NULL_NOT_ALLOWED・期限なし許諾は認めない・doc84 §0）。grantedAt 以前の期限は拒否。
// - この判定は consents actions 層で必ず通す（安全ゲートで機械検査）。
// - 突合判定（granted の真正性確認・validateCaseStudyConsent の拡張）は doc83 §9 段階3 の別承認。

export const CASE_STUDY_CONSENT_PURPOSES = [
  'internal_view',
  'ai_reference',
  'external_publish',
  'pr',
  'seo',
  'customer_voice',
] as const;
export type CaseStudyConsentPurpose = (typeof CASE_STUDY_CONSENT_PURPOSES)[number];

export function isCaseStudyConsentPurpose(value: string): value is CaseStudyConsentPurpose {
  return (CASE_STUDY_CONSENT_PURPOSES as readonly string[]).includes(value);
}

export type CaseStudyConsentInput = {
  purposes: string[];
  evidence: string;
  grantedAt: Date | null;
  expiresAt: Date | null;
};

/**
 * 許諾台帳の登録入力の検証。
 * - purpose 空・未知の purpose → NG（'purpose'）
 * - evidence 空 → NG（'evidence'）
 * - grantedAt 欠落/不正 → NG（'grantedAt'）
 * - expiresAt 欠落/不正 → NG（'expiresAt'・期限なし許諾は認めない）
 * - expiresAt が grantedAt 以前 → NG（'expiresBeforeGranted'）
 */
export function validateCaseStudyConsentInput(input: CaseStudyConsentInput):
  | { ok: true }
  | { ok: false; error: 'purpose' | 'evidence' | 'grantedAt' | 'expiresAt' | 'expiresBeforeGranted' } {
  if (input.purposes.length === 0) return { ok: false, error: 'purpose' };
  if (input.purposes.some((p) => !isCaseStudyConsentPurpose(p))) return { ok: false, error: 'purpose' };
  if (!input.evidence.trim()) return { ok: false, error: 'evidence' };
  if (!input.grantedAt || Number.isNaN(input.grantedAt.getTime())) return { ok: false, error: 'grantedAt' };
  if (!input.expiresAt || Number.isNaN(input.expiresAt.getTime())) return { ok: false, error: 'expiresAt' };
  if (input.expiresAt.getTime() <= input.grantedAt.getTime()) return { ok: false, error: 'expiresBeforeGranted' };
  return { ok: true };
}
