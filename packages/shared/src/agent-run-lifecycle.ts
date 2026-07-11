// AI Agent Run の lifecycle 純ロジック（Phase 4 Stream B2・roadmap74）。
// 既存 enum RunStatus（QUEUED/RUNNING/SUCCEEDED/FAILED/NEEDS_APPROVAL）のみを使う（schema 変更なし）。
// - COMPLETED は SUCCEEDED として保存する（表示名の別名）。
// - BLOCKED は保存せず、AIApprovalGate（REJECTED）からの導出状態（ai-workforce.ts）。
// 遷移は許可表で固定し、terminal（SUCCEEDED/FAILED）から RUNNING へ戻す不正遷移を拒否する。
// retry は既存 run の巻き戻しではなく「新しい run」を作る（履歴の改竄をしない）。

export type RunLifecycleStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'NEEDS_APPROVAL';

/** 許可される遷移（from → to の集合）。表にない遷移はすべて拒否。 */
export const RUN_TRANSITIONS: Record<RunLifecycleStatus, readonly RunLifecycleStatus[]> = {
  QUEUED: ['RUNNING', 'FAILED'],
  RUNNING: ['SUCCEEDED', 'FAILED', 'NEEDS_APPROVAL'],
  // 承認後の再開は RUNNING、却下は FAILED（人間の判断を経由。AI が承認/却下することはない）。
  NEEDS_APPROVAL: ['RUNNING', 'FAILED'],
  SUCCEEDED: [],
  FAILED: [],
};

export function canTransitionRun(from: RunLifecycleStatus, to: RunLifecycleStatus): boolean {
  return (RUN_TRANSITIONS[from] ?? []).includes(to);
}

export function isTerminalRunStatus(s: RunLifecycleStatus): boolean {
  return RUN_TRANSITIONS[s]?.length === 0;
}

/**
 * 新しい run を作ってよいか（二重実行・クラッシュ後の暴走防止）。
 * - 同一 agent×task に「新鮮な」RUNNING/QUEUED/NEEDS_APPROVAL があれば作らない（重複実行）。
 * - RUNNING が staleThresholdMs より古い場合はクラッシュ残骸とみなし、新規作成を許可する
 *   （古い run は巻き戻さず、そのまま履歴として残す）。
 */
export function shouldCreateRun(
  existing: { status: RunLifecycleStatus; startedAt: Date | null }[],
  now: Date,
  staleThresholdMs: number = STALE_RUNNING_MS,
): { create: boolean; reason: string } {
  for (const r of existing) {
    if (r.status === 'NEEDS_APPROVAL') {
      return { create: false, reason: '同一タスクが承認待ちです（人間の判断が先）' };
    }
    if (r.status === 'RUNNING' || r.status === 'QUEUED') {
      const age = r.startedAt ? now.getTime() - r.startedAt.getTime() : Number.POSITIVE_INFINITY;
      if (age <= staleThresholdMs) {
        return { create: false, reason: '同一タスクが実行中です（重複実行を防止）' };
      }
      // stale RUNNING は残骸として無視（履歴は改竄しない）。
    }
  }
  return { create: true, reason: 'ok' };
}

/** RUNNING がこの時間を超えて finishedAt を持たない場合、stale（実行中と断定できない）扱い。 */
export const STALE_RUNNING_MS = 2 * 60 * 60 * 1000;

/**
 * エラーメッセージの保存用マスク。PII/Secrets/接続文字列らしきものを落とし、長さを制限する。
 * prompt 全文・payload 本文は呼び出し側がそもそも渡さないこと（ここは最後の防波堤）。
 */
export function maskRunError(err: unknown, maxLen = 200): string {
  const raw = err instanceof Error ? err.message : String(err ?? 'unknown error');
  let s = raw
    .replace(/(postgres(ql)?|redis|https?):\/\/\S+/gi, '[masked-url]')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[masked-email]')
    .replace(/(api[_-]?key|token|secret|password|authorization)\s*[:=]\s*\S+/gi, '$1=[masked]')
    .replace(/\b\d{7,}\b/g, '[masked-number]');
  if (s.length > maxLen) s = `${s.slice(0, maxLen)}…`;
  return s;
}
