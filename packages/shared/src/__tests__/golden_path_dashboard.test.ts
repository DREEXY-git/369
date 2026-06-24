import { describe, it, expect } from 'vitest';
import {
  summarizeExecutiveDashboard,
  redactExecutiveFinance,
  type ExecProjectFact,
  type ExecSummaryOptions,
} from '../golden-path-dashboard';

const monthStart = new Date('2026-06-01T00:00:00Z');
const monthEnd = new Date('2026-07-01T00:00:00Z');

function opts(overrides: Partial<ExecSummaryOptions> = {}): ExecSummaryOptions {
  return { monthStart, monthEnd, monthInflowExpected: 0, monthOutflowExpected: 0, ...overrides };
}

// 問題のない進行中案件（attention 理由ゼロ）を起点に、部分上書きでシナリオを作る。
function fact(overrides: Partial<ExecProjectFact> = {}): ExecProjectFact {
  return {
    id: 'p',
    name: '案件',
    customerName: null,
    eventDate: null,
    venue: null,
    status: 'planned',
    progressPercent: 0,
    doneCount: 0,
    totalCount: 13,
    nextActionKey: 'customer',
    nextActionLabel: '顧客の紐付け',
    highRiskOpen: false,
    unfinishedLogisticsCount: 0,
    overdueLogisticsCount: 0,
    staffAssigned: false,
    bridged: false,
    invoiceCandidateCreated: false,
    invoiceFormalized: false,
    invoiceSent: false,
    approvalPendingCount: 0,
    revenue: 0,
    cost: 0,
    invoiceTotal: 0,
    paidAmount: 0,
    unpaidAmount: 0,
    receivableOverdue: false,
    ...overrides,
  };
}

describe('summarizeExecutiveDashboard — 全体集計', () => {
  it('進行中案件の平均進捗を計算（完了案件は平均から除外）', () => {
    const d = summarizeExecutiveDashboard(
      [
        fact({ id: 'a', progressPercent: 40 }),
        fact({ id: 'b', progressPercent: 60 }),
        fact({ id: 'c', progressPercent: 100, status: 'completed' }),
      ],
      opts(),
    );
    expect(d.overall.activeCount).toBe(2);
    expect(d.overall.completedCount).toBe(1);
    expect(d.overall.avgProgressPercent).toBe(50);
  });

  it('進行中案件がゼロなら平均進捗は 0', () => {
    const d = summarizeExecutiveDashboard([fact({ status: 'completed', progressPercent: 100 })], opts());
    expect(d.overall.avgProgressPercent).toBe(0);
  });

  it('今月開催・今月完了を eventDate ベースで数える（completedAt 代理）', () => {
    const d = summarizeExecutiveDashboard(
      [
        fact({ id: 'a', eventDate: new Date('2026-06-15T00:00:00Z') }),
        fact({ id: 'b', eventDate: new Date('2026-06-20T00:00:00Z'), status: 'completed' }),
        fact({ id: 'c', eventDate: new Date('2026-05-01T00:00:00Z') }),
      ],
      opts(),
    );
    expect(d.overall.monthEventCount).toBe(2);
    expect(d.overall.monthCompletedCount).toBe(1);
  });

  it('未回収・入金済の合計を集計', () => {
    const d = summarizeExecutiveDashboard(
      [
        fact({ id: 'a', invoiceTotal: 100000, paidAmount: 30000, unpaidAmount: 70000, invoiceFormalized: true, invoiceSent: true }),
        fact({ id: 'b', invoiceTotal: 50000, paidAmount: 50000, unpaidAmount: 0, invoiceFormalized: true, invoiceSent: true }),
      ],
      opts(),
    );
    expect(d.overall.unpaidTotal).toBe(70000);
    expect(d.overall.paidTotal).toBe(80000);
  });

  it('今月支払予定 > 入金予定 で cashflowTight=true', () => {
    const tight = summarizeExecutiveDashboard([fact()], opts({ monthInflowExpected: 100000, monthOutflowExpected: 200000 }));
    expect(tight.overall.cashflowTight).toBe(true);
    const ok = summarizeExecutiveDashboard([fact()], opts({ monthInflowExpected: 300000, monthOutflowExpected: 100000 }));
    expect(ok.overall.cashflowTight).toBe(false);
  });
});

describe('summarizeExecutiveDashboard — 警告検知', () => {
  it('低粗利検知: 売上ありで粗利率が閾値未満', () => {
    const d = summarizeExecutiveDashboard([fact({ revenue: 100000, cost: 95000 })], opts()); // 5%
    const p = d.projects[0]!;
    expect(p.lowMargin).toBe(true);
    expect(p.marginPercent).toBeLessThan(15);
    expect(p.attentionReasons).toContain('low_margin');
    expect(d.overall.lowMarginCount).toBe(1);
  });

  it('低粗利は健全な粗利では出ない / 売上ゼロでも出ない', () => {
    expect(summarizeExecutiveDashboard([fact({ revenue: 100000, cost: 50000 })], opts()).projects[0]!.lowMargin).toBe(false);
    expect(summarizeExecutiveDashboard([fact({ revenue: 0, cost: 0 })], opts()).projects[0]!.lowMargin).toBe(false);
  });

  it('売掛延滞検知', () => {
    const d = summarizeExecutiveDashboard(
      [fact({ invoiceFormalized: true, invoiceSent: true, invoiceTotal: 100000, paidAmount: 0, unpaidAmount: 100000, receivableOverdue: true })],
      opts(),
    );
    const p = d.projects[0]!;
    expect(p.attentionReasons).toContain('overdue_receivable');
    expect(p.attentionReasons).not.toContain('unpaid'); // 延滞と未回収は二重計上しない
    expect(d.overall.overdueReceivableTotal).toBe(100000);
  });

  it('高リスク検知', () => {
    const d = summarizeExecutiveDashboard([fact({ highRiskOpen: true })], opts());
    expect(d.projects[0]!.attentionReasons).toContain('high_risk');
    expect(d.overall.highRiskCount).toBe(1);
  });

  it('物流遅延・承認待ち・Bridge未接続を検知', () => {
    const d = summarizeExecutiveDashboard(
      [fact({ overdueLogisticsCount: 2, unfinishedLogisticsCount: 3, approvalPendingCount: 1, revenue: 100000, cost: 50000 })],
      opts(),
    );
    const p = d.projects[0]!;
    expect(p.attentionReasons).toEqual(expect.arrayContaining(['overdue_logistics', 'approval_pending', 'unbridged']));
    expect(d.overall.unfinishedLogisticsTotal).toBe(3);
    expect(d.overall.approvalPendingTotal).toBe(1);
    expect(d.overall.unbridgedCount).toBe(1);
  });

  it('正式請求書ありで未送信なら unsent_invoice', () => {
    const d = summarizeExecutiveDashboard([fact({ bridged: true, invoiceCandidateCreated: true, invoiceFormalized: true, invoiceSent: false })], opts());
    expect(d.projects[0]!.attentionReasons).toContain('unsent_invoice');
    expect(d.overall.unsentInvoiceCount).toBe(1);
  });
});

describe('summarizeExecutiveDashboard — 「今すぐ見るべき案件」優先度', () => {
  it('お金が危ない案件（売掛延滞）を最優先で先頭にする', () => {
    const d = summarizeExecutiveDashboard(
      [
        fact({ id: 'low', approvalPendingCount: 1 }), // 30
        fact({ id: 'risk', highRiskOpen: true }), // 80
        fact({ id: 'overdue', invoiceFormalized: true, invoiceSent: true, unpaidAmount: 50000, receivableOverdue: true }), // 100
      ],
      opts(),
    );
    expect(d.attention.map((p) => p.id)).toEqual(['overdue', 'risk', 'low']);
    expect(d.attention[0]!.attentionScore).toBe(100);
  });

  it('attention は理由のある案件のみ（問題のない案件は除外）', () => {
    const d = summarizeExecutiveDashboard([fact({ id: 'clean' }), fact({ id: 'risk', highRiskOpen: true })], opts());
    expect(d.attention.map((p) => p.id)).toEqual(['risk']);
    expect(d.overall.attentionCount).toBe(1);
  });

  it('attentionLimit で上限を制御', () => {
    const many = Array.from({ length: 12 }, (_, i) => fact({ id: `r${i}`, highRiskOpen: true }));
    const d = summarizeExecutiveDashboard(many, opts({ attentionLimit: 5 }));
    expect(d.attention).toHaveLength(5);
    expect(d.overall.attentionCount).toBe(12);
  });
});

describe('redactExecutiveFinance — finance 権限ゲート（データ整形段階）', () => {
  const dashboard = () =>
    summarizeExecutiveDashboard(
      [
        fact({ id: 'a', revenue: 100000, cost: 95000, bridged: true, invoiceCandidateCreated: true, invoiceFormalized: true, invoiceSent: true, unpaidAmount: 100000, receivableOverdue: true, highRiskOpen: true }),
        fact({ id: 'b', revenue: 200000, cost: 90000, highRiskOpen: false, overdueLogisticsCount: 1 }),
      ],
      opts({ monthInflowExpected: 50000, monthOutflowExpected: 80000 }),
    );

  it('canViewFinance=true はそのまま（金額が見える）', () => {
    const d = redactExecutiveFinance(dashboard(), true);
    expect(d.financeVisible).toBe(true);
    expect(d.projects[0]!.revenue).toBe(100000);
    expect(d.overall.unpaidTotal).toBe(100000);
  });

  it('canViewFinance=false は金額・粗利・回収状況をすべて null 化', () => {
    const d = redactExecutiveFinance(dashboard(), false);
    expect(d.financeVisible).toBe(false);
    for (const p of d.projects) {
      expect(p.revenue).toBeNull();
      expect(p.cost).toBeNull();
      expect(p.gross).toBeNull();
      expect(p.marginPercent).toBeNull();
      expect(p.lowMargin).toBeNull();
      expect(p.unpaidAmount).toBeNull();
      expect(p.paidAmount).toBeNull();
      expect(p.receivableOverdue).toBeNull();
    }
    expect(d.overall.lowMarginCount).toBeNull();
    expect(d.overall.unpaidTotal).toBeNull();
    expect(d.overall.overdueReceivableTotal).toBeNull();
    expect(d.overall.paidTotal).toBeNull();
    expect(d.overall.monthInflowExpected).toBeNull();
    expect(d.overall.monthOutflowExpected).toBeNull();
    expect(d.overall.cashflowTight).toBeNull();
  });

  it('finance 由来の attention 理由（低粗利・未回収・延滞）は除外し優先度を再計算', () => {
    const d = redactExecutiveFinance(dashboard(), false);
    const a = d.projects.find((p) => p.id === 'a')!;
    // a は元々 overdue_receivable(100)+high_risk(80)+low_margin(40) → redact後は high_risk のみ
    expect(a.attentionReasons).toEqual(['high_risk']);
    expect(a.attentionScore).toBe(80);
    // b は overdue_logistics(35) のみ（非finance）→ 残る
    const b = d.projects.find((p) => p.id === 'b')!;
    expect(b.attentionReasons).toContain('overdue_logistics');
  });

  it('redact 後も非 finance の業務 KPI は保持（進捗・リスク・物流・承認）', () => {
    const d = redactExecutiveFinance(dashboard(), false);
    const a = d.projects.find((p) => p.id === 'a')!;
    expect(a.highRiskOpen).toBe(true);
    expect(d.overall.highRiskCount).toBe(1);
    expect(d.overall.activeCount).toBe(2);
  });
});
