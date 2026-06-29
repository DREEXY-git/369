// Phase 1-36 統合テスト（要DB）: worker-safe な非課金 UsageEvent recorder（recordUsageEventCore）を DB レベルで検証。
// 実関数（packages/db/src/usage.ts）を直接叩く。apps/web には依存しない。実メール送信・Webhook 実送信・worker 実行はしない。
// 重要:
// - runtime billing は usage_only のみ。billable_candidate / never_billable は runtime で使わない（invalid billing は usage_only に丸める検証のみ）。
// - metadata は非PIIのみ。url/secret/signature/payload/本文/金額/実ID を入れない（forbidden_metadata_key ガードを検証）。
// - 顧客名・メール・本文・金額・secret 実値は使わない。
import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '../client';
import { recordUsageEventCore } from '../usage';

const T1 = `itest-p136-${Date.now()}-a`;
const T2 = `itest-p136-${Date.now()}-b`;

afterAll(async () => {
  await prisma.usageEvent.deleteMany({ where: { tenantId: { in: [T1, T2] } } });
});

describe('Phase 1-36 worker-safe UsageEvent recorder（recordUsageEventCore）', () => {
  it('usage_only の UsageEvent を作成でき、payload が仕様どおり保存される', async () => {
    const res = await recordUsageEventCore({
      tenantId: T1,
      actorId: 'user-1',
      actorType: 'user',
      eventType: 'test.core.basic',
      category: 'job',
      billing: 'usage_only',
      unit: 'count',
      quantity: 1,
      sourceType: 'TestSource',
      sourceId: 'src-basic',
      idempotencyKey: 'usage:test.core.basic:src-basic',
      metadata: { kind: 'test', status: 'ok' },
    });
    expect(res.ok).toBe(true);
    expect(res.created).toBe(true);

    const ev = await prisma.usageEvent.findFirst({
      where: { tenantId: T1, idempotencyKey: 'usage:test.core.basic:src-basic' },
    });
    expect(ev).not.toBeNull();
    expect(ev!.eventType).toBe('test.core.basic');
    expect(ev!.category).toBe('job');
    expect(ev!.billing).toBe('usage_only');
    expect(ev!.unit).toBe('count');
    expect(ev!.quantity.toString()).toBe('1');
    expect(ev!.sourceType).toBe('TestSource');
    expect(ev!.sourceId).toBe('src-basic');
    expect(ev!.metadata).toEqual({ kind: 'test', status: 'ok' });
  });

  it('actorType=system / actorId=null でも作成できる（worker 経路想定）', async () => {
    const res = await recordUsageEventCore({
      tenantId: T1,
      actorId: null,
      actorType: 'system',
      eventType: 'test.core.system',
      category: 'job',
      idempotencyKey: 'usage:test.core.system:src-system',
      sourceType: 'JobRun',
      sourceId: 'job-1',
      metadata: { jobType: 'TEST_JOB' },
    });
    expect(res.ok).toBe(true);
    expect(res.created).toBe(true);

    const ev = await prisma.usageEvent.findFirst({
      where: { tenantId: T1, idempotencyKey: 'usage:test.core.system:src-system' },
    });
    expect(ev).not.toBeNull();
    expect(ev!.actorType).toBe('system');
    expect(ev!.actorId).toBeNull();
    expect(ev!.billing).toBe('usage_only'); // 既定 billing は usage_only
  });

  it('forbidden metadata key がある場合は ok:false / reason=forbidden_metadata_key で作成されない', async () => {
    const res = await recordUsageEventCore({
      tenantId: T1,
      eventType: 'test.core.forbidden',
      category: 'webhook',
      idempotencyKey: 'usage:test.core.forbidden:src-forbidden',
      // url / secret / payload は禁止 top-level key
      metadata: { url: 'x', secret: 'y', payload: 'z' },
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('forbidden_metadata_key');

    const ev = await prisma.usageEvent.findFirst({
      where: { tenantId: T1, idempotencyKey: 'usage:test.core.forbidden:src-forbidden' },
    });
    expect(ev).toBeNull(); // DB に作成されていない
  });

  it('金額系 metadata key（amount/price/currency/total）も forbidden として弾く', async () => {
    for (const [i, key] of ['amount', 'price', 'currency', 'total'].entries()) {
      const res = await recordUsageEventCore({
        tenantId: T1,
        eventType: 'test.core.money',
        category: 'webhook',
        idempotencyKey: `usage:test.core.money:${i}`,
        metadata: { [key]: 1000 },
      });
      expect(res.ok).toBe(false);
      expect(res.reason).toBe('forbidden_metadata_key');
    }
    const count = await prisma.usageEvent.count({
      where: { tenantId: T1, eventType: 'test.core.money' },
    });
    expect(count).toBe(0); // 金額キーは1件も作成されない
  });

  it('missing required field は ok:false / reason=missing_required_field', async () => {
    const res = await recordUsageEventCore({
      tenantId: '',
      eventType: 'test.core.missing',
      category: 'job',
      idempotencyKey: 'usage:test.core.missing:1',
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('missing_required_field');
  });

  it('同一 tenantId + idempotencyKey は duplicate 扱い（二重計上しない）', async () => {
    const input = {
      tenantId: T1,
      eventType: 'test.core.dup',
      category: 'job',
      idempotencyKey: 'usage:test.core.dup:src-dup',
      sourceType: 'TestSource',
      sourceId: 'src-dup',
    } as const;
    const first = await recordUsageEventCore({ ...input });
    expect(first.ok).toBe(true);
    expect(first.created).toBe(true);

    const second = await recordUsageEventCore({ ...input });
    expect(second.ok).toBe(true);
    expect(second.created).toBe(false);
    expect(second.duplicate).toBe(true);

    const count = await prisma.usageEvent.count({
      where: { tenantId: T1, idempotencyKey: 'usage:test.core.dup:src-dup' },
    });
    expect(count).toBe(1); // 二重作成されない
  });

  it('別 tenant なら同じ idempotencyKey でも作成可能', async () => {
    const key = 'usage:test.core.shared:src-shared';
    const a = await recordUsageEventCore({ tenantId: T1, eventType: 'test.core.shared', category: 'job', idempotencyKey: key });
    const b = await recordUsageEventCore({ tenantId: T2, eventType: 'test.core.shared', category: 'job', idempotencyKey: key });
    expect(a.ok).toBe(true);
    expect(a.created).toBe(true);
    expect(b.ok).toBe(true);
    expect(b.created).toBe(true);

    const evA = await prisma.usageEvent.findFirst({ where: { tenantId: T1, idempotencyKey: key } });
    const evB = await prisma.usageEvent.findFirst({ where: { tenantId: T2, idempotencyKey: key } });
    expect(evA!.id).not.toBe(evB!.id);
    expect(evA!.idempotencyKey).toBe(evB!.idempotencyKey);
  });

  it('invalid billing は usage_only に丸める', async () => {
    const res = await recordUsageEventCore({
      tenantId: T1,
      eventType: 'test.core.billing',
      category: 'job',
      billing: 'something_else',
      idempotencyKey: 'usage:test.core.billing:src-billing',
    });
    expect(res.ok).toBe(true);
    const ev = await prisma.usageEvent.findFirst({
      where: { tenantId: T1, idempotencyKey: 'usage:test.core.billing:src-billing' },
    });
    expect(ev!.billing).toBe('usage_only');
    expect(ev!.billing).not.toBe('something_else');
  });

  it('UsageEvent モデルに金額カラム（amount/price/currency）が存在しない', async () => {
    const ev = await prisma.usageEvent.create({
      data: {
        tenantId: T1,
        eventType: 'test.core.nomoney',
        category: 'job',
        idempotencyKey: 'usage:test.core.nomoney:1',
      },
    });
    expect((ev as Record<string, unknown>).amount).toBeUndefined();
    expect((ev as Record<string, unknown>).price).toBeUndefined();
    expect((ev as Record<string, unknown>).currency).toBeUndefined();
  });
});
