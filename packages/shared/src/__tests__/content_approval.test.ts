import { describe, it, expect } from 'vitest';
import {
  canRequestContentApproval,
  contentStatusOnRequest,
  contentStatusOnDecision,
  contentApprovalLabel,
  CONTENT_REQUESTABLE_STATUSES,
} from '../content-approval';

describe('content-approval — C21 review-only 状態機械（roadmap81 §2）', () => {
  it('申請可能は draft / rejected のみ（pending_approval / approved は不可）', () => {
    expect(canRequestContentApproval('draft')).toBe(true);
    expect(canRequestContentApproval('rejected')).toBe(true);
    expect(canRequestContentApproval('pending_approval')).toBe(false);
    expect(canRequestContentApproval('approved')).toBe(false);
    expect(canRequestContentApproval('unknown')).toBe(false);
    expect(canRequestContentApproval('')).toBe(false);
  });

  it('CONTENT_REQUESTABLE_STATUSES は draft/rejected の2値', () => {
    expect([...CONTENT_REQUESTABLE_STATUSES].sort()).toEqual(['draft', 'rejected']);
  });

  it('申請で pending_approval / pending へ遷移', () => {
    expect(contentStatusOnRequest()).toEqual({ status: 'pending_approval', approvalStatus: 'pending' });
  });

  it('承認で approved、却下で rejected（公開はしない・社内承認状態のみ）', () => {
    expect(contentStatusOnDecision('approve')).toEqual({ status: 'approved', approvalStatus: 'approved' });
    expect(contentStatusOnDecision('reject')).toEqual({ status: 'rejected', approvalStatus: 'rejected' });
  });

  it('却下後は再申請可能（rejected は requestable）', () => {
    const afterReject = contentStatusOnDecision('reject');
    expect(canRequestContentApproval(afterReject.status)).toBe(true);
  });

  it('承認後は再申請不可（approved は requestable でない＝重複申請防止の第一段）', () => {
    const afterApprove = contentStatusOnDecision('approve');
    expect(canRequestContentApproval(afterApprove.status)).toBe(false);
  });

  it('approvalStatus 表示ラベル', () => {
    expect(contentApprovalLabel('pending')).toBe('承認申請中');
    expect(contentApprovalLabel('approved')).toBe('承認済み');
    expect(contentApprovalLabel('rejected')).toBe('却下');
    expect(contentApprovalLabel('none')).toBe('未申請');
    expect(contentApprovalLabel('anything-else')).toBe('未申請');
  });
});
