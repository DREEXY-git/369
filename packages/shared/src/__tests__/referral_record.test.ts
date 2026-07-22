import { describe, it, expect } from 'vitest';
import {
  canTransitionReferralRecord,
  isReferralRecordStatus,
  summarizeReferralRecords,
  deriveReferralSummary,
  summarizeReferrersByName,
  validateReferralRecordInput,
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

describe('紹介記録の入力検証（server 側・Codex R4-04/08）', () => {
  const base = { referrerName: '紹介太郎', referredName: '被紹介商事', referredContact: 'a@example.jp', note: 'メモ', estimatedValue: '50000' };

  it('正常入力を parse（金額は数値・空の連絡先/noteは null）', () => {
    const v = validateReferralRecordInput(base);
    expect(v).not.toBeNull();
    expect(v!.referrerName).toBe('紹介太郎');
    expect(v!.estimatedValue).toBe(50000);
    const v2 = validateReferralRecordInput({ ...base, referredContact: '', note: '', estimatedValue: '' });
    expect(v2!.referredContact).toBeNull();
    expect(v2!.note).toBeNull();
    expect(v2!.estimatedValue).toBeNull();
  });

  it('必須欠落・長さ超過・不正金額は null（丸めず fail-closed）', () => {
    expect(validateReferralRecordInput({ ...base, referrerName: '' })).toBeNull();
    expect(validateReferralRecordInput({ ...base, referredName: '   ' })).toBeNull();
    expect(validateReferralRecordInput({ ...base, referrerName: 'あ'.repeat(101) })).toBeNull();
    expect(validateReferralRecordInput({ ...base, referredContact: 'x'.repeat(121) })).toBeNull();
    expect(validateReferralRecordInput({ ...base, note: 'x'.repeat(501) })).toBeNull();
    expect(validateReferralRecordInput({ ...base, estimatedValue: '-1' })).toBeNull(); // 負値
    expect(validateReferralRecordInput({ ...base, estimatedValue: '1e6' })).toBeNull(); // 指数表記
    expect(validateReferralRecordInput({ ...base, estimatedValue: '1.234' })).toBeNull(); // 小数3桁
    expect(validateReferralRecordInput({ ...base, estimatedValue: '9999999999999' })).toBeNull(); // 13桁（範囲外）
    expect(validateReferralRecordInput({ ...base, estimatedValue: 'abc' })).toBeNull();
  });
});

describe('紹介元ランキング（summarizeReferrersByName・誰が成約に繋がったか）', () => {
  it('紹介者ごとに紹介数・成約・成約率・成約金額を集計し、成約金額の多い順に並べる', () => {
    const rows = summarizeReferrersByName([
      { referrerName: 'A社', status: 'won', count: 2, wonValue: 500000 },
      { referrerName: 'A社', status: 'lost', count: 1, wonValue: 0 },
      { referrerName: 'A社', status: 'received', count: 1, wonValue: 0 },
      { referrerName: 'B社', status: 'won', count: 1, wonValue: 800000 },
      { referrerName: 'C社', status: 'in_progress', count: 3, wonValue: 0 }, // 未決着のみ＝成約率0
    ]);
    // 成約金額 B社(800000) > A社(500000) > C社(0) の順
    expect(rows.map((r) => r.referrerName)).toEqual(['B社', 'A社', 'C社']);
    const a = rows.find((r) => r.referrerName === 'A社')!;
    expect(a.total).toBe(4); // won2 + lost1 + received1
    expect(a.won).toBe(2);
    expect(a.lost).toBe(1);
    expect(a.winRate).toBe(66.7); // 2/(2+1)
    expect(a.wonValue).toBe(500000);
    const c = rows.find((r) => r.referrerName === 'C社')!;
    expect(c.winRate).toBe(0); // 決着ゼロは0除算せず0
    expect(c.total).toBe(3);
    expect(c.wonValue).toBe(0);
  });

  it('空入力は空配列（決定論・0除算なし）', () => {
    expect(summarizeReferrersByName([])).toEqual([]);
  });
});

describe('紹介記録の集計（DB aggregate 経路・deriveReferralSummary・Codex R4-07）', () => {
  it('カウント・金額から成約率/総数/金額を導出し、array 集計と一致する', () => {
    const d = deriveReferralSummary({ received: 1, inProgress: 1, won: 2, lost: 1, pipelineValue: 300000, wonValue: 450000 });
    expect(d.total).toBe(5);
    expect(d.winRate).toBe(66.7);
    expect(d.pipelineValue).toBe(300000);
    expect(d.wonValue).toBe(450000);
    const arr = summarizeReferralRecords([
      { status: 'received', estimatedValue: 100000 },
      { status: 'in_progress', estimatedValue: 200000 },
      { status: 'won', estimatedValue: 300000 },
      { status: 'won', estimatedValue: 150000 },
      { status: 'lost', estimatedValue: 999999 },
    ]);
    expect(arr).toEqual(d);
  });
});
