// 承認要否の判定。外部送信・法務・財務・人事・顧客向けは必ず人間承認を挟む。

export type ApprovalAction =
  | 'outreach_send' // LeadMap 営業メール送信
  | 'customer_email_send'
  | 'quote_issue'
  | 'contract_sign'
  | 'invoice_send'
  | 'payment_execute'
  | 'data_export'
  | 'data_delete'
  | 'hr_decision'
  | 'knowledge_rollback'
  | 'ai_external_action';

export interface ApprovalContext {
  actorIsAi?: boolean;
  amount?: number;
  external?: boolean;
}

const ALWAYS_APPROVE: ApprovalAction[] = [
  'outreach_send',
  'customer_email_send',
  'contract_sign',
  'invoice_send',
  'payment_execute',
  'data_export',
  'data_delete',
  'hr_decision',
  'knowledge_rollback',
  'ai_external_action',
];

export const QUOTE_AUTO_APPROVE_LIMIT = 500_000; // 円。これ以上は承認必須。

/**
 * 重要操作は承認必須。
 *  - 外部送信・顧客向け・法務・財務・人事・削除・エクスポートは常に承認。
 *  - 見積は一定金額以上で承認。
 *  - AI が主体の外部影響アクションは常に承認（多重防御）。
 */
export function requiresApproval(action: ApprovalAction, ctx: ApprovalContext = {}): boolean {
  if (ctx.actorIsAi && ctx.external) return true;
  if (ALWAYS_APPROVE.includes(action)) return true;
  if (action === 'quote_issue') {
    return (ctx.amount ?? 0) >= QUOTE_AUTO_APPROVE_LIMIT;
  }
  return false;
}

/** AI は外部送信を構造的に実行不可。必ず人間承認後に人間/システムが送信。 */
export function aiCanSendExternally(): boolean {
  return false;
}
