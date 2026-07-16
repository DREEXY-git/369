import { test, expect } from '@playwright/test';
import { prisma } from '@hokko/db';
import { makeIdempotencyKey, makeLegacyIdempotencyKey } from '@hokko/shared';
import { emitDomainEvent } from '../../lib/events';

// Codex PR#57 R5 #1（upgrade regression）の実 PostgreSQL 証拠。
// canonical key 導入前（main の FNV-1a 32bit 形式）で保存された DomainEvent/Outbox に対し、
// デプロイ後に同一論理 identity を retry/re-emit しても二重 DomainEvent/Outbox を作らないこと
// （dual-read 収束）と、legacy key の FNV 衝突（別 identity）を同一 request と混同しないことを実測する。
// DomainEvent.tenantId はスカラ（Tenant への relation なし）のため、fixture 専用 tenantId を用いる。
// 外部送信・Webhook 配送は発生しない（Outbox 行の作成/参照のみ）。

// Codex R4/R5 の衝突 fixture は tenantId='tenant-evidence' で FNV が衝突する。同 tenant を fixture 専用に使う。
const T = 'tenant-evidence';

async function cleanupTenantEvents() {
  await prisma.outboxMessage.deleteMany({ where: { tenantId: T } });
  await prisma.domainEvent.deleteMany({ where: { tenantId: T } });
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('upgrade互換: legacy FNV key で保存済みの同一論理イベントへ dual-read で収束し、二重 DomainEvent/Outbox を作らない（Codex R5 #1）', async () => {
  const identity = { tenantId: T, eventType: 'CUSTOMER_CREATED' as const, aggregateId: `agg-upgrade-${process.pid}-${Date.now()}`, dedupe: 'upgrade-fixture' };
  const legacyKey = makeLegacyIdempotencyKey(identity);
  expect(legacyKey, 'legacy key は FNV 32bit 形式').toMatch(/^CUSTOMER_CREATED:[0-9a-f]{8}$/);
  expect(legacyKey).not.toBe(makeIdempotencyKey(identity));
  try {
    // main 形式（FNV key）の既存 DomainEvent + Outbox を seed（デプロイ前に保存された行を再現）。
    const legacyEv = await prisma.domainEvent.create({
      data: { tenantId: T, eventType: identity.eventType, aggregateType: 'Customer', aggregateId: identity.aggregateId, actorType: 'user', idempotencyKey: legacyKey, status: 'pending' },
    });
    await prisma.outboxMessage.create({ data: { tenantId: T, eventId: legacyEv.id, eventType: identity.eventType, status: 'pending' } });

    // 現行 emitDomainEvent を**同一論理 identity**で呼ぶ（デプロイ後の retry/re-emit を再現）。
    const r = await emitDomainEvent({ ...identity, aggregateType: 'Customer' });
    expect(r.duplicated, '既存 legacy 行へ収束（新規作成しない）').toBe(true);
    expect(r.eventId, '同一 eventId へ収束').toBe(legacyEv.id);
    expect(await prisma.domainEvent.count({ where: { tenantId: T, aggregateId: identity.aggregateId } }), 'DomainEvent は 1 件のまま').toBe(1);
    expect(await prisma.outboxMessage.count({ where: { tenantId: T, eventId: legacyEv.id } }), 'Outbox は 1 件のまま（再配送対象の増加なし）').toBe(1);

    // 再送（2回目）も同様に収束（冪等）。
    const r2 = await emitDomainEvent({ ...identity, aggregateType: 'Customer' });
    expect(r2.duplicated).toBe(true);
    expect(r2.eventId).toBe(legacyEv.id);
    expect(await prisma.domainEvent.count({ where: { tenantId: T, aggregateId: identity.aggregateId } })).toBe(1);
  } finally {
    await cleanupTenantEvents();
  }
});

test('legacy collision を同一 identity と混同しない: FNV 衝突する別 aggregate は legacy 行へ収束せず、独立に 1 件ずつ成立（Codex R5 #1）', async () => {
  // Codex 提示の決定論的衝突 fixture: 同一 tenant/type/dedupe で aggregate だけ異なる A/B は
  // legacy FNV key が同一値になる。identity としては別物なので、B を A の行へ収束させてはならない。
  const A = { tenantId: T, eventType: 'RECEIVABLE_COLLECTED' as const, aggregateId: 'cq9iaml5de11dumtx4u1esvz6', dedupe: 'receivable-collected' };
  const B = { ...A, aggregateId: 'cvo49ccci03xjt8an4vyr0u9p' };
  expect(makeLegacyIdempotencyKey(A), '前提: legacy key は A/B で衝突する').toBe(makeLegacyIdempotencyKey(B));
  try {
    // A の legacy 行（FNV key）を seed。
    const legacyEvA = await prisma.domainEvent.create({
      data: { tenantId: T, eventType: A.eventType, aggregateType: 'Invoice', aggregateId: A.aggregateId, actorType: 'user', idempotencyKey: makeLegacyIdempotencyKey(A), status: 'pending' },
    });
    await prisma.outboxMessage.create({ data: { tenantId: T, eventId: legacyEvA.id, eventType: A.eventType, status: 'pending' } });

    // B（別 identity・legacy key は A と衝突）→ dual-read は aggregateId 列不一致で A へ収束せず、新 canonical 行を作る。
    const rb = await emitDomainEvent({ ...B, aggregateType: 'Invoice' });
    expect(rb.duplicated, 'B は別 identity なので収束しない').toBe(false);
    expect(rb.eventId).not.toBe(legacyEvA.id);
    expect(await prisma.domainEvent.count({ where: { tenantId: T, aggregateId: B.aggregateId } }), 'B の DomainEvent 1 件').toBe(1);

    // A（同一 identity）→ legacy 行へ収束（duplicated・同一 eventId）。
    const ra = await emitDomainEvent({ ...A, aggregateType: 'Invoice' });
    expect(ra.duplicated, 'A は legacy 行へ収束').toBe(true);
    expect(ra.eventId).toBe(legacyEvA.id);

    // 「異なる invoice は独立して 1 件ずつ」: A=1（legacy）・B=1（canonical）・計 2。
    expect(await prisma.domainEvent.count({ where: { tenantId: T, aggregateId: A.aggregateId } }), 'A の DomainEvent 1 件').toBe(1);
    expect(await prisma.domainEvent.count({ where: { tenantId: T, eventType: 'RECEIVABLE_COLLECTED' } }), 'A/B 合計 2 件（潰し合わない）').toBe(2);
  } finally {
    await cleanupTenantEvents();
  }
});

test('同一aggregate・異なるdedupeのFNV衝突を同一identityと混同しない: コンテンツfingerprintで棄却し、Bは別行・exact retryのみ各行へ収束（Codex R6 #1）', async () => {
  // Codex R6 提示の決定論的衝突 fixture: 同一 tenant/type/aggregate で dedupe だけ異なる A/B は
  // legacy FNV key が同一値（CUSTOMER_CREATED:1c68e52b）になる。列照合（tenant/type/aggregate）だけでは
  // 区別できないため、保存行の payload/metadata/actor の無損失 fingerprint 照合で B を棄却する。
  const AGG = `agg-same`;
  const A = { tenantId: T, eventType: 'CUSTOMER_CREATED' as const, aggregateId: AGG, dedupe: 'd42vu' };
  const B = { ...A, dedupe: 'dfuea' };
  expect(makeLegacyIdempotencyKey(A), '前提: legacy key は A/B（dedupe違い）で衝突する').toBe(makeLegacyIdempotencyKey(B));
  expect(makeLegacyIdempotencyKey(A)).toBe('CUSTOMER_CREATED:1c68e52b');
  const payloadA = { source: 'legacy-A', customerId: 'cust-A' };
  const payloadB = { source: 'emit-B', customerId: 'cust-B' };
  try {
    // A の legacy 行（FNV key・Aのpayload）＋ Outbox を seed（デプロイ前に保存された行を再現）。
    const legacyEvA = await prisma.domainEvent.create({
      data: { tenantId: T, eventType: A.eventType, aggregateType: 'Customer', aggregateId: AGG, actorType: 'user', payload: payloadA, idempotencyKey: makeLegacyIdempotencyKey(A), status: 'pending' },
    });
    await prisma.outboxMessage.create({ data: { tenantId: T, eventId: legacyEvA.id, eventType: A.eventType, payload: payloadA, status: 'pending' } });

    // B（別 identity・legacy key は A と衝突・列は全一致）→ fingerprint 不一致で A へ収束せず、
    // **別の** DomainEvent + Outbox を新規作成する（イベントを静かに失わない）。
    const rb = await emitDomainEvent({ ...B, aggregateType: 'Customer', payload: payloadB });
    expect(rb.duplicated, 'B は別 identity なので legacy 行へ収束しない').toBe(false);
    expect(rb.eventId).not.toBe(legacyEvA.id);
    expect(await prisma.domainEvent.count({ where: { tenantId: T, aggregateId: AGG } }), 'A(legacy) + B(canonical) の 2 件').toBe(2);
    expect(await prisma.outboxMessage.count({ where: { tenantId: T, eventId: rb.eventId } }), 'B 自身の Outbox が作られる').toBe(1);
    expect(await prisma.outboxMessage.count({ where: { tenantId: T, eventId: legacyEvA.id } }), 'A の Outbox は増えない').toBe(1);

    // A の exact retry（同一入力の再送）→ legacy 行へ収束（duplicated・同一 eventId・行数不変）。
    const ra = await emitDomainEvent({ ...A, aggregateType: 'Customer', payload: payloadA });
    expect(ra.duplicated, 'A の exact retry は legacy 行へ収束').toBe(true);
    expect(ra.eventId).toBe(legacyEvA.id);

    // B の exact retry → B 自身の canonical 行へ収束（A の行と潰し合わない）。
    const rb2 = await emitDomainEvent({ ...B, aggregateType: 'Customer', payload: payloadB });
    expect(rb2.duplicated, 'B の exact retry は B の canonical 行へ収束').toBe(true);
    expect(rb2.eventId).toBe(rb.eventId);
    expect(await prisma.domainEvent.count({ where: { tenantId: T, aggregateId: AGG } }), '最終 2 件（A/B 各 1）').toBe(2);
  } finally {
    await cleanupTenantEvents();
  }
});
