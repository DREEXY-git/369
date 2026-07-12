import { describe, it, expect } from 'vitest';
import {
  buildControlTowerCards,
  countActionableCards,
  CONTROL_TOWER_REDACTION_NOTICE,
  CONTROL_TOWER_SCORE_MAX,
  type ControlTowerSignals,
} from '../growth-control-tower';

const baseSignals: ControlTowerSignals = {
  uncontactedLeads: 3,
  highOpportunityLeads: 2,
  stalledDeals: 4,
  companyBrainGaps: 1,
  lowMarginProjects: 2,
  unpaidRisk: 1,
  nextContactDue: 5,
  existingCustomerUpsell: 6,
  ceoAttention: 3,
};

const emptySignals: ControlTowerSignals = {
  uncontactedLeads: 0,
  highOpportunityLeads: 0,
  stalledDeals: 0,
  companyBrainGaps: 0,
  lowMarginProjects: 0,
  unpaidRisk: 0,
  nextContactDue: 0,
  existingCustomerUpsell: 0,
  ceoAttention: 0,
};

describe('buildControlTowerCards — 優先度と redaction（P3-CT-1 契約）', () => {
  it('9枚のカードを優先度（score）降順で返す', () => {
    const cards = buildControlTowerCards(baseSignals, { canViewFinance: true });
    expect(cards).toHaveLength(9);
    for (let i = 1; i < cards.length; i++) {
      expect(cards[i - 1]!.score).toBeGreaterThanOrEqual(cards[i]!.score);
    }
  });

  it('canViewFinance=true では finance 系カードに件数が出る', () => {
    const cards = buildControlTowerCards(baseSignals, { canViewFinance: true });
    const unpaid = cards.find((c) => c.key === 'unpaid_risk')!;
    const lowMargin = cards.find((c) => c.key === 'low_margin_projects')!;
    expect(unpaid.redacted).toBe(false);
    expect(unpaid.count).toBe(1);
    expect(lowMargin.redacted).toBe(false);
    expect(lowMargin.count).toBe(2);
  });

  it('canViewFinance=false では finance 系カードが redacted・count=null・実値を渡さない', () => {
    const staffSignals: ControlTowerSignals = { ...baseSignals, lowMarginProjects: null, unpaidRisk: null };
    const cards = buildControlTowerCards(staffSignals, { canViewFinance: false });
    const financeCards = cards.filter((c) => c.financeGated);
    expect(financeCards.length).toBeGreaterThan(0);
    for (const c of financeCards) {
      expect(c.redacted).toBe(true);
      expect(c.count).toBeNull();
      expect(c.reason).toBe(CONTROL_TOWER_REDACTION_NOTICE);
      expect(c.scoreBreakdown.redactedFloor).toBe(true);
      expect(c.scoreBreakdown.urgency).toBe(0);
    }
    const leads = cards.find((c) => c.key === 'uncontacted_leads')!;
    expect(leads.redacted).toBe(false);
    expect(leads.count).toBe(3);
  });

  it('件数0のカードは empty=true・score=0・priority=low', () => {
    const cards = buildControlTowerCards(emptySignals, { canViewFinance: true });
    expect(cards).toHaveLength(9);
    for (const c of cards) {
      expect(c.empty).toBe(true);
      expect(c.score).toBe(0);
      expect(c.count).toBe(0);
      expect(c.priority).toBe('low');
    }
    expect(countActionableCards(cards)).toBe(0);
  });

  it('deterministic: 同じ入力なら同じ順序・スコア・内訳を返す', () => {
    const a = buildControlTowerCards(baseSignals, { canViewFinance: true });
    const b = buildControlTowerCards(baseSignals, { canViewFinance: true });
    expect(a.map((c) => `${c.key}:${c.score}:${c.scoreBreakdown.urgency}`)).toEqual(
      b.map((c) => `${c.key}:${c.score}:${c.scoreBreakdown.urgency}`),
    );
  });

  it('countActionableCards は redacted か count>0 のカードを数える', () => {
    const cards = buildControlTowerCards(baseSignals, { canViewFinance: false });
    expect(countActionableCards(cards)).toBeGreaterThanOrEqual(2);
  });
});

describe('buildControlTowerCards — P3-CT-2 精緻化スコアリング', () => {
  it('score は 0..CONTROL_TOWER_SCORE_MAX の範囲に収まる', () => {
    const huge: ControlTowerSignals = {
      uncontactedLeads: 100000,
      highOpportunityLeads: 100000,
      stalledDeals: 100000,
      companyBrainGaps: 100000,
      lowMarginProjects: 100000,
      unpaidRisk: 100000,
      nextContactDue: 100000,
      existingCustomerUpsell: 100000,
      ceoAttention: 100000,
    };
    for (const opts of [{ canViewFinance: true }, { canViewFinance: false }]) {
      const cards = buildControlTowerCards(huge, opts);
      for (const c of cards) {
        expect(c.score).toBeGreaterThanOrEqual(0);
        expect(c.score).toBeLessThanOrEqual(CONTROL_TOWER_SCORE_MAX);
      }
    }
  });

  it('urgency は件数が上限で飽和し、スコアを過剰に釣り上げない', () => {
    // uncontacted_leads の urgencyCap は 20。20 と 1000 で urgency=1 に飽和し同スコア。
    const atCap = buildControlTowerCards({ ...emptySignals, uncontactedLeads: 20 }, { canViewFinance: true })
      .find((c) => c.key === 'uncontacted_leads')!;
    const overCap = buildControlTowerCards({ ...emptySignals, uncontactedLeads: 1000 }, { canViewFinance: true })
      .find((c) => c.key === 'uncontacted_leads')!;
    expect(atCap.scoreBreakdown.urgency).toBe(1);
    expect(overCap.scoreBreakdown.urgency).toBe(1);
    expect(overCap.score).toBe(atCap.score);
  });

  it('件数が増えるとスコアは単調非減少（同一カード内）', () => {
    const s1 = buildControlTowerCards({ ...emptySignals, stalledDeals: 1 }, { canViewFinance: true })
      .find((c) => c.key === 'stalled_deals')!.score;
    const s4 = buildControlTowerCards({ ...emptySignals, stalledDeals: 4 }, { canViewFinance: true })
      .find((c) => c.key === 'stalled_deals')!.score;
    const s8 = buildControlTowerCards({ ...emptySignals, stalledDeals: 8 }, { canViewFinance: true })
      .find((c) => c.key === 'stalled_deals')!.score;
    expect(s1).toBeGreaterThan(0);
    expect(s4).toBeGreaterThanOrEqual(s1);
    expect(s8).toBeGreaterThanOrEqual(s4);
  });

  it('件数がある社長ビューでは「社長が見るべき成長機会」が上位に来やすい', () => {
    const cards = buildControlTowerCards(baseSignals, { canViewFinance: true });
    expect(cards[0]!.key).toBe('ceo_attention');
    // 未回収リスクは停滞商談より上位（businessImpact 重視）。
    const unpaidIdx = cards.findIndex((c) => c.key === 'unpaid_risk');
    const stalledIdx = cards.findIndex((c) => c.key === 'stalled_deals');
    expect(unpaidIdx).toBeLessThan(stalledIdx);
  });

  it('redacted な finance カードは「要確認」中位（score>0・high ではない）', () => {
    const staffSignals: ControlTowerSignals = { ...baseSignals, lowMarginProjects: null, unpaidRisk: null };
    const cards = buildControlTowerCards(staffSignals, { canViewFinance: false });
    const unpaid = cards.find((c) => c.key === 'unpaid_risk')!;
    expect(unpaid.redacted).toBe(true);
    expect(unpaid.score).toBeGreaterThan(0);
    expect(unpaid.priority).not.toBe('high');
    // redacted の中位スコアは、権限ありで件数が飽和したときの高スコアより低い。
    const financeVisibleHigh = buildControlTowerCards({ ...emptySignals, unpaidRisk: 100 }, { canViewFinance: true })
      .find((c) => c.key === 'unpaid_risk')!;
    expect(unpaid.score).toBeLessThan(financeVisibleHigh.score);
  });

  it('priority ラベルは high/medium/low を score 閾値で分類する', () => {
    // ceo_attention は urgencyCap=5。件数5で urgency=1・score=businessImpact(92)→high。
    const high = buildControlTowerCards({ ...emptySignals, ceoAttention: 5 }, { canViewFinance: true })
      .find((c) => c.key === 'ceo_attention')!;
    expect(high.priority).toBe('high');
    expect(high.score).toBeGreaterThanOrEqual(70);
    // empty は low。
    const low = buildControlTowerCards(emptySignals, { canViewFinance: true })
      .find((c) => c.key === 'ceo_attention')!;
    expect(low.priority).toBe('low');
  });

  it('scoreBreakdown は説明可能な内訳（重要度・緊急度・信頼度）を持つ', () => {
    const cards = buildControlTowerCards(baseSignals, { canViewFinance: true });
    for (const c of cards) {
      expect(c.scoreBreakdown.businessImpact).toBeGreaterThan(0);
      expect(c.scoreBreakdown.confidence).toBeGreaterThan(0);
      expect(c.scoreBreakdown.confidence).toBeLessThanOrEqual(1);
      expect(c.scoreBreakdown.urgency).toBeGreaterThanOrEqual(0);
      expect(c.scoreBreakdown.urgency).toBeLessThanOrEqual(1);
    }
  });
});
