// AI Workforce read model（Phase 4 Stream B・roadmap71）。
// 既存の AIAgent / AIAgentRun / AIAgentAction / AIApprovalGate から表示用データを集約する。
// PII・Secrets・プロンプト全文・承認 payload 本文は取得しない（run の input/output を select しない）。
// 本モジュールは read-only。実行・承認・削除・外部送信は行わない。
import { prisma } from '@/lib/db';
import {
  deriveAgentState,
  freshnessLabel,
  type AiWorkforceState,
} from '@hokko/shared';

export interface AiWorkforceAgentView {
  id: string;
  key: string;
  name: string;
  role: string;
  department: string;
  autonomy: string;
  state: AiWorkforceState;
  stateReason: string;
  blockedReason: string | null;
  currentTask: string | null;
  lastActivityLabel: string;
  pendingApprovals: number;
  runCount: number;
  /** 権限レベルの表示（autonomy と AI 共通制約の要約・個別権限の羅列はしない）。 */
  permissionLevel: string;
  nextRecommendedAction: string;
}

export interface AiWorkforceReadModel {
  agents: AiWorkforceAgentView[];
  totals: { byState: Record<string, number>; pendingApprovals: number };
  generatedAtLabel: string;
}

export async function getAiWorkforceReadModel(tenantId: string, now: Date = new Date()): Promise<AiWorkforceReadModel> {
  const [agents, runs, gates, runCounts] = await Promise.all([
    prisma.aIAgent.findMany({
      where: { tenantId },
      select: { id: true, key: true, name: true, role: true, department: true, status: true, autonomy: true },
      orderBy: { name: 'asc' },
    }),
    // 直近 run をエージェントごとに1件（input/output は取得しない）。
    prisma.aIAgentRun.findMany({
      where: { tenantId },
      select: { agentId: true, status: true, task: true, startedAt: true, finishedAt: true, error: true },
      orderBy: { startedAt: 'desc' },
      take: 200,
    }),
    prisma.aIApprovalGate.findMany({
      where: { tenantId, status: { in: ['PENDING', 'REJECTED'] } },
      select: { runId: true, status: true },
    }),
    prisma.aIAgentRun.groupBy({ by: ['agentId'], where: { tenantId }, _count: { _all: true } }),
  ]);

  const latestRunByAgent = new Map<string, (typeof runs)[number]>();
  for (const r of runs) {
    if (!latestRunByAgent.has(r.agentId)) latestRunByAgent.set(r.agentId, r);
  }
  const runCountByAgent = new Map(runCounts.map((r) => [r.agentId, r._count._all]));

  // AIApprovalGate は runId 経由でのみエージェントに紐づく（runId null はテナント全体の件数として扱わない）。
  const runAgent = new Map<string, string>();
  const runIds = gates.map((g) => g.runId).filter((x): x is string => x != null);
  if (runIds.length) {
    const gateRuns = await prisma.aIAgentRun.findMany({ where: { tenantId, id: { in: runIds } }, select: { id: true, agentId: true } });
    for (const gr of gateRuns) runAgent.set(gr.id, gr.agentId);
  }
  const pendingByAgent = new Map<string, number>();
  const rejectedByAgent = new Map<string, number>();
  for (const g of gates) {
    const agentId = g.runId ? runAgent.get(g.runId) : undefined;
    if (!agentId) continue;
    const m = g.status === 'PENDING' ? pendingByAgent : rejectedByAgent;
    m.set(agentId, (m.get(agentId) ?? 0) + 1);
  }

  const views: AiWorkforceAgentView[] = agents.map((a) => {
    const run = latestRunByAgent.get(a.id) ?? null;
    const pending = pendingByAgent.get(a.id) ?? 0;
    const rejected = rejectedByAgent.get(a.id) ?? 0;
    const derived = deriveAgentState({
      agentStatus: a.status,
      latestRun: run ? { status: run.status, startedAt: run.startedAt, finishedAt: run.finishedAt, task: run.task, error: run.error } : null,
      pendingApprovalGates: pending,
      rejectedApprovalGates: rejected,
    });
    const lastActivityAt = run ? (run.finishedAt ?? run.startedAt) : null;
    const next =
      derived.state === 'waiting_approval'
        ? '承認待ち一覧（/approvals）で人間が判断してください'
        : derived.state === 'error' || derived.state === 'blocked'
          ? '活動ログ（/ai-agents）で失敗内容を確認してください'
          : derived.state === 'unknown'
            ? 'テレメトリなし。稼働させる場合はジョブ/タスクの割当が必要です'
            : '対応不要（自動運転は承認境界内のみ）';
    return {
      id: a.id,
      key: a.key,
      name: a.name,
      role: a.role,
      department: a.department ?? '未配属',
      autonomy: a.autonomy,
      state: derived.state,
      stateReason: derived.reason,
      blockedReason: derived.blockedReason,
      currentTask: run && (run.status === 'RUNNING' || run.status === 'QUEUED') ? run.task : null,
      lastActivityLabel: freshnessLabel(lastActivityAt, now),
      pendingApprovals: pending,
      runCount: runCountByAgent.get(a.id) ?? 0,
      permissionLevel: `autonomy: ${a.autonomy}（外部送信・承認・削除は不可／人間承認必須）`,
      nextRecommendedAction: next,
    };
  });

  const byState: Record<string, number> = {};
  for (const v of views) byState[v.state] = (byState[v.state] ?? 0) + 1;
  return {
    agents: views,
    totals: { byState, pendingApprovals: views.reduce((s, v) => s + v.pendingApprovals, 0) },
    generatedAtLabel: now.toISOString().slice(0, 16).replace('T', ' '),
  };
}
