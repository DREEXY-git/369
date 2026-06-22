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
