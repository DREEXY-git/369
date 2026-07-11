// Agent Control Plane v0: AIAgentRun の lifecycle producer（Phase 4 Stream B2・roadmap74・v5.8 hardening）。
// 遷移は shared の許可表（RUN_TRANSITIONS）に従い、terminal からの巻き戻し・二重 Run を作らない。
// prompt 全文・PII・Secrets・承認 payload 本文は保存しない（task 名は固定リテラル・エラーはマスク）。
// AI は承認・却下しない（NEEDS_APPROVAL は AIApprovalGate PENDING を作り、判断は人間に委ねる）。
// 外部送信・実 LLM・課金への接続なし（このモジュールは記録のみ）。
//
// v5.8 Codex レビュー反映:
// - High-2: fn 失敗時は FAILED 記録後に**マスク済みメッセージの例外を再 throw** する
//   （BullMQ の retry / failed telemetry を成立させる。握り潰して {ok:false} 返却しない）。
// - Medium-1: create 後に「自分より先に作られた新鮮な active run」を再確認し、負けた側は
//   自分を FAILED(重複) にして skip する（check-and-create の競合窓のベストエフォート緩和。
//   完全な原子性は schema unique 制約が必要＝roadmap78 の設計 Gate。schema 変更はしない）。
// - Medium-6: finish() を updateMany の compare-and-set に変更（再読→更新の競合窓を排除）。
//   遷移 CAS が失敗した場合は Gate/Action を作らず、安全な競合例外を投げる。
// - Medium-2: NEEDS_APPROVAL を返す producer の接続は、AIApprovalGate→人間判断の bridge
//   （roadmap78 設計 Gate）が実装されるまで**禁止**。現接続 producer（MORNING_REPORT_JOB）は
//   needsApproval を返さない。
import { prisma } from '@hokko/db';
import {
  RUN_TRANSITIONS,
  shouldCreateRun,
  isStaleActiveRun,
  maskRunError,
  type RunLifecycleStatus,
} from '@hokko/shared';

export interface LifecycleResult<T> {
  ok: boolean;
  skipped?: string;
  runId?: string;
  result?: T;
}

/** テスト注入用の最小 DB 面（実体は @hokko/db の prisma）。 */
export interface LifecycleDb {
  aIAgent: { findFirst: (args: unknown) => Promise<{ id: string } | null> };
  aIAgentRun: {
    findMany: (args: unknown) => Promise<{ id: string; status: string; startedAt: Date | null }[]>;
    create: (args: unknown) => Promise<{ id: string; startedAt: Date }>;
    updateMany: (args: unknown) => Promise<{ count: number }>;
  };
  aIApprovalGate: { create: (args: unknown) => Promise<unknown> };
  aIAgentAction: { create: (args: unknown) => Promise<unknown> };
}

/**
 * ジョブ本体を AIAgentRun の lifecycle（RUNNING→SUCCEEDED/FAILED/NEEDS_APPROVAL）で包む。
 * - 同一 agent×task に新鮮な RUNNING/QUEUED/NEEDS_APPROVAL があれば実行せず skip（二重 Run 防止）。
 * - fn が { needsApproval: reason } を返した場合は NEEDS_APPROVAL とし AIApprovalGate(PENDING) を作る。
 * - fn が throw した場合は FAILED＋マスク済みエラーを保存した上で、**マスク済み例外を再 throw** する
 *   （呼び出し元の queue が失敗を観測し retry できる。retry は次回起動時の新しい run として扱う）。
 */
export async function runWithAgentLifecycle<T>(
  params: { tenantId: string; agentKey: string; task: string; summary: string },
  fn: () => Promise<T & { needsApproval?: string }>,
  db: LifecycleDb = prisma as unknown as LifecycleDb,
): Promise<LifecycleResult<T>> {
  const { tenantId, agentKey, task, summary } = params;
  const agent = await db.aIAgent.findFirst({ where: { tenantId, key: agentKey }, select: { id: true } });
  if (!agent) return { ok: false, skipped: `agent not found: ${agentKey}` };

  const activeWhere = { tenantId, agentId: agent.id, task, status: { in: ['RUNNING', 'QUEUED', 'NEEDS_APPROVAL'] } };
  const existing = await db.aIAgentRun.findMany({
    where: activeWhere,
    select: { id: true, status: true, startedAt: true },
  });
  const gate = shouldCreateRun(
    existing.map((r) => ({ status: r.status as RunLifecycleStatus, startedAt: r.startedAt })),
    new Date(),
  );
  if (!gate.create) return { ok: false, skipped: gate.reason };

  const run = await db.aIAgentRun.create({
    data: { tenantId, agentId: agent.id, task, status: 'RUNNING', humanReviewed: false, sentExternally: false, riskLevel: 'LOW' },
  });

  // 遷移は compare-and-set（updateMany + 許可元 status 条件）で行う（Medium-6: 再読→更新の競合窓を排除）。
  const finish = async (to: RunLifecycleStatus, extra: { error?: string } = {}): Promise<boolean> => {
    const fromAllowed = (Object.keys(RUN_TRANSITIONS) as RunLifecycleStatus[]).filter((f) =>
      RUN_TRANSITIONS[f].includes(to),
    );
    const res = await db.aIAgentRun.updateMany({
      where: { id: run.id, tenantId, status: { in: fromAllowed } },
      data: { status: to, finishedAt: to === 'NEEDS_APPROVAL' ? null : new Date(), error: extra.error ?? null },
    });
    return res.count === 1;
  };

  // Medium-1 緩和: create 後に active を再確認し、自分より先（startedAt→id の順）に作られた別の
  // 新鮮な active run があれば後発の自分を降ろす（同時 2 worker の二重実行を片方へ収束させる。
  // 完全な原子性の保証ではない点は roadmap78 に記録）。
  const rivals = await db.aIAgentRun.findMany({
    where: activeWhere,
    select: { id: true, status: true, startedAt: true },
  });
  const mine = rivals.find((r) => r.id === run.id);
  const rivalNow = new Date();
  const earlier = rivals.filter((r) => {
    if (!mine || r.id === run.id) return false;
    // v6.2 修正: stale（クラッシュ残骸・RUNNING/QUEUED・startedAt 古い or null）は競合に含めない。
    // 作成前 gate（shouldCreateRun）と**同一の isStaleActiveRun**で判定し、pre/post の stale 規則を一致させる
    // （残骸が新規 run を恒久的に潰す二重実行誤判定を防ぐ。時刻基準 rivalNow も pre と揃える）。
    if (isStaleActiveRun({ status: r.status as RunLifecycleStatus, startedAt: r.startedAt }, rivalNow)) return false;
    const a = r.startedAt ? r.startedAt.getTime() : 0;
    const b = mine.startedAt ? mine.startedAt.getTime() : 0;
    return a < b || (a === b && r.id < run.id);
  });
  if (earlier.length > 0) {
    await finish('FAILED', { error: '二重実行を検出したため中止（先行 run が実行中）' });
    return { ok: false, skipped: '二重実行を検出したため中止（先行 run が実行中）', runId: run.id };
  }

  try {
    const result = await fn();
    if (result && typeof result === 'object' && typeof result.needsApproval === 'string') {
      // NOTE(Medium-2): この経路を使う producer の接続は bridge（roadmap78 設計 Gate）実装まで禁止。
      const moved = await finish('NEEDS_APPROVAL');
      if (!moved) throw new Error('run 状態遷移が競合しました（NEEDS_APPROVAL）');
      // AI は承認しない: PENDING の AIApprovalGate を作り、人間の判断（既存の承認導線）を待つ。
      await db.aIApprovalGate.create({
        data: { tenantId, runId: run.id, action: task, reason: result.needsApproval.slice(0, 200), status: 'PENDING' },
      });
      await db.aIAgentAction.create({ data: { tenantId, runId: run.id, type: 'recommend', summary: `${summary}（人間の承認待ち）` } });
      return { ok: true, runId: run.id, result };
    }
    const moved = await finish('SUCCEEDED');
    if (!moved) throw new Error('run 状態遷移が競合しました（SUCCEEDED）');
    await db.aIAgentAction.create({ data: { tenantId, runId: run.id, type: 'recommend', summary } });
    return { ok: true, runId: run.id, result };
  } catch (e) {
    const masked = maskRunError(e);
    // 記録は best-effort（記録失敗が再 throw を妨げないように握る）。
    try {
      await finish('FAILED', { error: masked });
      await db.aIAgentAction.create({ data: { tenantId, runId: run.id, type: 'recommend', summary: `${summary}（失敗: ${masked.slice(0, 80)}）` } });
    } catch {
      // 記録失敗時も元の失敗を優先して伝える
    }
    // High-2: マスク済みメッセージのみを持つ安全な例外を再 throw（BullMQ の retry/failed を成立させる。
    // 元例外の stack/プロパティに秘密が含まれ得るため、元オブジェクトはそのまま投げない）。
    throw new Error(`agent lifecycle job failed [run=${run.id}]: ${masked}`);
  }
}
