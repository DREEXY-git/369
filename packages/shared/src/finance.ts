import type { AlertSeverity } from './types';

export interface QuoteTotals {
  discountedSubtotal: number;
  tax: number;
  total: number;
  grossMargin: number;
  grossMarginRate: number; // %
}

/** 見積の粗利・税込合計を計算（JPY は整数丸め）。 */
export function computeQuoteTotals(
  subtotal: number,
  cost: number,
  discountRate = 0,
  taxRate = 10,
): QuoteTotals {
  const discounted = Math.round(subtotal * (1 - discountRate / 100));
  const tax = Math.round(discounted * (taxRate / 100));
  const total = discounted + tax;
  const grossMargin = discounted - cost;
  const grossMarginRate = discounted > 0 ? (grossMargin / discounted) * 100 : 0;
  return {
    discountedSubtotal: discounted,
    tax,
    total,
    grossMargin,
    grossMarginRate: Math.round(grossMarginRate * 10) / 10,
  };
}

export const LOW_MARGIN_THRESHOLD = 15; // %

export function isLowMargin(grossMarginRate: number): boolean {
  return grossMarginRate < LOW_MARGIN_THRESHOLD;
}

export function isOverdue(
  dueDate: Date | string | null | undefined,
  status: string,
  now: Date = new Date(),
): boolean {
  if (!dueDate) return false;
  const paidLike = ['PAID', 'VOID', 'collected'];
  if (paidLike.includes(status)) return false;
  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  return due.getTime() < now.getTime();
}

export interface CashflowInputLine {
  date: Date | string;
  inflow: number;
  outflow: number;
  note?: string;
}
export interface CashflowResultLine extends CashflowInputLine {
  balance: number;
  shortage: boolean;
}
export interface CashflowResult {
  lines: CashflowResultLine[];
  minBalance: number;
  shortageDate: Date | null;
}

/** 資金繰り予測: 期首残高と各日の入出金から残高推移と資金ショートを算出。 */
export function forecastCashflow(opening: number, lines: CashflowInputLine[]): CashflowResult {
  let balance = opening;
  let minBalance = opening;
  let shortageDate: Date | null = null;
  const sorted = [...lines].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const out: CashflowResultLine[] = sorted.map((l) => {
    balance = balance + l.inflow - l.outflow;
    const shortage = balance < 0;
    if (shortage && !shortageDate) shortageDate = new Date(l.date);
    if (balance < minBalance) minBalance = balance;
    return { ...l, balance, shortage };
  });
  return { lines: out, minBalance, shortageDate };
}

export interface ProfitLeakInput {
  quotes?: { id: string; title: string; grossMarginRate: number; discountRate: number; total: number }[];
  unbilledDeals?: { id: string; title: string; amount: number }[];
  overdueReceivables?: { id: string; amount: number; customer?: string }[];
  idleAssets?: { id: string; name: string; utilizationRate: number; acquisitionCost: number }[];
}

export interface ProfitLeakFinding {
  type: 'low_margin' | 'discount' | 'unbilled' | 'overdue' | 'idle_asset';
  title: string;
  impactJpy: number;
  severity: AlertSeverity;
  detail: string;
  recommendation: string;
  entityId?: string;
}

/** ルールベース利益漏れ検知。AI は説明文を上乗せする想定。 */
export function detectProfitLeaks(input: ProfitLeakInput): ProfitLeakFinding[] {
  const findings: ProfitLeakFinding[] = [];

  for (const q of input.quotes ?? []) {
    if (q.grossMarginRate < 0) {
      findings.push({
        type: 'low_margin',
        title: `赤字見積: ${q.title}`,
        impactJpy: Math.round((Math.abs(q.grossMarginRate) / 100) * q.total),
        severity: 'HIGH',
        detail: `粗利率 ${q.grossMarginRate}% で赤字。`,
        recommendation: '原価・値引きを見直し、再見積を承認フローへ。',
        entityId: q.id,
      });
    } else if (isLowMargin(q.grossMarginRate)) {
      findings.push({
        type: 'low_margin',
        title: `低粗利見積: ${q.title}`,
        impactJpy: Math.round(((LOW_MARGIN_THRESHOLD - q.grossMarginRate) / 100) * q.total),
        severity: 'MEDIUM',
        detail: `粗利率 ${q.grossMarginRate}% は基準 ${LOW_MARGIN_THRESHOLD}% 未満。`,
        recommendation: '値引き根拠の確認、または付帯サービスで粗利改善。',
        entityId: q.id,
      });
    }
    if (q.discountRate >= 20) {
      findings.push({
        type: 'discount',
        title: `過大値引き: ${q.title}`,
        impactJpy: Math.round((q.discountRate / 100) * q.total),
        severity: 'MEDIUM',
        detail: `値引き率 ${q.discountRate}%。`,
        recommendation: '値引き上限ポリシーの適用と承認確認。',
        entityId: q.id,
      });
    }
  }

  for (const d of input.unbilledDeals ?? []) {
    findings.push({
      type: 'unbilled',
      title: `請求漏れ候補: ${d.title}`,
      impactJpy: d.amount,
      severity: 'HIGH',
      detail: '納品/受注済みだが請求書が未作成。',
      recommendation: '請求書を作成し送付承認へ。',
      entityId: d.id,
    });
  }

  for (const r of input.overdueReceivables ?? []) {
    findings.push({
      type: 'overdue',
      title: `回収遅延: ${r.customer ?? r.id}`,
      impactJpy: r.amount,
      severity: 'HIGH',
      detail: '支払期日を超過した売掛金。',
      recommendation: '督促文ドラフトを作成し、回収アクションを実行。',
      entityId: r.id,
    });
  }

  for (const a of input.idleAssets ?? []) {
    if (a.utilizationRate < 10) {
      findings.push({
        type: 'idle_asset',
        title: `眠っているリース商品: ${a.name}`,
        impactJpy: Math.round(a.acquisitionCost * 0.1),
        severity: 'LOW',
        detail: `稼働率 ${a.utilizationRate}%。`,
        recommendation: 'セット提案・値下げ・他案件への転用を検討。',
        entityId: a.id,
      });
    }
  }

  return findings.sort((a, b) => b.impactJpy - a.impactJpy);
}

// ============ Finance Bridge（Operations→Finance）純ロジック — Phase 1-8 ============
// 設計は docs/audit/12_maintenance_architecture.md を参照。DB非依存。

export type FinanceEventType =
  | 'event_revenue'
  | 'event_cost'
  | 'purchase_order'
  | 'purchase_order_received'
  | 'damage_charge'
  | 'invoice_candidate'
  | 'payment_expected'
  | 'payment_received'
  | 'journal_candidate'
  | 'cashflow_expected';

export type FinanceDirection = 'inflow' | 'outflow' | 'neutral';

/**
 * FinanceEvent 種別の既定のキャッシュ方向。
 * cashflow_expected / journal_candidate は文脈依存のため neutral（呼び出し側で明示）。
 */
export function financeEventDirection(type: FinanceEventType): FinanceDirection {
  switch (type) {
    case 'event_revenue':
    case 'damage_charge':
    case 'invoice_candidate':
    case 'payment_expected':
    case 'payment_received':
      return 'inflow';
    case 'event_cost':
    case 'purchase_order':
    case 'purchase_order_received':
      return 'outflow';
    default:
      return 'neutral';
  }
}

export type JournalKind = 'revenue' | 'cost' | 'purchase' | 'damage';

export interface JournalCandidateMap {
  debitAccount: string;
  creditAccount: string;
  description: string;
}

/** 仕訳候補の借方/貸方マッピング（簡易・日本の一般的勘定科目）。 */
export function journalCandidateFor(kind: JournalKind): JournalCandidateMap {
  switch (kind) {
    case 'revenue':
      return { debitAccount: '売掛金', creditAccount: '売上高', description: 'イベント売上' };
    case 'cost':
      return { debitAccount: '売上原価', creditAccount: '未払金', description: 'イベント原価' };
    case 'purchase':
      return { debitAccount: '仕入', creditAccount: '買掛金', description: '発注' };
    case 'damage':
      return { debitAccount: '売掛金', creditAccount: '雑収入', description: '破損請求' };
  }
}

export const DEFAULT_TAX_RATE = 0.1; // 消費税10%（既定）

export interface InvoiceCandidateTotals {
  subtotal: number;
  taxAmount: number;
  total: number;
}

/** 税抜金額から税額・税込合計を算出（端数は四捨五入）。 */
export function invoiceCandidateTotals(subtotal: number, taxRate: number = DEFAULT_TAX_RATE): InvoiceCandidateTotals {
  const base = Math.max(0, subtotal);
  const taxAmount = Math.round(base * taxRate);
  return { subtotal: base, taxAmount, total: base + taxAmount };
}

export interface FinanceEventLike {
  type: string;
  direction: string;
  amount: number;
  status: string;
}

export interface FinanceBridgeSummary {
  total: number;
  inflowExpected: number;
  outflowExpected: number;
  netExpected: number;
  byType: Record<string, number>;
}

// 予定として集計する状態（確定前の見込み）。
const EXPECTED_STATUSES = new Set(['draft', 'pending_approval', 'approved']);

/** FinanceEvent 群を資金繰り見込み（入金/支払予定）として集計。 */
export function summarizeFinanceEvents(events: FinanceEventLike[]): FinanceBridgeSummary {
  const byType: Record<string, number> = {};
  let inflowExpected = 0;
  let outflowExpected = 0;
  for (const e of events) {
    byType[e.type] = (byType[e.type] ?? 0) + 1;
    if (!EXPECTED_STATUSES.has(e.status)) continue;
    if (e.direction === 'inflow') inflowExpected += Math.max(0, e.amount);
    else if (e.direction === 'outflow') outflowExpected += Math.max(0, e.amount);
  }
  return {
    total: events.length,
    inflowExpected,
    outflowExpected,
    netExpected: inflowExpected - outflowExpected,
    byType,
  };
}

// ============ 候補→正式化（Candidate Formalization）純ロジック — Phase 1-9 ============

export interface JournalEntryLineDraft {
  account: string; // 勘定科目名
  debit: number;
  credit: number;
}

/** 借方/貸方の勘定科目名と金額から複式の2行を生成（借方=amount / 貸方=amount）。 */
export function journalEntryLinesFor(debitAccount: string, creditAccount: string, amount: number): JournalEntryLineDraft[] {
  const a = Math.max(0, amount);
  return [
    { account: debitAccount, debit: a, credit: 0 },
    { account: creditAccount, debit: 0, credit: a },
  ];
}

/** 仕訳が借方=貸方でバランスしているか（複式の整合性）。 */
export function isBalancedJournal(lines: JournalEntryLineDraft[]): boolean {
  const debit = lines.reduce((s, l) => s + l.debit, 0);
  const credit = lines.reduce((s, l) => s + l.credit, 0);
  return debit === credit && debit > 0;
}

/** 仕訳候補を正式化してよいか（金額>0・借方/貸方の勘定科目あり）。 */
export function canFormalizeJournal(input: { amount: number; debitAccount: string; creditAccount: string }): boolean {
  return input.amount > 0 && input.debitAccount.trim().length > 0 && input.creditAccount.trim().length > 0;
}

// 勘定科目名 → 種別（asset/liability/equity/revenue/expense）の簡易推定（Account 自動作成時の type 用）。
// 注: 「売上原価」が「売上」(revenue)に誤マッチしないよう expense を revenue より先に判定する。
const ACCOUNT_TYPE_HINTS: { re: RegExp; type: string }[] = [
  { re: /売掛金|現金|預金|未収/, type: 'asset' },
  { re: /買掛金|未払|借入/, type: 'liability' },
  { re: /原価|仕入|費|経費|給与/, type: 'expense' },
  { re: /売上|収入/, type: 'revenue' },
];

export function inferAccountType(name: string): string {
  for (const h of ACCOUNT_TYPE_HINTS) if (h.re.test(name)) return h.type;
  return 'asset';
}

// ============ 請求送信・入金消込（Invoice Send / Payment Reconciliation）純ロジック — Phase 1-10 ============

/** 未回収額（税込合計 − 入金済）。負にはしない。 */
export function invoiceOutstanding(total: number, paidAmount: number): number {
  return Math.max(0, total - paidAmount);
}

/** 入金後の Invoice ステータス（total 以上 → PAID、未満かつ入金あり → PARTIALLY_PAID）。 */
export function invoiceStatusAfterPayment(total: number, paidAmount: number): 'PAID' | 'PARTIALLY_PAID' {
  return paidAmount >= total ? 'PAID' : 'PARTIALLY_PAID';
}

/** 入金後の Receivable ステータス（全額入金 → collected、それ以外 → open）。 */
export function receivableStatusAfterPayment(total: number, paidAmount: number): 'collected' | 'open' {
  return paidAmount >= total ? 'collected' : 'open';
}

// 送信可能な Invoice ステータス（正式化済みだが未送信）。
const SENDABLE_INVOICE_STATUSES = new Set(['DRAFT', 'ISSUED']);

/** 外部送信してよい Invoice か（DRAFT/ISSUED のみ。SENT以降は二重送信不可）。 */
export function canSendInvoice(status: string): boolean {
  return SENDABLE_INVOICE_STATUSES.has(status);
}

/** 既に送信済み（以降）の Invoice か（二重送信防止）。 */
export function isInvoiceSent(status: string): boolean {
  return !SENDABLE_INVOICE_STATUSES.has(status) && status !== 'VOID';
}

export interface CashflowActualExpected {
  inflowExpected: number;
  outflowExpected: number;
  inflowActual: number;
  outflowActual: number;
  netExpected: number;
  netActual: number;
  byStatus: Record<string, number>;
  paymentShortfallWarning: boolean; // 支払予定が入金予定を上回る
}

// 予定として数える状態（確定前の見込み）／実績として数える状態（posted）。
const CF_EXPECTED_STATUSES = new Set(['draft', 'pending_approval', 'approved']);
// 資金繰りの対象とする FinanceEvent 種別（予定/実績の金額イベント）。
const CF_FLOW_TYPES = new Set(['cashflow_expected', 'payment_expected', 'payment_received']);

/** FinanceEvent を「予定 vs 実績」で入金/支払別に集計（資金繰り統合用）。 */
export function summarizeCashflowActualVsExpected(
  events: { type: string; direction: string; amount: number; status: string }[],
): CashflowActualExpected {
  const byStatus: Record<string, number> = {};
  let inflowExpected = 0;
  let outflowExpected = 0;
  let inflowActual = 0;
  let outflowActual = 0;
  for (const e of events) {
    byStatus[e.status] = (byStatus[e.status] ?? 0) + 1;
    if (!CF_FLOW_TYPES.has(e.type)) continue;
    const amt = Math.max(0, e.amount);
    const isActual = e.status === 'posted';
    const isExpected = CF_EXPECTED_STATUSES.has(e.status);
    if (e.direction === 'inflow') {
      if (isActual) inflowActual += amt;
      else if (isExpected) inflowExpected += amt;
    } else if (e.direction === 'outflow') {
      if (isActual) outflowActual += amt;
      else if (isExpected) outflowExpected += amt;
    }
  }
  return {
    inflowExpected,
    outflowExpected,
    inflowActual,
    outflowActual,
    netExpected: inflowExpected - outflowExpected,
    netActual: inflowActual - outflowActual,
    byStatus,
    paymentShortfallWarning: outflowExpected > inflowExpected,
  };
}

// ============ P3-Q2C: 見積→請求 変換（Quote → Invoice conversion）— 純ロジック ============

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * quote_issue 承認の決定後、見積が遷移すべきステータス（純判定）。
 * approve → approved（発行確定・以後 請求書化が可能）／reject → rejected。
 * decideQuoteIssueCore の CAS（pending_approval → 本値）で使う。
 */
export function quoteStatusOnIssueDecision(decision: 'approve' | 'reject'): { status: 'approved' | 'rejected' } {
  return { status: decision === 'approve' ? 'approved' : 'rejected' };
}

/**
 * その見積を請求書へ変換してよいか（純判定）。
 * 変換できるのは発行確定済み（approved）の見積のみ。draft / pending_approval / rejected / sent は不可。
 * 「既に請求書化済みか」は別軸（Invoice.quoteId の unique 制約と呼び出し側の存在確認）で担保する。
 */
export function canConvertQuoteToInvoice(quoteStatus: string): boolean {
  return quoteStatus === 'approved';
}

export interface QuoteLineForInvoice {
  name: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface InvoiceDraftFromQuote {
  subtotal: number;
  taxAmount: number;
  total: number;
  lineItems: QuoteLineForInvoice[];
}

/**
 * 見積の明細・値引き率・税率から請求書ドラフトの金額を導出する純関数。
 * Invoice には値引き列が無いため、値引きは各明細の単価/金額へ按分して織り込む
 * （invoice.subtotal = 値引き後小計・課税標準）。原価(unitCost)は請求書には持たせない。
 *  - factor = 1 - 値引き率/100 を各行に適用し 2 桁で丸め、行金額の合算を小計とする。
 *  - 税額 = round2(小計 × 税率/100)、合計 = round2(小計 + 税額)。
 * 丸めを行単位で確定させ Σ(行金額)=小計 を保証する（請求書の内訳と合計が常に一致）。
 */
export function buildInvoiceDraftFromQuote(
  quote: { discountRate: number; taxRate: number },
  lines: QuoteLineForInvoice[],
): InvoiceDraftFromQuote {
  const factor = 1 - (Number(quote.discountRate) || 0) / 100;
  const lineItems = lines.map((l) => ({
    name: l.name,
    quantity: Number(l.quantity) || 0,
    unitPrice: round2((Number(l.unitPrice) || 0) * factor),
    amount: round2((Number(l.amount) || 0) * factor),
  }));
  const subtotal = round2(lineItems.reduce((s, l) => s + l.amount, 0));
  const taxAmount = round2((subtotal * (Number(quote.taxRate) || 0)) / 100);
  const total = round2(subtotal + taxAmount);
  return { subtotal, taxAmount, total, lineItems };
}
