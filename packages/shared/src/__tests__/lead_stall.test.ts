import { describe, it, expect } from 'vitest';
import {
  classifyLeadStall,
  leadStallBucketForStage,
  stagesForLeadStallBucket,
  leadStallCutoff,
  LEAD_STALL_THRESHOLD_DAYS,
  LEAD_STALL_BUCKET_LABEL,
  LEAD_STALL_BUCKETS,
} from '../leads';

const now = new Date('2026-07-22T00:00:00Z');
const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

describe('取りこぼし検知：stage → バケット対応', () => {
  it('アクティブな stage は対応バケットへ、終端・除外・未知は null', () => {
    expect(leadStallBucketForStage('NEW')).toBe('unworked');
    expect(leadStallBucketForStage('DRAFTED')).toBe('draft_pending');
    expect(leadStallBucketForStage('PENDING_APPROVAL')).toBe('draft_pending');
    expect(leadStallBucketForStage('SENT')).toBe('awaiting_response');
    expect(leadStallBucketForStage('REPLIED')).toBe('hot_cooling');
    expect(leadStallBucketForStage('QUOTED')).toBe('hot_cooling');
    // 終端・除外は対象外
    for (const s of ['WON', 'LOST', 'UNSUBSCRIBED', 'EXCLUDED', 'BOGUS', '']) {
      expect(leadStallBucketForStage(s)).toBeNull();
    }
  });

  it('全バケットに日本語ラベルとしきい値がある／stagesForLeadStallBucket は逆引き整合', () => {
    for (const b of LEAD_STALL_BUCKETS) {
      expect(LEAD_STALL_BUCKET_LABEL[b]).toBeTruthy();
      expect(LEAD_STALL_THRESHOLD_DAYS[b]).toBeGreaterThan(0);
      const stages = stagesForLeadStallBucket(b);
      expect(stages.length).toBeGreaterThan(0);
      for (const s of stages) expect(leadStallBucketForStage(s)).toBe(b);
    }
  });
});

describe('取りこぼし検知：classifyLeadStall', () => {
  it('終端 stage は null（対象外）', () => {
    expect(classifyLeadStall({ stage: 'WON', updatedAt: daysAgo(100), lastContactAt: null }, now)).toBeNull();
    expect(classifyLeadStall({ stage: 'EXCLUDED', updatedAt: daysAgo(100), lastContactAt: daysAgo(100) }, now)).toBeNull();
  });

  it('最終活動 = lastContactAt を優先、無ければ updatedAt', () => {
    // lastContactAt(2日前) を採用 → SENT のしきい値5日未満 → 非放置
    const r1 = classifyLeadStall({ stage: 'SENT', updatedAt: daysAgo(30), lastContactAt: daysAgo(2) }, now);
    expect(r1).toEqual({ bucket: 'awaiting_response', staleDays: 2, isStale: false });
    // lastContactAt 無し → updatedAt(10日前) を採用 → 放置
    const r2 = classifyLeadStall({ stage: 'SENT', updatedAt: daysAgo(10), lastContactAt: null }, now);
    expect(r2).toEqual({ bucket: 'awaiting_response', staleDays: 10, isStale: true });
  });

  it('しきい値ちょうど・超過は要対応、未満は非放置（バケット別の日数）', () => {
    // hot_cooling しきい値4日
    expect(classifyLeadStall({ stage: 'REPLIED', updatedAt: now, lastContactAt: daysAgo(4) }, now)!.isStale).toBe(true);
    expect(classifyLeadStall({ stage: 'REPLIED', updatedAt: now, lastContactAt: daysAgo(3) }, now)!.isStale).toBe(false);
    // draft_pending しきい値3日・unworked 7日
    expect(classifyLeadStall({ stage: 'DRAFTED', updatedAt: daysAgo(3), lastContactAt: null }, now)!.isStale).toBe(true);
    expect(classifyLeadStall({ stage: 'NEW', updatedAt: daysAgo(6), lastContactAt: null }, now)!.isStale).toBe(false);
    expect(classifyLeadStall({ stage: 'NEW', updatedAt: daysAgo(7), lastContactAt: null }, now)!.isStale).toBe(true);
  });

  it('未来日時（時計ずれ）でも負にならず 0 に丸める', () => {
    const r = classifyLeadStall({ stage: 'SENT', updatedAt: daysAgo(-3), lastContactAt: null }, now);
    expect(r!.staleDays).toBe(0);
    expect(r!.isStale).toBe(false);
  });
});

describe('取りこぼし検知：leadStallCutoff（DB クエリ用の基準日時）', () => {
  it('now - しきい値日 を返す', () => {
    expect(leadStallCutoff(now, 'awaiting_response').getTime()).toBe(daysAgo(5).getTime());
    expect(leadStallCutoff(now, 'unworked').getTime()).toBe(daysAgo(7).getTime());
    expect(leadStallCutoff(now, 'hot_cooling').getTime()).toBe(daysAgo(4).getTime());
  });
});
