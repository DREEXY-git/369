// Outcome & Human Time Ledger の証拠区分 純ロジック（Phase 4 Stream C1・roadmap75）。
// 「AI の成果」を表示するときは必ず証拠区分を付け、格上げ（estimated を measured に見せる等）をしない。
// - AI の実行時間だけから人間の削減時間を推定しない（baseline が無ければ unavailable）。
// - 自己申告値を実測値に合算しない（バケットを分けたまま返す）。
// 本モジュールは表示用の分類のみを行い、実行・承認・削除・外部送信の能力を持たない。

export const OUTCOME_EVIDENCE_CLASSES = [
  'measured', // システムが記録したイベント由来（UsageEvent・AIAgentRun 等の実カウント）
  'self_reported', // 人間の自己申告値（広告消化の自己申告と同型・実測と混同しない）
  'estimated', // 明示した仮定に基づく推定（仮定の記載が必須）
  'unverified', // 出所はあるが検証されていない値
  'unavailable', // 根拠が存在しない（表示するなら「計測なし」と明示する）
] as const;
export type OutcomeEvidenceClass = (typeof OUTCOME_EVIDENCE_CLASSES)[number];

export const OUTCOME_EVIDENCE_LABEL: Record<OutcomeEvidenceClass, string> = {
  measured: '実測',
  self_reported: '自己申告',
  estimated: '推定',
  unverified: '未検証',
  unavailable: '計測なし',
};

/** 一覧・詳細に出す成果行（値と証拠のセット。証拠区分のない値は作らない）。 */
export interface OutcomeEntry {
  key: string;
  label: string;
  /** 値。unavailable のときは null（0 と計測なしを混同しない）。 */
  value: number | null;
  unit: string;
  evidenceClass: OutcomeEvidenceClass;
  /** 証拠元（モデル名・イベント名など。unavailable のときは「無い理由」）。 */
  evidenceSource: string;
  /** 集計期間の表示（例: 直近30日）。 */
  periodLabel: string;
  /** 母数・分母の注記（例: 全 AIAgentRun 12 件中）。 */
  denominatorNote: string;
  /** 信頼度 0-1（measured は 1.0 固定ではなく記録系の網羅性に依存・null = 提示しない）。 */
  confidence: number | null;
}

/**
 * 人間の削減時間の証拠区分を決める。
 * - baseline（人間が同作業に要する時間の実測/合意値）が無ければ unavailable（推定もしない）。
 * - baseline が自己申告なら self_reported 止まり（verified 扱いにしない）。
 * - baseline が実測でも、成果側が実測イベントでなければ estimated 止まり。
 */
export function classifyHumanTimeSaving(input: {
  baselineMinutesPerTask: number | null;
  baselineIsMeasured: boolean;
  completedTaskCountMeasured: boolean;
}): OutcomeEvidenceClass {
  if (input.baselineMinutesPerTask == null || input.baselineMinutesPerTask <= 0) return 'unavailable';
  if (!input.baselineIsMeasured) return 'self_reported';
  if (!input.completedTaskCountMeasured) return 'estimated';
  return 'measured';
}

/** 「検証済み削減時間」として表示してよいか（baseline なしでは常に不可）。 */
export function canDisplayVerifiedTimeSaving(input: {
  baselineMinutesPerTask: number | null;
  baselineIsMeasured: boolean;
  completedTaskCountMeasured: boolean;
}): boolean {
  return classifyHumanTimeSaving(input) === 'measured';
}

/**
 * 成果行をバケット別に合計する。self_reported / estimated / unverified を
 * measured に合算しない（それぞれの合計を分けて返す）。unavailable（value null）は合計に入れない。
 */
export function sumByEvidenceClass(entries: OutcomeEntry[]): Record<OutcomeEvidenceClass, number> {
  const out: Record<OutcomeEvidenceClass, number> = {
    measured: 0,
    self_reported: 0,
    estimated: 0,
    unverified: 0,
    unavailable: 0,
  };
  for (const e of entries) {
    if (e.value == null) continue;
    out[e.evidenceClass] += e.value;
  }
  return out;
}
