// Phase 1-22 統合テスト（要DB）: UsageEvent モデル（非課金の利用量台帳）。
// このテストは DB model の入れ物のみを検証する。emit 関数・app code・shared 定数は作らない／触らない。
// 重要: UsageEvent.metadata に PII / 本文 / secret / 金額を入れない。テストデータも非PIIの例のみ
//        （顧客名・メール・プロンプト・生成文・金額・APIキー等を絶対に入れない）。
// 検証: 作成/必須フィールド保存/同一 tenant+idempotencyKey は重複不可/別 tenant は同 key 可/tenant分離/billing 3分類保存。
import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '../client';

const T1 = `itest-p122-${Date.now()}-a`;
const T2 = `itest-p122-${Date.now()}-b`;

afterAll(async () => {
  await prisma.usageEvent.deleteMany({ where: { tenantId: { in: [T1, T2] } } });
});

describe('Phase 1-22 UsageEvent（非課金の利用量台帳）', () => {
  it('UsageEvent を作成でき、各フィールドが保存される', async () => {
    const occurredAt = new Date(Date.now() - 60_000);
    const ev = await prisma.usageEvent.create({
      data: {
        tenantId: T1,
        actorId: 'user-1',
        actorType: 'user',
        eventType: 'ai.output.generated',
        category: 'ai',
        billing: 'billable_candidate',
        unit: 'token',
        quantity: '1234.5000',
        sourceType: 'ai_output',
        sourceId: 'src-1',
        idempotencyKey: 'k-create-1',
        occurredAt,
        // metadata は非PIIの集計補助のみ。本文・顧客情報・金額・secret は入れない。
        metadata: { model: 'fake', tokensBucket: '<2k' },
      },
    });

    expect(ev.id).toBeTruthy();
    expect(ev.tenantId).toBe(T1);
    expect(ev.actorId).toBe('user-1');
    expect(ev.actorType).toBe('user');
    expect(ev.eventType).toBe('ai.output.generated');
    expect(ev.category).toBe('ai');
    expect(ev.billing).toBe('billable_candidate');
    expect(ev.unit).toBe('token');
    expect(ev.quantity.toString()).toBe('1234.5');
    expect(ev.sourceType).toBe('ai_output');
    expect(ev.sourceId).toBe('src-1');
    expect(ev.idempotencyKey).toBe('k-create-1');
    expect(ev.occurredAt.getTime()).toBe(occurredAt.getTime());
    expect(ev.metadata).toEqual({ model: 'fake', tokensBucket: '<2k' });
    expect(ev.createdAt).toBeInstanceOf(Date);
    // 金額(amount/price/currency)は持たない＝モデルに存在しないことを型/実体で確認。
    expect((ev as Record<string, unknown>).amount).toBeUndefined();
    expect((ev as Record<string, unknown>).currency).toBeUndefined();
  });

  it('既定値（actorType=user / billing=usage_only / unit=count / quantity=0 / sourceType=""）が入る', async () => {
    const ev = await prisma.usageEvent.create({
      data: {
        tenantId: T1,
        eventType: 'job.run.completed',
        category: 'job',
        idempotencyKey: 'k-defaults-1',
      },
    });
    expect(ev.actorType).toBe('user');
    expect(ev.billing).toBe('usage_only');
    expect(ev.unit).toBe('count');
    expect(ev.quantity.toString()).toBe('0');
    expect(ev.sourceType).toBe('');
    expect(ev.actorId).toBeNull();
    expect(ev.metadata).toBeNull();
  });

  it('同一 tenantId + idempotencyKey は重複作成できない（二重計上防止）', async () => {
    await prisma.usageEvent.create({
      data: { tenantId: T1, eventType: 'export.generated', category: 'export', idempotencyKey: 'k-dup' },
    });
    await expect(
      prisma.usageEvent.create({
        data: { tenantId: T1, eventType: 'export.generated', category: 'export', idempotencyKey: 'k-dup' },
      }),
    ).rejects.toThrow();
  });

  it('別 tenant なら同じ idempotencyKey を使える', async () => {
    const a = await prisma.usageEvent.create({
      data: { tenantId: T1, eventType: 'export.generated', category: 'export', idempotencyKey: 'k-shared' },
    });
    const b = await prisma.usageEvent.create({
      data: { tenantId: T2, eventType: 'export.generated', category: 'export', idempotencyKey: 'k-shared' },
    });
    expect(a.id).not.toBe(b.id);
    expect(a.tenantId).toBe(T1);
    expect(b.tenantId).toBe(T2);
  });

  it('tenant 分離: tenant A の UsageEvent は tenant B クエリで見えない', async () => {
    await prisma.usageEvent.create({
      data: { tenantId: T1, eventType: 'storage.object.stored', category: 'storage', idempotencyKey: 'k-iso-a' },
    });
    const seenByB = await prisma.usageEvent.findMany({ where: { tenantId: T2, idempotencyKey: 'k-iso-a' } });
    expect(seenByB).toHaveLength(0);
    const seenByA = await prisma.usageEvent.findMany({ where: { tenantId: T1, idempotencyKey: 'k-iso-a' } });
    expect(seenByA).toHaveLength(1);
  });

  it('billing 3分類（usage_only / billable_candidate / never_billable）を保存できる', async () => {
    const classes = ['usage_only', 'billable_candidate', 'never_billable'] as const;
    for (const billing of classes) {
      const ev = await prisma.usageEvent.create({
        data: {
          tenantId: T2,
          eventType: 'ai.safety.checked',
          category: 'ai',
          billing,
          idempotencyKey: `k-billing-${billing}`,
        },
      });
      expect(ev.billing).toBe(billing);
    }
    const neverBillable = await prisma.usageEvent.findMany({ where: { tenantId: T2, billing: 'never_billable' } });
    expect(neverBillable.length).toBeGreaterThanOrEqual(1);
  });
});
