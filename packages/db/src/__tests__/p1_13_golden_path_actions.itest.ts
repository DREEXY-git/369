// Phase 1-13 統合テスト（要DB）: Action Deep Links + completedAt 精緻化 + Approval 種別分離。
// 既存モデルのみ。web lib（apps/web）は db テストから import 不可のため、集約を本テスト内で再現する。
// 検証: completeEventProject 相当で completedAt セット / completedAt 優先の今月完了集計 /
//        attention reason → action link が必要情報を持つ / tenant 分離 /
//        finance 権限なし相当で finance action が消える / invoice_finalize と invoice_send の分離。
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../client';
import {
  computeGoldenPath,
  summarizeExecutiveDashboard,
  redactExecutiveFinance,
  buildGoldenPathActionLinks,
  visibleGoldenPathActions,
  isInvoiceSent,
  type ExecProjectFact,
  type ExecutiveDashboard,
} from '@hokko/shared';

const T = `itest-p113-${Date.now()}`;
const T2 = `itest-p113b-${Date.now()}`;

// web の getGoldenPathExecutiveDashboardData と同じ集約を DB 上で再現（completedAt / invoiceId 含む）。
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
      hasCustomer: e.customerId != null, productUsageCount: e._count.productUsages, logisticsTaskCount: e._count.logisticsTasks,
      staffCount: e._count.staffAssignments, riskCount: e._count.risks, costRecorded: e._count.costs > 0 || cost > 0,
      revenue, cost, grossSnapshotCount: e._count.grossSnapshots, bridged, invoiceCandidateStatus: cand?.status ?? null, invoiceStatus, paidAmount, invoiceTotal,
    });
    return {
      id: e.id, name: e.name, customerName: null, eventDate: e.eventDate, venue: e.venue, status: e.status, completedAt: e.completedAt,
      progressPercent: gp.percent, doneCount: gp.doneCount, totalCount: gp.totalCount, nextActionKey: gp.nextActionKey, nextActionLabel: gp.nextActionLabel,
      highRiskOpen: highRiskSet.has(e.id), unfinishedLogisticsCount: logi.unfinished, overdueLogisticsCount: logi.overdue,
      staffAssigned: e._count.staffAssignments > 0, bridged, invoiceCandidateCreated: cand != null, invoiceFormalized: invoiceStatus != null, invoiceSent,
      approvalPendingCount: approvalCountByEvent.get(e.id) ?? 0,
      revenue, cost, invoiceTotal, paidAmount, unpaidAmount, receivableOverdue: receivable?.status === 'overdue', invoiceId: cand?.invoiceId ?? null,
    };
  });

  const dashboard = summarizeExecutiveDashboard(facts, { monthStart, monthEnd, monthInflowExpected: 0, monthOutflowExpected: 0 });
  return redactExecutiveFinance(dashboard, canViewFinance);
}

beforeAll(async () => {
  const now = new Date();
  const lastMonth = new Date(Date.now() - 40 * 86_400_000);

  // 危険案件: 延滞 + 高リスク + 低粗利（action link 用）
  const cust = await prisma.customer.create({ data: { tenantId: T, name: '危険案件顧客' } });
  const ev1 = await prisma.eventProject.create({ data: { tenantId: T, name: '危険案件', customerId: cust.id, status: 'planned', eventDate: now, revenue: 100000, cost: 95000, gross: 5000 } });
  await prisma.eventGrossProfitSnapshot.create({ data: { tenantId: T, eventId: ev1.id, revenue: 100000, cost: 95000, gross: 5000, marginRate: 5 } });
  await prisma.eventRisk.create({ data: { tenantId: T, eventId: ev1.id, type: 'safety', severity: 'critical', status: 'open', description: '安全' } });
  await prisma.financeEvent.create({ data: { tenantId: T, type: 'event_revenue', sourceType: 'EventProject', sourceId: ev1.id, direction: 'inflow', amount: 100000, status: 'draft' } });
  const invA = await prisma.invoice.create({ data: { tenantId: T, number: 'INV-P113-A', status: 'SENT', subtotal: 100000, taxAmount: 10000, total: 110000, paidAmount: 0, dueDate: lastMonth } });
  await prisma.invoiceCandidate.create({ data: { tenantId: T, sourceType: 'EventProject', sourceId: ev1.id, customerId: cust.id, title: '危険案件 請求', subtotal: 100000, taxAmount: 10000, total: 110000, status: 'sent', invoiceId: invA.id } });
  await prisma.receivable.create({ data: { tenantId: T, invoiceId: invA.id, amount: 110000, dueDate: lastMonth, status: 'overdue' } });

  // 今月完了（completedAt 当月、eventDate は先月）
  await prisma.eventProject.create({ data: { tenantId: T, name: '今月完了案件', status: 'completed', completedAt: now, eventDate: lastMonth, revenue: 50000, cost: 20000 } });
  // 今月完了（completedAt null → fallback: status=completed かつ eventDate 当月）
  await prisma.eventProject.create({ data: { tenantId: T, name: 'fallback完了案件', status: 'completed', completedAt: null, eventDate: now, revenue: 50000, cost: 20000 } });

  // Approval 種別分離の検証用レコード（直接作成）
  await prisma.approvalRequest.create({ data: { tenantId: T, type: 'invoice_finalize', title: '正式化(新)', entityType: 'InvoiceCandidate', entityId: 'cand-new', requestedForAction: 'invoice_finalize', status: 'PENDING' } });
  await prisma.approvalRequest.create({ data: { tenantId: T, type: 'invoice_send', title: '外部送信', entityType: 'Invoice', entityId: invA.id, requestedForAction: 'invoice_send', status: 'PENDING' } });
  await prisma.approvalRequest.create({ data: { tenantId: T, type: 'invoice_send', title: '正式化(旧データ)', entityType: 'InvoiceCandidate', entityId: 'cand-legacy', requestedForAction: 'invoice_send', status: 'PENDING' } });

  // 別テナント
  await prisma.eventProject.create({ data: { tenantId: T2, name: 'T2案件', status: 'planned', revenue: 1, cost: 0 } });
});

afterAll(async () => {
  for (const tid of [T, T2]) {
    await prisma.payment.deleteMany({ where: { tenantId: tid } });
    await prisma.receivable.deleteMany({ where: { tenantId: tid } });
    await prisma.invoice.deleteMany({ where: { tenantId: tid } });
    await prisma.invoiceCandidate.deleteMany({ where: { tenantId: tid } });
    await prisma.financeEvent.deleteMany({ where: { tenantId: tid } });
    await prisma.approvalRequest.deleteMany({ where: { tenantId: tid } });
    await prisma.eventGrossProfitSnapshot.deleteMany({ where: { tenantId: tid } });
    await prisma.eventRisk.deleteMany({ where: { tenantId: tid } });
    await prisma.eventProject.deleteMany({ where: { tenantId: tid } });
    await prisma.customer.deleteMany({ where: { tenantId: tid } });
  }
  await prisma.$disconnect();
});

describe('completedAt 精緻化', () => {
  it('completeEventProject 相当の更新で completedAt と loadOutAt がともにセットされる', async () => {
    const e = await prisma.eventProject.create({ data: { tenantId: T, name: '完了対象', status: 'planned' } });
    const now = new Date();
    await prisma.eventProject.update({ where: { id: e.id }, data: { status: 'completed', loadOutAt: now, completedAt: now } });
    const after = await prisma.eventProject.findUniqueOrThrow({ where: { id: e.id } });
    expect(after.status).toBe('completed');
    expect(after.completedAt).not.toBeNull(); // 経営上の完了日時
    expect(after.loadOutAt).not.toBeNull(); // 撤去/物流時刻も維持（互換）
  });

  it('今月完了は completedAt 優先で集計（fallback も含む）', async () => {
    const d = await buildDashboard(T, true);
    // 「今月完了案件」(completedAt 当月) + 「fallback完了案件」(completedAt null,status=completed,eventDate当月) + 上の「完了対象」(completedAt 当月)
    expect(d.overall.monthCompletedCount).toBe(3);
  });
});

describe('Action Deep Links', () => {
  it('attention 先頭（危険案件）から reason ごとの action link が生成され必要情報を持つ', async () => {
    const d = await buildDashboard(T, true);
    const danger = d.projects.find((p) => p.name === '危険案件')!;
    expect(danger.attentionReasons).toEqual(expect.arrayContaining(['overdue_receivable', 'high_risk', 'low_margin']));
    const actions = buildGoldenPathActionLinks(danger);
    const overdue = actions.find((a) => a.reason === 'overdue_receivable')!;
    expect(overdue.href).toMatch(/^\/invoices\//); // 請求書 deep link（invoiceId あり）
    expect(overdue.requiresFinance).toBe(true);
    const risk = actions.find((a) => a.reason === 'high_risk')!;
    expect(risk.href).toBe(`/operations/events/${danger.id}#risks`);
    expect(risk.requiresFinance).toBe(false);
  });

  it('finance 権限なし相当では finance 系 action link が消え、invoiceId も null', async () => {
    const d = await buildDashboard(T, false);
    const danger = d.projects.find((p) => p.name === '危険案件')!;
    expect(danger.invoiceId).toBeNull();
    // redact で finance reason（延滞・低粗利）が除外され、high_risk のみ残る
    expect(danger.attentionReasons).toEqual(['high_risk']);
    const actions = visibleGoldenPathActions(buildGoldenPathActionLinks(danger), false);
    expect(actions.every((a) => !a.requiresFinance)).toBe(true);
    expect(actions.map((a) => a.reason)).toEqual(['high_risk']);
  });

  it('tenant 分離: 別テナントの案件は含まれない', async () => {
    const d = await buildDashboard(T, true);
    expect(d.projects.some((p) => p.name === 'T2案件')).toBe(false);
  });
});

describe('Approval 種別分離（invoice_finalize / invoice_send）', () => {
  it('正式化実行クエリは InvoiceCandidate かつ [invoice_finalize, invoice_send] を後方互換で拾う', async () => {
    const finalizeReqs = await prisma.approvalRequest.findMany({
      where: { tenantId: T, status: 'PENDING', entityType: 'InvoiceCandidate', requestedForAction: { in: ['invoice_finalize', 'invoice_send'] } },
    });
    // 新(invoice_finalize) + 旧データ(invoice_send/InvoiceCandidate) の 2 件。外部送信(Invoice)は含まない。
    expect(finalizeReqs).toHaveLength(2);
    expect(finalizeReqs.every((r) => r.entityType === 'InvoiceCandidate')).toBe(true);
  });

  it('外部送信は entityType=Invoice の invoice_send で別系統（正式化クエリに混ざらない）', async () => {
    const sendReqs = await prisma.approvalRequest.findMany({
      where: { tenantId: T, status: 'PENDING', entityType: 'Invoice', requestedForAction: 'invoice_send' },
    });
    expect(sendReqs).toHaveLength(1);
    expect(sendReqs[0]!.entityType).toBe('Invoice');
  });
});
