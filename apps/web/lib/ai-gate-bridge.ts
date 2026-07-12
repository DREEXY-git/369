// Phase 4 安全実行 Bridge の transaction 正本（v7.0 Lane P4・roadmap82）。
// AI 承認ゲート（AIApprovalGate PENDING）への人間の approve/reject を、単一 $transaction で
// gate CAS → run 遷移（RUN_TRANSITIONS 準拠・count===1 必須）→ ApprovalRequest 1:1 決定レコード →
// 監査（metadata-only）として確定する。approve の「再開」は**内部処理のみ**（AIAgentAction に記録して
// run を完了させる）で、実 queue 再投入・外部送信・実 LLM・課金は一切行わない。
// AI 自身の判断は core（actorIsAi）と Server Action（user.isAi）の二重防御で DB 接触前に拒否する。
// db は注入（実 prisma / テスト mock / 失敗注入 wrapper）。

interface GateTx {
  aIApprovalGate: {
    updateMany(args: unknown): Promise<{ count: number }>;
    findFirst(args: unknown): Promise<{ id: string; runId: string | null; action: string } | null>;
  };
  aIAgentRun: { updateMany(args: unknown): Promise<{ count: number }> };
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
}

export type DecideAiGateResult = { outcome: 'decided' } | { outcome: 'already' } | { outcome: 'forbidden' };

export async function decideAiGateCore(db: GateBridgeDb, input: DecideAiGateInput): Promise<DecideAiGateResult> {
  if (input.actorIsAi) return { outcome: 'forbidden' }; // DB に触れる前に拒否
  const status = input.decision === 'approve' ? 'APPROVED' : 'REJECTED';
  return db.$transaction(async (tx) => {
    // 原子的な二重判断防止: PENDING の gate だけを決定へ（並行 approve/reject は一方だけ勝つ）。
    const claim = await tx.aIApprovalGate.updateMany({
      where: { id: input.gateId, tenantId: input.tenantId, status: 'PENDING' },
      data: { status },
    });
    if (claim.count === 0) return { outcome: 'already' as const };

    const gate = await tx.aIApprovalGate.findFirst({
      where: { id: input.gateId, tenantId: input.tenantId },
      select: { id: true, runId: true, action: true },
    });
    if (!gate) throw new Error('ai-gate-vanished'); // CAS 勝者なのに行が無い＝不整合 → 全体 rollback

    // runId が null の孤立 gate は「判断のみ」で完結（stale/null の一貫した扱い・run へは触れない）。
    if (gate.runId) {
      if (input.decision === 'approve') {
        // RUN_TRANSITIONS 準拠の2段遷移（NEEDS_APPROVAL→RUNNING→SUCCEEDED）。terminal からの巻き戻しはしない。
        const resumed = await tx.aIAgentRun.updateMany({
          where: { id: gate.runId, tenantId: input.tenantId, status: 'NEEDS_APPROVAL' },
          data: { status: 'RUNNING' },
        });
        if (resumed.count !== 1) throw new Error('ai-run-transition-failed'); // 消失/terminal/競合 → 判断ごと rollback
        const completed = await tx.aIAgentRun.updateMany({
          where: { id: gate.runId, tenantId: input.tenantId, status: 'RUNNING' },
          data: { status: 'SUCCEEDED', finishedAt: new Date(), humanReviewed: true },
        });
        if (completed.count !== 1) throw new Error('ai-run-transition-failed');
        // 再開の実体は内部処理のみ（外部作用なし）。実 queue 再投入は P4Q Gate の外。
        await tx.aIAgentAction.create({
          data: {
            tenantId: input.tenantId,
            runId: gate.runId,
            type: 'recommend',
            summary: `人間の承認により再開し、内部処理のみで完了しました（外部作用なし・action=${gate.action}）`,
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
        summary: input.decision === 'approve' ? '人間が承認し、内部処理のみで再開・完了（外部作用なし）' : '人間が却下（run は終了・再開不可）',
        entityType: 'ai_approval_gate',
        entityId: gate.id,
        riskLevel: 'MEDIUM',
        status,
        decidedById: input.decidedById,
        decidedAt: new Date(),
        decisionNote: input.note,
        payload: { runId: gate.runId, action: gate.action },
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
        summary: `AI承認ゲート（${gate.action}）を${input.decision === 'approve' ? '承認（内部再開）' : '却下'}`,
        metadata: { approvalId: record.id, runId: gate.runId },
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
        metadata: { approvalId: record.id, runId: gate.runId, fields: ['action', 'runId'] },
      },
    });
    return { outcome: 'decided' as const };
  });
}
