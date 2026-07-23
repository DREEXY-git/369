import { describe, it, expect } from 'vitest';
import { classifyCustomerChurn, daysSinceContact, CHURN_TIER_LABEL } from '../customer-health';

describe('顧客離反予兆の判定（classifyCustomerChurn・根拠を残す）', () => {
  it('シグナルが弱ければ stable（根拠なし・0除算/捏造なし）', () => {
    const a = classifyCustomerChurn({ churnRisk: 10, satisfaction: 80, daysSinceContact: 10, openComplaints: 0 });
    expect(a.tier).toBe('stable');
    expect(a.reasons).toEqual([]);
    expect(a.score).toBe(10);
  });

  it('全シグナルが null/0 なら score 0・stable・根拠なし', () => {
    const a = classifyCustomerChurn({ churnRisk: null, satisfaction: null, daysSinceContact: null, openComplaints: 0 });
    expect(a).toMatchObject({ tier: 'stable', score: 0, reasons: [] });
  });

  it('複数シグナルが重なると score が上がり tier が上がる（決定論）', () => {
    // churn 60 + 満足度<40(+25) + 90日以上(+25) + クレーム1件(+10) = 120 → 100 にクランプ
    const a = classifyCustomerChurn({ churnRisk: 60, satisfaction: 30, daysSinceContact: 120, openComplaints: 1 });
    expect(a.score).toBe(100);
    expect(a.tier).toBe('critical');
    expect(a.reasons.length).toBe(4);
    expect(a.recommendation).toContain('至急');
  });

  it('しきい値ちょうどは危険側に含める（満足度・接触日数の境界）', () => {
    // 満足度59は「やや低い」(+10)、接触60日は+15。churn 0 → score 25 → watch 未満(30未満)なので stable
    const a = classifyCustomerChurn({ churnRisk: 0, satisfaction: 59, daysSinceContact: 60, openComplaints: 0 });
    expect(a.score).toBe(25);
    expect(a.tier).toBe('stable');
    // 満足度60は加点なし（境界の外＝良い側）
    const b = classifyCustomerChurn({ churnRisk: 0, satisfaction: 60, daysSinceContact: 60, openComplaints: 0 });
    expect(b.reasons.some((r) => r.includes('満足度'))).toBe(false);
    expect(b.score).toBe(15);
  });

  it('tier 境界: 30=watch / 50=elevated / 70=critical', () => {
    expect(classifyCustomerChurn({ churnRisk: 30, satisfaction: null, daysSinceContact: null, openComplaints: 0 }).tier).toBe('watch');
    expect(classifyCustomerChurn({ churnRisk: 50, satisfaction: null, daysSinceContact: null, openComplaints: 0 }).tier).toBe('elevated');
    expect(classifyCustomerChurn({ churnRisk: 70, satisfaction: null, daysSinceContact: null, openComplaints: 0 }).tier).toBe('critical');
    expect(classifyCustomerChurn({ churnRisk: 29, satisfaction: null, daysSinceContact: null, openComplaints: 0 }).tier).toBe('stable');
  });

  it('範囲外・非数値の入力は無視して捏造しない（churn 200→100 クランプ・NaN 無視）', () => {
    const a = classifyCustomerChurn({ churnRisk: 200, satisfaction: Number.NaN, daysSinceContact: Number.NaN, openComplaints: -3 });
    expect(a.score).toBe(100); // churn 200→100
    expect(a.reasons.some((r) => r.includes('満足度'))).toBe(false); // NaN 満足度は無視
    expect(a.reasons.some((r) => r.includes('クレーム'))).toBe(false); // 負のクレームは無視
  });

  it('高い churnRisk 指標自体も根拠として明示する（>=60）', () => {
    const a = classifyCustomerChurn({ churnRisk: 65, satisfaction: 80, daysSinceContact: 5, openComplaints: 0 });
    expect(a.reasons.some((r) => r.includes('離反リスク指標'))).toBe(true);
  });

  it('全 tier に日本語ラベルがある', () => {
    for (const t of ['critical', 'elevated', 'watch', 'stable'] as const) {
      expect(CHURN_TIER_LABEL[t].length).toBeGreaterThan(0);
    }
  });
});

describe('daysSinceContact（最終接触からの経過日数）', () => {
  const now = new Date('2026-07-23T00:00:00Z');
  it('null は null（未接触を 0 日と混同しない）', () => {
    expect(daysSinceContact(null, now)).toBeNull();
    expect(daysSinceContact(undefined, now)).toBeNull();
  });
  it('経過日数を切り捨てで返す・未来日時は 0', () => {
    expect(daysSinceContact(new Date('2026-06-23T00:00:00Z'), now)).toBe(30);
    expect(daysSinceContact(new Date('2026-08-01T00:00:00Z'), now)).toBe(0); // 未来は 0
  });
});
