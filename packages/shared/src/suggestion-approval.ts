// C19 広告改善案 承認ブリッジの純ロジック（Phase 3.5・roadmap83 案A・人間承認済み 2026-07-12）。
// DB 非依存。MarketingSuggestion の「下書き → 承認申請 → 人間 approve/reject」という review-only
// 状態機械の規約だけを定義する（C21 content-approval と同型）。
// 広告の実変更・予算変更・出稿・外部送信・実 LLM・課金は本モジュールの範囲外（社内承認状態のみ）。

/** MarketingSuggestion.approvalStatus（DB は文字列列）。 */
export type SuggestionApprovalStatus = 'none' | 'pending' | 'approved' | 'rejected';

/** 承認申請が可能な approvalStatus。none（初回）と rejected（却下後の再申請）のみ。 */
export const SUGGESTION_REQUESTABLE_STATUSES: readonly SuggestionApprovalStatus[] = ['none', 'rejected'];

/**
 * 改善案が承認申請可能か（none または rejected のみ）。
 * 注: UI 活性判定・事前検証用。原子的な重複 PENDING 防止は server 側の
 * `MarketingSuggestion.approvalStatus` CAS（none/rejected → pending の条件付き updateMany）が正本。
 */
export function canRequestSuggestionApproval(approvalStatus: string): boolean {
  return (SUGGESTION_REQUESTABLE_STATUSES as readonly string[]).includes(approvalStatus);
}

/** 申請時に遷移させる状態。 */
export function suggestionStatusOnRequest(): { approvalStatus: SuggestionApprovalStatus } {
  return { approvalStatus: 'pending' };
}

/** 人間の決定に応じた状態。approve でも広告の実変更は行わない（社内承認状態のみ）。 */
export function suggestionStatusOnDecision(decision: 'approve' | 'reject'): {
  approvalStatus: SuggestionApprovalStatus;
} {
  return { approvalStatus: decision === 'approve' ? 'approved' : 'rejected' };
}

/** approvalStatus の表示ラベル（日本語・UI 用）。 */
export function suggestionApprovalLabel(approvalStatus: string): string {
  switch (approvalStatus) {
    case 'pending':
      return '承認申請中';
    case 'approved':
      return '承認済み';
    case 'rejected':
      return '却下';
    default:
      return '未申請';
  }
}
