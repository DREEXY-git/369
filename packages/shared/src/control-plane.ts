// Phase 4 Control Plane（v7.2 Lane C・read-only）の純ロジック。
// 既存データ（AIAgentRun / AIApprovalGate / ApprovalRequest / AuditLog / AIAgentAction）の射影から
// ①AI社員別の実測集計 ②Execution Receipt（判断の相関レシート）を決定論的に組み立てる。
// raw input/output/error・Secrets・PII は入力に含まれない（呼び出し側が select しない）。
// 推測 ROI・架空成果・推定削減時間は算出しない（実測できない値は null = 未計測として返す）。

export interface RunStatRow {
  agentId: string;
  status: string; // QUEUED | RUNNING | SUCCEEDED | FAILED | NEEDS_APPROVAL
  startedAt: Date | null;
  finishedAt: Date | null;
  /** 人間承認済みフラグ（QUEUED + humanReviewed = 承認済み・再開待ち）。 */
  humanReviewed: boolean;
}

export interface AgentRunStats {
  agentId: string;
  total: number;
  succeeded: number;
  failed: number;
  running: number;
  needsApproval: number;
  /** 人間承認済み・再開待ち（QUEUED + humanReviewed・実行はまだ行われていない）。 */
  queuedWaitingResume: number;
  /** それ以外の QUEUED（未実行の待機）。 */
  queuedOther: number;
  /** 実測時間の対象になった run 件数（terminal かつ startedAt/finishedAt 両方あり）。 */
  measuredCount: number;
  /** 実測の平均処理時間（分）。実測できる run が無ければ null = 未計測（0 と混同しない）。 */
  avgDurationMinutes: number | null;
  /** 実測の合計処理時間（分）。無ければ null = 未計測。 */
  totalDurationMinutes: number | null;
}

/**
 * AI 社員別の実測集計（決定論）。
 * - 処理時間は「terminal（SUCCEEDED/FAILED）かつ startedAt/finishedAt が両方あり finished>=started」の
 *   run だけを実測対象にする。対象外は集計から除外し、件数差（total - measuredCount 相当）で
 *   「未計測がある」ことを隠さない。
 * - 承認済み・再開待ち（QUEUED + humanReviewed）は succeeded と混同しない独立区分。
 */
export function summarizeAgentRuns(rows: RunStatRow[]): Record<string, AgentRunStats> {
  const byAgent: Record<string, AgentRunStats> = {};
  const durations: Record<string, number[]> = {};
  for (const r of rows) {
    const s = (byAgent[r.agentId] ??= {
      agentId: r.agentId,
      total: 0,
      succeeded: 0,
      failed: 0,
      running: 0,
      needsApproval: 0,
      queuedWaitingResume: 0,
      queuedOther: 0,
      measuredCount: 0,
      avgDurationMinutes: null,
      totalDurationMinutes: null,
    });
    s.total += 1;
    if (r.status === 'SUCCEEDED') s.succeeded += 1;
    else if (r.status === 'FAILED') s.failed += 1;
    else if (r.status === 'RUNNING') s.running += 1;
    else if (r.status === 'NEEDS_APPROVAL') s.needsApproval += 1;
    else if (r.status === 'QUEUED') {
      if (r.humanReviewed) s.queuedWaitingResume += 1;
      else s.queuedOther += 1;
    }
    if (
      (r.status === 'SUCCEEDED' || r.status === 'FAILED') &&
      r.startedAt &&
      r.finishedAt &&
      r.finishedAt.getTime() >= r.startedAt.getTime()
    ) {
      (durations[r.agentId] ??= []).push((r.finishedAt.getTime() - r.startedAt.getTime()) / 60000);
    }
  }
  for (const [agentId, list] of Object.entries(durations)) {
    const s = byAgent[agentId]!;
    s.measuredCount = list.length;
    const total = list.reduce((a, b) => a + b, 0);
    s.totalDurationMinutes = Math.round(total * 10) / 10;
    s.avgDurationMinutes = Math.round((total / list.length) * 10) / 10;
  }
  return byAgent;
}

// ── Execution Receipt（判断レシート）: gate 決定を approval / audit / run action と相関させる ──

export interface ReceiptApprovalRow {
  id: string;
  /** entityId = AIApprovalGate.id（P4 bridge の 1:1 決定レコード）。 */
  entityId: string | null;
  status: string; // APPROVED | REJECTED
  decidedAt: Date | null;
  decidedById: string | null;
  /** メタのみ（runId / action / staleConfirmed）。本文は含まれない。 */
  payload: { runId?: string | null; action?: string; staleConfirmed?: boolean } | null;
}

export interface ReceiptAuditRow {
  entityId: string | null; // gateId
  action: string; // approve | reject
  createdAt: Date;
  metadata: { approvalId?: string; runId?: string | null; staleConfirmed?: boolean } | null;
}

export interface ReceiptActionRow {
  runId: string;
  summary: string;
  createdAt: Date;
}

export interface ExecutionReceipt {
  gateId: string;
  runId: string | null;
  action: string;
  decision: 'approved' | 'rejected';
  decidedAt: Date | null;
  decidedById: string | null;
  staleConfirmed: boolean;
  /** 相関の実在確認（それぞれのレコードが実際に見つかったか）。 */
  correlated: { approval: true; audit: boolean; runAction: boolean };
  /** 成果を捏造しない結果ラベル（承認＝再開待ちであり実行済みではない）。 */
  outcomeLabel: '承認済み・再開待ち（実行なし）' | '却下（run 終了・再開不可）' | '判断のみ（対象 run なし）';
}

/**
 * ApprovalRequest(type='ai_run_resume') を正本に、AuditLog（entityType=AIApprovalGate）と
 * AIAgentAction（承認記録）を gateId/runId で相関させたレシートを decidedAt 降順で返す（決定論）。
 * 相関が見つからない場合も隠さず correlated=false として返す（監査の欠落を可視化）。
 */
export function buildExecutionReceipts(
  approvals: ReceiptApprovalRow[],
  audits: ReceiptAuditRow[],
  actions: ReceiptActionRow[],
): ExecutionReceipt[] {
  const auditByGate = new Map<string, ReceiptAuditRow[]>();
  for (const a of audits) {
    if (!a.entityId) continue;
    const list = auditByGate.get(a.entityId) ?? [];
    list.push(a);
    auditByGate.set(a.entityId, list);
  }
  const actionRunIds = new Set(actions.map((a) => a.runId));
  const receipts: ExecutionReceipt[] = [];
  for (const ap of approvals) {
    if (!ap.entityId) continue;
    const decision = ap.status === 'APPROVED' ? ('approved' as const) : ('rejected' as const);
    const runId = ap.payload?.runId ?? null;
    const gateAudits = auditByGate.get(ap.entityId) ?? [];
    const audit = gateAudits.find((a) => (a.metadata?.approvalId ? a.metadata.approvalId === ap.id : true));
    const staleConfirmed = ap.payload?.staleConfirmed === true || audit?.metadata?.staleConfirmed === true;
    receipts.push({
      gateId: ap.entityId,
      runId,
      action: ap.payload?.action ?? '(unknown)',
      decision,
      decidedAt: ap.decidedAt,
      decidedById: ap.decidedById,
      staleConfirmed,
      correlated: {
        approval: true,
        audit: Boolean(audit),
        runAction: decision === 'approved' && runId != null ? actionRunIds.has(runId) : false,
      },
      outcomeLabel:
        runId == null
          ? '判断のみ（対象 run なし）'
          : decision === 'approved'
            ? '承認済み・再開待ち（実行なし）'
            : '却下（run 終了・再開不可）',
    });
  }
  return receipts.sort((a, b) => (b.decidedAt?.getTime() ?? 0) - (a.decidedAt?.getTime() ?? 0));
}
