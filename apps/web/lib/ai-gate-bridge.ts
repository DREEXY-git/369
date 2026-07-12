// Phase 4 安全実行 Bridge の transaction 正本（v7.0 Lane P4・roadmap82／v7.0 R2・Codex comment 4951050657 対応）。
// AI 承認ゲート（AIApprovalGate PENDING）への人間の approve/reject を、単一 $transaction で
// gate CAS → run 遷移（RUN_TRANSITIONS 準拠・count===1 必須）→ ApprovalRequest 1:1 決定レコード →
// 監査（metadata-only）として確定する。
// v7.0 R2 の意味論是正（Codex P2-3）: **approve は run を SUCCEEDED にしない**。実行証拠なしに成果を
// 記録しないため、approve = NEEDS_APPROVAL → QUEUED（人間承認済み・再開待ち）。実 queue 再投入・実行・
// SUCCEEDED 化は P4Q Gate の worker 側。承認・再開待ち・実行済みは状態として混同されない。
// v7.0 R2 の stale 規約（Codex P2-2）: 判断前に gate.createdAt / run.startedAt の freshness を
// shared `isStaleApprovalGate`（単一正本）で判定し、stale な approve は人間の明示再確認
// （confirmStale）が無い限り**何も変更せず** 'stale' を返す。reject は安全側（終了）なので stale でも可。
// AI 自身の判断は core（actorIsAi）と Server Action（user.isAi）の二重防御で DB 接触前に拒否する。
// db は注入（実 prisma / テスト mock / 失敗注入 wrapper）。

import { isStaleApprovalGate, type RunLifecycleStatus } from '@hokko/shared';

interface GateTx {
  aIApprovalGate: {
    updateMany(args: unknown): Promise<{ count: number }>;
    findFirst(
      args: unknown,
    ): Promise<{ id: string; runId: string | null; action: string; status: string; createdAt: Date | null } | null>;
  };
  aIAgentRun: {
    updateMany(args: unknown): Promise<{ count: number }>;
    findFirst(args: unknown): Promise<{ id: string; status: string; startedAt: Date | null } | null>;
  };
  aIAgentAction: { create(args: unknown): Promise<unknown> };
  approvalRequest: { create(args: unknown): Promise<{ id: string }> };
  auditLog: { create(args: unknown): Promise<unknown> };
  dataAccessLog: { create(args: unknown): Promise<unknown> };
}

export interface GateBridgeDb {
  $transaction<T>(fn: (tx: GateTx) => Promise<T>): Promise<T>;
}

export interface DecideAiGateInput {
  tenantId: string;
  gateId: string;
  decision: 'approve' | 'reject';
  decidedById: string;
  note: string;
  /** AI ロールは承認権限が誤設定で付与されていても判断不可（不変条件）。 */
  actorIsAi: boolean;
  /** stale gate（24h 超・fail-closed）の approve は人間の明示再確認が必須（UI checkbox）。 */
  confirmStale?: boolean;
  /** テスト用の時刻注入（省略時は現在時刻）。 */
  now?: Date;
}

export type DecideAiGateResult =
  | { outcome: 'decided' }
  | { outcome: 'already' }
  | { outcome: 'forbidden' }
  | { outcome: 'stale' };

export async function decideAiGateCore(db: GateBridgeDb, input: DecideAiGateInput): Promise<DecideAiGateResult> {
  if (input.actorIsAi) return { outcome: 'forbidden' }; // DB に触れる前に拒否
  const status = input.decision === 'approve' ? 'APPROVED' : 'REJECTED';
  const now = input.now ?? new Date();
  return db.$transaction(async (tx) => {
    // tenant スコープで gate を先に取得（cross-tenant/不存在は benign な already＝存在シグナルなし）。
    // input/output/error/payload 本文は取得しない（metadata-only）。
    const gate = await tx.aIApprovalGate.findFirst({
      where: { id: input.gateId, tenantId: input.tenantId },
      select: { id: true, runId: true, action: true, status: true, createdAt: true },
    });
    if (!gate || gate.status !== 'PENDING') return { outcome: 'already' as const };

    // 対象 run の freshness 判定材料（status/startedAt のみの最小 select・tenant スコープ）。
    const run = gate.runId
      ? await tx.aIAgentRun.findFirst({
          where: { id: gate.runId, tenantId: input.tenantId },
          select: { id: true, status: true, startedAt: true },
        })
      : null;

    // v7.0 R2（Codex P2-2）: stale gate の approve は明示再確認が無い限り何も変更しない。
    if (
      input.decision === 'approve' &&
      !input.confirmStale &&
      isStaleApprovalGate(
        { createdAt: gate.createdAt },
        run ? { status: run.status as RunLifecycleStatus, startedAt: run.startedAt } : null,
        now,
      )
    ) {
      return { outcome: 'stale' as const };
    }

    // 原子的な二重判断防止: PENDING の gate だけを決定へ（並行 approve/reject は一方だけ勝つ）。
    const claim = await tx.aIApprovalGate.updateMany({
      where: { id: input.gateId, tenantId: input.tenantId, status: 'PENDING' },
      data: { status },
    });
    if (claim.count === 0) return { outcome: 'already' as const };

    // runId が null の孤立 gate は「判断のみ」で完結（stale/null の一貫した扱い・run へは触れない）。
    if (gate.runId) {
      if (input.decision === 'approve') {
        // v7.0 R2（Codex P2-3）: approve = NEEDS_APPROVAL → QUEUED（承認済み・再開待ち）。
        // SUCCEEDED・finishedAt は付けない（実行証拠なしに成果を記録しない）。startedAt（non-null 列）は
        // 元の実行開始時刻の履歴としてそのまま残す — 古い startedAt の QUEUED は isStaleActiveRun が
        // stale と判定するため、新規 run の作成を恒久ブロックしない。実行・完了は P4Q Gate の worker 側のみ。
        const queued = await tx.aIAgentRun.updateMany({
          where: { id: gate.runId, tenantId: input.tenantId, status: 'NEEDS_APPROVAL' },
          data: { status: 'QUEUED', humanReviewed: true },
        });
        if (queued.count !== 1) throw new Error('ai-run-transition-failed'); // 消失/terminal/競合 → 判断ごと rollback
        await tx.aIAgentAction.create({
          data: {
            tenantId: input.tenantId,
            runId: gate.runId,
            type: 'recommend',
            summary: `人間の承認を記録しました（再開待ち・実行はまだ行われていません・外部作用なし・action=${gate.action}）`,
          },
        });
      } else {
        const failed = await tx.aIAgentRun.updateMany({
          where: { id: gate.runId, tenantId: input.tenantId, status: 'NEEDS_APPROVAL' },
          data: { status: 'FAILED', finishedAt: new Date(), humanReviewed: true, error: '人間の判断により却下されました（承認ゲート）' },
        });
        if (failed.count !== 1) throw new Error('ai-run-transition-failed');
      }
    }

    // ApprovalRequest 1:1 決定レコード（CAS 勝者だけが作成＝構造的に一対一）。payload はメタのみ。
    const record = await tx.approvalRequest.create({
      data: {
        tenantId: input.tenantId,
        type: 'ai_run_resume',
        requestedForAction: 'ai_run_resume',
        title: `AI承認ゲートの判断: ${gate.action}`,
        summary:
          input.decision === 'approve'
            ? '人間が承認（再開待ち・実行はまだ行われていません・外部作用なし）'
            : '人間が却下（run は終了・再開不可）',
        entityType: 'ai_approval_gate',
        entityId: gate.id,
        riskLevel: 'MEDIUM',
        status,
        decidedById: input.decidedById,
        decidedAt: new Date(),
        decisionNote: input.note,
        payload: { runId: gate.runId, action: gate.action, staleConfirmed: input.confirmStale === true },
      },
    });
    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorId: input.decidedById,
        actorType: 'user',
        action: input.decision === 'approve' ? 'approve' : 'reject',
        entityType: 'AIApprovalGate',
        entityId: gate.id,
        summary: `AI承認ゲート（${gate.action}）を${input.decision === 'approve' ? '承認（再開待ち・実行なし）' : '却下'}`,
        metadata: { approvalId: record.id, runId: gate.runId, staleConfirmed: input.confirmStale === true },
      },
    });
    await tx.dataAccessLog.create({
      data: {
        tenantId: input.tenantId,
        actorId: input.decidedById,
        actorType: 'user',
        entityType: 'AIApprovalGate',
        entityId: gate.id,
        label: 'INTERNAL',
        action: 'read',
        purpose: 'ai_gate_decision',
        metadata: { approvalId: record.id, runId: gate.runId, fields: ['action', 'runId', 'createdAt'] },
      },
    });
    return { outcome: 'decided' as const };
  });
}
