// C21 SEO/Content 承認ブリッジの純ロジック（Phase 3.5・roadmap81 §2）。
// DB 非依存。ContentAsset の「下書き → 承認申請 → 人間 approve/reject」という
// review-only 状態機械の規約だけを定義する。
// 公開・CMS 投稿・外部送信・実 LLM・課金は本モジュールの範囲外（review-only・社内承認状態のみ）。

/** ContentAsset.status（DB は文字列列）。 */
export type ContentAssetStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected';
/** ContentAsset.approvalStatus（DB は文字列列）。 */
export type ContentApprovalStatus = 'none' | 'pending' | 'approved' | 'rejected';

/**
 * 承認申請が可能な status。
 * draft（初回）と rejected（却下後の再申請）のみ。
 * pending_approval / approved は再申請不可＝重複申請防止の第一段。
 */
export const CONTENT_REQUESTABLE_STATUSES: readonly ContentAssetStatus[] = ['draft', 'rejected'];

/**
 * 下書きが承認申請可能か（draft または rejected のみ）。
 * 注: これは UI 活性判定・事前検証用。原子的な重複 PENDING 防止は
 * server 側の `ContentAsset.status` CAS（draft/rejected → pending_approval の
 * 条件付き updateMany）が担う。本関数は判定の正本ではない。
 */
export function canRequestContentApproval(status: string): boolean {
  return (CONTENT_REQUESTABLE_STATUSES as readonly string[]).includes(status);
}

/** 申請時に遷移させる状態（draft/rejected → pending_approval / pending）。 */
export function contentStatusOnRequest(): {
  status: ContentAssetStatus;
  approvalStatus: ContentApprovalStatus;
} {
  return { status: 'pending_approval', approvalStatus: 'pending' };
}

/**
 * 人間の決定に応じた ContentAsset の状態。
 * approve → approved（**公開はしない**・社内承認状態のみ）。reject → rejected（再申請可能に戻る）。
 */
export function contentStatusOnDecision(decision: 'approve' | 'reject'): {
  status: ContentAssetStatus;
  approvalStatus: ContentApprovalStatus;
} {
  return decision === 'approve'
    ? { status: 'approved', approvalStatus: 'approved' }
    : { status: 'rejected', approvalStatus: 'rejected' };
}

/** approvalStatus の表示ラベル（日本語・UI 用）。 */
export function contentApprovalLabel(approvalStatus: string): string {
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
