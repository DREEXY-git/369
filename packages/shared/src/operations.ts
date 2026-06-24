// 倉庫・在庫・リース・イベント会社・営業 OS に向けた純ロジック（DB非依存）。Phase 1-5（準備）。
// 注意: ここでは「経営指標の計算」と「成長イベントの運用分類」のみを提供する。
//       OS本体（モデル/CRUD/画面/ワーカー/承認導線）は後続フェーズで追加する（本フェーズでは作らない）。
// 既存の inventory.ts（予約衝突・ダイナミックプライシング）と相補的に使う。

export type OperationCategory = 'inventory' | 'rental' | 'event' | 'sales' | 'logistics' | 'other';

/**
 * 在庫資産の稼働率（%）。期間内の使用日数 / 利用可能日数。
 * 利用可能日数が 0 以下なら 0%。100% でクランプし小数1桁に丸める。
 */
export function inventoryUtilizationRate(usedDays: number, availableDays: number): number {
  if (availableDays <= 0) return 0;
  const rate = (Math.max(0, usedDays) / availableDays) * 100;
  return Math.round(Math.min(100, rate) * 10) / 10;
}

export type RentalAvailability = 'available' | 'limited' | 'unavailable';

/**
 * リース可用性ステータス。残数（総数−予約−整備中）と総数比から判定。
 * 残 0 → unavailable、残が総数の 20% 以下 → limited、それ以外 → available。
 */
export function rentalAvailabilityStatus(input: {
  totalQuantity: number;
  reservedQuantity: number;
  maintenanceQuantity?: number;
}): RentalAvailability {
  const maintenance = Math.max(0, input.maintenanceQuantity ?? 0);
  const available = Math.max(0, input.totalQuantity - Math.max(0, input.reservedQuantity) - maintenance);
  if (available <= 0) return 'unavailable';
  if (input.totalQuantity > 0 && available / input.totalQuantity <= 0.2) return 'limited';
  return 'available';
}

/**
 * イベント案件の粗利率（%）。(revenue - cost) / revenue。
 * revenue が 0 以下なら 0。小数1桁に丸める。
 */
export function eventProfitMargin(revenue: number, cost: number): number {
  if (revenue <= 0) return 0;
  const margin = ((revenue - cost) / revenue) * 100;
  return Math.round(margin * 10) / 10;
}

/**
 * 営業（商品販売）の粗利率（%）。(売上 - 原価) / 売上。
 * 売上が 0 以下なら 0。小数1桁に丸める。
 */
export function salesGrossProfitRate(revenue: number, cogs: number): number {
  if (revenue <= 0) return 0;
  const rate = ((revenue - Math.max(0, cogs)) / revenue) * 100;
  return Math.round(rate * 10) / 10;
}

// ============ 成長イベントの運用カテゴリ分類 ============

/**
 * 成長イベント type（<category>.<entity>.<action>）が運用（在庫/リース/イベント/物流）系か。
 */
export function isOperationalGrowthEvent(type: string): boolean {
  const head = type.split('.')[0];
  return head === 'inventory' || head === 'rental' || head === 'event' || head === 'logistics';
}

/**
 * 成長イベント type を運用カテゴリへ写像（OS本体実装時のルーティング下地）。
 */
export function classifyOperationCategory(type: string): OperationCategory {
  const head = type.split('.')[0];
  switch (head) {
    case 'inventory':
      return 'inventory';
    case 'rental':
      return 'rental';
    case 'event':
      return 'event';
    case 'sales':
      return 'sales';
    case 'logistics':
      return 'logistics';
    default:
      return 'other';
  }
}
