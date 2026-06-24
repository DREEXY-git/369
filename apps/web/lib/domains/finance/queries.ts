// Finance Bridge の読み取り・集計（画面から複雑な集計を排除するための層）。Phase 1-8。
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { summarizeFinanceEvents } from '@hokko/shared';

const EXPECTED = ['draft', 'pending_approval', 'approved'];

export async function getFinanceBridgeDashboardData(tenantId: string) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);

  const [events, journalCandidates, invoiceCandidates, pendingJournals, pendingInvoices, monthDue] = await Promise.all([
    prisma.financeEvent.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.journalCandidate.count({ where: { tenantId } }),
    prisma.invoiceCandidate.count({ where: { tenantId } }),
    prisma.journalCandidate.count({ where: { tenantId, status: { in: ['draft', 'pending_approval'] } } }),
    prisma.invoiceCandidate.count({ where: { tenantId, status: { in: ['draft', 'pending_approval'] } } }),
    prisma.financeEvent.findMany({
      where: { tenantId, type: 'cashflow_expected', dueAt: { gte: monthStart, lt: monthEnd }, status: { in: EXPECTED } },
    }),
  ]);

  const summary = summarizeFinanceEvents(
    events.map((e) => ({ type: e.type, direction: e.direction, amount: toNumber(e.amount), status: e.status })),
  );
  const monthInflow = monthDue.filter((e) => e.direction === 'inflow').reduce((s, e) => s + toNumber(e.amount), 0);
  const monthOutflow = monthDue.filter((e) => e.direction === 'outflow').reduce((s, e) => s + toNumber(e.amount), 0);

  return {
    summary,
    recent: events.slice(0, 12),
    journalCandidates,
    invoiceCandidates,
    pendingJournals,
    pendingInvoices,
    monthInflow,
    monthOutflow,
    eventRevenueCount: summary.byType.event_revenue ?? 0,
    eventCostCount: summary.byType.event_cost ?? 0,
    purchaseOrderCount: (summary.byType.purchase_order ?? 0) + (summary.byType.payment_expected ?? 0),
    damageChargeCount: summary.byType.damage_charge ?? 0,
  };
}

// 候補に紐づく承認の状態（承認済みかつ未実行なら正式化ボタンを出す）。
async function approvalStatusMap(tenantId: string, approvalIds: (string | null)[]) {
  const ids = approvalIds.filter((x): x is string => !!x);
  if (ids.length === 0) return {} as Record<string, { status: string; executedAt: Date | null }>;
  const rows = await prisma.approvalRequest.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true, status: true, executedAt: true } });
  return Object.fromEntries(rows.map((r) => [r.id, { status: r.status, executedAt: r.executedAt }]));
}

export async function getJournalCandidateListData(tenantId: string) {
  const candidates = await prisma.journalCandidate.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 200 });
  const approvalById = await approvalStatusMap(tenantId, candidates.map((c) => c.approvalId));
  return { candidates, approvalById };
}

export async function getInvoiceCandidateListData(tenantId: string) {
  const candidates = await prisma.invoiceCandidate.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 200 });
  const approvalById = await approvalStatusMap(tenantId, candidates.map((c) => c.approvalId));
  return { candidates, approvalById };
}
