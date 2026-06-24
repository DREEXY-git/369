// Planning Hokko Golden Path を「経営者が一目で判断できる」executive KPI へ集約する純ロジック。Phase 1-12。
// 各 EventProject から集めた事実（ExecProjectFact）だけを受け取り、DB/UI 非依存で
//   - 全体KPI（進捗・件数・未回収・資金繰り影響・承認待ち）
//   - 案件別KPI（粗利/低粗利・リスク・物流・請求/入金の現在地・次の一手）
//   - 「今すぐ見るべき案件」優先度（低粗利/未回収/高リスク/承認待ち/物流未完了/Bridge未接続）
//   - finance 項目の redact（STAFF 等 finance 権限なしへはデータ整形段階で金額を渡さない）
// を返す。集計は page.tsx ではなく必ずここに集約する（保守性）。クエリ取得は web 側 lib が担当。
import { eventProfitMargin } from './operations';
import { GOLDEN_PATH_LOW_MARGIN_THRESHOLD } from './golden-path';

// ---- 入力（web lib がバッチ取得して組み立てる、既存モデル由来の事実のみ） ----
export interface ExecProjectFact {
  id: string;
  name: string;
  customerName: string | null;
  eventDate: Date | null;
  venue: string | null;
  status: string; // EventProject.status（planned / completed 等）
  completedAt: Date | null; // 経営上の完了日時。null なら status=completed かつ eventDate 当月で代理（Phase 1-13）
  // Golden Path 進捗（computeGoldenPath の結果を渡す）
  progressPercent: number;
  doneCount: number;
  totalCount: number;
  nextActionKey: string | null;
  nextActionLabel: string | null;
  // 業務（finance 機密でない＝STAFF にも見せてよい）
  highRiskOpen: boolean;
  unfinishedLogisticsCount: number;
  overdueLogisticsCount: number;
  staffAssigned: boolean;
  bridged: boolean;
  invoiceCandidateCreated: boolean;
  invoiceFormalized: boolean; // 正式請求書あり
  invoiceSent: boolean;
  approvalPendingCount: number;
  // finance（機密＝redact 対象。金額・粗利・回収状況）
  revenue: number;
  cost: number;
  invoiceTotal: number;
  paidAmount: number;
  unpaidAmount: number; // 請求済かつ未回収の残額（max(total-paid,0)）。未請求は 0
  receivableOverdue: boolean;
  invoiceId: string | null; // 是正アクションの deep link 用（finance機密＝redact対象）
}

// ---- 「今すぐ見るべき案件」理由コードと重み（優先度） ----
export type AttentionReasonCode =
  | 'overdue_receivable' // 売掛延滞（最優先・お金が危ない）
  | 'high_risk' // high/critical risk が open
  | 'unsent_invoice' // 正式請求書はあるが未送信（請求できていない）
  | 'unpaid' // 請求済だが未回収残あり
  | 'low_margin' // 粗利率が閾値未満
  | 'overdue_logistics' // 物流タスクが期限超過
  | 'approval_pending' // 承認待ちあり
  | 'unbridged'; // 売上ありだが Finance Bridge 未接続（未請求リスク）

// finance 権限が必要な理由（金額の存在を示唆するため redact 時に除外）。
const FINANCE_REASONS: ReadonlySet<AttentionReasonCode> = new Set<AttentionReasonCode>([
  'overdue_receivable',
  'unpaid',
  'low_margin',
]);

export const EXEC_ATTENTION_WEIGHT: Record<AttentionReasonCode, number> = {
  overdue_receivable: 100,
  high_risk: 80,
  unsent_invoice: 60,
  unpaid: 50,
  low_margin: 40,
  overdue_logistics: 35,
  approval_pending: 30,
  unbridged: 20,
};

export const EXEC_ATTENTION_LABEL: Record<AttentionReasonCode, string> = {
  overdue_receivable: '売掛延滞',
  high_risk: '高リスク',
  unsent_invoice: '請求書未送信',
  unpaid: '未回収あり',
  low_margin: '低粗利',
  overdue_logistics: '物流遅延',
  approval_pending: '承認待ち',
  unbridged: 'Finance未接続',
};

// ---- 案件別 KPI（finance 項目は redact 後 null になりうる） ----
export interface ExecProjectKpi {
  id: string;
  name: string;
  customerName: string | null;
  eventDate: Date | null;
  venue: string | null;
  status: string;
  active: boolean; // status !== 'completed'
  completedAt: Date | null;
  progressPercent: number;
  doneCount: number;
  totalCount: number;
  nextActionKey: string | null;
  nextActionLabel: string | null;
  // 業務（非機密）
  highRiskOpen: boolean;
  unfinishedLogisticsCount: number;
  overdueLogisticsCount: number;
  staffAssigned: boolean;
  bridged: boolean;
  invoiceCandidateCreated: boolean;
  invoiceFormalized: boolean;
  invoiceSent: boolean;
  approvalPendingCount: number;
  // finance（機密・redact 対象）
  revenue: number | null;
  cost: number | null;
  gross: number | null;
  marginPercent: number | null;
  lowMargin: boolean | null;
  unpaidAmount: number | null;
  paidAmount: number | null;
  receivableOverdue: boolean | null;
  invoiceId: string | null; // 是正アクションの deep link 用（redact対象）
  // 優先度
  attentionReasons: AttentionReasonCode[];
  attentionScore: number;
}

// ---- 全体 KPI ---- finance 項目は redact 後 null。
export interface ExecOverall {
  // 件数・進捗（非機密）
  activeCount: number;
  completedCount: number;
  avgProgressPercent: number; // 進行中案件の平均進捗（進行中ゼロなら 0）
  monthEventCount: number; // 今月開催（eventDate が当月）
  monthCompletedCount: number; // 今月完了（completedAt 不在のため status=completed かつ eventDate 当月で代理）
  highRiskCount: number;
  unfinishedLogisticsTotal: number;
  overdueLogisticsCount: number;
  staffUnassignedCount: number;
  unbridgedCount: number; // 進行中かつ売上ありで Bridge 未接続
  invoiceCandidateMissingCount: number; // Bridge 済だが請求候補なし
  invoiceNotFormalizedCount: number; // 請求候補あり/Bridge 済だが正式請求書なし
  unsentInvoiceCount: number; // 正式請求書あるが未送信
  approvalPendingTotal: number;
  attentionCount: number; // 「今すぐ見るべき案件」件数
  // finance（機密・redact 対象）
  lowMarginCount: number | null;
  unpaidTotal: number | null; // 未回収請求額（請求済 - 入金済）
  overdueReceivableTotal: number | null; // うち延滞分
  paidTotal: number | null; // 入金済金額
  monthInflowExpected: number | null; // 今月入金予定（cashflow）
  monthOutflowExpected: number | null; // 今月支払予定（cashflow）
  cashflowTight: boolean | null; // 今月支払予定 > 今月入金予定
}

export interface ExecutiveDashboard {
  overall: ExecOverall;
  projects: ExecProjectKpi[]; // 全件（attentionScore 付き）
  attention: ExecProjectKpi[]; // attentionScore>0 を優先度降順（上位 attentionLimit 件）
  financeVisible: boolean;
}

export interface ExecSummaryOptions {
  monthStart: Date;
  monthEnd: Date; // 当月の翌月 1 日 0:00（[monthStart, monthEnd) で判定）
  monthInflowExpected: number; // cashflow から（今月入金予定）
  monthOutflowExpected: number; // cashflow から（今月支払予定）
  attentionLimit?: number; // 「今すぐ見るべき案件」上限（既定 8）
}

function inMonth(d: Date | null, start: Date, end: Date): boolean {
  return d != null && d >= start && d < end;
}

/** 「今月完了」判定: completedAt があれば優先、無ければ status=completed かつ eventDate 当月で代理。Phase 1-13。 */
export function isCompletedInMonth(f: ExecProjectFact, start: Date, end: Date): boolean {
  if (f.completedAt != null) return inMonth(f.completedAt, start, end);
  return f.status === 'completed' && inMonth(f.eventDate, start, end);
}

/** 1 案件の事実 → KPI（finance 込み・redact 前）。理由コードと優先度スコアを付与。 */
function toProjectKpi(f: ExecProjectFact): ExecProjectKpi {
  const gross = f.revenue - f.cost;
  const marginPercent = eventProfitMargin(f.revenue, f.cost);
  const lowMargin = f.revenue > 0 && marginPercent < GOLDEN_PATH_LOW_MARGIN_THRESHOLD;
  const active = f.status !== 'completed';

  const reasons: AttentionReasonCode[] = [];
  // お金が危ない順（延滞 > 未送信 > 未回収）。延滞と未回収の二重計上は避ける。
  if (f.receivableOverdue) reasons.push('overdue_receivable');
  if (f.highRiskOpen) reasons.push('high_risk');
  if (f.invoiceFormalized && !f.invoiceSent) reasons.push('unsent_invoice');
  if (!f.receivableOverdue && f.unpaidAmount > 0) reasons.push('unpaid');
  if (lowMargin) reasons.push('low_margin');
  if (f.overdueLogisticsCount > 0) reasons.push('overdue_logistics');
  if (f.approvalPendingCount > 0) reasons.push('approval_pending');
  if (!f.bridged && f.revenue > 0) reasons.push('unbridged');

  const attentionScore = reasons.reduce((s, r) => s + EXEC_ATTENTION_WEIGHT[r], 0);

  return {
    id: f.id,
    name: f.name,
    customerName: f.customerName,
    eventDate: f.eventDate,
    venue: f.venue,
    status: f.status,
    active,
    completedAt: f.completedAt,
    progressPercent: f.progressPercent,
    doneCount: f.doneCount,
    totalCount: f.totalCount,
    nextActionKey: f.nextActionKey,
    nextActionLabel: f.nextActionLabel,
    highRiskOpen: f.highRiskOpen,
    unfinishedLogisticsCount: f.unfinishedLogisticsCount,
    overdueLogisticsCount: f.overdueLogisticsCount,
    staffAssigned: f.staffAssigned,
    bridged: f.bridged,
    invoiceCandidateCreated: f.invoiceCandidateCreated,
    invoiceFormalized: f.invoiceFormalized,
    invoiceSent: f.invoiceSent,
    approvalPendingCount: f.approvalPendingCount,
    revenue: f.revenue,
    cost: f.cost,
    gross,
    marginPercent,
    lowMargin,
    unpaidAmount: f.unpaidAmount,
    paidAmount: f.paidAmount,
    receivableOverdue: f.receivableOverdue,
    invoiceId: f.invoiceId,
    attentionReasons: reasons,
    attentionScore,
  };
}

// 優先度降順 → 開催日昇順（近い案件を上に）で安定ソート。
function byAttention(a: ExecProjectKpi, b: ExecProjectKpi): number {
  if (b.attentionScore !== a.attentionScore) return b.attentionScore - a.attentionScore;
  const at = a.eventDate ? a.eventDate.getTime() : Number.MAX_SAFE_INTEGER;
  const bt = b.eventDate ? b.eventDate.getTime() : Number.MAX_SAFE_INTEGER;
  return at - bt;
}

/** 案件別事実の配列 → executive ダッシュボード（finance 込み）。純関数。 */
export function summarizeExecutiveDashboard(
  facts: ExecProjectFact[],
  opts: ExecSummaryOptions,
): ExecutiveDashboard {
  const projects = facts.map(toProjectKpi);
  const limit = opts.attentionLimit ?? 8;

  const activeProjects = projects.filter((p) => p.active);
  const activeCount = activeProjects.length;
  const completedCount = projects.length - activeCount;
  const avgProgressPercent =
    activeCount === 0 ? 0 : Math.round(activeProjects.reduce((s, p) => s + p.progressPercent, 0) / activeCount);

  const overall: ExecOverall = {
    activeCount,
    completedCount,
    avgProgressPercent,
    monthEventCount: facts.filter((f) => inMonth(f.eventDate, opts.monthStart, opts.monthEnd)).length,
    monthCompletedCount: facts.filter((f) => isCompletedInMonth(f, opts.monthStart, opts.monthEnd)).length,
    highRiskCount: projects.filter((p) => p.highRiskOpen).length,
    unfinishedLogisticsTotal: projects.reduce((s, p) => s + p.unfinishedLogisticsCount, 0),
    overdueLogisticsCount: projects.filter((p) => p.overdueLogisticsCount > 0).length,
    staffUnassignedCount: activeProjects.filter((p) => !p.staffAssigned).length,
    unbridgedCount: projects.filter((p) => p.active && !p.bridged && (p.revenue ?? 0) > 0).length,
    invoiceCandidateMissingCount: projects.filter((p) => p.bridged && !p.invoiceCandidateCreated).length,
    invoiceNotFormalizedCount: projects.filter((p) => p.bridged && !p.invoiceFormalized).length,
    unsentInvoiceCount: projects.filter((p) => p.invoiceFormalized && !p.invoiceSent).length,
    approvalPendingTotal: projects.reduce((s, p) => s + p.approvalPendingCount, 0),
    attentionCount: projects.filter((p) => p.attentionScore > 0).length,
    // finance
    lowMarginCount: projects.filter((p) => p.lowMargin === true).length,
    unpaidTotal: projects.reduce((s, p) => s + (p.unpaidAmount ?? 0), 0),
    overdueReceivableTotal: projects.reduce((s, p) => s + (p.receivableOverdue ? (p.unpaidAmount ?? 0) : 0), 0),
    paidTotal: projects.reduce((s, p) => s + (p.paidAmount ?? 0), 0),
    monthInflowExpected: opts.monthInflowExpected,
    monthOutflowExpected: opts.monthOutflowExpected,
    cashflowTight: opts.monthOutflowExpected > opts.monthInflowExpected,
  };

  const attention = projects
    .filter((p) => p.attentionScore > 0)
    .sort(byAttention)
    .slice(0, limit);

  return { overall, projects, attention, financeVisible: true };
}

/**
 * finance 権限が無い閲覧者（STAFF 等）向けに、金額・粗利・回収状況をデータ整形段階で除去する純関数。
 * 単に UI で隠すのではなく、ここで null 化し、finance 由来の attention 理由も除外して優先度を再計算する。
 * canViewFinance=true ならそのまま返す。
 */
export function redactExecutiveFinance(
  dashboard: ExecutiveDashboard,
  canViewFinance: boolean,
): ExecutiveDashboard {
  if (canViewFinance) return dashboard;

  const redactProject = (p: ExecProjectKpi): ExecProjectKpi => {
    const reasons = p.attentionReasons.filter((r) => !FINANCE_REASONS.has(r));
    return {
      ...p,
      revenue: null,
      cost: null,
      gross: null,
      marginPercent: null,
      lowMargin: null,
      unpaidAmount: null,
      paidAmount: null,
      receivableOverdue: null,
      invoiceId: null,
      attentionReasons: reasons,
      attentionScore: reasons.reduce((s, r) => s + EXEC_ATTENTION_WEIGHT[r], 0),
    };
  };

  const projects = dashboard.projects.map(redactProject);
  const attention = projects
    .filter((p) => p.attentionScore > 0)
    .sort(byAttention)
    .slice(0, dashboard.attention.length > 0 ? Math.max(dashboard.attention.length, 8) : 8);

  const overall: ExecOverall = {
    ...dashboard.overall,
    attentionCount: projects.filter((p) => p.attentionScore > 0).length,
    lowMarginCount: null,
    unpaidTotal: null,
    overdueReceivableTotal: null,
    paidTotal: null,
    monthInflowExpected: null,
    monthOutflowExpected: null,
    cashflowTight: null,
  };

  return { overall, projects, attention, financeVisible: false };
}
