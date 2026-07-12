import { describe, it, expect } from 'vitest';
import { requiresApproval, aiCanSendExternally, QUOTE_AUTO_APPROVE_LIMIT } from '../approval';

describe('requiresApproval — dangerous actions', () => {
  it('always requires approval for external/financial/hr/permission actions', () => {
    for (const a of [
      'customer_email_send',
      'line_send',
      'sms_send',
      'ai_call_dial',
      'invoice_send',
      'invoice_finalize',
      'dunning_send',
      'journal_finalize',
      'closing_finalize',
      'payroll_process',
      'hr_evaluation_change',
      'permission_change',
      'data_export',
      'data_delete',
      'expert_share',
      'location_view',
      'recording_external_share',
      'ai_high_confidential_send',
      'ai_auto_execute',
    ] as const) {
      expect(requiresApproval(a)).toBe(true);
    }
  });

  it('quote requires approval only above the limit', () => {
    expect(requiresApproval('quote_issue', { amount: QUOTE_AUTO_APPROVE_LIMIT - 1 })).toBe(false);
    expect(requiresApproval('quote_issue', { amount: QUOTE_AUTO_APPROVE_LIMIT })).toBe(true);
  });

  it('AI external actions always require approval and AI cannot send externally', () => {
    expect(requiresApproval('quote_issue', { actorIsAi: true, external: true })).toBe(true);
    expect(aiCanSendExternally()).toBe(false);
  });

  // Phase 1-13: 候補正式化(invoice_finalize) と 外部送信(invoice_send) を意味的に分離。両方とも承認必須。
  it('separates invoice_finalize (候補→正式化) from invoice_send (外部送信); both require approval', () => {
    expect(requiresApproval('invoice_finalize')).toBe(true);
    expect(requiresApproval('invoice_send')).toBe(true);
  });

  // Phase 3.5 承認ブリッジ（roadmap81）: コンテンツ下書きのレビューは常に人間承認（AI は申請/決定不可）。
  it('content_review always requires human approval', () => {
    expect(requiresApproval('content_review')).toBe(true);
  });
});
