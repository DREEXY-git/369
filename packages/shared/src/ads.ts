// C19 Ads Management read model の純ロジック（Phase 3.5 Stream A・roadmap70）。
// DB 非依存。金額・指標の集計とチャネル状態の導出のみを行う。
// 外部広告 API への接続・広告費の支出・自動最適化は本モジュールの範囲外（封印中）。

/** Growth Channel（MarketingCampaign.channel の既知値）。 */
export const GROWTH_CHANNELS = ['ads', 'seo', 'sns', 'meo', 'line', 'mail'] as const;
export type GrowthChannel = (typeof GROWTH_CHANNELS)[number];

export const GROWTH_CHANNEL_LABEL: Record<GrowthChannel, string> = {
  ads: '広告（Ads）',
  seo: 'SEO / コンテンツ',
  sns: 'SNS',
  meo: 'MEO（マップ）',
  line: 'LINE',
  mail: 'メール',
};

/**
 * チャネルの内部データ状態。
 * - connected_data: 記録済みキャンペーンと実績メトリクスがある
 * - insufficient: キャンペーンはあるが実績メトリクスが無い（データ不足）
 * - not_connected: 記録が無い（未接続）
 * 外部 API 連携は全チャネル常時「封印中」（表示側で必ず併記する）。
 */
export type ChannelDataState = 'connected_data' | 'insufficient' | 'not_connected';

export function channelDataState(campaignCount: number, metricCount: number): ChannelDataState {
  if (campaignCount <= 0) return 'not_connected';
  return metricCount > 0 ? 'connected_data' : 'insufficient';
}

export const CHANNEL_DATA_STATE_LABEL: Record<ChannelDataState, string> = {
  connected_data: '記録あり',
  insufficient: 'データ不足',
  not_connected: '未接続',
};

export interface AdsMetricInput {
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
}

/** 集計結果。率・単価は分母 0 のとき null（0% と「未計測」を混同しない）。 */
export interface AdsSummary {
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  /** クリック率（clicks/impressions）。分母 0 は null。 */
  ctr: number | null;
  /** コンバージョン率（conversions/clicks）。分母 0 は null。 */
  cvr: number | null;
  /** クリック単価（cost/clicks）。分母 0 は null。 */
  cpc: number | null;
  /** 獲得単価（cost/conversions）。分母 0 は null。 */
  cpa: number | null;
}

export function summarizeAdsMetrics(rows: AdsMetricInput[]): AdsSummary {
  const t = rows.reduce(
    (s, r) => ({
      impressions: s.impressions + Math.max(0, r.impressions),
      clicks: s.clicks + Math.max(0, r.clicks),
      conversions: s.conversions + Math.max(0, r.conversions),
      cost: s.cost + Math.max(0, r.cost),
    }),
    { impressions: 0, clicks: 0, conversions: 0, cost: 0 },
  );
  const ratio = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 10000) / 10000 : null);
  const unit = (num: number, den: number) => (den > 0 ? Math.round(num / den) : null);
  return {
    ...t,
    ctr: ratio(t.clicks, t.impressions),
    cvr: ratio(t.conversions, t.clicks),
    cpc: unit(t.cost, t.clicks),
    cpa: unit(t.cost, t.conversions),
  };
}
