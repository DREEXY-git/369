// FinanceEvent(cashflow_expected) を /finance/cashflow へ接続する集計（既存表示は非破壊）。Phase 1-9〜1-10。
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import {
  summarizeCashflowActualVsExpected,
  forecastCashflow,
  financeEventToCashflowLine,
  type CashflowActualExpected,
  type CashflowResult,
  type CashflowInputLine,
} from '@hokko/shared';

const EXPECTED = ['draft', 'pending_approval', 'approved'];

export interface CashflowBridgeData {
  events: Awaited<ReturnType<typeof prisma.financeEvent.findMany>>;
  inflowExpected: number;
  outflowExpected: number;
  netExpected: number;
  monthInflow: number;
  monthOutflow: number;
}

export interface CashflowShortageProjection {
  /** 現在の現預金（CashAccount 残高合計）＝予測の起点。 */
  opening: number;
  /** 予測に載せた予定イベント数（今日以降・dueAt 確定分・take 上限内）。 */
  lineCount: number;
  /** Codex B-CF-03: take 上限で後続予定が打ち切られたか（true なら「ショートなし」を断定しない）。 */
  truncated: boolean;
  /** Codex B-CF-02: opening が既にマイナス＝現時点で資金ショート中か（将来予兆とは別に明示）。 */
  currentlyNegative: boolean;
  /** forecastCashflow の結果（日次残高推移・最低残高・初ショート日）。 */
  result: CashflowResult;
}

export const SHORTAGE_PROJECTION_LIMIT = 500;

/**
 * 資金ショート予兆（実データからのライブ予測）: 現在の現預金（CashAccount 合計）を起点に、
 * 今日以降の「予定」FinanceEvent（cashflow_expected の expected 状態・dueAt 確定分）を
 * 日付順に足し引きして running balance を作り、初めてマイナスになる日＝資金ショート予測日を実データから算出する。
 * 既存の静的 forecast 表示は非破壊（別カード）。read-only・tenantId スコープ・純関数 forecastCashflow に委譲。
 */
export async function getCashflowShortageProjection(
  tenantId: string,
  now: Date = new Date(),
): Promise<CashflowShortageProjection> {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const [accounts, events] = await Promise.all([
    prisma.cashAccount.findMany({ where: { tenantId }, select: { balance: true } }),
    prisma.financeEvent.findMany({
      // Codex B-CF-01: 予定は canonical な cashflow_expected のみ対象にする。payment_expected を併読すると
      // Finance Bridge が同一支払を両 type で表現するため二重計上（偽のショート/偽の余裕）になる。既存の予定表示と同一 type。
      where: {
        tenantId,
        type: 'cashflow_expected',
        status: { in: EXPECTED },
        dueAt: { gte: todayStart },
      },
      // Codex B-CF-05: 同一 dueAt の並び順を id で決定論化（同日入出金の順序でショート判定が揺れない）。
      orderBy: [{ dueAt: 'asc' }, { id: 'asc' }],
      take: SHORTAGE_PROJECTION_LIMIT + 1, // Codex B-CF-03: +1 件多く取り、打ち切り有無を検出する
      select: { dueAt: true, amount: true, direction: true, description: true },
    }),
  ]);
  const truncated = events.length > SHORTAGE_PROJECTION_LIMIT;
  const opening = accounts.reduce((s, a) => s + toNumber(a.balance), 0);
  const lines: CashflowInputLine[] = [];
  for (const e of events.slice(0, SHORTAGE_PROJECTION_LIMIT)) {
    const line = financeEventToCashflowLine({ dueAt: e.dueAt, amount: toNumber(e.amount), direction: e.direction, note: e.description });
    if (line) lines.push(line);
  }
  return { opening, lineCount: lines.length, truncated, currentlyNegative: opening < 0, result: forecastCashflow(opening, lines) };
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

export interface TenantScopedCashflowForecast {
  forecast: { id: string; name: string; baseDate: Date; createdAt: Date } | null;
  lines: Awaited<ReturnType<typeof prisma.cashflowForecastLine.findMany>>;
}

/**
 * 最新の資金繰り予測とその明細を actor tenant で二重スコープして返す（V90 FIN_CASHFLOW_FORECAST_LINE_TENANT_R1）。
 * CashflowForecastLine は forecastId 単独FKのため親子 tenant 一致が DB では強制されない。
 * 子行の取得条件に必ず tenantId を併記し、親と tenant が一致しない行は値・件数・存在シグナルを
 * 一切返さない（fail-closed＝その行が存在しない世界と同一の出力）。
 */
export async function getTenantScopedCashflowForecast(tenantId: string): Promise<TenantScopedCashflowForecast> {
  const forecast = await prisma.cashflowForecast.findFirst({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, baseDate: true, createdAt: true },
  });
  if (!forecast) return { forecast: null, lines: [] };
  const lines = await prisma.cashflowForecastLine.findMany({
    where: { forecastId: forecast.id, tenantId },
    orderBy: { date: 'asc' },
  });
  return { forecast, lines };
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
    where: { tenantId, type: { in: ['cashflow_expected', 'payment_expected', 'payment_received', 'payment_reversal'] } },
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
