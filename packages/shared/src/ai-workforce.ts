// AI Workforce read model の純ロジック（Phase 4 Stream B・roadmap71）。
// AI 社員の状態は「証拠」（AIAgentRun / AIApprovalGate / AIAgent.status / 最終活動時刻）から導出する。
// 証拠がなければ unknown（no telemetry）とし、働いているように捏造しない。
// 本モジュールは表示用の導出のみを行い、実行・承認・削除・外部送信の能力を持たない。

export const AI_WORKFORCE_STATES = [
  'idle',
  'planning',
  'working',
  'waiting_approval',
  'blocked',
  'error',
  'offline',
  'unknown',
] as const;
export type AiWorkforceState = (typeof AI_WORKFORCE_STATES)[number];

export const AI_WORKFORCE_STATE_LABEL: Record<AiWorkforceState, string> = {
  idle: '待機中',
  planning: '準備中',
  working: '作業中',
  waiting_approval: '承認待ち',
  blocked: 'ブロック',
  error: 'エラー',
  offline: '停止中',
  unknown: '計測なし',
};

/** 状態ごとの表示色（3D/2D 共通・色だけに依存しないこと。ラベル・アイコンを必ず併記する）。 */
export const AI_WORKFORCE_STATE_COLOR: Record<AiWorkforceState, string> = {
  idle: '#94a3b8',
  planning: '#38bdf8',
  working: '#10b981',
  waiting_approval: '#f59e0b',
  blocked: '#f97316',
  error: '#ef4444',
  offline: '#475569',
  unknown: '#a1a1aa',
};

export interface AgentStateEvidence {
  /** AIAgent.status（'active' 以外は停止扱い）。 */
  agentStatus: string;
  /** 直近の AIAgentRun（無ければ null = テレメトリなし）。 */
  latestRun: {
    status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'NEEDS_APPROVAL' | string;
    startedAt: Date | null;
    finishedAt: Date | null;
    task: string;
    error?: string | null;
  } | null;
  /** PENDING の AIApprovalGate 件数（承認待ちの証拠）。 */
  pendingApprovalGates: number;
  /** REJECTED の AIApprovalGate 件数（直近 run 以降に再実行の証拠がない場合のブロック根拠）。 */
  rejectedApprovalGates: number;
}

export interface DerivedAgentState {
  state: AiWorkforceState;
  /** 状態の根拠（証拠の要約・UI にそのまま表示できる日本語）。 */
  reason: string;
  /** blocked のときのみ: ブロック理由。 */
  blockedReason: string | null;
}

/**
 * 証拠から AI 社員の状態を導出する（決定論・現在時刻に依存しない）。
 * 優先順位: offline > waiting_approval > working > planning > blocked > error > idle > unknown。
 */
export function deriveAgentState(e: AgentStateEvidence): DerivedAgentState {
  if (e.agentStatus !== 'active') {
    return { state: 'offline', reason: `エージェント状態が ${e.agentStatus}（active ではない）`, blockedReason: null };
  }
  if (e.pendingApprovalGates > 0 || e.latestRun?.status === 'NEEDS_APPROVAL') {
    const n = e.pendingApprovalGates;
    return {
      state: 'waiting_approval',
      reason: n > 0 ? `承認ゲート PENDING ${n} 件` : '直近の実行が NEEDS_APPROVAL',
      blockedReason: null,
    };
  }
  if (e.latestRun == null) {
    return { state: 'unknown', reason: '実行記録なし（no telemetry）', blockedReason: null };
  }
  switch (e.latestRun.status) {
    case 'RUNNING':
      return { state: 'working', reason: `実行中: ${e.latestRun.task}`, blockedReason: null };
    case 'QUEUED':
      return { state: 'planning', reason: `キュー待ち: ${e.latestRun.task}`, blockedReason: null };
    case 'FAILED':
      if (e.rejectedApprovalGates > 0) {
        return {
          state: 'blocked',
          reason: `実行失敗＋承認ゲート却下 ${e.rejectedApprovalGates} 件`,
          blockedReason: '直近の承認が却下されており、人間の再判断が必要です',
        };
      }
      return { state: 'error', reason: `直近の実行が失敗: ${e.latestRun.task}`, blockedReason: null };
    case 'SUCCEEDED':
      if (e.rejectedApprovalGates > 0) {
        return {
          state: 'blocked',
          reason: `承認ゲート却下 ${e.rejectedApprovalGates} 件（再実行の証拠なし）`,
          blockedReason: '承認が却下されたまま次の実行記録がありません',
        };
      }
      return { state: 'idle', reason: `直近の実行が完了: ${e.latestRun.task}`, blockedReason: null };
    default:
      return { state: 'unknown', reason: `未知の実行状態: ${e.latestRun.status}`, blockedReason: null };
  }
}

/** データ鮮度ラベル（最終活動からの経過分）。null = 記録なし。 */
export function freshnessLabel(lastActivityAt: Date | null, now: Date): string {
  if (!lastActivityAt) return '記録なし';
  const min = Math.max(0, Math.floor((now.getTime() - lastActivityAt.getTime()) / 60000));
  if (min < 60) return `${min}分前`;
  if (min < 60 * 24) return `${Math.floor(min / 60)}時間前`;
  return `${Math.floor(min / (60 * 24))}日前`;
}
