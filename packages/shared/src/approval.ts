// 承認要否の判定。外部送信・法務・財務・人事・顧客向けは必ず人間承認を挟む。

export type ApprovalAction =
  | 'outreach_send' // LeadMap 営業メール送信
  | 'customer_email_send'
  | 'line_send'
  | 'sms_send'
  | 'ai_call_dial' // AI電話発信 / AIコールセンター発信
  | 'quote_issue'
  | 'contract_sign'
  | 'invoice_send' // 正式 Invoice の外部送信
  | 'invoice_finalize' // 請求候補 → 正式 Invoice 化（外部送信なし・内部確定）。Phase 1-13 で invoice_send から意味分離
  | 'dunning_send' // 督促送信
  | 'payment_execute'
  | 'journal_finalize' // 会計仕訳確定
  | 'closing_finalize' // 決算確定
  | 'payroll_process' // 給与関連処理
  | 'hr_evaluation_change' // 人事評価変更
  | 'permission_change' // 権限変更
  | 'data_export'
  | 'data_delete'
  | 'hr_decision'
  | 'expert_share' // 外部士業への共有
  | 'location_view' // 位置情報の閲覧
  | 'recording_external_share' // 録音データの外部共有
  | 'ai_high_confidential_send' // 高機密データのAI送信
  | 'ai_auto_execute' // AI社員による自動実行
  | 'knowledge_rollback'
  | 'ai_external_action'
  // Operations OS（Phase 1-6）
  | 'inventory_adjust' // 在庫数量の大幅調整（閾値以上で承認）
  | 'inventory_force_release' // 予約済み在庫の強制解除
  | 'damage_charge_finalize' // 破損請求の確定
  // Operations 実行管理（Phase 1-7）
  | 'stocktake_adjust' // 大幅棚卸差異の在庫反映（閾値以上で承認）
  | 'purchase_order_issue' // 高額発注の確定（閾値以上で承認）
  // Phase 3.5 承認ブリッジ（roadmap81/83）— review-only。公開/外部送信/CMS/広告実変更/実LLM/課金は伴わない社内承認状態のみ。
  | 'content_review' // C21 コンテンツ下書きの人間レビュー申請
  | 'ad_suggestion_review' // C19 広告改善案の人間レビュー申請（案A・2026-07-12 人間承認済み）
  // Phase 4 安全実行 Bridge（roadmap82）— AI 承認ゲートの人間判断。approve でも内部処理のみ（外部作用なし）。
  | 'ai_run_resume';

export interface ApprovalContext {
  actorIsAi?: boolean;
  amount?: number;
  external?: boolean;
}

const ALWAYS_APPROVE: ApprovalAction[] = [
  'outreach_send',
  'customer_email_send',
  'line_send',
  'sms_send',
  'ai_call_dial',
  'contract_sign',
  'invoice_send',
  'invoice_finalize',
  'dunning_send',
  'payment_execute',
  'journal_finalize',
  'closing_finalize',
  'payroll_process',
  'hr_evaluation_change',
  'permission_change',
  'data_export',
  'data_delete',
  'hr_decision',
  'expert_share',
  'location_view',
  'recording_external_share',
  'ai_high_confidential_send',
  'ai_auto_execute',
  'knowledge_rollback',
  'ai_external_action',
  'inventory_force_release',
  'damage_charge_finalize',
  'content_review', // C21 コンテンツ下書きのレビューは常に人間承認（AI は申請/決定を持たない）
  'ad_suggestion_review', // C19 広告改善案のレビューも常に人間承認
  'ai_run_resume', // AI 承認ゲートの判断は常に人間（AI は自己承認しない）
];

export const QUOTE_AUTO_APPROVE_LIMIT = 500_000; // 円。これ以上は承認必須。
export const INVENTORY_ADJUST_APPROVE_THRESHOLD = 10; // |Δ数量| がこれ以上は承認必須。
export const STOCKTAKE_ADJUST_APPROVE_THRESHOLD = 10; // |棚卸差異| がこれ以上は承認必須。
export const PURCHASE_ORDER_APPROVE_THRESHOLD = 100_000; // 円。これ以上の発注は承認必須。

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
  if (action === 'inventory_adjust') {
    // 数量差分の絶対値が閾値以上なら承認必須（amount に Δ数量を渡す）。
    return Math.abs(ctx.amount ?? 0) >= INVENTORY_ADJUST_APPROVE_THRESHOLD;
  }
  if (action === 'stocktake_adjust') {
    return Math.abs(ctx.amount ?? 0) >= STOCKTAKE_ADJUST_APPROVE_THRESHOLD;
  }
  if (action === 'purchase_order_issue') {
    return (ctx.amount ?? 0) >= PURCHASE_ORDER_APPROVE_THRESHOLD;
  }
  return false;
}

// ============ 承認後実行の可否（純判定）— Phase 1-7 ============

export interface ApprovalExecState {
  status: string; // PENDING | APPROVED | REJECTED | CANCELLED
  executedAt?: Date | string | null;
  expiresAt?: Date | string | null;
}

export interface ApprovalExecCheck {
  ok: boolean;
  reason: 'ok' | 'not-approved' | 'already-executed' | 'expired';
}

/**
 * 承認済みアクションを実行してよいか（APPROVED かつ 未実行 かつ 未失効）。
 * executeApprovedAction の前段判定に使う（二重実行・失効を防ぐ）。
 */
export function canExecuteApproval(req: ApprovalExecState, now: Date = new Date()): ApprovalExecCheck {
  if (req.status !== 'APPROVED') return { ok: false, reason: 'not-approved' };
  if (req.executedAt) return { ok: false, reason: 'already-executed' };
  if (req.expiresAt && new Date(req.expiresAt).getTime() < now.getTime()) return { ok: false, reason: 'expired' };
  return { ok: true, reason: 'ok' };
}

/** AI は外部送信を構造的に実行不可。必ず人間承認後に人間/システムが送信。 */
export function aiCanSendExternally(): boolean {
  return false;
}
