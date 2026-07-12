// Phase 4 Control Plane read model（v7.2 Lane C・read-only・roadmap85）。
// 既存データ（AIAgent / AIAgentRun / AIApprovalGate / ApprovalRequest / AuditLog / AIAgentAction）のみを
// 最小 select で集約する。**run の input / output / error・承認 payload 本文・Secrets・PII は取得しない。**
// 実行・承認・削除・外部送信は行わない（判断は /approvals のみ・本画面は可視化専用）。
// 承認由来のセクション（Inbox のゲート・Execution Receipt）は approval:approve かつ人間のみへ渡す
// （WIP-5 承認シグナル遮断・v7.0 R2 の AI 閲覧境界と同一規律・取得段階で遮断）。
import { prisma } from '@/lib/db';
import {
  isStaleApprovalGate,
  isStaleActiveRun,
  summarizeAgentRuns,
  buildExecutionReceipts,
  type AgentRunStats,
  type ExecutionReceipt,
  type RunLifecycleStatus,
} from '@hokko/shared';
import { getAiWorkforceReadModel, type AiWorkforceReadModel } from './read-model';

const WINDOW_DAYS = 30;

export interface ControlInboxItem {
  kind: 'pending_gate' | 'queued_resume' | 'stale_active' | 'failed_recent' | 'needs_approval';
  label: string;
  detail: string;
  stale: boolean;
  /** deep link（判断・確認の実行先。この画面では実行しない）。 */
  href: string;
  testId: string;
}

export interface ControlPlaneModel {
  workforce: AiWorkforceReadModel;
  statsByAgent: Record<string, AgentRunStats>;
  /** 承認権限者（人間）のみ非 null。 */
  inbox: ControlInboxItem[] | null;
  receipts: (ExecutionReceipt & { decidedByName: string | null })[] | null;
  counts: {
    queuedResume: number;
    staleActive: number;
    failedRecent: number;
    needsApproval: number;
    /** 承認権限者のみ（非権限者へは承認シグナルを返さない）。 */
    pendingGates: number | null;
  };
  windowDays: number;
}

export async function getControlPlaneModel(
  tenantId: string,
  opts: { includeApprovalSections: boolean },
  now: Date = new Date(),
): Promise<ControlPlaneModel> {
  const since = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const [workforce, runs] = await Promise.all([
    getAiWorkforceReadModel(tenantId, now),
    prisma.aIAgentRun.findMany({
      where: { tenantId, startedAt: { gte: since } },
      select: { id: true, agentId: true, status: true, task: true, startedAt: true, finishedAt: true, humanReviewed: true },
      orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      take: 500,
    }),
  ]);
  const agentName = new Map(workforce.agents.map((a) => [a.id, a.name]));

  const statsByAgent = summarizeAgentRuns(
    runs.map((r) => ({ agentId: r.agentId, status: r.status, startedAt: r.startedAt, finishedAt: r.finishedAt, humanReviewed: r.humanReviewed })),
  );

  const queuedResume = runs.filter((r) => r.status === 'QUEUED' && r.humanReviewed);
  const staleActive = runs.filter((r) =>
    isStaleActiveRun({ status: r.status as RunLifecycleStatus, startedAt: r.startedAt }, now),
  );
  const failedRecent = runs.filter((r) => r.status === 'FAILED').slice(0, 10);
  const needsApproval = runs.filter((r) => r.status === 'NEEDS_APPROVAL');

  const counts = {
    queuedResume: queuedResume.length,
    staleActive: staleActive.length,
    failedRecent: runs.filter((r) => r.status === 'FAILED').length,
    needsApproval: needsApproval.length,
    pendingGates: null as number | null,
  };

  let inbox: ControlInboxItem[] | null = null;
  let receipts: (ExecutionReceipt & { decidedByName: string | null })[] | null = null;

  if (opts.includeApprovalSections) {
    // ── 承認権限者（人間）のみ: PENDING ゲート＋判断レシート ──
    const gates = await prisma.aIApprovalGate.findMany({
      where: { tenantId, status: 'PENDING' },
      select: { id: true, runId: true, action: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const gateRunIds = gates.map((g) => g.runId).filter((v): v is string => Boolean(v));
    const gateRuns = gateRunIds.length
      ? await prisma.aIAgentRun.findMany({
          where: { tenantId, id: { in: gateRunIds } },
          select: { id: true, status: true, startedAt: true },
        })
      : [];
    const gateRunById = new Map(gateRuns.map((r) => [r.id, r]));

    inbox = [
      ...gates.map((g): ControlInboxItem => {
        const run = g.runId ? (gateRunById.get(g.runId) ?? null) : null;
        const stale = isStaleApprovalGate(
          { createdAt: g.createdAt },
          run ? { status: run.status as RunLifecycleStatus, startedAt: run.startedAt } : null,
          now,
        );
        return {
          kind: 'pending_gate',
          label: `人間の判断待ち: ${g.action}`,
          detail: stale ? 'stale（24h超・承認には再確認が必要）' : '判断は /approvals で行います',
          stale,
          href: '/approvals',
          testId: `cp-inbox-gate-${g.id}`,
        };
      }),
      ...queuedResume.slice(0, 10).map(
        (r): ControlInboxItem => ({
          kind: 'queued_resume',
          label: `承認済み・再開待ち: ${r.task}`,
          detail: `${agentName.get(r.agentId) ?? 'AI社員'}／実行はまだ行われていません（実 queue 再投入は別 Gate）`,
          stale: false,
          href: `/ai-agents/${r.agentId}`,
          testId: `cp-inbox-queued-${r.id}`,
        }),
      ),
      ...staleActive.slice(0, 10).map(
        (r): ControlInboxItem => ({
          kind: 'stale_active',
          label: `stale: ${r.task}`,
          detail: `${r.status} のまま終了記録がなく実行中と断定できません`,
          stale: true,
          href: `/ai-agents/${r.agentId}`,
          testId: `cp-inbox-stale-${r.id}`,
        }),
      ),
      ...failedRecent.map(
        (r): ControlInboxItem => ({
          kind: 'failed_recent',
          label: `失敗: ${r.task}`,
          detail: `${agentName.get(r.agentId) ?? 'AI社員'}／詳細は AI 社員ページで確認（本文は表示しません）`,
          stale: false,
          href: `/ai-agents/${r.agentId}`,
          testId: `cp-inbox-failed-${r.id}`,
        }),
      ),
    ];
    counts.pendingGates = gates.length;

    // Execution Receipt: ApprovalRequest(ai_run_resume) を正本に audit / run action と相関。
    const approvals = await prisma.approvalRequest.findMany({
      where: { tenantId, type: 'ai_run_resume' },
      select: { id: true, entityId: true, status: true, decidedAt: true, decidedById: true, payload: true },
      orderBy: { decidedAt: 'desc' },
      take: 20,
    });
    const gateIds = approvals.map((a) => a.entityId).filter((v): v is string => Boolean(v));
    const [audits, receiptRunActions, deciders] = await Promise.all([
      gateIds.length
        ? prisma.auditLog.findMany({
            where: { tenantId, entityType: 'AIApprovalGate', entityId: { in: gateIds }, action: { in: ['approve', 'reject'] } },
            select: { entityId: true, action: true, createdAt: true, metadata: true },
          })
        : Promise.resolve([]),
      prisma.aIAgentAction.findMany({
        where: { tenantId, summary: { contains: '人間の承認を記録しました' } },
        select: { runId: true, summary: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.user.findMany({
        where: { tenantId, id: { in: approvals.map((a) => a.decidedById).filter((v): v is string => Boolean(v)) } },
        select: { id: true, name: true },
      }),
    ]);
    const deciderName = new Map(deciders.map((d) => [d.id, d.name]));
    receipts = buildExecutionReceipts(
      approvals.map((a) => ({
        id: a.id,
        entityId: a.entityId,
        status: a.status,
        decidedAt: a.decidedAt,
        decidedById: a.decidedById,
        payload: (a.payload ?? null) as { runId?: string | null; action?: string; staleConfirmed?: boolean } | null,
      })),
      audits.map((a) => ({
        entityId: a.entityId,
        action: a.action,
        createdAt: a.createdAt,
        metadata: (a.metadata ?? null) as { approvalId?: string; runId?: string | null; staleConfirmed?: boolean } | null,
      })),
      receiptRunActions.map((a) => ({ runId: a.runId, summary: a.summary, createdAt: a.createdAt })),
    ).map((r) => ({ ...r, decidedByName: r.decidedById ? (deciderName.get(r.decidedById) ?? null) : null }));
  }

  return { workforce, statsByAgent, inbox, receipts, counts, windowDays: WINDOW_DAYS };
}
