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
