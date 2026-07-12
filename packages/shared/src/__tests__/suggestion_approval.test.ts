import { describe, it, expect } from 'vitest';
import {
  canRequestSuggestionApproval,
  suggestionStatusOnRequest,
  suggestionStatusOnDecision,
  suggestionApprovalLabel,
  SUGGESTION_REQUESTABLE_STATUSES,
} from '../suggestion-approval';

describe('suggestion-approval — C19 review-only 状態機械（roadmap83 案A）', () => {
  it('申請可能は none / rejected のみ（pending / approved は不可）', () => {
    expect(canRequestSuggestionApproval('none')).toBe(true);
    expect(canRequestSuggestionApproval('rejected')).toBe(true);
    expect(canRequestSuggestionApproval('pending')).toBe(false);
    expect(canRequestSuggestionApproval('approved')).toBe(false);
    expect(canRequestSuggestionApproval('')).toBe(false);
  });

  it('SUGGESTION_REQUESTABLE_STATUSES は none/rejected の2値', () => {
    expect([...SUGGESTION_REQUESTABLE_STATUSES].sort()).toEqual(['none', 'rejected']);
  });

  it('申請で pending・承認で approved・却下で rejected（広告の実変更は伴わない）', () => {
    expect(suggestionStatusOnRequest()).toEqual({ approvalStatus: 'pending' });
    expect(suggestionStatusOnDecision('approve')).toEqual({ approvalStatus: 'approved' });
    expect(suggestionStatusOnDecision('reject')).toEqual({ approvalStatus: 'rejected' });
  });

  it('却下後は再申請可能・承認後は再申請不可', () => {
    expect(canRequestSuggestionApproval(suggestionStatusOnDecision('reject').approvalStatus)).toBe(true);
    expect(canRequestSuggestionApproval(suggestionStatusOnDecision('approve').approvalStatus)).toBe(false);
  });

  it('表示ラベル', () => {
    expect(suggestionApprovalLabel('pending')).toBe('承認申請中');
    expect(suggestionApprovalLabel('approved')).toBe('承認済み');
    expect(suggestionApprovalLabel('rejected')).toBe('却下');
    expect(suggestionApprovalLabel('none')).toBe('未申請');
  });
});
