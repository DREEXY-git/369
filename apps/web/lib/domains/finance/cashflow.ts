// FinanceEvent(cashflow_expected) を /finance/cashflow へ接続する集計（既存表示は非破壊）。Phase 1-9〜1-10。
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { summarizeCashflowActualVsExpected, type CashflowActualExpected } from '@hokko/shared';

const EXPECTED = ['draft', 'pending_approval', 'approved'];

export interface CashflowBridgeData {
  events: Awaited<ReturnType<typeof prisma.financeEvent.findMany>>;
  inflowExpected: number;
  outflowExpected: number;
  netExpected: number;
  monthInflow: number;
  monthOutflow: number;
}

/** FinanceEvent(cashflow_expected) を入金/支払予定として集計（今月＋全期間）。 */
export async function getCashflowBridgeData(tenantId: string): Promise<CashflowBridgeData> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);

  const events = await prisma.financeEvent.findMany({
    where: { tenantId, type: 'cashflow_expected', status: { in: EXPECTED } },
    orderBy: { dueAt: 'asc' },
    take: 100,
  });

  let inflowExpected = 0;
  let outflowExpected = 0;
  let monthInflow = 0;
  let monthOutflow = 0;
  for (const e of events) {
    const amt = toNumber(e.amount);
    const inMonth = e.dueAt != null && e.dueAt >= monthStart && e.dueAt < monthEnd;
    if (e.direction === 'inflow') {
      inflowExpected += amt;
      if (inMonth) monthInflow += amt;
    } else if (e.direction === 'outflow') {
      outflowExpected += amt;
      if (inMonth) monthOutflow += amt;
    }
  }

  return {
    events,
    inflowExpected,
    outflowExpected,
    netExpected: inflowExpected - outflowExpected,
    monthInflow,
    monthOutflow,
  };
}

export interface CashflowUnifiedData {
  summary: CashflowActualExpected;
  recentActuals: Awaited<ReturnType<typeof prisma.financeEvent.findMany>>;
  recentInflowActual: number;
  recentOutflowActual: number;
}

/** 予定（draft/pending/approved）と実績（posted）を入金/支払別に統合集計（直近30日実績付き）。Phase 1-10。 */
export async function getCashflowUnifiedData(tenantId: string): Promise<CashflowUnifiedData> {
  const events = await prisma.financeEvent.findMany({
    where: { tenantId, type: { in: ['cashflow_expected', 'payment_expected', 'payment_received'] } },
    orderBy: { occurredAt: 'desc' },
    take: 300,
  });
  const summary = summarizeCashflowActualVsExpected(
    events.map((e) => ({ type: e.type, direction: e.direction, amount: toNumber(e.amount), status: e.status })),
  );
  const since = new Date(Date.now() - 30 * 86_400_000);
  const recentActuals = events.filter((e) => e.status === 'posted' && e.occurredAt >= since);
  const recentInflowActual = recentActuals.filter((e) => e.direction === 'inflow').reduce((s, e) => s + toNumber(e.amount), 0);
  const recentOutflowActual = recentActuals.filter((e) => e.direction === 'outflow').reduce((s, e) => s + toNumber(e.amount), 0);
  return { summary, recentActuals: recentActuals.slice(0, 20), recentInflowActual, recentOutflowActual };
}
