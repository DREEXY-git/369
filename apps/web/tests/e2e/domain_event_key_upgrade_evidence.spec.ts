import { test, expect } from '@playwright/test';
import { prisma } from '@hokko/db';
import { makeIdempotencyKey, makeLegacyIdempotencyKey } from '@hokko/shared';
import { emitDomainEvent } from '../../lib/events';

// Codex PR#57 R5/R6/R7 #1（upgrade regression / legacy 誤収束）の実 PostgreSQL 証拠。
// canonical key 導入前（main の FNV-1a 32bit 形式）で保存された DomainEvent/Outbox に対し、
//  - dedupe-less の同一 identity retry/re-emit は legacy 行へ収束し二重 DomainEvent/Outbox を作らない
//  - dedupe を持つ identity は legacy 行（監査事実: main は dedupe を一切書かない＝全 legacy 行の
//    identity は dedupe=''）と同一になり得ないため、キーが FNV 衝突しても**決して収束せず**、
//    自分の canonical 行＋Outbox を新規作成する（同一コンテンツでもイベントを失わない・Codex R7）
// を実測する。DomainEvent.tenantId はスカラ（Tenant への relation なし）のため fixture 専用 tenantId を用いる。
// 外部送信・Webhook 配送は発生しない（Outbox 行の作成/参照のみ）。

const T = 'tenant-evidence';

async function cleanupTenantEvents() {
  await prisma.outboxMessage.deleteMany({ where: { tenantId: T } });
  await prisma.domainEvent.deleteMany({ where: { tenantId: T } });
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('upgrade互換: dedupe-less の同一論理イベントは legacy 行へ dual-read 収束し、二重 DomainEvent/Outbox を作らない（Codex R5 #1）', async () => {
  // 監査事実: main の全 production call site は dedupe を渡さない（git grep で unit test のみ）
  // → 実在し得る legacy identity は必ず dedupe=''。同一 identity の retry も dedupe-less で到達する。
  const identity = { tenantId: T, eventType: 'CUSTOMER_CREATED' as const, aggregateId: `agg-upgrade-${process.pid}-${Date.now()}` };
  const legacyKey = makeLegacyIdempotencyKey(identity);
  expect(legacyKey, 'legacy key は FNV 32bit 形式').toMatch(/^CUSTOMER_CREATED:[0-9a-f]{8}$/);
  expect(legacyKey).not.toBe(makeIdempotencyKey(identity));
  try {
    // main 形式（FNV key・dedupe-less identity）の既存 DomainEvent + Outbox を seed。
    const legacyEv = await prisma.domainEvent.create({
      data: { tenantId: T, eventType: identity.eventType, aggregateType: 'Customer', aggregateId: identity.aggregateId, actorType: 'user', idempotencyKey: legacyKey, status: 'pending' },
    });
    await prisma.outboxMessage.create({ data: { tenantId: T, eventId: legacyEv.id, eventType: identity.eventType, status: 'pending' } });

    // 現行 emitDomainEvent を**同一論理 identity**（dedupe-less）で呼ぶ（デプロイ後の retry/re-emit を再現）。
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

test('legacy collision を同一 identity と混同しない: dedupe-less でも aggregate が異なる FNV 衝突は列不一致で収束せず、独立に 1 件ずつ成立（Codex R5 #1）', async () => {
  // dedupe='' で FNV が衝突する aggregateId ペア（brute-force で決定論的に確認済み）。
  // FNV('tenant-evidence:RECEIVABLE_COLLECTED:aggcol4wzx:') === FNV('...:aggcolb6cd:') === 33da6a19
  const A = { tenantId: T, eventType: 'RECEIVABLE_COLLECTED' as const, aggregateId: 'aggcol4wzx' };
  const B = { ...A, aggregateId: 'aggcolb6cd' };
  expect(makeLegacyIdempotencyKey(A), '前提: legacy key は A/B で衝突する').toBe(makeLegacyIdempotencyKey(B));
  expect(makeLegacyIdempotencyKey(A)).toBe('RECEIVABLE_COLLECTED:33da6a19');
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

    // A（同一 identity・dedupe-less）→ legacy 行へ収束（duplicated・同一 eventId）。
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

test('同一コンテンツ・異なるdedupeのFNV衝突でも legacy 行へ誤収束しない: dedupe-bearing は fail-closed で自分の行＋Outboxを作る（Codex R7）', async () => {
  // Codex R7 fixture: 同一 tenant/type/aggregate で dedupe だけ異なる A/B は legacy FNV key が
  // 同一値（CUSTOMER_CREATED:1c68e52b）になる。R6 のコンテンツ fingerprint は「同一コンテンツ」の
  // 衝突ペアを区別できなかった。R7 修正: dedupe を持つ identity は legacy 行（全行 dedupe=''）と
  // 同一になり得ない（dedupe の空性による無損失な同一性証明）ため、**コンテンツが同一でも**
  // legacy 行へ収束せず、自分の canonical 行を作る。
  const AGG = 'agg-same';
  const A = { tenantId: T, eventType: 'CUSTOMER_CREATED' as const, aggregateId: AGG, dedupe: 'd42vu' };
  const B = { ...A, dedupe: 'dfuea' };
  expect(makeLegacyIdempotencyKey(A), '前提: legacy key は A/B（dedupe違い）で衝突する').toBe(makeLegacyIdempotencyKey(B));
  expect(makeLegacyIdempotencyKey(A)).toBe('CUSTOMER_CREATED:1c68e52b');
  // **同一コンテンツ**（Codex R7 の決定論的再現手順どおり、legacy 行を A/B と同じ
  // aggregateType/actorId/actorType/payload/metadata で seed する）。
  const sameContent = { source: 'identical-content', customerId: 'cust-same' };
  try {
    const legacyEv = await prisma.domainEvent.create({
      data: { tenantId: T, eventType: A.eventType, aggregateType: 'Customer', aggregateId: AGG, actorId: null, actorType: 'user', payload: sameContent, idempotencyKey: makeLegacyIdempotencyKey(A), status: 'pending' },
    });
    await prisma.outboxMessage.create({ data: { tenantId: T, eventId: legacyEv.id, eventType: A.eventType, payload: sameContent, status: 'pending' } });

    // B（dedupe-bearing・legacy key 衝突・列一致・**コンテンツも同一**）→ 収束しない。
    // B 固有の canonical DomainEvent + Outbox が作られ、イベントは失われない。
    const rb = await emitDomainEvent({ ...B, aggregateType: 'Customer', payload: sameContent });
    expect(rb.duplicated, 'B は同一コンテンツでも legacy 行へ収束しない').toBe(false);
    expect(rb.eventId).not.toBe(legacyEv.id);
    expect(await prisma.outboxMessage.count({ where: { tenantId: T, eventId: rb.eventId } }), 'B 自身の Outbox が作られる（消失なし）').toBe(1);
    expect(await prisma.outboxMessage.count({ where: { tenantId: T, eventId: legacyEv.id } }), 'legacy の Outbox は増えない').toBe(1);

    // A（dedupe-bearing・同一コンテンツ）も同様に収束しない（legacy 行の identity は dedupe='' で別物）。
    const ra = await emitDomainEvent({ ...A, aggregateType: 'Customer', payload: sameContent });
    expect(ra.duplicated, 'A も dedupe-bearing なので legacy 行へ収束しない').toBe(false);
    expect(ra.eventId).not.toBe(legacyEv.id);
    expect(ra.eventId).not.toBe(rb.eventId);

    // A/B の exact retry は各自の canonical 行へ収束（新規行なし）。
    const ra2 = await emitDomainEvent({ ...A, aggregateType: 'Customer', payload: sameContent });
    expect(ra2.duplicated).toBe(true);
    expect(ra2.eventId).toBe(ra.eventId);
    const rb2 = await emitDomainEvent({ ...B, aggregateType: 'Customer', payload: sameContent });
    expect(rb2.duplicated).toBe(true);
    expect(rb2.eventId).toBe(rb.eventId);

    // 肯定対照: dedupe-less identity（同 aggregate・同コンテンツ）は、自分の legacy 行
    //（key = FNV(tenant:type:aggregate:'')）へ収束する（'' === '' の同一性証明）。
    const C = { tenantId: T, eventType: A.eventType, aggregateId: AGG };
    const legacyEvC = await prisma.domainEvent.create({
      data: { tenantId: T, eventType: A.eventType, aggregateType: 'Customer', aggregateId: AGG, actorId: null, actorType: 'user', payload: sameContent, idempotencyKey: makeLegacyIdempotencyKey(C), status: 'pending' },
    });
    const rc = await emitDomainEvent({ ...C, aggregateType: 'Customer', payload: sameContent });
    expect(rc.duplicated, "dedupe-less identity は legacy 行へ収束（'' === '' の同一性証明）").toBe(true);
    expect(rc.eventId).toBe(legacyEvC.id);

    // 最終形: legacy(dedupe-ful seed) 1 + legacy(dedupe-less) 1 + A canonical 1 + B canonical 1 = 4 行
    //（誤収束も消失もない）。
    expect(await prisma.domainEvent.count({ where: { tenantId: T, aggregateId: AGG } }), '最終 4 件').toBe(4);
  } finally {
    await cleanupTenantEvents();
  }
});
