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

// ============ 在庫移動（InventoryMovement）の純ロジック — Phase 1-6 ============

export type InventoryMovementType =
  | 'receive'
  | 'move'
  | 'reserve'
  | 'dispatch'
  | 'return'
  | 'damage'
  | 'maintenance_start'
  | 'maintenance_complete'
  | 'adjust';

export const INVENTORY_MOVEMENT_TYPES: readonly InventoryMovementType[] = [
  'receive',
  'move',
  'reserve',
  'dispatch',
  'return',
  'damage',
  'maintenance_start',
  'maintenance_complete',
  'adjust',
] as const;

export const INVENTORY_MOVEMENT_LABEL: Record<InventoryMovementType, string> = {
  receive: '入庫',
  move: '倉庫内移動',
  reserve: '予約',
  dispatch: '出庫',
  return: '返却',
  damage: '破損',
  maintenance_start: 'メンテナンス開始',
  maintenance_complete: 'メンテナンス完了',
  adjust: '数量調整',
};

export function isInventoryMovementType(v: string): v is InventoryMovementType {
  return (INVENTORY_MOVEMENT_TYPES as readonly string[]).includes(v);
}

export interface InventoryEffect {
  status?: string; // ProductAsset.status の目標（available|reserved|out|maintenance）
  condition?: string; // ProductAsset.condition の目標（good|repair|broken|retired）
  setsLocation?: boolean; // move: toLocationId を反映
  changesQuantity?: boolean; // receive(+qty)/adjust(数量を設定)
}

/**
 * 在庫移動タイプ → ProductAsset への効果（状態/状態/位置/数量）。
 * ProductAsset.status / condition / locationId / quantity と連動する単一の写像。
 */
export function inventoryEffectOfMovement(type: InventoryMovementType): InventoryEffect {
  switch (type) {
    case 'receive':
      return { status: 'available', changesQuantity: true };
    case 'move':
      return { setsLocation: true };
    case 'reserve':
      return { status: 'reserved' };
    case 'dispatch':
      return { status: 'out' };
    case 'return':
      return { status: 'available' };
    case 'damage':
      return { status: 'maintenance', condition: 'broken' };
    case 'maintenance_start':
      return { status: 'maintenance', condition: 'repair' };
    case 'maintenance_complete':
      return { status: 'available', condition: 'good' };
    case 'adjust':
      return { changesQuantity: true };
    default:
      return {};
  }
}

/** 在庫移動タイプ → 成長イベント種別。 */
export function growthTypeOfMovement(type: InventoryMovementType): string {
  switch (type) {
    case 'receive':
      return 'inventory.stock.received';
    case 'move':
      return 'inventory.stock.moved';
    case 'reserve':
      return 'inventory.stock.reserved';
    case 'dispatch':
      return 'inventory.stock.dispatched';
    case 'return':
      return 'inventory.stock.returned';
    case 'damage':
      return 'inventory.stock.damaged';
    case 'maintenance_start':
      return 'inventory.maintenance.created';
    case 'maintenance_complete':
      return 'inventory.maintenance.completed';
    case 'adjust':
      return 'inventory.stock.adjusted';
    default:
      return 'inventory.stock.adjusted';
  }
}

// 在庫数量の大幅調整は承認必須（誤操作・棚卸し不整合の防止）。
export const INVENTORY_LARGE_ADJUST_THRESHOLD = 10;

/** 数量差分の絶対値が閾値以上なら「大幅調整」（承認対象）。 */
export function isLargeInventoryAdjustment(delta: number): boolean {
  return Math.abs(delta) >= INVENTORY_LARGE_ADJUST_THRESHOLD;
}

// ============ 棚卸（Stocktake）— Phase 1-7 ============

/** 棚卸差異 = 実地カウント − 帳簿数。正なら過剰、負なら不足。 */
export function stocktakeDifference(expected: number, counted: number): number {
  return counted - expected;
}

// 棚卸差異の大幅判定（在庫反映時に承認が必要なライン）。
export const STOCKTAKE_LARGE_DIFF_THRESHOLD = 10;

export function isLargeStocktakeDifference(diff: number): boolean {
  return Math.abs(diff) >= STOCKTAKE_LARGE_DIFF_THRESHOLD;
}

// ============ 発注点（Reorder）— Phase 1-7 ============

export interface ReorderInput {
  quantity: number; // 現在の利用可能/在庫数
  minQuantity: number; // 発注点
  reorderQuantity: number; // 補充数
  active?: boolean;
}

export interface ReorderSuggestion {
  needsReorder: boolean;
  suggestedQuantity: number;
  shortBy: number;
}

/** 在庫が発注点（min）以下なら発注候補。reorderQuantity を提案。 */
export function reorderSuggestion(input: ReorderInput): ReorderSuggestion {
  if (input.active === false) return { needsReorder: false, suggestedQuantity: 0, shortBy: 0 };
  const needsReorder = input.quantity <= input.minQuantity;
  return {
    needsReorder,
    suggestedQuantity: needsReorder ? Math.max(1, input.reorderQuantity) : 0,
    shortBy: needsReorder ? Math.max(0, input.minQuantity - input.quantity) : 0,
  };
}

// ============ 物流タスク（Logistics）— Phase 1-7 ============

export type LogisticsTaskType = 'delivery' | 'setup' | 'showtime' | 'teardown' | 'pickup' | 'return';
export type LogisticsStatus = 'todo' | 'in_progress' | 'done' | 'blocked';

export const LOGISTICS_TASK_LABEL: Record<LogisticsTaskType, string> = {
  delivery: '配送',
  setup: '設営',
  showtime: '本番',
  teardown: '撤去',
  pickup: '回収',
  return: '返却',
};

export const LOGISTICS_TASK_TYPES: readonly LogisticsTaskType[] = [
  'delivery',
  'setup',
  'showtime',
  'teardown',
  'pickup',
  'return',
] as const;

export function isLogisticsTaskType(v: string): v is LogisticsTaskType {
  return (LOGISTICS_TASK_TYPES as readonly string[]).includes(v);
}

const LOGISTICS_TRANSITIONS: Record<LogisticsStatus, LogisticsStatus[]> = {
  todo: ['in_progress', 'blocked', 'done'],
  in_progress: ['done', 'blocked', 'todo'],
  blocked: ['todo', 'in_progress'],
  done: [],
};

/** 物流タスクの状態遷移が妥当か（done は終端、不正な飛びを禁止）。 */
export function canTransitionLogistics(from: LogisticsStatus, to: LogisticsStatus): boolean {
  if (from === to) return false;
  return (LOGISTICS_TRANSITIONS[from] ?? []).includes(to);
}

/** 物流タスク種別 → 完了時の成長イベント種別。 */
export function growthTypeOfLogisticsCompletion(type: LogisticsTaskType): string {
  switch (type) {
    case 'delivery':
      return 'logistics.delivery.completed';
    case 'setup':
      return 'logistics.setup.completed';
    case 'teardown':
      return 'logistics.teardown.completed';
    case 'pickup':
    case 'return':
      return 'logistics.pickup.completed';
    default:
      return 'logistics.task.created';
  }
}

// ============ イベント人員配置（人件費）— Phase 1-7 ============

/** 人員配置の人件費合計。 */
export function eventStaffCost(assignments: { cost: number }[]): number {
  return assignments.reduce((s, a) => s + Math.max(0, a.cost), 0);
}

// ============ イベントリスク — Phase 1-7 ============

export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

const RISK_SEVERITY_RANK: Record<RiskSeverity, number> = { low: 1, medium: 2, high: 3, critical: 4 };

export function riskSeverityRank(s: string): number {
  return RISK_SEVERITY_RANK[s as RiskSeverity] ?? 0;
}

/** high / critical は要警告（ダッシュボード強調・即対応）。 */
export function isHighSeverityRisk(s: string): boolean {
  return riskSeverityRank(s) >= RISK_SEVERITY_RANK.high;
}

export const RISK_TYPE_LABEL: Record<string, string> = {
  weather: '天候',
  venue: '会場',
  inventory: '在庫',
  staffing: '人員',
  customer: '顧客',
  safety: '安全',
  finance: '財務',
  other: 'その他',
};
