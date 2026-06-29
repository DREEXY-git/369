// Phase 1-25 統合テスト（要DB）: 非課金 UsageEvent emit（AIOutput／saveAIOutputStandard 経由）の payload 仕様を DB レベルで検証。
// apps/web の関数は直接叩かず、emit が生成する UsageEvent の形（ai.output.generated / usage_only）を再現して検証する。
// 重要: UsageEvent.metadata は task / model のみ。input/inputHash/output/outputText/citations/prompt/顧客情報/金額/secret を入れない。
//        テストデータも非PIIのみ（task は固定ラベル analyzeLead、model は固定ラベル fake、id は疑似ID）。
// Phase 1-25 では billing は usage_only のみ。billable_candidate / never_billable は使わない。
import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '../client';

const T1 = `itest-p125-${Date.now()}-a`;
const T2 = `itest-p125-${Date.now()}-b`;

// emit payload を saveAIOutputStandard と同一仕様で組み立てる（金額・PII・本文を含まない）。
function aiOutputUsagePayload(tenantId: string, actorId: string, aiOutputId: string) {
  return {
    tenantId,
    actorId,
    actorType: 'ai_agent',
    eventType: 'ai.output.generated',
    category: 'ai',
    billing: 'usage_only',
    unit: 'count',
    quantity: 1,
    sourceType: 'AIOutput',
    sourceId: aiOutputId,
    idempotencyKey: `usage:ai.output.generated:${aiOutputId}`,
    metadata: { task: 'analyzeLead', model: 'fake' },
  } as const;
}

afterAll(async () => {
  await prisma.usageEvent.deleteMany({ where: { tenantId: { in: [T1, T2] } } });
});

describe('Phase 1-25 非課金 UsageEvent emit（AIOutput）', () => {
  it('ai.output.generated の UsageEvent を作成でき、payload が仕様どおり保存される', async () => {
    const ev = await prisma.usageEvent.create({ data: aiOutputUsagePayload(T1, 'user-1', 'ai-output-1') });

    expect(ev.tenantId).toBe(T1);
    expect(ev.actorId).toBe('user-1');
    expect(['user', 'ai_agent']).toContain(ev.actorType);
    expect(ev.eventType).toBe('ai.output.generated');
    expect(ev.category).toBe('ai');
    expect(ev.billing).toBe('usage_only');
    expect(ev.unit).toBe('count');
    expect(ev.quantity.toString()).toBe('1');
    expect(ev.sourceType).toBe('AIOutput');
    expect(ev.sourceId).toBe('ai-output-1');
    expect(ev.idempotencyKey).toBe('usage:ai.output.generated:ai-output-1');
    expect(ev.metadata).toEqual({ task: 'analyzeLead', model: 'fake' });
  });

  it('metadata は task / model のみ（input/output/outputText/prompt/citations/PII/金額を含まない）', async () => {
    const ev = await prisma.usageEvent.create({ data: aiOutputUsagePayload(T1, 'user-1', 'ai-output-meta') });
    const meta = (ev.metadata ?? {}) as Record<string, unknown>;
    expect(Object.keys(meta).sort()).toEqual(['model', 'task']);
    for (const forbidden of [
      'input', 'inputHash', 'output', 'outputText', 'citations', 'prompt',
      'body', 'email', 'customer', 'name', 'amount', 'price', 'currency', 'secret', 'token',
    ]) {
      expect(meta).not.toHaveProperty(forbidden);
    }
    // 金額系フィールドはモデルにも存在しない。
    expect((ev as Record<string, unknown>).amount).toBeUndefined();
    expect((ev as Record<string, unknown>).currency).toBeUndefined();
  });

  it('billing は usage_only（billable_candidate / never_billable ではない）', async () => {
    const ev = await prisma.usageEvent.create({ data: aiOutputUsagePayload(T1, 'user-1', 'ai-output-billing') });
    expect(ev.billing).toBe('usage_only');
    expect(ev.billing).not.toBe('billable_candidate');
    expect(ev.billing).not.toBe('never_billable');
  });

  it('同一 tenantId + idempotencyKey は二重作成できない（同じ AIOutput を二重計上しない）', async () => {
    await prisma.usageEvent.create({ data: aiOutputUsagePayload(T1, 'user-1', 'ai-output-dup') });
    await expect(
      prisma.usageEvent.create({ data: aiOutputUsagePayload(T1, 'user-1', 'ai-output-dup') }),
    ).rejects.toThrow();
  });

  it('別 tenant なら同じ idempotencyKey でも作成可能', async () => {
    const a = await prisma.usageEvent.create({ data: aiOutputUsagePayload(T1, 'user-1', 'ai-output-shared') });
    const b = await prisma.usageEvent.create({ data: aiOutputUsagePayload(T2, 'user-2', 'ai-output-shared') });
    expect(a.id).not.toBe(b.id);
    expect(a.idempotencyKey).toBe(b.idempotencyKey);
    expect(a.tenantId).toBe(T1);
    expect(b.tenantId).toBe(T2);
  });
});
