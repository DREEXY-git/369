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

// ── 突合判定（doc89 準拠・Phase 段階3の純粋関数のみ・doc90） ────────────────────
// granted（申告値）を真正な許諾として扱ってよいかを、許諾台帳の行と機械照合する判定。
// - DB を読まない・Prisma を import しない・非同期にしない（決定的な純粋関数）。
// - 現在時刻は now 引数・SuppressionList の照会結果は suppressed boolean で受け取る（呼び出し層の責務）。
// - evidence は存在確認のみ（本文は判定に使わない・AI 文脈へ注入しない）。
// - 既存の validateCaseStudyConsent（匿名化の門番）/ validateCaseStudyConsentInput（台帳入力検証）は変更しない。
// - この関数はまだどの保存条件・AI参照にも接続されていない（接続・anonymized=false 解禁は別承認・安全ゲートで段階分離を機械検査）。

export const CASE_STUDY_CONSENT_AI_READABLE_LABELS = ['NORMAL', 'INTERNAL'] as const;

export type CaseStudyReconciliationCaseStudy = {
  id: string;
  tenantId: string;
  consentStatus: string;
  archivedAt: Date | null;
  publishStatus: string;
  label: string;
};

export type CaseStudyReconciliationConsentRow = {
  tenantId: string;
  caseStudyId: string;
  status: string;
  purpose: string[];
  evidence: string;
  expiresAt: Date;
  revokedAt: Date | null;
  grantedById: string | null;
};

export type CaseStudyConsentReconciliationReason =
  | 'unknownTargetPurpose'
  | 'consentStatusNotGranted'
  | 'caseStudyArchived'
  | 'caseStudyNotPrivate'
  | 'labelNotAllowed'
  | 'suppressed'
  | 'noConsentRecord'
  | 'tenantMismatch'
  | 'caseStudyMismatch'
  | 'unknownStatus'
  | 'revoked'
  | 'expired'
  | 'purposeEmpty'
  | 'unknownPurposeInLedger'
  | 'purposeMismatch'
  | 'evidenceEmpty'
  | 'grantedByMissing';

function consentRowFailure(
  row: CaseStudyReconciliationConsentRow,
  targetPurpose: CaseStudyConsentPurpose,
  now: Date,
): CaseStudyConsentReconciliationReason | null {
  if (row.status === 'revoked') return 'revoked';
  if (row.status !== 'granted') return 'unknownStatus';
  if (row.revokedAt !== null) return 'revoked';
  if (row.expiresAt.getTime() <= now.getTime()) return 'expired';
  if (row.purpose.length === 0) return 'purposeEmpty';
  if (row.purpose.some((p) => !isCaseStudyConsentPurpose(p))) return 'unknownPurposeInLedger';
  if (!row.purpose.includes(targetPurpose)) return 'purposeMismatch';
  if (!row.evidence.trim()) return 'evidenceEmpty';
  if (!row.grantedById || !row.grantedById.trim()) return 'grantedByMissing';
  return null;
}

/**
 * 突合判定: 対象用途について「有効な台帳行」が存在するときだけ ok。
 * 有効条件は doc89 §5 の全条件 AND（1つでも欠けたら reason つきで拒否・安全側）。
 * 複数行がある場合、1行でも全条件を満たせば ok。満たす行が無い場合の reason は
 * 最初に照合対象になった行の最初の不成立条件（決定的）。
 */
export function validateCaseStudyConsentReconciliation(input: {
  caseStudy: CaseStudyReconciliationCaseStudy;
  consents: CaseStudyReconciliationConsentRow[];
  targetPurpose: string;
  now: Date;
  suppressed: boolean;
}): { ok: true } | { ok: false; reason: CaseStudyConsentReconciliationReason } {
  if (!isCaseStudyConsentPurpose(input.targetPurpose)) return { ok: false, reason: 'unknownTargetPurpose' };
  if (input.caseStudy.consentStatus !== 'granted') return { ok: false, reason: 'consentStatusNotGranted' };
  if (input.caseStudy.archivedAt !== null) return { ok: false, reason: 'caseStudyArchived' };
  if (input.caseStudy.publishStatus !== 'private') return { ok: false, reason: 'caseStudyNotPrivate' };
  if (!(CASE_STUDY_CONSENT_AI_READABLE_LABELS as readonly string[]).includes(input.caseStudy.label)) {
    return { ok: false, reason: 'labelNotAllowed' };
  }
  if (input.suppressed) return { ok: false, reason: 'suppressed' };
  if (input.consents.length === 0) return { ok: false, reason: 'noConsentRecord' };

  const tenantRows = input.consents.filter((c) => c.tenantId === input.caseStudy.tenantId);
  if (tenantRows.length === 0) return { ok: false, reason: 'tenantMismatch' };
  const matchedRows = tenantRows.filter((c) => c.caseStudyId === input.caseStudy.id);
  if (matchedRows.length === 0) return { ok: false, reason: 'caseStudyMismatch' };

  let firstFailure: CaseStudyConsentReconciliationReason | null = null;
  for (const row of matchedRows) {
    const failure = consentRowFailure(row, input.targetPurpose, input.now);
    if (failure === null) return { ok: true };
    if (firstFailure === null) firstFailure = failure;
  }
  return { ok: false, reason: firstFailure ?? 'noConsentRecord' };
}
