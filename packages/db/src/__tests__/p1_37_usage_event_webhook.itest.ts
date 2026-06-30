// Phase 1-37 統合テスト（要DB）: Webhook 配送 success のみ非課金 UsageEvent（webhook.delivered）を記録することを検証。
// processOutboxBatch を実DBで動かすが、外部HTTPは vi.stubGlobal('fetch') で mock し、実Webhook送信はしない。
// worker は起動しない。本番 outbox dispatch も実行しない。
// 重要:
// - success のときだけ emit。failed / dead / retry失敗 は emit しない。
// - idempotencyKey=usage:webhook.delivered:<eventId>:<subscriptionId> で retry の二重計上を構造防止（最終成功1回）。
// - metadata は { eventType } のみ。url/secret/signature/payload/statusCode/error/eventId/subscriptionId/金額/実ID を入れない。
import { describe, it, expect, afterEach, afterAll, vi } from 'vitest';
import { prisma } from '../client';
import { processOutboxBatch } from '../outbox';

const RUN = `itest-p137-${Date.now()}`;
const tenants: string[] = [];

function tenantId(suffix: string): string {
  const t = `${RUN}-${suffix}`;
  if (!tenants.includes(t)) tenants.push(t);
  return t;
}

// fetch を mock。url ごとに success/failure を切替（実HTTPは飛ばさない）。
function stubFetch(okFor: (url: string) => boolean) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: unknown) => {
      const ok = okFor(String(url));
      return { ok, status: ok ? 200 : 500 } as unknown as Response;
    }),
  );
}

async function seedSubscription(t: string, eventType: string, url: string) {
  return prisma.webhookSubscription.create({
    data: { tenantId: t, eventType, url, secret: 'dummy-secret-not-real', active: true },
  });
}

async function seedMessage(t: string, eventId: string, eventType: string, attempts = 0) {
  return prisma.outboxMessage.create({
    data: {
      tenantId: t,
      eventId,
      eventType,
      payload: { hello: 'world' },
      status: attempts > 0 ? 'failed' : 'pending',
      attempts,
      nextAttemptAt: new Date(Date.now() - 1000),
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(async () => {
  await prisma.usageEvent.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.webhookDelivery.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.webhookSubscription.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.outboxMessage.deleteMany({ where: { tenantId: { in: tenants } } });
});

describe('Phase 1-37 Webhook success 非課金 UsageEvent emit（webhook.delivered）', () => {
  it('Webhook delivery success のとき webhook.delivered を1件作成し payload が仕様どおり', async () => {
    const t = tenantId('ok');
    const sub = await seedSubscription(t, 'QUOTE_APPROVED', 'https://example.test/ok');
    await seedMessage(t, 'evt-ok-1', 'QUOTE_APPROVED');
    stubFetch(() => true);

    await processOutboxBatch({ limit: 50 });

    const key = `usage:webhook.delivered:evt-ok-1:${sub.id}`;
    const ev = await prisma.usageEvent.findFirst({ where: { tenantId: t, idempotencyKey: key } });
    expect(ev).not.toBeNull();
    expect(ev!.eventType).toBe('webhook.delivered');
    expect(ev!.category).toBe('webhook');
    expect(ev!.billing).toBe('usage_only');
    expect(ev!.unit).toBe('count');
    expect(ev!.quantity.toString()).toBe('1');
    expect(ev!.actorType).toBe('system');
    expect(ev!.actorId).toBeNull();
    expect(ev!.sourceType).toBe('WebhookDelivery');
    // sourceId は WebhookDelivery.id（生成された配送行のid）
    const delivery = await prisma.webhookDelivery.findFirst({
      where: { tenantId: t, eventId: 'evt-ok-1', subscriptionId: sub.id, status: 'success' },
    });
    expect(delivery).not.toBeNull();
    expect(ev!.sourceId).toBe(delivery!.id);
  });

  it('metadata は { eventType } のみ（url/secret/signature/payload/statusCode/error/各種ID/金額を含まない）', async () => {
    const t = tenantId('meta');
    const sub = await seedSubscription(t, 'INVOICE_ISSUED', 'https://example.test/meta');
    await seedMessage(t, 'evt-meta-1', 'INVOICE_ISSUED');
    stubFetch(() => true);

    await processOutboxBatch({ limit: 50 });

    const key = `usage:webhook.delivered:evt-meta-1:${sub.id}`;
    const ev = await prisma.usageEvent.findFirst({ where: { tenantId: t, idempotencyKey: key } });
    expect(ev).not.toBeNull();
    const meta = (ev!.metadata ?? {}) as Record<string, unknown>;
    expect(Object.keys(meta).sort()).toEqual(['eventType']);
    expect(meta.eventType).toBe('INVOICE_ISSUED');
    for (const forbidden of [
      'url', 'secret', 'signature', 'payload', 'body', 'statusCode', 'error',
      'eventId', 'subscriptionId', 'amount', 'price', 'currency', 'total', 'token',
    ]) {
      expect(meta).not.toHaveProperty(forbidden);
    }
  });

  it('failed delivery では emit しない', async () => {
    const t = tenantId('failed');
    await seedSubscription(t, 'QUOTE_APPROVED', 'https://example.test/fail');
    await seedMessage(t, 'evt-fail-1', 'QUOTE_APPROVED');
    stubFetch(() => false); // 全て失敗

    await processOutboxBatch({ limit: 50 });

    const count = await prisma.usageEvent.count({ where: { tenantId: t, eventType: 'webhook.delivered' } });
    expect(count).toBe(0);
    // 配送行は failed として作られる（既存挙動）
    const failedDelivery = await prisma.webhookDelivery.count({ where: { tenantId: t, status: 'failed' } });
    expect(failedDelivery).toBeGreaterThanOrEqual(1);
  });

  it('dead 相当（リトライ上限超過で失敗）でも emit しない', async () => {
    const t = tenantId('dead');
    await seedSubscription(t, 'QUOTE_APPROVED', 'https://example.test/dead');
    await seedMessage(t, 'evt-dead-1', 'QUOTE_APPROVED', 5); // attempts=5 → 次の失敗で attempts=6>=MAX(6)=dead
    stubFetch(() => false);

    await processOutboxBatch({ limit: 50 });

    const deadMsg = await prisma.outboxMessage.findFirst({ where: { tenantId: t, eventId: 'evt-dead-1' } });
    expect(deadMsg!.status).toBe('dead');
    const count = await prisma.usageEvent.count({ where: { tenantId: t, eventType: 'webhook.delivered' } });
    expect(count).toBe(0);
  });

  it('retry: 部分失敗で再試行され、同じ宛先に再度 success が起きても二重計上しない（最終成功1回）', async () => {
    const t = tenantId('retry');
    const subOk = await seedSubscription(t, 'QUOTE_APPROVED', 'https://example.test/retry-ok');
    await seedSubscription(t, 'QUOTE_APPROVED', 'https://example.test/retry-fail');
    const msg = await seedMessage(t, 'evt-retry-1', 'QUOTE_APPROVED');
    // retry-ok は成功、retry-fail は失敗（→ allOk=false → message は failed として再試行対象に戻る）
    stubFetch((url) => url.includes('/retry-ok'));

    // 1回目: subOk 成功（UsageEvent 1件）、subFail 失敗 → message failed
    await processOutboxBatch({ limit: 50 });
    // message を再試行可能に戻す（nextAttemptAt を過去へ）
    await prisma.outboxMessage.update({
      where: { id: msg.id },
      data: { status: 'failed', nextAttemptAt: new Date(Date.now() - 1000) },
    });
    // 2回目: subOk は再び成功するが idempotencyKey が同一なので二重計上されない
    await processOutboxBatch({ limit: 50 });

    const key = `usage:webhook.delivered:evt-retry-1:${subOk.id}`;
    const count = await prisma.usageEvent.count({ where: { tenantId: t, idempotencyKey: key } });
    expect(count).toBe(1); // 最終成功1回だけ
    // 配送主処理は壊れていない: subOk への success 配送行は2回作られている（duplicate でも配送は継続）
    const okDeliveries = await prisma.webhookDelivery.count({
      where: { tenantId: t, subscriptionId: subOk.id, status: 'success' },
    });
    expect(okDeliveries).toBeGreaterThanOrEqual(2);
  });

  it('別 tenant の成功配送はそれぞれ独立して記録される', async () => {
    const tA = tenantId('multiA');
    const tB = tenantId('multiB');
    const subA = await seedSubscription(tA, 'QUOTE_APPROVED', 'https://example.test/a');
    const subB = await seedSubscription(tB, 'QUOTE_APPROVED', 'https://example.test/b');
    await seedMessage(tA, 'evt-multi', 'QUOTE_APPROVED');
    await seedMessage(tB, 'evt-multi', 'QUOTE_APPROVED');
    stubFetch(() => true);

    await processOutboxBatch({ limit: 50 });

    const evA = await prisma.usageEvent.findFirst({
      where: { tenantId: tA, idempotencyKey: `usage:webhook.delivered:evt-multi:${subA.id}` },
    });
    const evB = await prisma.usageEvent.findFirst({
      where: { tenantId: tB, idempotencyKey: `usage:webhook.delivered:evt-multi:${subB.id}` },
    });
    expect(evA).not.toBeNull();
    expect(evB).not.toBeNull();
    expect(evA!.id).not.toBe(evB!.id);
    expect(evA!.tenantId).toBe(tA);
    expect(evB!.tenantId).toBe(tB);
  });
});
