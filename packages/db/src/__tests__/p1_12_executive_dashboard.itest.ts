// Phase 1-12 統合テスト（要DB）: Golden Path KPI Executive Dashboard。
// 既存モデル横断（EventProject/EventRisk/LogisticsTask/InvoiceCandidate/Invoice/Payment/
// Receivable/FinanceEvent/ApprovalRequest）から「経営 KPI の事実」をバッチ集約し、
// @hokko/shared の summarizeExecutiveDashboard / redactExecutiveFinance に通す。
// web lib（apps/web）は db テストから import 不可のため、バッチ取得を本テスト内で再現する。
// 検証: 複数案件の集計 / 未回収（invoice+payment+receivable+financeEvent） /
//        低粗利・高リスク・物流遅延・承認待ち検出 / tenant 分離 / STAFF 相当の finance redact。
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../client';
import {
  computeGoldenPath,
  summarizeExecutiveDashboard,
  redactExecutiveFinance,
  isInvoiceSent,
  type ExecProjectFact,
  type ExecutiveDashboard,
} from '@hokko/shared';

const T = `itest-p112-${Date.now()}`;
const T2 = `itest-p112b-${Date.now()}`;

// web lib（getGoldenPathExecutiveDashboardData）と同じバッチ集約を DB 上で再現。
async function buildDashboard(tenantId: string, canViewFinance: boolean): Promise<ExecutiveDashboard> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const events = await prisma.eventProject.findMany({
    where: { tenantId },
    include: { _count: { select: { productUsages: true, logisticsTasks: true, staffAssignments: true, risks: true, costs: true, grossSnapshots: true } } },
    orderBy: { eventDate: 'asc' },
  });
  const eventIds = events.map((e) => e.id);

  const [openHighRisks, logisticsRows, revenueFEs, candidates, pendingApprovals] = await Promise.all([
    prisma.eventRisk.findMany({ where: { tenantId, eventId: { in: eventIds }, status: { not: 'resolved' }, severity: { in: ['high', 'critical'] } }, select: { eventId: true } }),
    prisma.logisticsTask.findMany({ where: { tenantId, eventId: { in: eventIds }, status: { not: 'done' } }, select: { eventId: true, scheduledAt: true } }),
    prisma.financeEvent.findMany({ where: { tenantId, type: 'event_revenue', sourceType: 'EventProject', sourceId: { in: eventIds } }, select: { sourceId: true } }),
    prisma.invoiceCandidate.findMany({ where: { tenantId, sourceType: 'EventProject', sourceId: { in: eventIds } }, orderBy: { createdAt: 'desc' }, select: { sourceId: true, status: true, invoiceId: true } }),
    prisma.approvalRequest.findMany({ where: { tenantId, status: 'PENDING', entityType: 'EventProject', entityId: { in: eventIds } }, select: { entityId: true } }),
  ]);
  const invoiceIds = [...new Set(candidates.map((c) => c.invoiceId).filter((x): x is string => x != null))];
  const [invoices, receivables] = await Promise.all([
    invoiceIds.length ? prisma.invoice.findMany({ where: { tenantId, id: { in: invoiceIds } }, select: { id: true, status: true, total: true, paidAmount: true } }) : Promise.resolve([] as { id: string; status: string; total: unknown; paidAmount: unknown }[]),
    invoiceIds.length ? prisma.receivable.findMany({ where: { tenantId, invoiceId: { in: invoiceIds } }, select: { invoiceId: true, status: true } }) : Promise.resolve([] as { invoiceId: string; status: string }[]),
  ]);

  const highRiskSet = new Set(openHighRisks.map((r) => r.eventId));
  const logiByEvent = new Map<string, { unfinished: number; overdue: number }>();
  for (const l of logisticsRows) {
    if (l.eventId == null) continue;
    const cur = logiByEvent.get(l.eventId) ?? { unfinished: 0, overdue: 0 };
    cur.unfinished += 1;
    if (l.scheduledAt != null && l.scheduledAt < now) cur.overdue += 1;
    logiByEvent.set(l.eventId, cur);
  }
  const bridgedSet = new Set(revenueFEs.map((f) => f.sourceId).filter((x): x is string => x != null));
  const candByEvent = new Map<string, { status: string; invoiceId: string | null }>();
  for (const c of candidates) {
    if (c.sourceId == null || candByEvent.has(c.sourceId)) continue;
    candByEvent.set(c.sourceId, { status: c.status, invoiceId: c.invoiceId });
  }
  const invoiceById = new Map(invoices.map((i) => [i.id, i]));
  const receivableByInvoice = new Map(receivables.map((r) => [r.invoiceId, r]));
  const approvalCountByEvent = new Map<string, number>();
  for (const a of pendingApprovals) approvalCountByEvent.set(a.entityId, (approvalCountByEvent.get(a.entityId) ?? 0) + 1);

  const facts: ExecProjectFact[] = events.map((e) => {
    const cand = candByEvent.get(e.id);
    const invoice = cand?.invoiceId ? invoiceById.get(cand.invoiceId) : undefined;
    const invoiceStatus = invoice?.status ?? null;
    const invoiceTotal = Number(invoice?.total ?? 0);
    const paidAmount = Number(invoice?.paidAmount ?? 0);
    const invoiceSent = invoiceStatus != null && isInvoiceSent(invoiceStatus);
    const collectible = invoiceStatus != null && invoiceStatus !== 'DRAFT' && invoiceStatus !== 'VOID';
    const unpaidAmount = collectible ? Math.max(invoiceTotal - paidAmount, 0) : 0;
    const receivable = cand?.invoiceId ? receivableByInvoice.get(cand.invoiceId) : undefined;
    const revenue = Number(e.revenue);
    const cost = Math.max(Number(e.cost), 0);
    const bridged = bridgedSet.has(e.id);
    const logi = logiByEvent.get(e.id) ?? { unfinished: 0, overdue: 0 };
    const gp = computeGoldenPath({
      hasCustomer: e.customerId != null,
      productUsageCount: e._count.productUsages,
      logisticsTaskCount: e._count.logisticsTasks,
      staffCount: e._count.staffAssignments,
      riskCount: e._count.risks,
      costRecorded: e._count.costs > 0 || cost > 0,
      revenue, cost,
      grossSnapshotCount: e._count.grossSnapshots,
      bridged,
      invoiceCandidateStatus: cand?.status ?? null,
      invoiceStatus, paidAmount, invoiceTotal,
    });
    return {
      id: e.id, name: e.name, customerName: null, eventDate: e.eventDate, venue: e.venue, status: e.status,
      completedAt: e.completedAt,
      progressPercent: gp.percent, doneCount: gp.doneCount, totalCount: gp.totalCount,
      nextActionKey: gp.nextActionKey, nextActionLabel: gp.nextActionLabel,
      highRiskOpen: highRiskSet.has(e.id),
      unfinishedLogisticsCount: logi.unfinished, overdueLogisticsCount: logi.overdue,
      staffAssigned: e._count.staffAssignments > 0,
      bridged,
      invoiceCandidateCreated: cand != null,
      invoiceFormalized: invoiceStatus != null,
      invoiceSent,
      approvalPendingCount: approvalCountByEvent.get(e.id) ?? 0,
      revenue, cost, invoiceTotal, paidAmount, unpaidAmount,
      receivableOverdue: receivable?.status === 'overdue',
      invoiceId: cand?.invoiceId ?? null,
    };
  });

  const dashboard = summarizeExecutiveDashboard(facts, { monthStart, monthEnd, monthInflowExpected: 0, monthOutflowExpected: 0 });
  return redactExecutiveFinance(dashboard, canViewFinance);
}

beforeAll(async () => {
  const now = new Date();
  const past = new Date(Date.now() - 5 * 86_400_000);

  // --- Tenant T ---
  // A: 延滞 + 低粗利 + 高リスク + 物流遅延 + 承認待ち（最重要案件）
  const custA = await prisma.customer.create({ data: { tenantId: T, name: '延滞顧客' } });
  const a = await prisma.eventProject.create({ data: { tenantId: T, name: 'A_延滞案件', customerId: custA.id, status: 'planned', eventDate: now, revenue: 100000, cost: 95000, gross: 5000 } });
  await prisma.eventProductUsage.create({ data: { tenantId: T, eventId: a.id, assetName: '音響', quantity: 1 } });
  await prisma.eventStaffAssignment.create({ data: { tenantId: T, eventId: a.id, name: '山田', role: 'PA', cost: 20000 } });
  await prisma.eventCost.create({ data: { tenantId: T, eventId: a.id, category: '人件費', amount: 95000 } });
  await prisma.eventGrossProfitSnapshot.create({ data: { tenantId: T, eventId: a.id, revenue: 100000, cost: 95000, gross: 5000, marginRate: 5 } });
  await prisma.logisticsTask.create({ data: { tenantId: T, eventId: a.id, type: 'delivery', title: '搬入', status: 'todo', scheduledAt: past } }); // 期限超過
  await prisma.eventRisk.create({ data: { tenantId: T, eventId: a.id, type: 'safety', severity: 'critical', status: 'open', description: '安全' } });
  await prisma.financeEvent.create({ data: { tenantId: T, type: 'event_revenue', sourceType: 'EventProject', sourceId: a.id, direction: 'inflow', amount: 100000, status: 'draft' } });
  const invA = await prisma.invoice.create({ data: { tenantId: T, number: 'INV-A', status: 'SENT', subtotal: 100000, taxAmount: 10000, total: 110000, paidAmount: 0, dueDate: past } });
  await prisma.invoiceCandidate.create({ data: { tenantId: T, sourceType: 'EventProject', sourceId: a.id, customerId: custA.id, title: 'A請求', subtotal: 100000, taxAmount: 10000, total: 110000, status: 'sent', invoiceId: invA.id } });
  await prisma.receivable.create({ data: { tenantId: T, invoiceId: invA.id, amount: 110000, dueDate: past, status: 'overdue' } });
  await prisma.approvalRequest.create({ data: { tenantId: T, type: 'invoice_send', title: 'A承認', entityType: 'EventProject', entityId: a.id, status: 'PENDING' } });

  // D: 一部入金（Payment + Receivable open）+ 健全粗利
  const custD = await prisma.customer.create({ data: { tenantId: T, name: '一部入金顧客' } });
  const d = await prisma.eventProject.create({ data: { tenantId: T, name: 'D_一部入金案件', customerId: custD.id, status: 'planned', eventDate: now, revenue: 200000, cost: 120000, gross: 80000 } });
  await prisma.eventGrossProfitSnapshot.create({ data: { tenantId: T, eventId: d.id, revenue: 200000, cost: 120000, gross: 80000, marginRate: 40 } });
  await prisma.financeEvent.create({ data: { tenantId: T, type: 'event_revenue', sourceType: 'EventProject', sourceId: d.id, direction: 'inflow', amount: 200000, status: 'draft' } });
  const invD = await prisma.invoice.create({ data: { tenantId: T, number: 'INV-D', status: 'SENT', subtotal: 200000, taxAmount: 0, total: 200000, paidAmount: 40000, dueDate: now } });
  await prisma.payment.create({ data: { tenantId: T, invoiceId: invD.id, amount: 40000, paidAt: now, method: 'bank' } });
  await prisma.invoiceCandidate.create({ data: { tenantId: T, sourceType: 'EventProject', sourceId: d.id, customerId: custD.id, title: 'D請求', subtotal: 200000, total: 200000, status: 'sent', invoiceId: invD.id } });
  await prisma.receivable.create({ data: { tenantId: T, invoiceId: invD.id, amount: 160000, dueDate: now, status: 'open' } });

  // B: 完了・健全（今月完了）
  await prisma.eventProject.create({ data: { tenantId: T, name: 'B_完了健全案件', status: 'completed', eventDate: now, revenue: 300000, cost: 150000, gross: 150000 } });

  // C: 新規（顧客のみ・売上ゼロ）
  const custC = await prisma.customer.create({ data: { tenantId: T, name: '新規顧客' } });
  await prisma.eventProject.create({ data: { tenantId: T, name: 'C_新規案件', customerId: custC.id, status: 'planned', revenue: 0, cost: 0 } });

  // --- Tenant T2（分離検証用）---
  await prisma.eventProject.create({ data: { tenantId: T2, name: 'T2案件', status: 'planned', revenue: 1, cost: 0 } });
});

afterAll(async () => {
  for (const tid of [T, T2]) {
    await prisma.payment.deleteMany({ where: { tenantId: tid } });
    await prisma.receivable.deleteMany({ where: { tenantId: tid } });
    await prisma.invoiceLineItem.deleteMany({ where: { tenantId: tid } });
    await prisma.invoice.deleteMany({ where: { tenantId: tid } });
    await prisma.invoiceCandidate.deleteMany({ where: { tenantId: tid } });
    await prisma.financeEvent.deleteMany({ where: { tenantId: tid } });
    await prisma.approvalRequest.deleteMany({ where: { tenantId: tid } });
    await prisma.eventProductUsage.deleteMany({ where: { tenantId: tid } });
    await prisma.logisticsTask.deleteMany({ where: { tenantId: tid } });
    await prisma.eventStaffAssignment.deleteMany({ where: { tenantId: tid } });
    await prisma.eventCost.deleteMany({ where: { tenantId: tid } });
    await prisma.eventGrossProfitSnapshot.deleteMany({ where: { tenantId: tid } });
    await prisma.eventRisk.deleteMany({ where: { tenantId: tid } });
    await prisma.eventProject.deleteMany({ where: { tenantId: tid } });
    await prisma.customer.deleteMany({ where: { tenantId: tid } });
  }
  await prisma.$disconnect();
});

describe('Executive Dashboard — 複数案件からの集計', () => {
  it('進行中/完了件数・今月開催/完了を集計（completedAt 代理）', async () => {
    const d = await buildDashboard(T, true);
    expect(d.overall.activeCount).toBe(3); // A,D,C
    expect(d.overall.completedCount).toBe(1); // B
    expect(d.overall.monthEventCount).toBe(3); // A,D,B（eventDate=今月）。C は eventDate=null
    expect(d.overall.monthCompletedCount).toBe(1); // B
    expect(d.overall.avgProgressPercent).toBeGreaterThan(0);
    expect(d.overall.avgProgressPercent).toBeLessThanOrEqual(100);
  });

  it('未回収集計（invoice+payment+receivable+financeEvent を横断）', async () => {
    const d = await buildDashboard(T, true);
    // A: SENT total110000 paid0 → 未回収110000（延滞）。D: SENT total200000 paid40000 → 未回収160000。
    expect(d.overall.unpaidTotal).toBe(270000);
    expect(d.overall.overdueReceivableTotal).toBe(110000); // A のみ延滞
    expect(d.overall.paidTotal).toBe(40000); // D の入金
  });

  it('低粗利・高リスク・物流遅延・承認待ちを検出', async () => {
    const d = await buildDashboard(T, true);
    expect(d.overall.lowMarginCount).toBe(1); // A（5%）
    expect(d.overall.highRiskCount).toBe(1); // A（critical open）
    expect(d.overall.overdueLogisticsCount).toBe(1); // A（過去 scheduledAt）
    expect(d.overall.approvalPendingTotal).toBe(1); // A
    expect(d.overall.unsentInvoiceCount).toBe(0); // A,D とも SENT 済
  });

  it('「今すぐ見るべき案件」は A（延滞+高リスク+低粗利+物流+承認）が最優先', async () => {
    const d = await buildDashboard(T, true);
    expect(d.attention.length).toBeGreaterThanOrEqual(1);
    expect(d.attention[0]!.name).toBe('A_延滞案件');
    expect(d.attention[0]!.attentionReasons).toEqual(expect.arrayContaining(['overdue_receivable', 'high_risk', 'low_margin', 'overdue_logistics', 'approval_pending']));
  });
});

describe('Executive Dashboard — tenant 分離', () => {
  it('別テナントの案件は集計に含まれない', async () => {
    const d = await buildDashboard(T, true);
    expect(d.projects.some((p) => p.name === 'T2案件')).toBe(false);
    const d2 = await buildDashboard(T2, true);
    expect(d2.projects).toHaveLength(1);
    expect(d2.projects[0]!.name).toBe('T2案件');
  });
});

describe('Executive Dashboard — STAFF 相当の finance redact', () => {
  it('canViewFinance=false で金額 KPI が null・finance attention 理由が除外される', async () => {
    const d = await buildDashboard(T, false);
    expect(d.financeVisible).toBe(false);
    expect(d.overall.unpaidTotal).toBeNull();
    expect(d.overall.paidTotal).toBeNull();
    expect(d.overall.lowMarginCount).toBeNull();
    expect(d.overall.overdueReceivableTotal).toBeNull();
    for (const p of d.projects) {
      expect(p.revenue).toBeNull();
      expect(p.gross).toBeNull();
      expect(p.unpaidAmount).toBeNull();
      expect(p.receivableOverdue).toBeNull();
      expect(p.attentionReasons).not.toContain('overdue_receivable');
      expect(p.attentionReasons).not.toContain('low_margin');
      expect(p.attentionReasons).not.toContain('unpaid');
    }
    // 非 finance の業務 KPI は保持される（高リスク・物流・承認・進捗）。
    expect(d.overall.highRiskCount).toBe(1);
    expect(d.overall.overdueLogisticsCount).toBe(1);
    expect(d.overall.approvalPendingTotal).toBe(1);
    const a = d.projects.find((p) => p.name === 'A_延滞案件')!;
    expect(a.attentionReasons).toEqual(expect.arrayContaining(['high_risk', 'overdue_logistics', 'approval_pending']));
  });
});
