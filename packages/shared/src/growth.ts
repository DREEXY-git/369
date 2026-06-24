// Growth Event Ledger の純ロジック（型・カテゴリ・経営インパクト計算）。Phase 1-4。
// 会社で起きた出来事を「売上・利益・生産性・DX効果」に接続するための分析台帳。

export type GrowthCategory =
  | 'marketing'
  | 'sales'
  | 'finance'
  | 'dx'
  | 'ai'
  | 'management'
  | 'customer'
  | 'operations';

// 代表的な成長イベント種別（ドット記法 <category>.<entity>.<action>）。
export const GROWTH_EVENT_TYPES = [
  'marketing.campaign.created',
  'marketing.asset.generated',
  'marketing.asset.approved',
  'marketing.lead.acquired',
  'marketing.lead.converted',
  'sales.proposal.sent',
  'sales.deal.won',
  'sales.order.created',
  'sales.order.fulfilled',
  'finance.invoice.paid',
  'customer.repeat.purchased',
  'customer.reactivated',
  'dx.assessment.created',
  'dx.opportunity.detected',
  'dx.automation.completed',
  'dx.process.mapped',
  'ai.employee.action.completed',
  'ai.asset.generated',
  'management.decision.recorded',
  // 運用（在庫/リース/イベント会社/物流）— Operations OS 準備（Phase 1-5）
  'inventory.stock.received',
  'inventory.stock.adjusted',
  'inventory.asset.maintenance',
  'rental.reservation.created',
  'rental.reservation.returned',
  'rental.asset.damaged',
  'event.project.created',
  'event.project.completed',
  'event.proposal.created',
  'logistics.delivery.completed',
  // Operations OS 最小縦スライス（Phase 1-6）
  'inventory.stock.moved',
  'inventory.stock.reserved',
  'inventory.stock.dispatched',
  'inventory.stock.returned',
  'inventory.stock.damaged',
  'inventory.maintenance.created',
  'inventory.maintenance.completed',
  'inventory.availability.checked',
  'inventory.profitability.updated',
  'rental.reservation.confirmed',
  'rental.item.dispatched',
  'rental.item.returned',
  'rental.inspection.completed',
  'rental.damage.charged',
  'rental.revenue.recorded',
  'event.schedule.updated',
  'event.equipment.assigned',
  'event.staff.assigned',
  'event.task.completed',
  'event.issue.recorded',
  'event.completed',
  'event.profitability.recorded',
  // Operations 実行管理（棚卸/発注/物流/人員/リスク）— Phase 1-7
  'inventory.stocktake.created',
  'inventory.stocktake.reconciled',
  'inventory.purchase_order.created',
  'inventory.purchase_order.received',
  'inventory.reorder.suggested',
  'logistics.task.created',
  'logistics.setup.completed',
  'logistics.teardown.completed',
  'logistics.pickup.completed',
  'event.risk.created',
  'event.risk.resolved',
  // Finance Bridge（Operations→Finance）— Phase 1-8
  'finance.event.created',
  'finance.journal_candidate.created',
  'finance.invoice_candidate.created',
  'finance.cashflow_expected.created',
  'finance.purchase_order.bridged',
  'finance.event_project.bridged',
  'finance.damage_charge.bridged',
] as const;

export type GrowthEventType = (typeof GROWTH_EVENT_TYPES)[number];

export function isGrowthEventType(v: string): v is GrowthEventType {
  return (GROWTH_EVENT_TYPES as readonly string[]).includes(v);
}

/** type の先頭セグメントからカテゴリを導出。 */
export function growthCategoryOf(type: string): GrowthCategory {
  const head = type.split('.')[0];
  switch (head) {
    case 'marketing':
    case 'sales':
    case 'finance':
    case 'dx':
    case 'ai':
    case 'management':
    case 'customer':
      return head;
    case 'inventory':
    case 'rental':
    case 'event':
    case 'logistics':
      return 'operations';
    default:
      return 'management';
  }
}

/** 売上に直接関係するイベントか（ダッシュボードの「売上関連」集計用）。 */
export function isRevenueRelated(type: string): boolean {
  return (
    type === 'sales.deal.won' ||
    type === 'sales.order.fulfilled' ||
    type === 'finance.invoice.paid' ||
    type === 'marketing.lead.converted' ||
    type === 'customer.repeat.purchased'
  );
}

// ============ DX 改善機会のインパクト/優先度計算 ============

export type Difficulty = 'low' | 'medium' | 'high';

export interface DxImpactInput {
  estimatedTimeSavingMinutes: number; // 月あたり削減分
  estimatedCostSaving: number; // 円/月
  estimatedRevenueImpact: number; // 円/月
  difficulty: Difficulty;
}

const HOURLY_LABOR_COST = 3000; // 円/時（工数→金額換算の既定）
const DIFFICULTY_FACTOR: Record<Difficulty, number> = { low: 1, medium: 0.7, high: 0.45 };

/** 工数削減を金額換算し、コスト削減・売上インパクトと合算した月次インパクト（円）。 */
export function dxMonetaryImpact(input: DxImpactInput): number {
  const timeMoney = (Math.max(0, input.estimatedTimeSavingMinutes) / 60) * HOURLY_LABOR_COST;
  return Math.round(timeMoney + Math.max(0, input.estimatedCostSaving) + Math.max(0, input.estimatedRevenueImpact));
}

/**
 * 優先度スコア（0-100）。インパクトが大きく、難易度が低いほど高い。
 * 実装容易性で重み付けし、即効性のある施策を上位に。
 */
export function dxPriorityScore(input: DxImpactInput): number {
  const impact = dxMonetaryImpact(input);
  // 100万円/月で頭打ちの対数的スケール
  const impactScore = Math.min(100, (impact / 1_000_000) * 100);
  const score = impactScore * DIFFICULTY_FACTOR[input.difficulty];
  return Math.round(Math.max(0, Math.min(100, score)));
}

// ============ 成長イベント群の集計 ============

export interface GrowthLike {
  type: string;
  revenueImpact?: number | null;
  costSaving?: number | null;
  timeSavingMinutes?: number | null;
}

export interface GrowthSummary {
  total: number;
  revenueRelated: number;
  byCategory: Record<string, number>;
  totalRevenueImpact: number;
  totalCostSaving: number;
  totalTimeSavingMinutes: number;
}

export function summarizeGrowth(events: GrowthLike[]): GrowthSummary {
  const byCategory: Record<string, number> = {};
  let revenueRelated = 0;
  let totalRevenueImpact = 0;
  let totalCostSaving = 0;
  let totalTimeSavingMinutes = 0;
  for (const e of events) {
    const cat = growthCategoryOf(e.type);
    byCategory[cat] = (byCategory[cat] ?? 0) + 1;
    if (isRevenueRelated(e.type)) revenueRelated++;
    totalRevenueImpact += e.revenueImpact ?? 0;
    totalCostSaving += e.costSaving ?? 0;
    totalTimeSavingMinutes += e.timeSavingMinutes ?? 0;
  }
  return {
    total: events.length,
    revenueRelated,
    byCategory,
    totalRevenueImpact,
    totalCostSaving,
    totalTimeSavingMinutes,
  };
}
