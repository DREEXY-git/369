// LeadMap AI: 営業優先度スコア（0-100）。
// 「既に確立しているが改善余地がある会社ほど刺さりやすい」という前提でスコアリング。

export interface LeadScoreInput {
  rating?: number | null; // Google 評価 (1-5)
  reviewCount?: number | null;
  hasWebsite?: boolean;
  mobileFriendly?: boolean;
  hasBooking?: boolean;
  hasLine?: boolean;
  hasSocial?: boolean;
  hasNegativeReviewSignal?: boolean;
}

export interface LeadScoreResult {
  score: number;
  breakdown: Record<string, number>;
}

export function computeLeadScore(input: LeadScoreInput): LeadScoreResult {
  const breakdown: Record<string, number> = {};
  const set = (k: string, v: number) => {
    breakdown[k] = v;
  };

  set('base', 30);

  const reviews = input.reviewCount ?? 0;
  set('established', Math.min(Math.round(reviews / 5), 20)); // 確立度（口コミ数）

  const rating = input.rating ?? 0;
  if (rating > 0 && rating < 3.5) set('rating', 15);
  else if (rating >= 3.5 && rating < 4.5) set('rating', 10);
  else if (rating >= 4.5) set('rating', 5);
  else set('rating', 0);

  if (input.hasWebsite === false) set('noWebsite', 20);
  else if (input.hasWebsite && input.mobileFriendly === false) set('weakMobile', 10);

  if (input.hasBooking === false) set('noBooking', 8);
  if (input.hasLine === false) set('noLine', 6);
  if (input.hasSocial === false) set('noSocial', 5);
  if (input.hasNegativeReviewSignal) set('negativeSignal', 6);

  const raw = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const score = Math.max(0, Math.min(100, raw));
  return { score, breakdown };
}

export function priorityLabel(score: number): { text: string; tone: string } {
  if (score >= 75) return { text: '高', tone: 'red' };
  if (score >= 55) return { text: '中', tone: 'amber' };
  return { text: '低', tone: 'slate' };
}

// ---- 取りこぼし検知（放置・停滞リードのレーダー） ----
// アクティブなリードを「今どの段階で止まっているか」で分類し、最終活動からの経過で「要対応」を炙り出す。
// 終端（WON/LOST/UNSUBSCRIBED/EXCLUDED）は対象外。DB 非依存の純関数（stage は文字列で受ける）。
// 送信後未反応（既存の追客ボード）に加え、①未着手 ②下書き未送信（承認漏れ）③返信後放置 の取りこぼしも拾う。

export const LEAD_STALL_BUCKETS = ['hot_cooling', 'awaiting_response', 'draft_pending', 'unworked'] as const;
export type LeadStallBucket = (typeof LEAD_STALL_BUCKETS)[number];

export const LEAD_STALL_BUCKET_LABEL: Record<LeadStallBucket, string> = {
  hot_cooling: '返信後・冷めかけ',
  awaiting_response: '送信後・反応待ち',
  draft_pending: '下書き・未送信（承認漏れ）',
  unworked: '未着手（抽出のみ）',
};

// バケットごとの「これ以上 動きが無ければ要対応」の日数。返信後（hot）は取りこぼし損失が大きいので短め。
export const LEAD_STALL_THRESHOLD_DAYS: Record<LeadStallBucket, number> = {
  hot_cooling: 4,
  awaiting_response: 5,
  draft_pending: 3,
  unworked: 7,
};

// stage → バケット（終端・除外＝マップに無い＝対象外）。16 段階のうち WON/LOST/UNSUBSCRIBED/EXCLUDED は含めない。
const LEAD_STAGE_TO_STALL_BUCKET: Record<string, LeadStallBucket> = {
  NEW: 'unworked',
  ANALYZED: 'draft_pending',
  DRAFTED: 'draft_pending',
  PENDING_APPROVAL: 'draft_pending',
  READY: 'draft_pending',
  SENT: 'awaiting_response',
  OPENED: 'awaiting_response',
  CLICKED: 'awaiting_response',
  REPLIED: 'hot_cooling',
  APPOINTMENT: 'hot_cooling',
  NEGOTIATING: 'hot_cooling',
  QUOTED: 'hot_cooling',
};

/** 取りこぼし検知の対象バケット（終端・除外・未知 stage は null）。バケットに属する stage 群も引ける。 */
export function leadStallBucketForStage(stage: string): LeadStallBucket | null {
  return LEAD_STAGE_TO_STALL_BUCKET[stage] ?? null;
}

/** あるバケットに属する stage の一覧（DB クエリの stage: { in } に使う）。 */
export function stagesForLeadStallBucket(bucket: LeadStallBucket): string[] {
  return Object.keys(LEAD_STAGE_TO_STALL_BUCKET).filter((s) => LEAD_STAGE_TO_STALL_BUCKET[s] === bucket);
}

export interface LeadStallInput {
  stage: string;
  updatedAt: Date;
  lastContactAt: Date | null;
}

export interface LeadStallResult {
  bucket: LeadStallBucket;
  /** 最終活動（lastContactAt が無ければ updatedAt）からの経過日数（負は 0）。 */
  staleDays: number;
  /** バケットのしきい値以上 放置されているか（＝要対応）。境界（ちょうど）も含む。 */
  isStale: boolean;
}

/**
 * リードの取りこぼし状態を判定する純関数。終端・除外・未知 stage は null（対象外）。
 * 最終活動 = lastContactAt ?? updatedAt。staleDays = max(0, floor((now - 最終活動)/日))。
 * isStale = staleDays >= バケットしきい値。
 */
export function classifyLeadStall(lead: LeadStallInput, now: Date): LeadStallResult | null {
  const bucket = leadStallBucketForStage(lead.stage);
  if (!bucket) return null;
  const last = lead.lastContactAt ?? lead.updatedAt;
  const staleDays = Math.max(0, Math.floor((now.getTime() - last.getTime()) / (24 * 60 * 60 * 1000)));
  return { bucket, staleDays, isStale: staleDays >= LEAD_STALL_THRESHOLD_DAYS[bucket] };
}

/** 放置とみなす基準日時（now - しきい値日）。DB クエリの lastContactAt/updatedAt: { lt } に渡す用途。 */
export function leadStallCutoff(now: Date, bucket: LeadStallBucket): Date {
  return new Date(now.getTime() - LEAD_STALL_THRESHOLD_DAYS[bucket] * 24 * 60 * 60 * 1000);
}
