import { describe, it, expect } from 'vitest';
import {
  canTransitionReferralRecord,
  isReferralRecordStatus,
  summarizeReferralRecords,
  REFERRAL_RECORD_STATUS_LABEL,
} from '../referral';

describe('紹介記録の状態機械（Phase 3.5）', () => {
  it('有効な状態だけを受理する', () => {
    for (const s of ['received', 'in_progress', 'won', 'lost']) expect(isReferralRecordStatus(s)).toBe(true);
    for (const s of ['', 'unknown', 'WON', 'done']) expect(isReferralRecordStatus(s)).toBe(false);
  });

  it('許可された遷移のみ true（成約は終端・不成立は再挑戦可）', () => {
    expect(canTransitionReferralRecord('received', 'in_progress')).toBe(true);
    expect(canTransitionReferralRecord('received', 'won')).toBe(true);
    expect(canTransitionReferralRecord('received', 'lost')).toBe(true);
    expect(canTransitionReferralRecord('in_progress', 'won')).toBe(true);
    expect(canTransitionReferralRecord('in_progress', 'lost')).toBe(true);
    expect(canTransitionReferralRecord('lost', 'in_progress')).toBe(true); // 再挑戦
    // fail-closed: 終端・同一・逆行・不正
    expect(canTransitionReferralRecord('won', 'in_progress')).toBe(false);
    expect(canTransitionReferralRecord('won', 'lost')).toBe(false);
    expect(canTransitionReferralRecord('in_progress', 'received')).toBe(false);
    expect(canTransitionReferralRecord('received', 'received')).toBe(false);
    expect(canTransitionReferralRecord('lost', 'won')).toBe(false);
    expect(canTransitionReferralRecord('bogus', 'won')).toBe(false);
  });

  it('全状態に日本語ラベルがある', () => {
    expect(REFERRAL_RECORD_STATUS_LABEL.received).toBe('受領');
    expect(REFERRAL_RECORD_STATUS_LABEL.won).toBe('成約');
    expect(REFERRAL_RECORD_STATUS_LABEL.lost).toBe('不成立');
  });
});

describe('紹介記録の集計（件数・成約率・見込み金額）', () => {
  it('状況別件数・パイプライン/成約金額・成約率を算出（未決着は成約率の分母に含めない）', () => {
    const s = summarizeReferralRecords([
      { status: 'received', estimatedValue: 100000 },
      { status: 'in_progress', estimatedValue: 200000 },
      { status: 'won', estimatedValue: 300000 },
      { status: 'won', estimatedValue: 150000 },
      { status: 'lost', estimatedValue: 999999 }, // 不成立は金額に計上しない
    ]);
    expect(s.total).toBe(5);
    expect(s.received).toBe(1);
    expect(s.inProgress).toBe(1);
    expect(s.won).toBe(2);
    expect(s.lost).toBe(1);
    expect(s.pipelineValue).toBe(300000); // received(100000)+in_progress(200000)
    expect(s.wonValue).toBe(450000); // 300000+150000
    expect(s.winRate).toBe(66.7); // 成約2 /（成約2＋不成立1）
  });

  it('決着ゼロなら成約率は 0（0除算しない）／金額 null は 0 として扱う', () => {
    const s = summarizeReferralRecords([
      { status: 'received', estimatedValue: null },
      { status: 'in_progress', estimatedValue: null },
    ]);
    expect(s.winRate).toBe(0);
    expect(s.pipelineValue).toBe(0);
    expect(s.wonValue).toBe(0);
    expect(s.total).toBe(2);
  });
});
