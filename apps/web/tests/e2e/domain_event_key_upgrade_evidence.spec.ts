import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { prisma } from '@hokko/db';
import { makeIdempotencyKey, makeCanonicalIdempotencyKey, readIdemMetadata } from '@hokko/shared';
import { emitDomainEvent } from '../../lib/events';

// Phase A（WIP-PADN-PHASEA-001 → 修正版 Phase A2 改訂）: canonical/legacy dual-reader の実 PostgreSQL 証拠。
// PR #57（改訂）が writer を canonical key へ切替えた後に main へ rollback した環境を再現し、
//  (a) legacy 行が既存のとき、同一論理イベントの emit 再実行で DomainEvent/Outbox 増分 0（従来挙動の不変）
//  (b) canonical key の行が既存のとき、legacy writer の emit でも増分 0（rollback 二重化防止＝本命 oracle）。
//      修正版 Phase A2: fixture を PR #57 **実経路準拠（非空 dedupe=paymentKey）**へ差替え（旧 spec の
//      dedupe 空 fixture は PA-BLK-1 の指摘どおり本質を外していた）。dedupe 相違の canonical 行へ
//      誤収束しないことも oracle 化。
//  (c) 無関係イベントは正常に新規作成される（肯定対照・過剰 dedupe でイベントを失わない）
// を実測する。writer は legacy のまま（新規行の idempotencyKey が FNV 形式・payload.idem 保存も assert）。
// 外部送信・Webhook 配送は発生しない（DomainEvent/OutboxMessage 行の作成/参照のみ）。
// retries=0（playwright.config.ts 全体設定）・cleanup は本テストが作成した行の ID に限定。

const T = 'tenant-padn-phasea-evidence';

// テスト環境境界: 接続前に DATABASE_URL の host が localhost/127.0.0.1 であることを機械確認。
function assertLocalDatabaseUrl(): void {
  let host = '';
  try {
    host = new URL(process.env.DATABASE_URL ?? '').hostname;
  } catch {
    host = '';
  }
  if (host !== 'localhost' && host !== '127.0.0.1') {
    throw new Error(
      `TEST_ENVIRONMENT_APPROVAL_REQUIRED: DATABASE_URL host="${host}" はローカル/CI と機械確認できません`,
    );
  }
}

test.beforeAll(() => {
  assertLocalDatabaseUrl();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

/** 作成 ID 限定 cleanup（tenant 全消しをしない）。 */
async function cleanupByEventIds(eventIds: string[]): Promise<void> {
  if (eventIds.length === 0) return;
  await prisma.outboxMessage.deleteMany({ where: { tenantId: T, eventId: { in: eventIds } } });
  await prisma.domainEvent.deleteMany({ where: { tenantId: T, id: { in: eventIds } } });
}

test('(a) legacy 行が既存: 同一論理イベントの emit 再実行は既存行へ収束し DomainEvent/Outbox 増分 0', async () => {
  const identity = {
    tenantId: T,
    eventType: 'CUSTOMER_CREATED' as const,
    aggregateId: `agg-legacy-${process.pid}-${Date.now()}`,
  };
  const legacyKey = makeIdempotencyKey(identity);
  expect(legacyKey, 'legacy key は FNV 32bit 形式').toMatch(/^CUSTOMER_CREATED:[0-9a-f]{8}$/);
  const created: string[] = [];
  try {
    // 従来 main（legacy writer）で保存された既存行を fixture として作成。
    const legacyEv = await prisma.domainEvent.create({
      data: {
        tenantId: T,
        eventType: identity.eventType,
        aggregateType: 'Customer',
        aggregateId: identity.aggregateId,
        actorType: 'user',
        idempotencyKey: legacyKey,
        status: 'pending',
      },
    });
    created.push(legacyEv.id);
    await prisma.outboxMessage.create({
      data: { tenantId: T, eventId: legacyEv.id, eventType: identity.eventType, status: 'pending' },
    });

    // 同一論理イベントの retry/re-emit（2 回）→ どちらも既存行へ収束・増分 0。
    for (let i = 0; i < 2; i++) {
      const r = await emitDomainEvent({ ...identity, aggregateType: 'Customer' });
      if (!created.includes(r.eventId)) created.push(r.eventId);
      expect(r.duplicated, `${i + 1}回目の再 emit は既存 legacy 行へ収束`).toBe(true);
      expect(r.eventId, '同一 eventId へ収束').toBe(legacyEv.id);
    }
    expect(
      await prisma.domainEvent.count({ where: { tenantId: T, aggregateId: identity.aggregateId } }),
      'DomainEvent は 1 件のまま（増分 0）',
    ).toBe(1);
    expect(
      await prisma.outboxMessage.count({ where: { tenantId: T, eventId: legacyEv.id } }),
      'Outbox は 1 件のまま（再配送対象の増加なし）',
    ).toBe(1);
  } finally {
    await cleanupByEventIds(created);
  }
});

test('(b) 本命 oracle: 非空 dedupe の canonical 行（改訂 PR#57 実経路 → rollback 環境）でも legacy writer の emit で増分 0・dedupe 相違行へは誤収束しない', async () => {
  // PR #57 実経路準拠: PAYMENT_RECEIVED の dedupe は入金 request の paymentKey（非空）。
  const paymentKey = `c${randomUUID().replace(/-/g, '').slice(0, 24)}`;
  const otherKey = `c${randomUUID().replace(/-/g, '').slice(0, 24)}`;
  const identity = {
    tenantId: T,
    eventType: 'PAYMENT_RECEIVED' as const,
    aggregateId: `agg-canonical-${process.pid}-${Date.now()}`,
    dedupe: paymentKey,
  };
  const canonicalKey = makeCanonicalIdempotencyKey(identity);
  expect(canonicalKey, 'canonical key は PR#57 書式（4 セグメント・非空 dedupe）').toBe(
    `PAYMENT_RECEIVED:${encodeURIComponent(T)}:${encodeURIComponent(identity.aggregateId)}:${encodeURIComponent(paymentKey)}`,
  );
  expect(canonicalKey).not.toBe(makeIdempotencyKey(identity));
  const created: string[] = [];
  try {
    // 改訂 PR #57（canonical writer・payload.idem 保存）で保存された行を fixture として**直接 DB に作成**。
    const canonicalEv = await prisma.domainEvent.create({
      data: {
        tenantId: T,
        eventType: identity.eventType,
        aggregateType: 'Invoice',
        aggregateId: identity.aggregateId,
        actorType: 'user',
        payload: { idem: { aggregateType: 'Invoice', aggregateId: identity.aggregateId, dedupe: paymentKey, enc: 'canonical', v: 1 } },
        idempotencyKey: canonicalKey,
        status: 'pending',
      },
    });
    created.push(canonicalEv.id);
    await prisma.outboxMessage.create({
      data: { tenantId: T, eventId: canonicalEv.id, eventType: identity.eventType, status: 'pending' },
    });

    // rollback 後の main（legacy writer）が同一論理イベント（同一 dedupe）を emit → dual-read が
    // canonical 行を認識し、二重 DomainEvent/Outbox/Webhook を作らない（blocker B2 の封鎖）。
    for (let i = 0; i < 2; i++) {
      const r = await emitDomainEvent({ ...identity, aggregateType: 'Invoice' });
      if (!created.includes(r.eventId)) created.push(r.eventId);
      expect(r.duplicated, `${i + 1}回目の emit は canonical 行へ収束（dual-read）`).toBe(true);
      expect(r.eventId, '同一 eventId へ収束').toBe(canonicalEv.id);
    }
    expect(
      await prisma.domainEvent.count({ where: { tenantId: T, aggregateId: identity.aggregateId } }),
      'DomainEvent は canonical 行 1 件のまま（増分 0）',
    ).toBe(1);
    expect(
      await prisma.outboxMessage.count({ where: { tenantId: T, eventId: canonicalEv.id } }),
      'Outbox は 1 件のまま（増分 0）',
    ).toBe(1);
    // 行の key が書き換えられていない（reader は既存行に触らない）。
    const row = await prisma.domainEvent.findUnique({
      where: { id: canonicalEv.id },
      select: { idempotencyKey: true },
    });
    expect(row!.idempotencyKey, '既存 canonical 行の key は不変').toBe(canonicalKey);

    // 陰性対照: dedupe 相違（別 payment request）の emit は既存 canonical 行へ**誤収束せず**新規作成される。
    const other = await emitDomainEvent({ ...identity, aggregateType: 'Invoice', dedupe: otherKey });
    created.push(other.eventId);
    expect(other.duplicated, '別 dedupe は別 identity（イベントを失わない）').toBe(false);
    expect(other.eventId).not.toBe(canonicalEv.id);
    expect(
      await prisma.domainEvent.count({ where: { tenantId: T, aggregateId: identity.aggregateId } }),
      '同一 aggregate に request 単位で 2 件目が立つ',
    ).toBe(2);
  } finally {
    await cleanupByEventIds(created);
  }
});

test('(c) 肯定対照: 無関係イベントは dual-read に阻害されず正常に新規作成され、保存 key は legacy 形式のまま', async () => {
  const stamp = `${process.pid}-${Date.now()}`;
  const occupied = {
    tenantId: T,
    eventType: 'DEAL_CREATED' as const,
    aggregateId: `agg-occupied-${stamp}`,
  };
  const fresh = { ...occupied, aggregateId: `agg-fresh-${stamp}` };
  const created: string[] = [];
  try {
    // 近傍に canonical 行が存在する状況を作る（無関係 key が誤爆しないことの対照）。
    const canonicalEv = await prisma.domainEvent.create({
      data: {
        tenantId: T,
        eventType: occupied.eventType,
        aggregateType: 'Deal',
        aggregateId: occupied.aggregateId,
        actorType: 'user',
        idempotencyKey: makeCanonicalIdempotencyKey(occupied),
        status: 'pending',
      },
    });
    created.push(canonicalEv.id);

    // 別 aggregate の新規イベント → duplicated=false で新規作成される（イベントを失わない）。
    const r = await emitDomainEvent({ ...fresh, aggregateType: 'Deal' });
    created.push(r.eventId);
    expect(r.duplicated, '無関係イベントは新規作成される').toBe(false);
    expect(r.eventId).not.toBe(canonicalEv.id);
    expect(
      await prisma.domainEvent.count({ where: { tenantId: T, aggregateId: fresh.aggregateId } }),
      '新規 DomainEvent 1 件',
    ).toBe(1);
    expect(
      await prisma.outboxMessage.count({ where: { tenantId: T, eventId: r.eventId } }),
      '新規 Outbox 1 件',
    ).toBe(1);

    // writer 不変の証拠: 新規行の保存 key は legacy FNV 形式（canonical ではない）。
    const row = await prisma.domainEvent.findUnique({
      where: { id: r.eventId },
      select: { idempotencyKey: true, payload: true },
    });
    expect(row!.idempotencyKey, '保存 key は legacy FNV 形式のまま').toBe(makeIdempotencyKey(fresh));
    expect(row!.idempotencyKey).toMatch(/^DEAL_CREATED:[0-9a-f]{8}$/);
    // 修正版 Phase A2: writer は payload.idem に identity を無損失保存する（ID-2・legacy 照合の決定化）。
    expect(readIdemMetadata(row!.payload), '新規行は payload.idem を持つ（dedupe なし emit は空文字）').toEqual({ dedupe: '' });
  } finally {
    await cleanupByEventIds(created);
  }
});
