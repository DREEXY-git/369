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
});
