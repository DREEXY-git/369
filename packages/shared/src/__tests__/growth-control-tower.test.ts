import { describe, it, expect } from 'vitest';
import {
  buildControlTowerCards,
  countActionableCards,
  CONTROL_TOWER_REDACTION_NOTICE,
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

describe('buildControlTowerCards — 優先度と redaction', () => {
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
    }
    // 非 finance カードは通常表示。
    const leads = cards.find((c) => c.key === 'uncontacted_leads')!;
    expect(leads.redacted).toBe(false);
    expect(leads.count).toBe(3);
  });

  it('件数0のカードは empty=true として残るが score は 0', () => {
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
    const cards = buildControlTowerCards(emptySignals, { canViewFinance: true });
    expect(cards).toHaveLength(9);
    for (const c of cards) {
      expect(c.empty).toBe(true);
      expect(c.score).toBe(0);
      expect(c.count).toBe(0);
    }
    expect(countActionableCards(cards)).toBe(0);
  });

  it('deterministic: 同じ入力なら同じ順序・スコアを返す', () => {
    const a = buildControlTowerCards(baseSignals, { canViewFinance: true });
    const b = buildControlTowerCards(baseSignals, { canViewFinance: true });
    expect(a.map((c) => `${c.key}:${c.score}`)).toEqual(b.map((c) => `${c.key}:${c.score}`));
  });

  it('countActionableCards は redacted か count>0 のカードを数える', () => {
    const cards = buildControlTowerCards(baseSignals, { canViewFinance: false });
    // finance 2枚は redacted（actionable 扱い）＋ 非finance で count>0 のもの。
    expect(countActionableCards(cards)).toBeGreaterThanOrEqual(2);
  });
});
