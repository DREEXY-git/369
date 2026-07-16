import { test, expect } from '@playwright/test';
import { prisma } from '@hokko/db';
import {
  addAssetToLeaseReservation,
  confirmLeaseReservation,
  dispatchLeaseReservation,
  returnLeaseReservation,
  type LeaseActor,
} from '../../lib/domains/operations/lease';
import { applyInventoryMovement } from '../../lib/operations';

// P3-INV-2（Codex CR #4970495097）の実 PostgreSQL 証拠。
// リース予約の
//  High-1: 可用性判定は Asset FOR UPDATE ロック取得**後**に同 tx で再読取した quantity で行う
//          （lock 前 snapshot 判定の排除 — lock 待機中の在庫変更を必ず反映する）
//  P2-2:  予約ライン・reserve Movement・Audit・Growth/DomainEvent/Outbox を単一 transaction で確定
//  High-3: lifecycle 明示 CAS（reserved→confirmed→dispatched→returned）。dispatch/return は
//          CAS claim → 全 Asset id 昇順 FOR UPDATE → 全 line Movement/Audit → status/time → Growth/
//          Domain/Outbox を1 transaction で確定。replay/並行/途中失敗で Movement/usageCount/Audit 不増。
// を実 DB で検証する。外部作用なし（社内の在庫予約のみ・実 provider/外部送信なし）。

let seq = 0;
function stamp(): string {
  seq += 1;
  return `${process.pid}-${Date.now()}-${seq}`;
}

/** R2: canonical requestId（1呼び出し=1要求。replay テストは同じ値を再利用する）。 */
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
    data: { tenantId, code: `LL${s}`.slice(0, 12), name: `LEASE-LC-${s}`, quantity, status: 'available', condition: 'good' },
    select: { id: true, name: true, quantity: true, usageCount: true },
  });
}

async function makeReservation(tenantId: string, status = 'reserved') {
  const s = stamp();
  return prisma.leaseReservation.create({
    data: {
      tenantId,
      eventName: `LEASE-LC-RSV-${s}`,
      status,
      startAt: new Date('2031-01-10T00:00:00Z'),
      endAt: new Date('2031-01-12T00:00:00Z'),
    },
    select: { id: true, eventName: true },
  });
}

interface LeaseCounts {
  lines: number;
  reserveMovements: number;
  dispatchMovements: number;
  returnMovements: number;
  movementGrowth: number;
  movementEvents: number;
  reservationEvents: Record<string, number>;
  outbox: number;
  reservationAudit: number;
}

/** 本テスト由来の全書き込み面を数える（reservationId / assetIds でスコープ）。 */
async function countAll(tenantId: string, reservationId: string, assetIds: string[]): Promise<LeaseCounts> {
  const movements = await prisma.inventoryMovement.findMany({
    where: { tenantId, reservationId },
    select: { id: true, type: true },
  });
  const movementIds = movements.map((m) => m.id);
  const events = await prisma.domainEvent.findMany({
    where: {
      tenantId,
      OR: [
        { aggregateType: 'LeaseReservation', aggregateId: reservationId },
        { aggregateType: 'ProductAsset', aggregateId: { in: assetIds }, idempotencyKey: { startsWith: 'LEASE_MOVEMENT:mov:' } },
        // R2: add-line（reserve）の movement event は requestId 由来の booking anchor キーになった。
        { aggregateType: 'ProductAsset', aggregateId: { in: assetIds }, idempotencyKey: { startsWith: 'LEASE_BOOKING:add-line:' } },
      ],
    },
    select: { id: true, eventType: true, idempotencyKey: true },
  });
  // movement 由来 event は本 spec の movement id / booking anchor に限定（他テストの資産行と混ざらない）。
  const movementEvents = events.filter(
    (e) =>
      movementIds.some((id) => e.idempotencyKey === `LEASE_MOVEMENT:mov:${encodeURIComponent(id)}`) ||
      e.idempotencyKey.startsWith('LEASE_BOOKING:add-line:'),
  );
  const reservationEventRows = events.filter((e) => e.eventType.startsWith('LEASE_'));
  const reservationEvents: Record<string, number> = {};
  for (const e of reservationEventRows) reservationEvents[e.eventType] = (reservationEvents[e.eventType] ?? 0) + 1;
  return {
    lines: await prisma.leaseReservationLine.count({ where: { tenantId, reservationId } }),
    reserveMovements: movements.filter((m) => m.type === 'reserve').length,
    dispatchMovements: movements.filter((m) => m.type === 'dispatch').length,
    returnMovements: movements.filter((m) => m.type === 'return').length,
    movementGrowth: await prisma.growthEvent.count({ where: { tenantId, entityType: 'InventoryMovement', entityId: { in: movementIds } } }),
    movementEvents: movementEvents.length,
    reservationEvents,
    outbox: await prisma.outboxMessage.count({ where: { eventId: { in: events.map((e) => e.id) } } }),
    reservationAudit: await prisma.auditLog.count({ where: { tenantId, entityType: 'LeaseReservation', entityId: reservationId } }),
  };
}

/** fixture 固有 cleanup（本テストが作った行だけを消す）。 */
async function cleanup(tenantId: string, reservationId: string, assetIds: string[]) {
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
    where: { tenantId, OR: [{ entityId: { in: [...movementIds, reservationId, ...assetIds] } }] },
  });
  await prisma.auditLog.deleteMany({
    where: { tenantId, OR: [{ entityType: 'LeaseReservation', entityId: reservationId }, { entityType: 'InventoryMovement', entityId: { in: movementIds } }] },
  });
  await prisma.inventoryMovement.deleteMany({ where: { id: { in: movementIds } } });
  await prisma.leaseReservationLine.deleteMany({ where: { tenantId, reservationId } });
  await prisma.leaseReservation.deleteMany({ where: { id: reservationId } });
  await prisma.productAsset.deleteMany({ where: { id: { in: assetIds } } });
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('High-1 真lock競合: holder が Asset を FOR UPDATE 保持中に add が実待機し（pg_blocking_pids 観測）、holder commit 後の lock 下再読込で conflict', async () => {
  const actor = await getActor();
  const asset = await makeAsset(actor.tenantId, 1);
  const reservation = await makeReservation(actor.tenantId);
  try {
    // R2 強化: gate による「事前完了」ではなく、**実際の lock 待ち**を観測する。
    // holder tx が対象 Asset 行を FOR UPDATE で保持 → ready 通知 → add（waiter）を起動 →
    // pg_stat_activity + pg_blocking_pids で waiter の FOR UPDATE が Lock 待ちであることを実測 →
    // holder が quantity を 1→0 に更新して commit → waiter は lock 取得後の同 tx 再読込で 0 を見て conflict。
    // source から FOR UPDATE を外すと waiter は待機せず（観測 0）本テストは fail する。
    let holderReady!: () => void;
    const ready = new Promise<void>((res) => (holderReady = res));
    let releaseHolder!: () => void;
    const holderGate = new Promise<void>((res) => (releaseHolder = res));
    const holder = prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "ProductAsset" WHERE id = ${asset.id} AND "tenantId" = ${actor.tenantId} FOR UPDATE`;
        holderReady();
        await holderGate;
        await tx.productAsset.update({ where: { id: asset.id }, data: { quantity: 0 } });
      },
      { timeout: 30000 },
    );
    await ready;

    const pAdd = addAssetToLeaseReservation(actor, {
      reservationId: reservation.id,
      assetId: asset.id,
      quantity: 1,
      requestId: rid(),
    });

    // waiter が実際に holder にブロックされていることを pg_blocking_pids で観測（最大 ~3s poll）。
    let blockedCount = 0;
    for (let i = 0; i < 60; i++) {
      const rows = await prisma.$queryRaw<Array<{ pid: number }>>`
        SELECT pid FROM pg_stat_activity
        WHERE cardinality(pg_blocking_pids(pid)) > 0
          AND wait_event_type = 'Lock'
          AND query ILIKE '%FROM "ProductAsset"%FOR UPDATE%'`;
      blockedCount = rows.length;
      if (blockedCount > 0) break;
      await new Promise((res) => setTimeout(res, 50));
    }
    expect(blockedCount, 'add の Asset FOR UPDATE が holder により実際に Lock 待ちしている').toBeGreaterThan(0);

    // holder が在庫を 0 へ更新して commit → waiter が解除される。
    releaseHolder();
    await holder;
    const r = await pAdd;
    expect(r.ok, '実在庫0での予約は拒否される').toBe(false);
    if (!r.ok) expect(r.reason).toBe('conflict');
    const c = await countAll(actor.tenantId, reservation.id, [asset.id]);
    expect(c.lines, '予約ラインは作られない').toBe(0);
    expect(c.reserveMovements, 'reserve Movement も作られない').toBe(0);

    // 肯定対照: 在庫を1へ戻すと同じ add が成功し、ライン＋Movement＋Growth＋Domain/Outbox が同一txで揃う。
    await applyInventoryMovement({ tenantId: actor.tenantId, actorId: actor.userId, assetId: asset.id, type: 'adjust', setQuantity: 1, note: 'barrier: 在庫を1へ' });
    const r2 = await addAssetToLeaseReservation(actor, { reservationId: reservation.id, assetId: asset.id, quantity: 1, requestId: rid() });
    expect(r2.ok).toBe(true);
    const c2 = await countAll(actor.tenantId, reservation.id, [asset.id]);
    expect(c2.lines).toBe(1);
    expect(c2.reserveMovements).toBe(1);
    expect(c2.movementGrowth, 'Movement Growth が同一txで確定').toBe(1);
    expect(c2.movementEvents, 'Movement DomainEvent が同一txで確定').toBe(1);
    expect(c2.outbox, 'Outbox が同一txで確定').toBe(1);
  } finally {
    await cleanup(actor.tenantId, reservation.id, [asset.id]);
  }
});

test('P2-2 原子性: ライン作成後・Movement前のfaultで全rollback（ライン0）→ retryがちょうど1組へ収束', async () => {
  const actor = await getActor();
  const asset = await makeAsset(actor.tenantId, 3);
  const reservation = await makeReservation(actor.tenantId);
  try {
    await expect(
      addAssetToLeaseReservation(
        actor,
        { reservationId: reservation.id, assetId: asset.id, quantity: 1, requestId: rid() },
        {
          __faultAfterLineForTest: () => {
            throw new Error('injected-fault:after-line');
          },
        },
      ),
    ).rejects.toThrow('injected-fault:after-line');
    const c = await countAll(actor.tenantId, reservation.id, [asset.id]);
    expect(c.lines, 'fault で ライン 0（半確定なし）').toBe(0);
    expect(c.reserveMovements).toBe(0);
    expect(c.movementGrowth).toBe(0);
    expect(c.movementEvents).toBe(0);
    expect(c.outbox).toBe(0);
    // retry: 残骸ラインが無いため自己競合せず、ちょうど1組が確定する（CR P2-2 の復旧不能状態の排除）。
    const r = await addAssetToLeaseReservation(actor, { reservationId: reservation.id, assetId: asset.id, quantity: 1, requestId: rid() });
    expect(r.ok, 'retry は成功').toBe(true);
    const c2 = await countAll(actor.tenantId, reservation.id, [asset.id]);
    expect(c2.lines).toBe(1);
    expect(c2.reserveMovements).toBe(1);
  } finally {
    await cleanup(actor.tenantId, reservation.id, [asset.id]);
  }
});

test('lifecycle CAS: reserved→confirmed→dispatched→returned が各1回だけ成立し、replayは already で不増', async () => {
  const actor = await getActor();
  const asset = await makeAsset(actor.tenantId, 5);
  const reservation = await makeReservation(actor.tenantId);
  try {
    const add = await addAssetToLeaseReservation(actor, { reservationId: reservation.id, assetId: asset.id, quantity: 2, requestId: rid() });
    expect(add.ok).toBe(true);
    const before = await prisma.productAsset.findUnique({ where: { id: asset.id }, select: { usageCount: true } });

    expect((await confirmLeaseReservation(actor, reservation.id)).ok).toBe(true);
    const confirmReplay = await confirmLeaseReservation(actor, reservation.id);
    expect(confirmReplay.ok).toBe(false);
    if (!confirmReplay.ok) expect(confirmReplay.reason, 'confirm replay は already').toBe('already');

    expect((await dispatchLeaseReservation(actor, reservation.id)).ok).toBe(true);
    const afterDispatch = await prisma.leaseReservation.findUnique({ where: { id: reservation.id }, select: { status: true, deliveryAt: true } });
    expect(afterDispatch!.status).toBe('dispatched');
    expect(afterDispatch!.deliveryAt, 'deliveryAt が確定').not.toBeNull();
    const dispatchReplay = await dispatchLeaseReservation(actor, reservation.id);
    expect(dispatchReplay.ok).toBe(false);
    if (!dispatchReplay.ok) expect(dispatchReplay.reason, 'dispatch replay は already').toBe('already');

    expect((await returnLeaseReservation(actor, reservation.id)).ok).toBe(true);
    const returnReplay = await returnLeaseReservation(actor, reservation.id);
    expect(returnReplay.ok).toBe(false);
    if (!returnReplay.ok) expect(returnReplay.reason, 'return replay は already（double-return 不可）').toBe('already');

    const c = await countAll(actor.tenantId, reservation.id, [asset.id]);
    expect(c.dispatchMovements, 'dispatch Movement は line 数=1 のみ（replay 不増）').toBe(1);
    expect(c.returnMovements, 'return Movement も1のみ').toBe(1);
    expect(c.reservationEvents['LEASE_RESERVATION_CONFIRMED'] ?? 0, 'confirm イベントは1').toBe(1);
    expect(c.reservationEvents['LEASE_ITEM_DISPATCHED'] ?? 0, 'dispatch イベントは1').toBe(1);
    expect(c.reservationEvents['LEASE_ITEM_RETURNED'] ?? 0, 'return イベントは1').toBe(1);
    expect(c.reservationAudit, '予約レベル Audit は confirm/dispatch/return の3件のみ').toBe(3);
    const after = await prisma.productAsset.findUnique({ where: { id: asset.id }, select: { usageCount: true, status: true } });
    expect(after!.usageCount - before!.usageCount, 'usageCount は dispatch 1回分だけ増える').toBe(1);
    expect(after!.status, '返却後は available').toBe('available');
  } finally {
    await cleanup(actor.tenantId, reservation.id, [asset.id]);
  }
});

test('順序違反はfail-closed: reserved からの dispatch/return・returned からの再dispatch は invalid-state（書き込み0）', async () => {
  const actor = await getActor();
  const asset = await makeAsset(actor.tenantId, 5);
  const reservation = await makeReservation(actor.tenantId);
  try {
    await addAssetToLeaseReservation(actor, { reservationId: reservation.id, assetId: asset.id, quantity: 1, requestId: rid() });
    // reserved のまま dispatch / return（return-before-dispatch）→ invalid-state・Movement 0。
    const d = await dispatchLeaseReservation(actor, reservation.id);
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.reason, '未確定予約は出庫できない').toBe('invalid-state');
    const r = await returnLeaseReservation(actor, reservation.id);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason, 'return-before-dispatch は invalid-state').toBe('invalid-state');
    let c = await countAll(actor.tenantId, reservation.id, [asset.id]);
    expect(c.dispatchMovements).toBe(0);
    expect(c.returnMovements).toBe(0);
    expect((await prisma.leaseReservation.findUnique({ where: { id: reservation.id }, select: { status: true } }))!.status).toBe('reserved');

    // 正順で returned まで進めた後の再 dispatch は invalid-state（returned≠confirmed・Movement 不増）。
    await confirmLeaseReservation(actor, reservation.id);
    await dispatchLeaseReservation(actor, reservation.id);
    await returnLeaseReservation(actor, reservation.id);
    const d2 = await dispatchLeaseReservation(actor, reservation.id);
    expect(d2.ok).toBe(false);
    if (!d2.ok) expect(d2.reason, 'returned からの再出庫は invalid-state').toBe('invalid-state');
    c = await countAll(actor.tenantId, reservation.id, [asset.id]);
    expect(c.dispatchMovements, 'dispatch Movement は1のまま').toBe(1);
    expect(c.returnMovements).toBe(1);
    // 出庫済み/返却済みへのライン追加も fail-closed。
    const addLate = await addAssetToLeaseReservation(actor, { reservationId: reservation.id, assetId: asset.id, quantity: 1, requestId: rid() });
    expect(addLate.ok).toBe(false);
    if (!addLate.ok) expect(addLate.reason, '返却済み予約へのライン追加は invalid-state').toBe('invalid-state');
    expect((await countAll(actor.tenantId, reservation.id, [asset.id])).lines).toBe(1);
  } finally {
    await cleanup(actor.tenantId, reservation.id, [asset.id]);
  }
});

test('High-3 多明細fault: 2件目lineのfaultでdispatch全rollback（status=confirmed維持・Movement/usageCount不増）→解除後retryが1回だけ成功', async () => {
  const actor = await getActor();
  const assetA = await makeAsset(actor.tenantId, 5);
  const assetB = await makeAsset(actor.tenantId, 5);
  const reservation = await makeReservation(actor.tenantId);
  try {
    await addAssetToLeaseReservation(actor, { reservationId: reservation.id, assetId: assetA.id, quantity: 1, requestId: rid() });
    await addAssetToLeaseReservation(actor, { reservationId: reservation.id, assetId: assetB.id, quantity: 1, requestId: rid() });
    await confirmLeaseReservation(actor, reservation.id);
    const before = await prisma.productAsset.findMany({ where: { id: { in: [assetA.id, assetB.id] } }, select: { id: true, usageCount: true, status: true } });

    // 2件目 line（index 1）適用後に fault → 1件目の Movement/usageCount も含め**全て** rollback。
    await expect(
      dispatchLeaseReservation(actor, reservation.id, {
        __faultAfterLineIndexForTest: (i) => {
          if (i === 1) throw new Error('injected-fault:line-1');
        },
      }),
    ).rejects.toThrow('injected-fault:line-1');
    const mid = await countAll(actor.tenantId, reservation.id, [assetA.id, assetB.id]);
    expect(mid.dispatchMovements, 'fault で dispatch Movement 0（1件目も rollback）').toBe(0);
    expect((await prisma.leaseReservation.findUnique({ where: { id: reservation.id }, select: { status: true } }))!.status, 'status は confirmed のまま（CAS ごと rollback）').toBe('confirmed');
    const midAssets = await prisma.productAsset.findMany({ where: { id: { in: [assetA.id, assetB.id] } }, select: { id: true, usageCount: true, status: true } });
    expect(midAssets, 'usageCount/status は不変').toEqual(before);
    expect(mid.reservationEvents['LEASE_ITEM_DISPATCHED'] ?? 0).toBe(0);

    // 解除後 retry はちょうど1回成功（残骸に阻まれない・全 line 揃って確定）。
    const r = await dispatchLeaseReservation(actor, reservation.id);
    expect(r.ok, 'retry は成功').toBe(true);
    const c = await countAll(actor.tenantId, reservation.id, [assetA.id, assetB.id]);
    expect(c.dispatchMovements, '全 line の Movement が揃って1組').toBe(2);
    expect(c.movementGrowth, 'reserve 2 + dispatch 2 の Growth').toBe(4);
    expect(c.reservationEvents['LEASE_ITEM_DISPATCHED'] ?? 0).toBe(1);
    const after = await prisma.productAsset.findMany({ where: { id: { in: [assetA.id, assetB.id] } }, select: { id: true, usageCount: true } });
    for (const a of after) {
      const b = before.find((x) => x.id === a.id)!;
      expect(a.usageCount - b.usageCount, '各資産の usageCount は+1のみ').toBe(1);
    }
  } finally {
    await cleanup(actor.tenantId, reservation.id, [assetA.id, assetB.id]);
  }
});

test('High-3 並行replay: 同一予約への並列4 dispatch は勝者1本（Movement=line数・usageCount+1・イベント/Audit 各1）', async () => {
  const actor = await getActor();
  const asset = await makeAsset(actor.tenantId, 5);
  const reservation = await makeReservation(actor.tenantId);
  try {
    await addAssetToLeaseReservation(actor, { reservationId: reservation.id, assetId: asset.id, quantity: 2, requestId: rid() });
    await confirmLeaseReservation(actor, reservation.id);
    const before = await prisma.productAsset.findUnique({ where: { id: asset.id }, select: { usageCount: true } });

    const results = await Promise.all(Array.from({ length: 4 }, () => dispatchLeaseReservation(actor, reservation.id)));
    expect(results.filter((r) => r.ok).length, '勝者はちょうど1本').toBe(1);
    for (const r of results) {
      if (!r.ok) expect(r.reason, '敗者は already（書き込み0）').toBe('already');
    }
    const c = await countAll(actor.tenantId, reservation.id, [asset.id]);
    expect(c.dispatchMovements, 'Movement は line 数=1 のみ').toBe(1);
    expect(c.reservationEvents['LEASE_ITEM_DISPATCHED'] ?? 0, 'dispatch イベントは1').toBe(1);
    const after = await prisma.productAsset.findUnique({ where: { id: asset.id }, select: { usageCount: true } });
    expect(after!.usageCount - before!.usageCount, 'usageCount は+1のみ').toBe(1);
    // Audit: 予約レベルは confirm + dispatch の2件のみ（並列敗者の Audit なし）。
    expect(c.reservationAudit).toBe(2);
  } finally {
    await cleanup(actor.tenantId, reservation.id, [asset.id]);
  }
});

test('同一Asset複数line: 決定論lock順で deadlock せず、dispatch は line ごとに Movement（usageCount は line 数分）', async () => {
  const actor = await getActor();
  const asset = await makeAsset(actor.tenantId, 5);
  const reservation = await makeReservation(actor.tenantId);
  try {
    await addAssetToLeaseReservation(actor, { reservationId: reservation.id, assetId: asset.id, quantity: 1, requestId: rid() });
    await addAssetToLeaseReservation(actor, { reservationId: reservation.id, assetId: asset.id, quantity: 1, requestId: rid() });
    await confirmLeaseReservation(actor, reservation.id);
    const before = await prisma.productAsset.findUnique({ where: { id: asset.id }, select: { usageCount: true } });
    const r = await dispatchLeaseReservation(actor, reservation.id);
    expect(r.ok, '同一資産2ラインでも単一txで完走（deadlockなし）').toBe(true);
    const c = await countAll(actor.tenantId, reservation.id, [asset.id]);
    expect(c.dispatchMovements, 'line ごとに Movement').toBe(2);
    const after = await prisma.productAsset.findUnique({ where: { id: asset.id }, select: { usageCount: true } });
    expect(after!.usageCount - before!.usageCount, 'usageCount は line 数分（+2）').toBe(2);
  } finally {
    await cleanup(actor.tenantId, reservation.id, [asset.id]);
  }
});

test('境界の否定: 別tenant・不存在Asset/予約は notfound で書き込み0', async () => {
  const actor = await getActor();
  const asset = await makeAsset(actor.tenantId, 3);
  const reservation = await makeReservation(actor.tenantId);
  const s = stamp();
  const foreignTenant = await prisma.tenant.create({ data: { name: `LEASE-LC-FOREIGN-${s}` } });
  const foreignActor: LeaseActor = { tenantId: foreignTenant.id, userId: actor.userId };
  try {
    // 別 tenant からは実在の予約/資産にも到達できない（tenant 境界）。
    const addForeign = await addAssetToLeaseReservation(foreignActor, { reservationId: reservation.id, assetId: asset.id, quantity: 1, requestId: rid() });
    expect(addForeign.ok).toBe(false);
    if (!addForeign.ok) expect(addForeign.reason).toBe('notfound');
    for (const fn of [confirmLeaseReservation, dispatchLeaseReservation, returnLeaseReservation]) {
      const r = await fn(foreignActor, reservation.id);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason, '別tenantの lifecycle 遷移は notfound').toBe('notfound');
    }
    // 不存在 Asset / 予約。
    const addNoAsset = await addAssetToLeaseReservation(actor, { reservationId: reservation.id, assetId: 'asset_does_not_exist_0', quantity: 1, requestId: rid() });
    expect(addNoAsset.ok).toBe(false);
    if (!addNoAsset.ok) expect(addNoAsset.reason).toBe('notfound');
    const addNoRsv = await addAssetToLeaseReservation(actor, { reservationId: 'rsv_does_not_exist_0000', assetId: asset.id, quantity: 1, requestId: rid() });
    expect(addNoRsv.ok).toBe(false);
    if (!addNoRsv.ok) expect(addNoRsv.reason).toBe('notfound');
    // 書き込み0（予約は reserved のまま・ライン/Movement なし）。
    const c = await countAll(actor.tenantId, reservation.id, [asset.id]);
    expect(c.lines).toBe(0);
    expect(c.reserveMovements + c.dispatchMovements + c.returnMovements).toBe(0);
    expect((await prisma.leaseReservation.findUnique({ where: { id: reservation.id }, select: { status: true } }))!.status).toBe('reserved');
  } finally {
    await cleanup(actor.tenantId, reservation.id, [asset.id]);
    await prisma.tenant.delete({ where: { id: foreignTenant.id } });
  }
});
