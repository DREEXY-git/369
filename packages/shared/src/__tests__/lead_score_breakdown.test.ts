import { describe, it, expect } from 'vitest';
import {
  computeLeadScore,
  describeLeadScoreBreakdown,
  LEAD_SCORE_FACTOR_META,
} from '../leads';

describe('優先度スコアの内訳の説明（describeLeadScoreBreakdown・なぜ有望か）', () => {
  it('computeLeadScore の breakdown を「加点のあった理由」に変換する', () => {
    const { breakdown } = computeLeadScore({
      rating: 3.0, // 低評価帯 → rating +15
      reviewCount: 50, // 確立度 +10
      hasWebsite: false, // noWebsite +20
      hasBooking: false, // noBooking +8
      hasLine: false, // noLine +6
      hasSocial: false, // noSocial +5
    });
    const factors = describeLeadScoreBreakdown(breakdown);
    const keys = factors.map((f) => f.key);
    // base も加点(30)なので含まれる。加点0は含まれない。
    expect(keys).toContain('base');
    expect(keys).toContain('noWebsite');
    expect(keys).toContain('noBooking');
    // 全項目に日本語ラベル・種別が付く
    for (const f of factors) {
      expect(f.label.length).toBeGreaterThan(0);
      expect(['base', 'fit', 'opportunity', 'caution']).toContain(f.kind);
      expect(f.points).toBeGreaterThan(0);
    }
  });

  it('影響度（点数）の大きい順・同点は key で決定論的に整列', () => {
    const factors = describeLeadScoreBreakdown({ noBooking: 8, noSocial: 8, noWebsite: 20, base: 30 });
    expect(factors.map((f) => f.key)).toEqual(['base', 'noWebsite', 'noBooking', 'noSocial']);
    // 同点(8)の noBooking と noSocial は key 昇順（noBooking < noSocial）で安定
    const reversed = describeLeadScoreBreakdown({ noSocial: 8, noBooking: 8, base: 30, noWebsite: 20 });
    expect(reversed.map((f) => f.key)).toEqual(factors.map((f) => f.key));
  });

  it('加点0以下・非数値の項目は理由に含めない（該当なしを理由に見せない）', () => {
    const factors = describeLeadScoreBreakdown({ base: 30, rating: 0, noWebsite: 0, weakMobile: -5, noLine: 'x' as never });
    expect(factors.map((f) => f.key)).toEqual(['base']);
  });

  it('未知キーは key をそのままラベルにして opportunity 扱い（落とさない）', () => {
    const factors = describeLeadScoreBreakdown({ mysteryFactor: 12 });
    expect(factors).toHaveLength(1);
    expect(factors[0]!).toMatchObject({ key: 'mysteryFactor', label: 'mysteryFactor', points: 12, kind: 'opportunity' });
  });

  it('現実的な範囲を超える巨大な有限値は理由に含めない（壊れた/旧データを根拠にしない・C-SCORE-03）', () => {
    expect(describeLeadScoreBreakdown({ base: 30, mystery: Number.MAX_VALUE }).map((f) => f.key)).toEqual(['base']);
    expect(describeLeadScoreBreakdown({ a: 100 }).map((f) => f.key)).toEqual(['a']); // 上限ちょうどは許可
    expect(describeLeadScoreBreakdown({ a: 101 })).toEqual([]); // 上限超過は除外
  });

  it('Object.prototype 継承キー（constructor/toString/__proto__）も通常の未知キーとして扱う（prototype汚染回避・C-SCORE-04）', () => {
    // JSON.parse 由来なら __proto__ も own 列挙プロパティになる。prototype のメソッドを meta と誤認しないこと。
    const parsed = JSON.parse('{"constructor":7,"toString":6,"__proto__":5,"mystery":4}');
    const byKey = Object.fromEntries(describeLeadScoreBreakdown(parsed).map((f) => [f.key, f]));
    for (const k of ['constructor', 'toString', '__proto__', 'mystery']) {
      expect(byKey[k]).toBeTruthy();
      expect(byKey[k]!.label).toBe(k); // key をそのままラベル化（prototype メソッドを拾わない）
      expect(byKey[k]!.kind).toBe('opportunity');
      expect(typeof byKey[k]!.hint).toBe('string');
    }
  });

  it('null / undefined / 非オブジェクト / 配列は空配列（fail-closed・捏造しない）', () => {
    expect(describeLeadScoreBreakdown(null)).toEqual([]);
    expect(describeLeadScoreBreakdown(undefined)).toEqual([]);
    expect(describeLeadScoreBreakdown(42)).toEqual([]);
    expect(describeLeadScoreBreakdown('base')).toEqual([]);
    expect(describeLeadScoreBreakdown([{ base: 30 }])).toEqual([]);
  });

  it('既知キーはすべて meta を持つ（ラベル欠落でUIが空にならない）', () => {
    for (const key of ['base', 'established', 'rating', 'noWebsite', 'weakMobile', 'noBooking', 'noLine', 'noSocial', 'negativeSignal']) {
      const meta = LEAD_SCORE_FACTOR_META[key];
      expect(meta).toBeTruthy();
      expect(meta!.label.length).toBeGreaterThan(0);
    }
  });
});
