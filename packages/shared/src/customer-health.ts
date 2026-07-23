// 顧客の離反予兆（churn）判定 純ロジック（DB 非依存）。
// Customer に保存された離反リスク・満足度・最終接触からの経過・未対応クレームを組み合わせ、
// 「今どの顧客が離れそうか・なぜか・何をすべきか」を決定論的に導く。
// 断定助言はせず、リスクと推奨アクション（フォロー観点）に留める。根拠（reasons）を必ず残す。

export const CHURN_TIERS = ['critical', 'elevated', 'watch', 'stable'] as const;
export type ChurnTier = (typeof CHURN_TIERS)[number];

export const CHURN_TIER_LABEL: Record<ChurnTier, string> = {
  critical: '離反 危険',
  elevated: '離反 要注意',
  watch: '様子見',
  stable: '安定',
};

export interface CustomerChurnInput {
  /** 保存済み離反リスク指標 0-100（高いほど危険）。未計測は null。 */
  churnRisk: number | null;
  /** 満足度 0-100（高いほど良い）。未計測は null。 */
  satisfaction: number | null;
  /** 最終接触からの経過日数。未接触/不明は null。 */
  daysSinceContact: number | null;
  /** 未対応（open）クレーム件数。 */
  openComplaints: number;
}

export interface CustomerChurnAssessment {
  tier: ChurnTier;
  /** 0-100 の総合離反リスク（決定論・各シグナルの加点を上限100でクランプ）。 */
  score: number;
  /** なぜ危ないか（該当したシグナルのみ・空なら根拠なし）。 */
  reasons: string[];
  /** 推奨アクション（フォロー観点。断定助言はしない）。 */
  recommendation: string;
}

const SILENCE_DAYS_HIGH = 90;
const SILENCE_DAYS_MID = 60;

const RECOMMENDATION: Record<ChurnTier, string> = {
  critical: '至急フォロー：担当者が直接連絡し、不満・要望を把握して具体策を提示してください。',
  elevated: '近日中にフォロー面談を設定し、満足度と課題を確認してください。',
  watch: '定期接触の予定を入れ、関係が薄まる前に接点を持ってください。',
  stable: '現状の関係を維持してください。',
};

/**
 * 顧客の離反予兆を判定する純関数。各シグナルの加点を合算（上限100）し、tier と根拠・推奨を返す。
 * - 数値でない/範囲外の入力は無視（捏造しない）。該当シグナルが無ければ reasons は空。
 * - しきい値ちょうどは安全側（危険側に倒す）に含める。
 */
export function classifyCustomerChurn(input: CustomerChurnInput): CustomerChurnAssessment {
  const reasons: string[] = [];
  let score = 0;

  const churn = typeof input.churnRisk === 'number' && Number.isFinite(input.churnRisk) ? clamp0to100(input.churnRisk) : null;
  if (churn != null) {
    score += churn;
    if (churn >= 60) reasons.push(`離反リスク指標が高い（${churn}）`);
  }

  const sat = typeof input.satisfaction === 'number' && Number.isFinite(input.satisfaction) ? clamp0to100(input.satisfaction) : null;
  if (sat != null) {
    if (sat < 40) {
      score += 25;
      reasons.push(`満足度が低い（${sat}）`);
    } else if (sat < 60) {
      score += 10;
      reasons.push(`満足度がやや低い（${sat}）`);
    }
  }

  const days = typeof input.daysSinceContact === 'number' && Number.isFinite(input.daysSinceContact) ? input.daysSinceContact : null;
  if (days != null) {
    if (days >= SILENCE_DAYS_HIGH) {
      score += 25;
      reasons.push(`${SILENCE_DAYS_HIGH}日以上 接触がありません（${days}日）`);
    } else if (days >= SILENCE_DAYS_MID) {
      score += 15;
      reasons.push(`${SILENCE_DAYS_MID}日以上 接触がありません（${days}日）`);
    }
  }

  const complaints = Number.isFinite(input.openComplaints) && input.openComplaints > 0 ? Math.floor(input.openComplaints) : 0;
  if (complaints > 0) {
    score += Math.min(complaints * 10, 25);
    reasons.push(`未対応のクレームが ${complaints}件あります`);
  }

  score = clamp0to100(score);
  const tier: ChurnTier = score >= 70 ? 'critical' : score >= 50 ? 'elevated' : score >= 30 ? 'watch' : 'stable';
  return { tier, score, reasons, recommendation: RECOMMENDATION[tier] };
}

/** 最終接触日時から経過日数を求める（未設定は null）。負値は 0。 */
export function daysSinceContact(lastContactAt: Date | null | undefined, now: Date): number | null {
  if (lastContactAt == null) return null;
  return Math.max(0, Math.floor((now.getTime() - lastContactAt.getTime()) / (24 * 60 * 60 * 1000)));
}

function clamp0to100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
