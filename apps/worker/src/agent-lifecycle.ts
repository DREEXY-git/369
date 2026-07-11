// Agent Control Plane v0: AIAgentRun の lifecycle producer（Phase 4 Stream B2・roadmap74）。
// 遷移は shared の許可表（RUN_TRANSITIONS）に従い、terminal からの巻き戻し・二重 Run を作らない。
// prompt 全文・PII・Secrets・承認 payload 本文は保存しない（task 名は固定リテラル・エラーはマスク）。
// AI は承認・却下しない（NEEDS_APPROVAL は AIApprovalGate PENDING を作り、判断は人間の既存フローに委ねる）。
// 外部送信・実 LLM・課金への接続なし（このモジュールは記録のみ）。
import { prisma } from '@hokko/db';
import {
  canTransitionRun,
  shouldCreateRun,
  maskRunError,
  type RunLifecycleStatus,
} from '@hokko/shared';

export interface LifecycleResult<T> {
  ok: boolean;
  skipped?: string;
  runId?: string;
  result?: T;
  error?: string;
}

/**
 * ジョブ本体を AIAgentRun の lifecycle（RUNNING→SUCCEEDED/FAILED/NEEDS_APPROVAL）で包む。
 * - 同一 agent×task に新鮮な RUNNING/QUEUED/NEEDS_APPROVAL があれば実行せず skip（二重 Run 防止）。
 * - fn が { needsApproval: reason } を返した場合は NEEDS_APPROVAL とし AIApprovalGate(PENDING) を作る。
 * - 失敗時は FAILED＋マスク済みエラーを保存（retry は次回起動時の新しい run として扱う）。
 */
export async function runWithAgentLifecycle<T>(
  params: { tenantId: string; agentKey: string; task: string; summary: string },
  fn: () => Promise<T & { needsApproval?: string }>,
): Promise<LifecycleResult<T>> {
  const { tenantId, agentKey, task, summary } = params;
  const agent = await prisma.aIAgent.findFirst({ where: { tenantId, key: agentKey }, select: { id: true } });
  if (!agent) return { ok: false, skipped: `agent not found: ${agentKey}` };

  const existing = await prisma.aIAgentRun.findMany({
    where: { tenantId, agentId: agent.id, task, status: { in: ['RUNNING', 'QUEUED', 'NEEDS_APPROVAL'] } },
    select: { status: true, startedAt: true },
  });
  const gate = shouldCreateRun(
    existing.map((r: { status: string; startedAt: Date | null }) => ({ status: r.status as RunLifecycleStatus, startedAt: r.startedAt })),
    new Date(),
  );
  if (!gate.create) return { ok: false, skipped: gate.reason };

  const run = await prisma.aIAgentRun.create({
    data: { tenantId, agentId: agent.id, task, status: 'RUNNING', humanReviewed: false, sentExternally: false, riskLevel: 'LOW' },
  });

  const finish = async (to: RunLifecycleStatus, extra: { error?: string } = {}) => {
    // 遷移は許可表を通す（現在値を再読して terminal 巻き戻しを拒否）。
    const cur = await prisma.aIAgentRun.findFirst({ where: { id: run.id, tenantId }, select: { status: true } });
    if (!cur || !canTransitionRun(cur.status as RunLifecycleStatus, to)) return false;
    await prisma.aIAgentRun.update({
      where: { id: run.id },
      data: { status: to, finishedAt: to === 'NEEDS_APPROVAL' ? null : new Date(), error: extra.error ?? null },
    });
    return true;
  };

  try {
    const result = await fn();
    if (result && typeof result === 'object' && typeof result.needsApproval === 'string') {
      await finish('NEEDS_APPROVAL');
      // AI は承認しない: PENDING の AIApprovalGate を作り、人間の判断（既存の承認導線）を待つ。
      await prisma.aIApprovalGate.create({
        data: { tenantId, runId: run.id, action: task, reason: result.needsApproval.slice(0, 200), status: 'PENDING' },
      });
      await prisma.aIAgentAction.create({ data: { tenantId, runId: run.id, type: 'recommend', summary: `${summary}（人間の承認待ち）` } });
      return { ok: true, runId: run.id, result };
    }
    await finish('SUCCEEDED');
    await prisma.aIAgentAction.create({ data: { tenantId, runId: run.id, type: 'recommend', summary } });
    return { ok: true, runId: run.id, result };
  } catch (e) {
    const masked = maskRunError(e);
    await finish('FAILED', { error: masked });
    await prisma.aIAgentAction.create({ data: { tenantId, runId: run.id, type: 'recommend', summary: `${summary}（失敗: ${masked.slice(0, 80)}）` } });
    return { ok: false, runId: run.id, error: masked };
  }
}
