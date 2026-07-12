import { describe, expect, it } from 'vitest';
import {
  REFERRAL_CHANNELS,
  classifyReferralSource,
  buildReferralDraft,
  REFERRAL_PR_DISCLOSURE,
  REFERRAL_REWARD_TAX_NOTE,
  REFERRAL_NAME_PLACEHOLDER,
} from '../referral';

// C22 read-only 縦切り（v7.2 Lane B・roadmap76/83 §4）の純ロジック契約。
// 候補の算出まで・決定論・PII 非複製・PR 表記の削除経路なし。

const NOW = new Date('2026-07-12T12:00:00Z');
const RECENT = new Date('2026-07-01T00:00:00Z');
const OLD = new Date('2026-01-01T00:00:00Z');

const base = {
  customerId: 'c1',
  rank: 'A',
  status: 'active',
  satisfaction: 80,
  churnRisk: 10,
  wonDeals: 1,
  lastContactAt: RECENT,
};

describe('classifyReferralSource — 決定論・実測由来のみ', () => {
  it('成約実績あり・ランクA・満足度高・直近接触 → eligible（根拠はすべて実測由来）', () => {
    const r = classifyReferralSource(base, NOW);
    expect(r.eligible).toBe(true);
    expect(r.score).toBe(100);
    expect(r.reasons).toContain('成約実績 1 件（実測）');
    expect(r.reasons.join()).not.toMatch(/推定|見込み売上|ROI/); // 推測 ROI・架空成果を根拠にしない
  });

  it('成約実績 0 件は score に関わらず not eligible（実績のない顧客へ紹介依頼しない）', () => {
    expect(classifyReferralSource({ ...base, wonDeals: 0 }, NOW).eligible).toBe(false);
  });

  it('status が active 以外は not eligible・caution に明示', () => {
    const r = classifyReferralSource({ ...base, status: 'dormant' }, NOW);
    expect(r.eligible).toBe(false);
    expect(r.cautionFlags.some((f) => f.includes('dormant'))).toBe(true);
  });

  it('満足度 null は加点も減点もせず「未計測」を明示（実測なしを高評価と混同しない）', () => {
    const r = classifyReferralSource({ ...base, satisfaction: null }, NOW);
    expect(r.cautionFlags.some((f) => f.includes('未計測'))).toBe(true);
    expect(r.score).toBe(80); // 満足度 20 点が付かない
  });

  it('解約リスク 70 以上と 90日超の非接触は caution flag（自動除外・自動BANはしない）', () => {
    const r = classifyReferralSource({ ...base, churnRisk: 85, lastContactAt: OLD }, NOW);
    expect(r.cautionFlags.some((f) => f.includes('解約リスク 85'))).toBe(true);
    expect(r.cautionFlags.some((f) => f.includes('90日以上前'))).toBe(true);
    expect(r.eligible).toBe(true); // flag は人間判断材料であり自動失格ではない
  });

  it('決定論: 同一入力は常に同一出力', () => {
    expect(classifyReferralSource(base, NOW)).toEqual(classifyReferralSource({ ...base }, new Date(NOW)));
  });

  it('成約2件以上かつランクA → business_network・それ以外は referral', () => {
    expect(classifyReferralSource({ ...base, wonDeals: 2 }, NOW).suggestedChannel).toBe('business_network');
    expect(classifyReferralSource({ ...base, wonDeals: 2, rank: 'B' }, NOW).suggestedChannel).toBe('referral');
    expect(classifyReferralSource(base, NOW).suggestedChannel).toBe('referral');
  });
});

describe('buildReferralDraft — PR 表記削除不能・PII 非複製', () => {
  it('referral / business_network とも PR 表記と税務注記が必ず末尾側に1回含まれる', () => {
    for (const ch of ['referral', 'business_network'] as const) {
      const d = buildReferralDraft(ch);
      expect(d.body.split(REFERRAL_PR_DISCLOSURE)).toHaveLength(2); // ちょうど1回
      expect(d.body.endsWith(REFERRAL_PR_DISCLOSURE)).toBe(true); // 末尾固定＝後段連結で上書き不能
      expect(d.body).toContain(REFERRAL_REWARD_TAX_NOTE);
      expect(d.body).toContain('同意');
    }
  });

  it('下書きはプレースホルダのみで、実名・連絡先を受け取る引数が存在しない（PII 非複製）', () => {
    const d = buildReferralDraft('referral');
    expect(d.subject).toContain(REFERRAL_NAME_PLACEHOLDER);
    expect(buildReferralDraft.length).toBe(1); // channel のみ（名前や email を渡す経路がない）
  });

  it('決定論: 同一 channel は常に同一下書き', () => {
    expect(buildReferralDraft('referral')).toEqual(buildReferralDraft('referral'));
  });
});

describe('REFERRAL_CHANNELS — 4チャネルの正直な区分', () => {
  it('4チャネル・external データ源（affiliate/creator）は候補 0 が正しい表示になる区分を持つ', () => {
    expect(REFERRAL_CHANNELS.map((c) => c.key)).toEqual(['referral', 'affiliate', 'creator', 'business_network']);
    expect(REFERRAL_CHANNELS.filter((c) => c.dataSource === 'external').map((c) => c.key)).toEqual(['affiliate', 'creator']);
  });
});
