// Phase 1-23 統合テスト（要DB）: 非課金 UsageEvent emit（LeadMap export のみ）の payload 仕様を DB レベルで検証。
// apps/web の route は直接叩かず、emit が生成する UsageEvent の形（export.generated / usage_only）を再現して検証する。
// 重要: UsageEvent.metadata に PII / secret / 本文 / campaignId 実値 / CSV本文 / 金額を入れない。
//        テストデータも非PII のみ（顧客名・メール・本文・金額・件数のような規模推測値は使わない）。
// Phase 1-23 では billing は usage_only のみ。billable_candidate / never_billable は使わない。
import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '../client';

const T1 = `itest-p123-${Date.now()}-a`;
const T2 = `itest-p123-${Date.now()}-b`;

// emit payload を route と同一仕様で組み立てる（金額・PII・実IDを含まない）。
function exportUsagePayload(tenantId: string, actorId: string, exportJobId: string) {
  return {
    tenantId,
    actorId,
    actorType: 'user',
    eventType: 'export.generated',
    category: 'export',
    billing: 'usage_only',
    unit: 'count',
    quantity: 1,
    sourceType: 'ExportJob',
    sourceId: exportJobId,
    idempotencyKey: `usage:export.generated:${exportJobId}`,
    metadata: { scope: 'leadmap_leads', format: 'csv', hasCampaignFilter: false },
  } as const;
}

afterAll(async () => {
  await prisma.usageEvent.deleteMany({ where: { tenantId: { in: [T1, T2] } } });
});

describe('Phase 1-23 非課金 UsageEvent emit（LeadMap export）', () => {
  it('export.generated の UsageEvent を作成でき、payload が仕様どおり保存される', async () => {
    const ev = await prisma.usageEvent.create({ data: exportUsagePayload(T1, 'user-1', 'job-1') });

    expect(ev.tenantId).toBe(T1);
    expect(ev.actorId).toBe('user-1');
    expect(ev.actorType).toBe('user');
    expect(ev.eventType).toBe('export.generated');
    expect(ev.category).toBe('export');
    expect(ev.billing).toBe('usage_only');
    expect(ev.unit).toBe('count');
    expect(ev.quantity.toString()).toBe('1');
    expect(ev.sourceType).toBe('ExportJob');
    expect(ev.sourceId).toBe('job-1');
    expect(ev.idempotencyKey).toBe('usage:export.generated:job-1');
    expect(ev.metadata).toEqual({ scope: 'leadmap_leads', format: 'csv', hasCampaignFilter: false });
  });

  it('metadata は非PIIの集計補助のみ（顧客情報・本文・campaignId実値・金額・件数を含まない）', async () => {
    const ev = await prisma.usageEvent.create({ data: exportUsagePayload(T1, 'user-1', 'job-meta') });
    const meta = (ev.metadata ?? {}) as Record<string, unknown>;
    // 許可キーのみ。PII/本文/金額/規模を推測できるキーが無いことを確認。
    expect(Object.keys(meta).sort()).toEqual(['format', 'hasCampaignFilter', 'scope']);
    for (const forbidden of ['email', 'name', 'customer', 'body', 'csv', 'campaignId', 'amount', 'price', 'count', 'secret']) {
      expect(meta).not.toHaveProperty(forbidden);
    }
    // 金額系フィールドはモデルにも存在しない。
    expect((ev as Record<string, unknown>).amount).toBeUndefined();
    expect((ev as Record<string, unknown>).currency).toBeUndefined();
  });

  it('billing は usage_only（Phase 1-23 では billable_candidate を使わない）', async () => {
    const ev = await prisma.usageEvent.create({ data: exportUsagePayload(T1, 'user-1', 'job-billing') });
    expect(ev.billing).toBe('usage_only');
    expect(ev.billing).not.toBe('billable_candidate');
    expect(ev.billing).not.toBe('never_billable');
  });

  it('同一 tenantId + idempotencyKey は二重作成できない（同じ export を二重計上しない）', async () => {
    await prisma.usageEvent.create({ data: exportUsagePayload(T1, 'user-1', 'job-dup') });
    await expect(
      prisma.usageEvent.create({ data: exportUsagePayload(T1, 'user-1', 'job-dup') }),
    ).rejects.toThrow();
  });

  it('別 tenant なら同じ idempotencyKey でも作成可能', async () => {
    const a = await prisma.usageEvent.create({ data: exportUsagePayload(T1, 'user-1', 'job-shared') });
    const b = await prisma.usageEvent.create({ data: exportUsagePayload(T2, 'user-2', 'job-shared') });
    expect(a.id).not.toBe(b.id);
    expect(a.idempotencyKey).toBe(b.idempotencyKey);
    expect(a.tenantId).toBe(T1);
    expect(b.tenantId).toBe(T2);
  });
});
