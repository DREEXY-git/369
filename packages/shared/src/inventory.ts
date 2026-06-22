// 在庫・リースの可用性判定とダイナミックプライシング（ルールベース）。

export interface ReservationWindow {
  assetId: string;
  quantity: number;
  startAt: Date | string;
  endAt: Date | string;
}

function overlaps(a: ReservationWindow, b: ReservationWindow): boolean {
  const aStart = new Date(a.startAt).getTime();
  const aEnd = new Date(a.endAt).getTime();
  const bStart = new Date(b.startAt).getTime();
  const bEnd = new Date(b.endAt).getTime();
  return aStart < bEnd && bStart < aEnd;
}

/**
 * 予約重複チェック。同一資産で期間が重なり、合計数量が在庫数を超える場合に衝突。
 */
export function hasReservationConflict(
  candidate: ReservationWindow,
  existing: ReservationWindow[],
  stockQuantity: number,
): boolean {
  const overlapping = existing.filter(
    (e) => e.assetId === candidate.assetId && overlaps(candidate, e),
  );
  const reserved = overlapping.reduce((sum, e) => sum + e.quantity, 0);
  return reserved + candidate.quantity > stockQuantity;
}

export function availableQuantity(
  assetId: string,
  stockQuantity: number,
  window: { startAt: Date | string; endAt: Date | string },
  existing: ReservationWindow[],
): number {
  const reserved = existing
    .filter((e) => e.assetId === assetId && overlaps({ assetId, quantity: 0, ...window }, e))
    .reduce((sum, e) => sum + e.quantity, 0);
  return Math.max(0, stockQuantity - reserved);
}

export interface PricingFactors {
  peakSeason?: boolean;
  lowSeason?: boolean;
  nearEventDate?: boolean;
  lowStock?: boolean; // 残在庫わずか
  highPastWinRate?: boolean;
  highRankCustomer?: boolean;
  lowUtilization?: boolean; // 稼働率が低く稼ぎたい
}

export interface PricingSuggestion {
  suggestedPrice: number;
  changeRate: number; // %
  reason: string;
  appliedFactors: string[];
}

/**
 * ダイナミックプライシング提案（ルールベース + 理由文）。
 * 各要因で係数を加減し、-30%〜+40% の範囲にクランプ。
 */
export function suggestDynamicPrice(basePrice: number, factors: PricingFactors): PricingSuggestion {
  let rate = 0;
  const applied: string[] = [];
  const add = (delta: number, label: string) => {
    rate += delta;
    applied.push(label);
  };

  if (factors.peakSeason) add(15, '繁忙期');
  if (factors.lowSeason) add(-10, '閑散期');
  if (factors.nearEventDate) add(8, 'イベント直前');
  if (factors.lowStock) add(12, '在庫残少');
  if (factors.highPastWinRate) add(5, '高受注率');
  if (factors.highRankCustomer) add(-5, '優良顧客優遇');
  if (factors.lowUtilization) add(-12, '低稼働解消');

  rate = Math.max(-30, Math.min(40, rate));
  const suggestedPrice = Math.round((basePrice * (100 + rate)) / 100);
  const reason =
    applied.length > 0
      ? `${applied.join('・')}を考慮し ${rate >= 0 ? '+' : ''}${rate}% を提案。`
      : '需要要因に大きな変化はなく現状価格を維持。';

  return { suggestedPrice, changeRate: rate, reason, appliedFactors: applied };
}
