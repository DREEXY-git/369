import { describe, it, expect } from 'vitest';
import { maskEmail, maskPhone, maskName, maskText } from '../masking';
import { computeQuoteTotals, isOverdue, forecastCashflow, detectProfitLeaks } from '../finance';
import { hasReservationConflict, suggestDynamicPrice } from '../inventory';
import { computeLeadScore } from '../leads';
import { chunkText, cosineSimilarity } from '../knowledge';
import { detectAnomalies } from '../anomaly';
import { requiresApproval } from '../approval';
import { isSuppressed, detectUnsubscribeRequest } from '../suppression';
import { classifyBusinessRelevance } from '../relevance';

describe('マスキング', () => {
  it('メール/電話/氏名をマスキング', () => {
    expect(maskEmail('taro.yamada@example.co.jp')).toBe('t***@e***.jp');
    expect(maskPhone('011-222-3333')).toBe('***-****-3333');
    expect(maskName('山田太郎')).toBe('山〇〇〇');
  });
  it('自由文中の PII をマスキング', () => {
    const out = maskText('連絡は taro@example.com か 090-1111-2222 まで');
    expect(out).not.toContain('taro@example.com');
    expect(out).not.toContain('090-1111-2222');
  });
});

describe('見積粗利計算', () => {
  it('値引き・税込・粗利率を計算', () => {
    const r = computeQuoteTotals(1_000_000, 700_000, 10, 10);
    expect(r.discountedSubtotal).toBe(900_000);
    expect(r.tax).toBe(90_000);
    expect(r.total).toBe(990_000);
    expect(r.grossMargin).toBe(200_000);
    expect(r.grossMarginRate).toBeCloseTo(22.2, 1);
  });
  it('赤字を検出', () => {
    const r = computeQuoteTotals(100_000, 150_000, 0, 10);
    expect(r.grossMargin).toBeLessThan(0);
  });
});

describe('請求の延滞判定', () => {
  const past = new Date('2026-01-01');
  const now = new Date('2026-06-22');
  it('期日超過かつ未払いは延滞', () => {
    expect(isOverdue(past, 'ISSUED', now)).toBe(true);
  });
  it('支払済みは延滞でない', () => {
    expect(isOverdue(past, 'PAID', now)).toBe(false);
  });
});

describe('資金繰り予測', () => {
  it('残高推移と資金ショート日を算出', () => {
    const r = forecastCashflow(1_000_000, [
      { date: '2026-07-01', inflow: 0, outflow: 800_000 },
      { date: '2026-07-10', inflow: 0, outflow: 500_000 },
      { date: '2026-07-20', inflow: 1_000_000, outflow: 0 },
    ]);
    expect(r.lines[1]!.balance).toBe(-300_000);
    expect(r.shortageDate).not.toBeNull();
    expect(r.minBalance).toBe(-300_000);
  });
});

describe('利益漏れ検知', () => {
  it('低粗利・過大値引き・請求漏れを検出', () => {
    const findings = detectProfitLeaks({
      quotes: [{ id: 'q1', title: 'A案件', grossMarginRate: 8, discountRate: 25, total: 1_000_000 }],
      unbilledDeals: [{ id: 'd1', title: 'B案件', amount: 500_000 }],
    });
    const types = findings.map((f) => f.type);
    expect(types).toContain('low_margin');
    expect(types).toContain('discount');
    expect(types).toContain('unbilled');
  });
});

describe('在庫の予約重複', () => {
  const existing = [
    { assetId: 'tent', quantity: 8, startAt: '2026-07-01', endAt: '2026-07-03' },
  ];
  it('在庫超過の重複を検出', () => {
    expect(
      hasReservationConflict(
        { assetId: 'tent', quantity: 5, startAt: '2026-07-02', endAt: '2026-07-04' },
        existing,
        10,
      ),
    ).toBe(true);
  });
  it('在庫内なら衝突しない', () => {
    expect(
      hasReservationConflict(
        { assetId: 'tent', quantity: 2, startAt: '2026-07-02', endAt: '2026-07-04' },
        existing,
        10,
      ),
    ).toBe(false);
  });
  it('期間が重ならなければ衝突しない', () => {
    expect(
      hasReservationConflict(
        { assetId: 'tent', quantity: 8, startAt: '2026-07-10', endAt: '2026-07-12' },
        existing,
        10,
      ),
    ).toBe(false);
  });
});

describe('ダイナミックプライシング', () => {
  it('繁忙期+在庫残少で値上げを提案', () => {
    const r = suggestDynamicPrice(100_000, { peakSeason: true, lowStock: true });
    expect(r.changeRate).toBeGreaterThan(0);
    expect(r.suggestedPrice).toBeGreaterThan(100_000);
  });
  it('低稼働では値下げを提案', () => {
    const r = suggestDynamicPrice(100_000, { lowUtilization: true, lowSeason: true });
    expect(r.changeRate).toBeLessThan(0);
  });
});

describe('リードスコア', () => {
  it('Webサイト無し・口コミ多数で高スコア', () => {
    const r = computeLeadScore({ rating: 4.2, reviewCount: 120, hasWebsite: false });
    expect(r.score).toBeGreaterThan(60);
    expect(r.breakdown.noWebsite).toBe(20);
  });
  it('完璧な店舗は相対的に低スコア', () => {
    const strong = computeLeadScore({
      rating: 4.9,
      reviewCount: 10,
      hasWebsite: true,
      mobileFriendly: true,
      hasBooking: true,
      hasLine: true,
      hasSocial: true,
    });
    const weak = computeLeadScore({ rating: 4.0, reviewCount: 80, hasWebsite: false });
    expect(weak.score).toBeGreaterThan(strong.score);
  });
});

describe('ナレッジ', () => {
  it('長文をオーバーラップ付きでチャンク化', () => {
    const text = 'あ'.repeat(1000);
    const chunks = chunkText(text, 400, 60);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]!.length).toBe(400);
  });
  it('コサイン類似度', () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });
});

describe('経営異常検知', () => {
  it('売上未達・回収遅延・高優先度リード未対応を検出', () => {
    const findings = detectAnomalies({
      salesActual: 5_000_000,
      salesTarget: 10_000_000,
      overdueReceivableCount: 2,
      overdueReceivableAmount: 800_000,
      highPriorityUnhandledLeads: 4,
    });
    const codes = findings.map((f) => f.code);
    expect(codes).toContain('SALES_BELOW_TARGET');
    expect(codes).toContain('OVERDUE_RECEIVABLE');
    expect(codes).toContain('LEAD_UNHANDLED');
    // 重大度の高い順に並ぶ
    expect(findings[0]!.severity === 'CRITICAL' || findings[0]!.severity === 'HIGH').toBe(true);
  });
});

describe('承認要否', () => {
  it('外部送信・契約は常に承認必須', () => {
    expect(requiresApproval('outreach_send')).toBe(true);
    expect(requiresApproval('contract_sign')).toBe(true);
  });
  it('見積は金額閾値で承認要否が変わる', () => {
    expect(requiresApproval('quote_issue', { amount: 100_000 })).toBe(false);
    expect(requiresApproval('quote_issue', { amount: 800_000 })).toBe(true);
  });
  it('AI の外部影響アクションは常に承認', () => {
    expect(requiresApproval('ai_external_action', { actorIsAi: true, external: true })).toBe(true);
  });
});

describe('配信停止', () => {
  const list = [
    { channel: 'email', value: 'stop@example.com' },
    { channel: 'email', value: 'blocked.co.jp' },
  ];
  it('完全一致・ドメイン一致で抑止', () => {
    expect(isSuppressed(list, 'email', 'STOP@example.com')).toBe(true);
    expect(isSuppressed(list, 'email', 'anyone@blocked.co.jp')).toBe(true);
    expect(isSuppressed(list, 'email', 'ok@example.com')).toBe(false);
  });
  it('返信から配信停止希望を検知', () => {
    expect(detectUnsubscribeRequest('今後の連絡は不要です')).toBe(true);
    expect(detectUnsubscribeRequest('ぜひ詳細を教えてください')).toBe(false);
  });
});

describe('業務関連性判定', () => {
  it('業務キーワードを含むと relevant', () => {
    const r = classifyBusinessRelevance('見積の件、契約書を確認して請求をお願いします');
    expect(r.relevance).toBe('relevant');
  });
  it('私的内容は private', () => {
    const r = classifyBusinessRelevance('週末の家族での飲み会の相談です');
    expect(r.relevance).toBe('private');
  });
});
