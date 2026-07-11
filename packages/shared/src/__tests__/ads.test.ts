import { describe, expect, it } from 'vitest';
import { channelDataState, summarizeAdsMetrics, GROWTH_CHANNELS } from '../ads';

describe('summarizeAdsMetrics', () => {
  it('複数行を合算し、率・単価を計算する', () => {
    const s = summarizeAdsMetrics([
      { impressions: 1000, clicks: 50, conversions: 5, cost: 10000 },
      { impressions: 1000, clicks: 30, conversions: 3, cost: 6000 },
    ]);
    expect(s.impressions).toBe(2000);
    expect(s.clicks).toBe(80);
    expect(s.conversions).toBe(8);
    expect(s.cost).toBe(16000);
    expect(s.ctr).toBe(0.04);
    expect(s.cvr).toBe(0.1);
    expect(s.cpc).toBe(200);
    expect(s.cpa).toBe(2000);
  });

  it('分母 0 の率・単価は null（0% と未計測を混同しない）', () => {
    const s = summarizeAdsMetrics([{ impressions: 0, clicks: 0, conversions: 0, cost: 0 }]);
    expect(s.ctr).toBeNull();
    expect(s.cvr).toBeNull();
    expect(s.cpc).toBeNull();
    expect(s.cpa).toBeNull();
  });

  it('空配列でも安全に 0 集計を返す', () => {
    const s = summarizeAdsMetrics([]);
    expect(s.impressions).toBe(0);
    expect(s.cost).toBe(0);
    expect(s.cpa).toBeNull();
  });

  it('負値は 0 に丸めて合算する（防御的集計）', () => {
    const s = summarizeAdsMetrics([{ impressions: -10, clicks: -1, conversions: 0, cost: -500 }]);
    expect(s.impressions).toBe(0);
    expect(s.cost).toBe(0);
  });
});

describe('channelDataState', () => {
  it('キャンペーンなし → 未接続', () => {
    expect(channelDataState(0, 0)).toBe('not_connected');
  });
  it('キャンペーンあり・実績なし → データ不足', () => {
    expect(channelDataState(2, 0)).toBe('insufficient');
  });
  it('実績あり → 記録あり', () => {
    expect(channelDataState(1, 3)).toBe('connected_data');
  });
  it('既知チャネルは6種', () => {
    expect(GROWTH_CHANNELS).toHaveLength(6);
  });
});
