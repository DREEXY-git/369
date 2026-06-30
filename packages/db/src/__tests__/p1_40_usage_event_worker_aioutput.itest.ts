// Phase 1-40 統合テスト（要DB）: worker MORNING_REPORT_JOB の aIOutput 非課金 UsageEvent emit を payload 仕様で検証。
// 実 worker / queue は起動せず、実AI実行・外部送信もしない。worker と同一仕様で recordUsageEventCore を直接叩く。
// 重要:
// - metadata は { task, source } の固定非PIIのみ。output/outputText/report/prompt/inputHash/金額/secret/url/payload/実ID を入れない。
// - eventType=ai.output.generated（apps/web の AIOutput emit と同一スキーム・別 id なので二重計上しない）。
// - succeeded（aIOutput.create 成功）相当のときだけ emit する想定。
import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '../client';
import { recordUsageEventCore } from '../usage';

const T1 = `itest-p140-${Date.now()}-a`;
const T2 = `itest-p140-${Date.now()}-b`;

// worker MORNING_REPORT_JOB と同一仕様の emit payload（本文・金額を含まない）。
function morningReportUsagePayload(tenantId: string, aiOutputId: string) {
  return {
    tenantId,
    actorId: null,
    actorType: 'system' as const,
    eventType: 'ai.output.generated',
    category: 'ai',
    billing: 'usage_only',
    unit: 'count',
    quantity: 1,
    sourceType: 'AIOutput',
    sourceId: aiOutputId,
    idempotencyKey: `usage:ai.output.generated:${aiOutputId}`,
    metadata: { task: 'generateMorningReport', source: 'worker' },
  };
}

// AIOutput 行を作る（output には最小ダミー JSON。UsageEvent metadata には絶対に入れない）。
async function createMorningAIOutput(tenantId: string) {
  return prisma.aIOutput.create({
    data: { tenantId, task: 'generateMorningReport', output: { ok: true } as any, confidence: 0.7 },
  });
}

afterAll(async () => {
  await prisma.usageEvent.deleteMany({ where: { tenantId: { in: [T1, T2] } } });
  await prisma.aIOutput.deleteMany({ where: { tenantId: { in: [T1, T2] } } });
});

describe('Phase 1-40 worker MORNING_REPORT_JOB の AIOutput 非課金 UsageEvent emit', () => {
  it('ai.output.generated を作成でき、payload が仕様どおり保存される', async () => {
    const ai = await createMorningAIOutput(T1);
    const res = await recordUsageEventCore(morningReportUsagePayload(T1, ai.id));
    expect(res.ok).toBe(true);
    expect(res.created).toBe(true);

    const ev = await prisma.usageEvent.findFirst({
      where: { tenantId: T1, idempotencyKey: `usage:ai.output.generated:${ai.id}` },
    });
    expect(ev).not.toBeNull();
    expect(ev!.eventType).toBe('ai.output.generated');
    expect(ev!.category).toBe('ai');
    expect(ev!.billing).toBe('usage_only');
    expect(ev!.unit).toBe('count');
    expect(ev!.quantity.toString()).toBe('1');
    expect(ev!.actorType).toBe('system');
    expect(ev!.actorId).toBeNull();
    expect(ev!.sourceType).toBe('AIOutput');
    expect(ev!.sourceId).toBe(ai.id);
    expect(ev!.metadata).toEqual({ task: 'generateMorningReport', source: 'worker' });
  });

  it('metadata は { task, source } のみ（output/本文/金額/各種ID/secret を含まない）', async () => {
    const ai = await createMorningAIOutput(T1);
    const res = await recordUsageEventCore(morningReportUsagePayload(T1, ai.id));
    expect(res.ok).toBe(true);
    const ev = await prisma.usageEvent.findFirst({
      where: { tenantId: T1, idempotencyKey: `usage:ai.output.generated:${ai.id}` },
    });
    const meta = (ev!.metadata ?? {}) as Record<string, unknown>;
    expect(Object.keys(meta).sort()).toEqual(['source', 'task']);
    for (const forbidden of [
      'output', 'outputText', 'report', 'prompt', 'inputHash', 'salesActual', 'salesTarget',
      'amount', 'price', 'currency', 'total', 'secret', 'token', 'url', 'payload', 'aiOutputId', 'tenantId',
    ]) {
      expect(meta).not.toHaveProperty(forbidden);
    }
  });

  it('同一 tenantId + idempotencyKey は duplicate 扱いで二重計上しない', async () => {
    const ai = await createMorningAIOutput(T1);
    const first = await recordUsageEventCore(morningReportUsagePayload(T1, ai.id));
    expect(first.ok).toBe(true);
    expect(first.created).toBe(true);
    const second = await recordUsageEventCore(morningReportUsagePayload(T1, ai.id));
    expect(second.ok).toBe(true);
    expect(second.created).toBe(false);
    expect(second.duplicate).toBe(true);

    const count = await prisma.usageEvent.count({
      where: { tenantId: T1, idempotencyKey: `usage:ai.output.generated:${ai.id}` },
    });
    expect(count).toBe(1);
  });

  it('別 tenant の朝礼AI出力はそれぞれ独立して記録される', async () => {
    const aiA = await createMorningAIOutput(T1);
    const aiB = await createMorningAIOutput(T2);
    const a = await recordUsageEventCore(morningReportUsagePayload(T1, aiA.id));
    const b = await recordUsageEventCore(morningReportUsagePayload(T2, aiB.id));
    expect(a.created).toBe(true);
    expect(b.created).toBe(true);

    const evA = await prisma.usageEvent.findFirst({ where: { tenantId: T1, idempotencyKey: `usage:ai.output.generated:${aiA.id}` } });
    const evB = await prisma.usageEvent.findFirst({ where: { tenantId: T2, idempotencyKey: `usage:ai.output.generated:${aiB.id}` } });
    expect(evA!.id).not.toBe(evB!.id);
    expect(evA!.tenantId).toBe(T1);
    expect(evB!.tenantId).toBe(T2);
  });

  it('UsageEvent モデルに金額カラム（amount/price/currency）が存在しない', async () => {
    const ai = await createMorningAIOutput(T1);
    await recordUsageEventCore(morningReportUsagePayload(T1, ai.id));
    const ev = await prisma.usageEvent.findFirst({ where: { tenantId: T1, idempotencyKey: `usage:ai.output.generated:${ai.id}` } });
    expect((ev as Record<string, unknown>).amount).toBeUndefined();
    expect((ev as Record<string, unknown>).price).toBeUndefined();
    expect((ev as Record<string, unknown>).currency).toBeUndefined();
  });
});
