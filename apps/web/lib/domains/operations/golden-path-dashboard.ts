// Planning Hokko Golden Path を経営ダッシュボード KPI へ集約するクエリ層。Phase 1-12。
// 集計・優先度・finance redact の純ロジックは @hokko/shared に委譲し、ここは
//   - 既存モデル横断の「バッチ取得」（EventProjectごとの個別クエリを避け N+1 を回避）
//   - Map 突合での fact 組み立て
//   - finance 権限に応じた redact（データ整形段階で金額を渡さない）
// だけを行う。新規DBモデルは追加しない。
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import {
  computeGoldenPath,
  summarizeExecutiveDashboard,
  redactExecutiveFinance,
  isInvoiceSent,
  type ExecProjectFact,
  type ExecutiveDashboard,
} from '@hokko/shared';
import { getCashflowBridgeData } from '@/lib/domains/finance/cashflow';

/**
 * プランニングホッコー Golden Path の経営ダッシュボードデータを集約。
 * canViewFinance=false（STAFF 等）の場合、戻り値の金額・粗利・回収状況は lib 段階で null 化される。
 */
export async function getGoldenPathExecutiveDashboardData(
  tenantId: string,
  canViewFinance: boolean,
): Promise<ExecutiveDashboard> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // 1) 全 EventProject ＋ 各種 _count をまとめて取得（per-event 個別クエリにしない）。
  const events = await prisma.eventProject.findMany({
    where: { tenantId },
    include: {
      _count: {
        select: { productUsages: true, logisticsTasks: true, staffAssignments: true, risks: true, costs: true, grossSnapshots: true },
      },
    },
    orderBy: { eventDate: 'asc' },
  });
  const eventIds = events.map((e) => e.id);
  const customerIds = [...new Set(events.map((e) => e.customerId).filter((x): x is string => x != null))];

  // 2) 横断データをバッチ取得（すべて { in: eventIds } で一括）。
  const [customers, openHighRisks, logisticsRows, revenueFEs, candidates, pendingApprovals, cashflow] = await Promise.all([
    customerIds.length
      ? prisma.customer.findMany({ where: { tenantId, id: { in: customerIds } }, select: { id: true, name: true } })
      : Promise.resolve([] as { id: string; name: string }[]),
    prisma.eventRisk.findMany({
      where: { tenantId, eventId: { in: eventIds }, status: { not: 'resolved' }, severity: { in: ['high', 'critical'] } },
      select: { eventId: true },
    }),
    prisma.logisticsTask.findMany({
      where: { tenantId, eventId: { in: eventIds }, status: { not: 'done' } },
      select: { eventId: true, scheduledAt: true },
    }),
    prisma.financeEvent.findMany({
      where: { tenantId, type: 'event_revenue', sourceType: 'EventProject', sourceId: { in: eventIds } },
      select: { sourceId: true },
    }),
    prisma.invoiceCandidate.findMany({
      where: { tenantId, sourceType: 'EventProject', sourceId: { in: eventIds } },
      orderBy: { createdAt: 'desc' },
      select: { sourceId: true, status: true, invoiceId: true },
    }),
    prisma.approvalRequest.findMany({
      where: { tenantId, status: 'PENDING', entityType: 'EventProject', entityId: { in: eventIds } },
      select: { entityId: true },
    }),
    getCashflowBridgeData(tenantId),
  ]);

  // 3) 請求候補 → 正式請求書 → 売掛金 をバッチ取得。
  const invoiceIds = [...new Set(candidates.map((c) => c.invoiceId).filter((x): x is string => x != null))];
  const [invoices, receivables] = await Promise.all([
    invoiceIds.length
      ? prisma.invoice.findMany({ where: { tenantId, id: { in: invoiceIds } }, select: { id: true, status: true, total: true, paidAmount: true } })
      : Promise.resolve([] as { id: string; status: string; total: unknown; paidAmount: unknown }[]),
    invoiceIds.length
      ? prisma.receivable.findMany({ where: { tenantId, invoiceId: { in: invoiceIds } }, select: { invoiceId: true, status: true } })
      : Promise.resolve([] as { invoiceId: string; status: string }[]),
  ]);

  // 4) Map 突合（O(1) ルックアップ）。
  const customerName = new Map(customers.map((c) => [c.id, c.name]));
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
  // 同一 event に複数候補があれば最新（createdAt desc の先頭）を採用。
  const candByEvent = new Map<string, { status: string; invoiceId: string | null }>();
  for (const c of candidates) {
    if (c.sourceId == null || candByEvent.has(c.sourceId)) continue;
    candByEvent.set(c.sourceId, { status: c.status, invoiceId: c.invoiceId });
  }
  const invoiceById = new Map(invoices.map((i) => [i.id, i]));
  const receivableByInvoice = new Map(receivables.map((r) => [r.invoiceId, r]));
  const approvalCountByEvent = new Map<string, number>();
  for (const a of pendingApprovals) approvalCountByEvent.set(a.entityId, (approvalCountByEvent.get(a.entityId) ?? 0) + 1);

  // 5) fact 組み立て（進捗は既存 computeGoldenPath に委譲）。
  const facts: ExecProjectFact[] = events.map((e) => {
    const cand = candByEvent.get(e.id);
    const invoice = cand?.invoiceId ? invoiceById.get(cand.invoiceId) : undefined;
    const invoiceStatus = invoice?.status ?? null;
    const invoiceTotal = toNumber(invoice?.total ?? 0);
    const paidAmount = toNumber(invoice?.paidAmount ?? 0);
    const invoiceSent = invoiceStatus != null && isInvoiceSent(invoiceStatus);
    // 未回収残: 請求可能（DRAFT/VOID 以外）かつ未完済の残額。未請求・PAID は 0。
    const collectible = invoiceStatus != null && invoiceStatus !== 'DRAFT' && invoiceStatus !== 'VOID';
    const unpaidAmount = collectible ? Math.max(invoiceTotal - paidAmount, 0) : 0;
    const receivable = cand?.invoiceId ? receivableByInvoice.get(cand.invoiceId) : undefined;
    const receivableOverdue = receivable?.status === 'overdue';

    const revenue = toNumber(e.revenue);
    const cost = Math.max(toNumber(e.cost), 0);
    const bridged = bridgedSet.has(e.id);
    const logi = logiByEvent.get(e.id) ?? { unfinished: 0, overdue: 0 };

    const gp = computeGoldenPath({
      hasCustomer: e.customerId != null,
      productUsageCount: e._count.productUsages,
      logisticsTaskCount: e._count.logisticsTasks,
      staffCount: e._count.staffAssignments,
      riskCount: e._count.risks,
      costRecorded: e._count.costs > 0 || cost > 0,
      revenue,
      cost,
      grossSnapshotCount: e._count.grossSnapshots,
      bridged,
      invoiceCandidateStatus: cand?.status ?? null,
      invoiceStatus,
      paidAmount,
      invoiceTotal,
    });

    return {
      id: e.id,
      name: e.name,
      customerName: e.customerId ? customerName.get(e.customerId) ?? null : null,
      eventDate: e.eventDate,
      venue: e.venue,
      status: e.status,
      completedAt: e.completedAt,
      progressPercent: gp.percent,
      doneCount: gp.doneCount,
      totalCount: gp.totalCount,
      nextActionKey: gp.nextActionKey,
      nextActionLabel: gp.nextActionLabel,
      highRiskOpen: highRiskSet.has(e.id),
      unfinishedLogisticsCount: logi.unfinished,
      overdueLogisticsCount: logi.overdue,
      staffAssigned: e._count.staffAssignments > 0,
      bridged,
      invoiceCandidateCreated: cand != null,
      invoiceFormalized: invoiceStatus != null,
      invoiceSent,
      approvalPendingCount: approvalCountByEvent.get(e.id) ?? 0,
      revenue,
      cost,
      invoiceTotal,
      paidAmount,
      unpaidAmount,
      receivableOverdue,
      invoiceId: cand?.invoiceId ?? null,
    };
  });

  const dashboard = summarizeExecutiveDashboard(facts, {
    monthStart,
    monthEnd,
    monthInflowExpected: cashflow.monthInflow,
    monthOutflowExpected: cashflow.monthOutflow,
  });
  return redactExecutiveFinance(dashboard, canViewFinance);
}
