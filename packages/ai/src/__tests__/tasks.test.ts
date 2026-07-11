import { describe, it, expect } from 'vitest';
import {
  analyzeLeadBusiness,
  analyzeReviews,
  generateOutreachDraft,
  classifyOutreachReply,
  summarizeMeeting,
  classifyRelevance,
  fakeOutreachDraft,
} from '../tasks';
import { FakeEmbeddingProvider } from '../providers/index';
import { cosineSimilarity } from '@hokko/shared';

describe('FakeLLM AIタスク', () => {
  it('リード分析が強みと改善余地を返す', async () => {
    const r = await analyzeLeadBusiness({
      name: 'サンプル美容室',
      industry: '美容室',
      city: '札幌市',
      rating: 4.5,
      reviewCount: 120,
      hasWebsite: true,
      mobileFriendly: false,
      hasBooking: false,
      salesType: 'Web制作',
    });
    expect(r.strengths.length).toBeGreaterThan(0);
    expect(r.opportunities.length).toBeGreaterThan(0);
    expect(r.angle).toContain('予約');
  });

  it('レビュー分析が前向きな提案へ変換する', async () => {
    const r = await analyzeReviews([
      { rating: 5, text: '技術が上手で接客も丁寧でした' },
      { rating: 3, text: '電話予約が繋がりにくく待ち時間が長い' },
      { rating: 3, text: '予約が取りづらい' },
    ]);
    expect(r.praised).toContain('技術');
    expect(r.recurring).toContain('予約');
    expect(r.positiveReframe).not.toContain('悪い');
  });

  it('個別営業メール下書きが会社名と切り口を含む', async () => {
    const r = await generateOutreachDraft({
      leadName: 'テスト歯科',
      industry: '歯科医院',
      city: '札幌市',
      salesType: 'MEO',
      senderCompany: 'dreexy',
      strengths: ['口コミ評価が高い'],
      opportunities: ['予約導線が弱い'],
    });
    expect(r.subject).toContain('テスト歯科');
    expect(r.body).toContain('テスト歯科');
    expect(r.body).toContain('dreexy');
    expect(r.cautions).toContain('承認');
  });

  it('100社で異なる本文（テンプレ一律でない）', () => {
    const a = fakeOutreachDraft({ leadName: 'A店', industry: '美容室', city: '札幌市', strengths: ['接客が良い'], opportunities: ['予約導線が弱い'] });
    const b = fakeOutreachDraft({ leadName: 'B院', industry: '歯科医院', city: '東京都', strengths: ['評価が高い'], opportunities: ['Webが古い'] });
    expect(a.body).not.toBe(b.body);
  });

  it('返信分類: 配信停止を検出', async () => {
    const r = await classifyOutreachReply('今後の連絡は不要です。配信停止してください。');
    expect(r.classification).toBe('unsubscribe');
  });

  it('返信分類: 興味ありを検出', async () => {
    const r = await classifyOutreachReply('ぜひ詳しく話を聞きたいです。');
    expect(r.classification).toBe('interested');
  });

  it('議事録生成が決定事項とアクションを抽出', async () => {
    const transcript = [
      '田中: 今回の夏祭りの件、テント10張りで進めることに決定しました。',
      '佐藤: 見積を金曜までに作成してお願いします。',
      '田中: 搬入時間が未定なのが懸念です。',
    ].join('\n');
    const r = await summarizeMeeting({ title: '夏祭り打ち合わせ', transcript });
    expect(r.decisions.length).toBeGreaterThan(0);
    expect(r.actionItems.length).toBeGreaterThan(0);
    expect(r.risks).toContain('懸念');
  });

  it('業務関連性判定（FakeLLM委譲）', () => {
    expect(classifyRelevance('見積と請求の件で相談です').relevance).toBe('relevant');
  });
});

describe('FakeEmbedding', () => {
  it('似た文ほど高い類似度', async () => {
    const e = new FakeEmbeddingProvider();
    const [a, b, c] = await e.embed([
      '美容室の予約導線を改善したい',
      '美容室の予約の導線を良くしたい',
      '会計ソフトの仕訳を自動化する',
    ]);
    expect(cosineSimilarity(a!, b!)).toBeGreaterThan(cosineSimilarity(a!, c!));
  });
});

describe('fakeAdsImprovement（C19 Ads 改善案・Phase 3.5）', () => {
  it('実績があるとき、根拠・次の人間確認つきの下書きを返す（Zod 検証済み・決定論）', async () => {
    const { fakeAdsImprovement } = await import('../tasks');
    const input = {
      campaignName: '夏のイベント集客',
      channel: 'ads',
      budget: 500000,
      spent: 350000,
      impressions: 120000,
      clicks: 900,
      conversions: 24,
      cost: 350000,
      ctr: 0.0075,
      cvr: 0.0267,
      cpa: 14583,
    };
    const a = fakeAdsImprovement(input);
    const b = fakeAdsImprovement(input);
    expect(a).toEqual(b); // 決定論
    expect(a.title).toContain('夏のイベント集客');
    expect(a.recommendations.length).toBeGreaterThan(0);
    expect(a.rationale.join(' ')).toContain('CTR');
    expect(a.nextHumanChecks.join(' ')).toContain('封印中');
    expect(a.confidence).toBeGreaterThan(0);
    expect(a.confidence).toBeLessThanOrEqual(1);
  });

  it('実績ゼロのとき、データ不足を明示し働いているように見せない', async () => {
    const { fakeAdsImprovement } = await import('../tasks');
    const a = fakeAdsImprovement({
      campaignName: '新規campaign',
      channel: 'ads',
      budget: 0,
      spent: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      cost: 0,
      ctr: null,
      cvr: null,
      cpa: null,
    });
    expect(a.dataGaps.length).toBeGreaterThan(0);
    expect(a.recommendations.join(' ')).toContain('記録');
  });
});
