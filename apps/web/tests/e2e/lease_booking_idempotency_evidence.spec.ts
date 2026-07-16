import { test, expect } from '@playwright/test';
import { prisma } from '@hokko/db';
import {
  addAssetToLeaseReservation,
  createLeaseReservation,
  type LeaseActor,
} from '../../lib/domains/operations/lease';

// PR #63 R2（Codex CR #4992497297・booking request idempotency）の実 PostgreSQL 証拠。
//  1. 予約作成・商品追加の双方に canonical requestId ＋ payload fingerprint。durable barrier は
//     DomainEvent の (tenantId, idempotencyKey) unique（キーは requestId 由来・単射）。
//     same key + same payload → 同一結果へ収束（Line/Movement/Audit/Event/Outbox 不増）、
//     same key + different payload → 書き込み前に idempotency-mismatch、
//     別 requestId → 同一 Asset の意図的な複数 Line は許可。
//  2. 予約作成は Reservation/Audit/Growth/Domain/Outbox を単一 transaction（fault で全 rollback）。
//  3. 可用性 telemetry は core commit 後 best-effort（失敗しても action 成功のまま・再送は収束）。
// 在庫 >=2 の環境で「commit 後応答喪失 → client retry」の決定的再現（CR の再現手順）を封鎖する。
// 外部作用なし（実 provider/外部送信なし）。cleanup は fixture 固有 id スコープのみ（broad cleanup なし）。

let seq = 0;
function stamp(): string {
  seq += 1;
  return `${process.pid}-${Date.now()}-${seq}`;
}
function rid(): string {
  return `req-${stamp()}`;
}

async function getActor(): Promise<LeaseActor & { userId: string }> {
  const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { id: true, tenantId: true } });
  expect(ceo, 'seed の CEO ユーザーが存在する').not.toBeNull();
  return { tenantId: ceo!.tenantId, userId: ceo!.id };
}

async function makeAsset(tenantId: string, quantity: number) {
  const s = stamp();
  return prisma.productAsset.create({
    data: { tenantId, code: `LB${s}`.slice(0, 12), name: `LEASE-BK-${s}`, quantity, status: 'available', condition: 'good' },
    select: { id: true, name: true, quantity: true },
  });
}

async function makeReservation(tenantId: string, status = 'reserved') {
  const s = stamp();
  return prisma.leaseReservation.create({
    data: {
      tenantId,
      eventName: `LEASE-BK-RSV-${s}`,
      status,
      startAt: new Date('2032-02-10T00:00:00Z'),
      endAt: new Date('2032-02-12T00:00:00Z'),
    },
    select: { id: true, eventName: true },
  });
}

/** add-line の全書き込み面の exact cardinality（Line/Movement/Movement-Audit/Growth/DomainEvent/Outbox）。 */
async function countAdd(tenantId: string, reservationId: string, assetIds: string[]) {
  const movements = await prisma.inventoryMovement.findMany({ where: { tenantId, reservationId }, select: { id: true, type: true } });
  const movementIds = movements.map((m) => m.id);
  const anchors = await prisma.domainEvent.findMany({
    where: { tenantId, aggregateType: 'ProductAsset', aggregateId: { in: assetIds }, idempotencyKey: { startsWith: 'LEASE_BOOKING:add-line:' } },
    select: { id: true },
  });
  return {
    lines: await prisma.leaseReservationLine.count({ where: { tenantId, reservationId } }),
    reserveMovements: movements.filter((m) => m.type === 'reserve').length,
    movementAudit: await prisma.auditLog.count({ where: { tenantId, entityType: 'InventoryMovement', entityId: { in: movementIds } } }),
    movementGrowth: await prisma.growthEvent.count({ where: { tenantId, entityType: 'InventoryMovement', entityId: { in: movementIds } } }),
    anchors: anchors.length,
    outbox: await prisma.outboxMessage.count({ where: { eventId: { in: anchors.map((a) => a.id) } } }),
    availabilityGrowth: await prisma.growthEvent.count({
      where: { tenantId, type: 'inventory.availability.checked', entityType: 'ProductAsset', entityId: { in: assetIds } },
    }),
  };
}

/** create-reservation の全書き込み面の exact cardinality（eventName でスコープ）。 */
async function countCreate(tenantId: string, eventName: string) {
  const reservations = await prisma.leaseReservation.findMany({ where: { tenantId, eventName }, select: { id: true } });
  const ids = reservations.map((r) => r.id);
  const anchors = await prisma.domainEvent.findMany({
    where: { tenantId, eventType: 'LEASE_RESERVATION_CREATED', aggregateType: 'LeaseReservation', aggregateId: { in: ids } },
    select: { id: true },
  });
  return {
    reservations: reservations.length,
    audit: await prisma.auditLog.count({ where: { tenantId, entityType: 'LeaseReservation', entityId: { in: ids }, action: 'create' } }),
    growth: await prisma.growthEvent.count({ where: { tenantId, type: 'rental.reservation.created', entityId: { in: ids } } }),
    anchors: anchors.length,
    outbox: await prisma.outboxMessage.count({ where: { eventId: { in: anchors.map((a) => a.id) } } }),
  };
}

/** fixture 固有 cleanup（本テストが作った行だけを消す）。 */
async function cleanupReservation(tenantId: string, reservationId: string, assetIds: string[]) {
  const movements = await prisma.inventoryMovement.findMany({ where: { tenantId, reservationId }, select: { id: true } });
  const movementIds = movements.map((m) => m.id);
  const events = await prisma.domainEvent.findMany({
    where: {
      tenantId,
      OR: [
        { aggregateType: 'LeaseReservation', aggregateId: reservationId },
        { aggregateType: 'ProductAsset', aggregateId: { in: assetIds } },
      ],
    },
    select: { id: true },
  });
  await prisma.outboxMessage.deleteMany({ where: { eventId: { in: events.map((e) => e.id) } } });
  await prisma.domainEvent.deleteMany({ where: { id: { in: events.map((e) => e.id) } } });
  await prisma.growthEvent.deleteMany({
    where: { tenantId, entityId: { in: [...movementIds, reservationId, ...assetIds] } },
  });
  await prisma.auditLog.deleteMany({
    where: {
      tenantId,
      OR: [
        { entityType: 'LeaseReservation', entityId: reservationId },
        { entityType: 'InventoryMovement', entityId: { in: movementIds } },
      ],
    },
  });
  await prisma.inventoryMovement.deleteMany({ where: { id: { in: movementIds } } });
  await prisma.leaseReservationLine.deleteMany({ where: { tenantId, reservationId } });
  await prisma.leaseReservation.deleteMany({ where: { id: reservationId } });
  await prisma.productAsset.deleteMany({ where: { id: { in: assetIds } } });
}

/** create テスト用 cleanup（eventName スコープ）。 */
async function cleanupCreated(tenantId: string, eventName: string) {
  const reservations = await prisma.leaseReservation.findMany({ where: { tenantId, eventName }, select: { id: true } });
  for (const r of reservations) await cleanupReservation(tenantId, r.id, []);
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

// ============================ 予約作成 ============================

test('create: 同一requestId+同一payloadの逐次replayは同一予約へ収束（Reservation/Audit/Growth/Anchor/Outbox 各1）', async () => {
  const actor = await getActor();
  const eventName = `LEASE-BK-CREATE-${stamp()}`;
  const requestId = rid();
  const input = { eventName, venue: '本社', startAt: new Date('2032-03-01T00:00:00Z'), endAt: new Date('2032-03-03T00:00:00Z'), requestId };
  try {
    const r1 = await createLeaseReservation(actor, input);
    expect(r1.ok).toBe(true);
    if (r1.ok) expect(r1.replayed, '初回は fresh').toBe(false);
    // 応答喪失を想定した client retry（同一 requestId・同一 payload）→ 同一予約 id で収束。
    const r2 = await createLeaseReservation(actor, input);
    expect(r2.ok).toBe(true);
    if (r1.ok && r2.ok) {
      expect(r2.replayed, '再送は replay 収束').toBe(true);
      expect(r2.reservationId, '同一予約へ収束').toBe(r1.reservationId);
    }
    const c = await countCreate(actor.tenantId, eventName);
    expect(c.reservations, 'Reservation はちょうど1').toBe(1);
    expect(c.audit, 'Audit はちょうど1').toBe(1);
    expect(c.growth, 'Growth はちょうど1').toBe(1);
    expect(c.anchors, 'DomainEvent(anchor) はちょうど1').toBe(1);
    expect(c.outbox, 'Outbox はちょうど1').toBe(1);
  } finally {
    await cleanupCreated(actor.tenantId, eventName);
  }
});

test('create: 同一requestIdの並列4replayでも Reservation はちょうど1（全callerが同一idへ収束）', async () => {
  const actor = await getActor();
  const eventName = `LEASE-BK-PCREATE-${stamp()}`;
  const requestId = rid();
  const input = { eventName, venue: null, startAt: new Date('2032-03-05T00:00:00Z'), endAt: new Date('2032-03-06T00:00:00Z'), requestId };
  try {
    const results = await Promise.all(Array.from({ length: 4 }, () => createLeaseReservation(actor, input)));
    const ids = new Set<string>();
    for (const r of results) {
      expect(r.ok, '並列でも全caller成功（勝者fresh・敗者はanchor収束）').toBe(true);
      if (r.ok) ids.add(r.reservationId);
    }
    expect(ids.size, '全callerが同一予約idを受け取る').toBe(1);
    expect(results.filter((r) => r.ok && !r.replayed).length, 'fresh はちょうど1本').toBe(1);
    const c = await countCreate(actor.tenantId, eventName);
    expect(c.reservations).toBe(1);
    expect(c.audit).toBe(1);
    expect(c.growth).toBe(1);
    expect(c.anchors).toBe(1);
    expect(c.outbox).toBe(1);
  } finally {
    await cleanupCreated(actor.tenantId, eventName);
  }
});

test('create: 同一requestId+異なるpayloadは書き込み前に idempotency-mismatch（新規Reservation 0）', async () => {
  const actor = await getActor();
  const eventName = `LEASE-BK-MCREATE-${stamp()}`;
  const otherName = `LEASE-BK-MCREATE2-${stamp()}`;
  const requestId = rid();
  try {
    const r1 = await createLeaseReservation(actor, { eventName, venue: null, startAt: new Date('2032-03-08T00:00:00Z'), endAt: new Date('2032-03-09T00:00:00Z'), requestId });
    expect(r1.ok).toBe(true);
    // 同じ requestId で内容を変えた要求は収束させず conflict（書き込みゼロ）。
    const r2 = await createLeaseReservation(actor, { eventName: otherName, venue: null, startAt: new Date('2032-03-08T00:00:00Z'), endAt: new Date('2032-03-09T00:00:00Z'), requestId });
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.reason).toBe('idempotency-mismatch');
    expect((await countCreate(actor.tenantId, otherName)).reservations, '異payloadのReservationは作られない').toBe(0);
    expect((await countCreate(actor.tenantId, eventName)).reservations, '元のReservationは1のまま').toBe(1);
  } finally {
    await cleanupCreated(actor.tenantId, eventName);
    await cleanupCreated(actor.tenantId, otherName);
  }
});

test('create: Reservation作成後のfaultで全rollback（Audit/Growth/Anchor 0）→ 同一requestIdのretryがちょうど1回成功', async () => {
  const actor = await getActor();
  const eventName = `LEASE-BK-FCREATE-${stamp()}`;
  const requestId = rid();
  const input = { eventName, venue: null, startAt: new Date('2032-03-10T00:00:00Z'), endAt: new Date('2032-03-11T00:00:00Z'), requestId };
  try {
    await expect(
      createLeaseReservation(actor, input, {
        __faultAfterReservationForTest: () => {
          throw new Error('injected-fault:after-reservation');
        },
      }),
    ).rejects.toThrow('injected-fault:after-reservation');
    const c = await countCreate(actor.tenantId, eventName);
    expect(c.reservations, 'faultで Reservation 0（半確定なし・旧実装の分割commitはここで検出される）').toBe(0);
    expect(c.audit).toBe(0);
    expect(c.growth).toBe(0);
    expect(c.anchors).toBe(0);
    // retry（同一 requestId）は anchor が無いためちょうど1回成功する。
    const r = await createLeaseReservation(actor, input);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.replayed).toBe(false);
    const c2 = await countCreate(actor.tenantId, eventName);
    expect(c2.reservations).toBe(1);
    expect(c2.audit).toBe(1);
    expect(c2.growth).toBe(1);
    expect(c2.anchors).toBe(1);
    expect(c2.outbox).toBe(1);
  } finally {
    await cleanupCreated(actor.tenantId, eventName);
  }
});

test('create: requestId 書式不正は fail-closed（invalid-request-id・書き込み0）', async () => {
  const actor = await getActor();
  const eventName = `LEASE-BK-VCREATE-${stamp()}`;
  try {
    for (const bad of ['', 'short', 'bad id with spaces!', 'a'.repeat(200)]) {
      const r = await createLeaseReservation(actor, { eventName, venue: null, startAt: new Date('2032-03-12T00:00:00Z'), endAt: new Date('2032-03-13T00:00:00Z'), requestId: bad });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe('invalid-request-id');
    }
    expect((await countCreate(actor.tenantId, eventName)).reservations).toBe(0);
  } finally {
    await cleanupCreated(actor.tenantId, eventName);
  }
});

// ============================ 商品追加（add-line） ============================

test('add-line: 在庫>=2で同一requestIdの逐次replayは収束（Line/Movement/Audit/Growth/Anchor/Outbox 各1・CRの決定的再現の封鎖）', async () => {
  const actor = await getActor();
  const asset = await makeAsset(actor.tenantId, 3);
  const reservation = await makeReservation(actor.tenantId);
  const requestId = rid();
  const input = { reservationId: reservation.id, assetId: asset.id, quantity: 1, requestId };
  try {
    const r1 = await addAssetToLeaseReservation(actor, input);
    expect(r1.ok).toBe(true);
    if (r1.ok) expect(r1.replayed).toBe(false);
    // CR 再現手順 step 3: 応答喪失後の client retry（在庫は 2 以上残っており容量競合では防げない）。
    const r2 = await addAssetToLeaseReservation(actor, input);
    expect(r2.ok, '再送も成功として返る（収束）').toBe(true);
    if (r1.ok && r2.ok) {
      expect(r2.replayed, '再送は replay 収束（新規書き込みなし）').toBe(true);
      expect(r2.available, '収束応答は初回と同じ可用性').toBe(r1.available);
      expect(r2.assetName).toBe(r1.assetName);
    }
    const c = await countAdd(actor.tenantId, reservation.id, [asset.id]);
    expect(c.lines, 'Line はちょうど1（二重Lineの封鎖）').toBe(1);
    expect(c.reserveMovements, 'reserve Movement はちょうど1').toBe(1);
    expect(c.movementAudit, 'Movement Audit はちょうど1').toBe(1);
    expect(c.movementGrowth, 'Movement Growth はちょうど1').toBe(1);
    expect(c.anchors, 'anchor DomainEvent はちょうど1').toBe(1);
    expect(c.outbox, 'Outbox はちょうど1').toBe(1);
  } finally {
    await cleanupReservation(actor.tenantId, reservation.id, [asset.id]);
  }
});

test('add-line: 在庫>=2で同一requestIdの並列6replayでも Line/Movement はちょうど1（容量競合に依存しない冪等性）', async () => {
  const actor = await getActor();
  const asset = await makeAsset(actor.tenantId, 5);
  const reservation = await makeReservation(actor.tenantId);
  const requestId = rid();
  const input = { reservationId: reservation.id, assetId: asset.id, quantity: 1, requestId };
  try {
    const results = await Promise.all(Array.from({ length: 6 }, () => addAssetToLeaseReservation(actor, input)));
    for (const r of results) expect(r.ok, '全caller成功（勝者fresh・敗者はanchor収束）').toBe(true);
    expect(results.filter((r) => r.ok && !r.replayed).length, 'fresh はちょうど1本').toBe(1);
    const c = await countAdd(actor.tenantId, reservation.id, [asset.id]);
    expect(c.lines, '在庫5でも Line は1（容量ではなく anchor が防ぐ）').toBe(1);
    expect(c.reserveMovements).toBe(1);
    expect(c.movementAudit).toBe(1);
    expect(c.movementGrowth).toBe(1);
    expect(c.anchors).toBe(1);
    expect(c.outbox).toBe(1);
  } finally {
    await cleanupReservation(actor.tenantId, reservation.id, [asset.id]);
  }
});

test('add-line: post-commit telemetry failure でも action は成功のまま（非致命化）・再送は収束（CR item 3 の決定的再現）', async () => {
  const actor = await getActor();
  const asset = await makeAsset(actor.tenantId, 3);
  const reservation = await makeReservation(actor.tenantId);
  const requestId = rid();
  const input = { reservationId: reservation.id, assetId: asset.id, quantity: 1, requestId };
  try {
    // core commit 後の telemetry を失敗させる → 旧実装（catchなし）ならここで throw し client retry が
    // 非冪等経路へ再入していた。R2 では catch で非致命化し ok を返す。
    const r1 = await addAssetToLeaseReservation(actor, input, {
      __telemetryFaultForTest: () => {
        throw new Error('injected-fault:telemetry');
      },
    });
    expect(r1.ok, 'telemetry 失敗でも commit 済み成功は成功として返る').toBe(true);
    if (r1.ok) expect(r1.replayed).toBe(false);
    const mid = await countAdd(actor.tenantId, reservation.id, [asset.id]);
    expect(mid.lines, 'core は commit 済み').toBe(1);
    expect(mid.availabilityGrowth, 'telemetry イベントは失敗して残らない（best-effort）').toBe(0);
    // それでも client が retry した場合 → anchor で収束し二重 Line にならない。
    const r2 = await addAssetToLeaseReservation(actor, input);
    expect(r2.ok).toBe(true);
    if (r2.ok) expect(r2.replayed).toBe(true);
    const c = await countAdd(actor.tenantId, reservation.id, [asset.id]);
    expect(c.lines).toBe(1);
    expect(c.reserveMovements).toBe(1);
    // 正常系対照: telemetry は fresh 成功時に1件だけ記録される（replay では再記録しない）。
    const requestId2 = rid();
    const r3 = await addAssetToLeaseReservation(actor, { ...input, requestId: requestId2 });
    expect(r3.ok).toBe(true);
    const c2 = await countAdd(actor.tenantId, reservation.id, [asset.id]);
    expect(c2.availabilityGrowth, 'telemetry は fresh 1回分のみ').toBe(1);
  } finally {
    await cleanupReservation(actor.tenantId, reservation.id, [asset.id]);
  }
});

test('add-line: 同一requestId+異なるpayload（数量変更）は書き込み前に idempotency-mismatch（Line/Movement 不増）', async () => {
  const actor = await getActor();
  const asset = await makeAsset(actor.tenantId, 5);
  const reservation = await makeReservation(actor.tenantId);
  const requestId = rid();
  try {
    const r1 = await addAssetToLeaseReservation(actor, { reservationId: reservation.id, assetId: asset.id, quantity: 1, requestId });
    expect(r1.ok).toBe(true);
    const r2 = await addAssetToLeaseReservation(actor, { reservationId: reservation.id, assetId: asset.id, quantity: 2, requestId });
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.reason, '同一キー・異payloadは収束させない').toBe('idempotency-mismatch');
    const c = await countAdd(actor.tenantId, reservation.id, [asset.id]);
    expect(c.lines, 'Line は1のまま').toBe(1);
    expect(c.reserveMovements).toBe(1);
    expect(c.anchors).toBe(1);
  } finally {
    await cleanupReservation(actor.tenantId, reservation.id, [asset.id]);
  }
});

test('add-line: 別requestIdなら同一Assetの意図的な複数Lineは許可（intentional vs replay の識別）', async () => {
  const actor = await getActor();
  const asset = await makeAsset(actor.tenantId, 5);
  const reservation = await makeReservation(actor.tenantId);
  try {
    const r1 = await addAssetToLeaseReservation(actor, { reservationId: reservation.id, assetId: asset.id, quantity: 1, requestId: rid() });
    const r2 = await addAssetToLeaseReservation(actor, { reservationId: reservation.id, assetId: asset.id, quantity: 1, requestId: rid() });
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    if (r2.ok) expect(r2.replayed, '別要求は replay ではない').toBe(false);
    const c = await countAdd(actor.tenantId, reservation.id, [asset.id]);
    expect(c.lines, '意図的な2要求は2 Lines').toBe(2);
    expect(c.reserveMovements).toBe(2);
    expect(c.anchors, 'anchor は要求ごとに1').toBe(2);
  } finally {
    await cleanupReservation(actor.tenantId, reservation.id, [asset.id]);
  }
});

test('add-line: cross-tenant 同一requestId は互いに独立（barrier は tenant-scoped・越境収束しない）', async () => {
  const actor = await getActor();
  const s = stamp();
  const foreignTenant = await prisma.tenant.create({ data: { name: `LEASE-BK-FOREIGN-${s}` } });
  const foreignActor: LeaseActor = { tenantId: foreignTenant.id, userId: null };
  const asset = await makeAsset(actor.tenantId, 3);
  const reservation = await makeReservation(actor.tenantId);
  const fAsset = await makeAsset(foreignTenant.id, 3);
  const fReservation = await makeReservation(foreignTenant.id);
  const requestId = rid();
  try {
    const r1 = await addAssetToLeaseReservation(actor, { reservationId: reservation.id, assetId: asset.id, quantity: 1, requestId });
    expect(r1.ok).toBe(true);
    // 別 tenant が同じ requestId を使っても、他 tenant の anchor に収束せず自分の書き込みが成立する。
    const r2 = await addAssetToLeaseReservation(foreignActor, { reservationId: fReservation.id, assetId: fAsset.id, quantity: 1, requestId });
    expect(r2.ok, '別tenantは独立に成功').toBe(true);
    if (r2.ok) expect(r2.replayed, '越境 replay 扱いにならない').toBe(false);
    expect((await countAdd(actor.tenantId, reservation.id, [asset.id])).lines).toBe(1);
    expect((await countAdd(foreignTenant.id, fReservation.id, [fAsset.id])).lines).toBe(1);
    // cross-tenant で create 側 anchor も独立していることを確認。
    const cName = `LEASE-BK-XCREATE-${stamp()}`;
    const cReq = rid();
    const own = await createLeaseReservation(actor, { eventName: cName, venue: null, startAt: new Date('2032-04-01T00:00:00Z'), endAt: new Date('2032-04-02T00:00:00Z'), requestId: cReq });
    const foreign = await createLeaseReservation(foreignActor, { eventName: cName, venue: null, startAt: new Date('2032-04-01T00:00:00Z'), endAt: new Date('2032-04-02T00:00:00Z'), requestId: cReq });
    expect(own.ok).toBe(true);
    expect(foreign.ok).toBe(true);
    if (own.ok && foreign.ok) {
      expect(foreign.replayed).toBe(false);
      expect(foreign.reservationId).not.toBe(own.reservationId);
    }
    await cleanupCreated(actor.tenantId, cName);
    await cleanupCreated(foreignTenant.id, cName);
  } finally {
    await cleanupReservation(actor.tenantId, reservation.id, [asset.id]);
    await cleanupReservation(foreignTenant.id, fReservation.id, [fAsset.id]);
    await prisma.tenant.delete({ where: { id: foreignTenant.id } });
  }
});

test('add-line: requestId 書式不正は fail-closed（invalid-request-id・書き込み0）', async () => {
  const actor = await getActor();
  const asset = await makeAsset(actor.tenantId, 3);
  const reservation = await makeReservation(actor.tenantId);
  try {
    for (const bad of ['', 'short', 'bad id with spaces!']) {
      const r = await addAssetToLeaseReservation(actor, { reservationId: reservation.id, assetId: asset.id, quantity: 1, requestId: bad });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe('invalid-request-id');
    }
    expect((await countAdd(actor.tenantId, reservation.id, [asset.id])).lines).toBe(0);
  } finally {
    await cleanupReservation(actor.tenantId, reservation.id, [asset.id]);
  }
});
