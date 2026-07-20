import { test, expect } from '@playwright/test';
import { prisma } from '@hokko/db';
import type { DomainEventType } from '@hokko/shared';
import {
  assignAssetToEvent,
  recordLeaseDamage,
  assignEventStaff,
  type Actor,
} from '../../lib/domains/operations/events';
import { emitGrowthEvent } from '../../lib/growth';

// CODEX E-03（M1-b round2）実 PostgreSQL 証拠 — OPERATIONS レーン（asset/damage/staff）。
// round1 で $transaction 化された3経路の「transaction が存在する」ことでは証明できない主張を、
// test-only fault 注入（events.ts の OperationsTestHooks・本番未指定時は無作用）で実 DB 実証する:
//  1. Event asset 割当: EventProductUsage ＋ reserve Movement ＋ asset status/quantity が all-or-nothing。
//     Movement 直前 fault で Usage 0（孤児 usage なし）。post-commit Growth 失敗後、core は単一 commit で
//     確定済みのため、Growth-only の冪等 retry は DomainEvent/Outbox を 1 に収束し usage/reserve を増やさない。
//  2. Lease damage: DamageLossRecord ＋ damage Movement ＋ asset status(→maintenance)/condition(→broken)
//     が all-or-nothing。Movement 直前 fault で DamageLossRecord 0・asset 不変。
//  3. Event staff: EventStaffAssignment.costRecorded ＋ EventCost ＋ Audit が整合。cost/audit 直前 fault で
//     全 0。post-commit Growth 失敗後の Growth-only 冪等 retry は assignment を重複させない。
// Prisma mock は使わず最終行を re-fetch。fixture/cleanup は本テスト生成 ID に限定（seed 非削除）。
// 実行前提は他 evidence spec と同一（seed 済みローカル/CI 使い捨て PostgreSQL・retries=0）。

function assertLocalDatabaseUrl(): void {
  let host = '';
  try {
    host = new URL(process.env.DATABASE_URL ?? '').hostname;
  } catch {
    host = '';
  }
  if (host !== 'localhost' && host !== '127.0.0.1') {
    throw new Error(
      `TEST_ENVIRONMENT_APPROVAL_REQUIRED: DATABASE_URL host="${host}" は使い捨てローカル/CI service と機械確認できません`,
    );
  }
}

let seq = 0;
function stamp(): string {
  seq += 1;
  return `${process.pid}-${Date.now()}-${seq}`;
}

async function getActor(): Promise<Actor & { userId: string }> {
  const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { id: true, tenantId: true } });
  expect(ceo, 'seed の CEO ユーザーが存在する').not.toBeNull();
  return { tenantId: ceo!.tenantId, userId: ceo!.id };
}

async function makeAsset(tenantId: string, quantity: number, status = 'available') {
  const s = stamp();
  return prisma.productAsset.create({
    data: { tenantId, code: `OA${s}`.slice(0, 12), name: `OPS-AT-${s}`, quantity, status, condition: 'good' },
    select: { id: true, name: true, quantity: true, status: true, condition: true },
  });
}

async function makeEvent(tenantId: string) {
  const s = stamp();
  return prisma.eventProject.create({
    data: { tenantId, name: `OPS-AT-EVT-${s}`, status: 'planned' },
    select: { id: true, name: true },
  });
}

// ---- 集計（本テスト生成の書き込み面を eventId/assetId でスコープ）----
async function equipmentGrowthCounts(tenantId: string, eventId: string) {
  const events = await prisma.domainEvent.findMany({
    where: { tenantId, eventType: 'EVENT_EQUIPMENT_ASSIGNED', aggregateId: eventId },
    select: { id: true },
  });
  const outbox = await prisma.outboxMessage.count({ where: { eventId: { in: events.map((e) => e.id) } } });
  const growth = await prisma.growthEvent.count({ where: { tenantId, type: 'event.equipment.assigned', entityId: eventId } });
  return { domainEvents: events.length, outbox, growth };
}

async function staffGrowthCounts(tenantId: string, eventId: string) {
  const events = await prisma.domainEvent.findMany({
    where: { tenantId, eventType: 'EVENT_STAFF_ASSIGNED', aggregateId: eventId },
    select: { id: true },
  });
  const outbox = await prisma.outboxMessage.count({ where: { eventId: { in: events.map((e) => e.id) } } });
  const growth = await prisma.growthEvent.count({ where: { tenantId, type: 'event.staff.assigned', entityId: eventId } });
  return { domainEvents: events.length, outbox, growth };
}

async function cleanupEventAsset(tenantId: string, eventId: string, assetId: string) {
  const movements = await prisma.inventoryMovement.findMany({ where: { tenantId, OR: [{ eventId }, { assetId }] }, select: { id: true } });
  const movementIds = movements.map((m) => m.id);
  const domainEvents = await prisma.domainEvent.findMany({
    where: { tenantId, OR: [{ aggregateType: 'EventProject', aggregateId: eventId }, { aggregateType: 'ProductAsset', aggregateId: assetId }] },
    select: { id: true },
  });
  await prisma.outboxMessage.deleteMany({ where: { eventId: { in: domainEvents.map((e) => e.id) } } });
  await prisma.domainEvent.deleteMany({ where: { id: { in: domainEvents.map((e) => e.id) } } });
  await prisma.growthEvent.deleteMany({ where: { tenantId, entityId: { in: [eventId, assetId, ...movementIds] } } });
  await prisma.auditLog.deleteMany({ where: { tenantId, entityType: 'InventoryMovement', entityId: { in: movementIds } } });
  await prisma.inventoryMovement.deleteMany({ where: { id: { in: movementIds } } });
  await prisma.eventProductUsage.deleteMany({ where: { tenantId, eventId } });
  await prisma.eventProject.deleteMany({ where: { id: eventId } });
  await prisma.productAsset.deleteMany({ where: { id: assetId } });
}

async function cleanupEventStaff(tenantId: string, eventId: string, marker: string) {
  const domainEvents = await prisma.domainEvent.findMany({ where: { tenantId, aggregateType: 'EventProject', aggregateId: eventId }, select: { id: true } });
  await prisma.outboxMessage.deleteMany({ where: { eventId: { in: domainEvents.map((e) => e.id) } } });
  await prisma.domainEvent.deleteMany({ where: { id: { in: domainEvents.map((e) => e.id) } } });
  await prisma.growthEvent.deleteMany({ where: { tenantId, entityId: eventId } });
  await prisma.auditLog.deleteMany({ where: { tenantId, entityType: 'EventStaffAssignment', summary: { contains: marker } } });
  await prisma.eventCost.deleteMany({ where: { tenantId, eventId } });
  await prisma.eventStaffAssignment.deleteMany({ where: { tenantId, eventId } });
  await prisma.eventProject.deleteMany({ where: { id: eventId } });
}

async function cleanupDamage(tenantId: string, assetId: string) {
  const movements = await prisma.inventoryMovement.findMany({ where: { tenantId, assetId }, select: { id: true } });
  const movementIds = movements.map((m) => m.id);
  await prisma.auditLog.deleteMany({ where: { tenantId, entityType: 'InventoryMovement', entityId: { in: movementIds } } });
  await prisma.inventoryMovement.deleteMany({ where: { id: { in: movementIds } } });
  await prisma.damageLossRecord.deleteMany({ where: { tenantId, assetId } });
  await prisma.productAsset.deleteMany({ where: { id: assetId } });
}

test.beforeAll(() => {
  assertLocalDatabaseUrl();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('E-03 event asset: Usage＋reserve Movement＋asset は all-or-nothing（Movement直前faultでUsage0・asset不変）', async () => {
  const actor = await getActor();
  const event = await makeEvent(actor.tenantId);
  const asset = await makeAsset(actor.tenantId, 5);
  try {
    // Movement 直前（Usage 作成後）に fault = reserve Movement 失敗相当 → tx 全 rollback。
    await expect(
      assignAssetToEvent(
        actor,
        { eventId: event.id, assetId: asset.id, quantity: 2 },
        {
          __faultBetweenWritesForTest: () => {
            throw new Error('injected-fault:before-reserve-movement');
          },
        },
      ),
    ).rejects.toThrow('injected-fault:before-reserve-movement');
    expect(await prisma.eventProductUsage.count({ where: { tenantId: actor.tenantId, eventId: event.id } }), 'fault で Usage 0（孤児 usage なし）').toBe(0);
    expect(await prisma.inventoryMovement.count({ where: { tenantId: actor.tenantId, eventId: event.id, type: 'reserve' } }), 'reserve Movement も 0').toBe(0);
    const assetMid = await prisma.productAsset.findUnique({ where: { id: asset.id }, select: { status: true, quantity: true } });
    expect(assetMid, 'asset は不変（status=available・quantity 据置）').toEqual({ status: 'available', quantity: 5 });

    // 肯定対照: fault 無しで Usage＋reserve Movement＋asset(status=reserved) が同一 tx で揃う。
    const r = await assignAssetToEvent(actor, { eventId: event.id, assetId: asset.id, quantity: 2 });
    expect(r.ok).toBe(true);
    expect(await prisma.eventProductUsage.count({ where: { tenantId: actor.tenantId, eventId: event.id } })).toBe(1);
    expect(await prisma.inventoryMovement.count({ where: { tenantId: actor.tenantId, eventId: event.id, type: 'reserve' } })).toBe(1);
    const assetAfter = await prisma.productAsset.findUnique({ where: { id: asset.id }, select: { status: true, quantity: true } });
    expect(assetAfter, 'reserve で status=reserved・quantity は不変').toEqual({ status: 'reserved', quantity: 5 });
    const g = await equipmentGrowthCounts(actor.tenantId, event.id);
    expect(g, 'post-commit Growth（DomainEvent/Outbox/Growth 各1）が発火').toEqual({ domainEvents: 1, outbox: 1, growth: 1 });
  } finally {
    await cleanupEventAsset(actor.tenantId, event.id, asset.id);
  }
});

test('E-03 event asset post-commit Growth: commit後fault→core永続・Growth未発火→Growth-only冪等retryでusage/reserve不増', async () => {
  const actor = await getActor();
  const event = await makeEvent(actor.tenantId);
  const asset = await makeAsset(actor.tenantId, 5);
  try {
    // core（Usage＋Movement＋asset）は commit 済み、post-commit Growth 直前で fault → action は reject。
    await expect(
      assignAssetToEvent(
        actor,
        { eventId: event.id, assetId: asset.id, quantity: 1 },
        {
          __faultAfterCommitForTest: () => {
            throw new Error('injected-fault:post-commit-growth');
          },
        },
      ),
    ).rejects.toThrow('injected-fault:post-commit-growth');
    // core は単一 commit で確定済み。Growth（非クリティカル）は未発火。
    expect(await prisma.eventProductUsage.count({ where: { tenantId: actor.tenantId, eventId: event.id } }), 'core Usage は commit 済み(1)').toBe(1);
    expect(await prisma.inventoryMovement.count({ where: { tenantId: actor.tenantId, eventId: event.id, type: 'reserve' } }), 'core reserve Movement は commit 済み(1)').toBe(1);
    expect(await equipmentGrowthCounts(actor.tenantId, event.id), 'post-commit Growth は未発火(0)').toEqual({ domainEvents: 0, outbox: 0, growth: 0 });

    // Growth-only の resume（失敗した post-commit ステップだけを再実行）。core 業務行は触らない。
    const resume = () =>
      emitGrowthEvent({
        tenantId: actor.tenantId,
        type: 'event.equipment.assigned',
        title: `備品割当: ${asset.name} → ${event.name}`,
        actorId: actor.userId,
        entityType: 'EventProject',
        entityId: event.id,
        alsoDomainEvent: { domainType: 'EVENT_EQUIPMENT_ASSIGNED' as DomainEventType, aggregateType: 'EventProject', aggregateId: event.id },
      });
    await resume();
    const g1 = await equipmentGrowthCounts(actor.tenantId, event.id);
    expect(g1.domainEvents, 'resume で DomainEvent 1').toBe(1);
    expect(g1.outbox, 'resume で Outbox 1').toBe(1);
    // 冪等性: 同一 identity(EVENT_EQUIPMENT_ASSIGNED × eventId) の再 emit は DomainEvent/Outbox を増やさない。
    await resume();
    const g2 = await equipmentGrowthCounts(actor.tenantId, event.id);
    expect(g2.domainEvents, 'retry しても DomainEvent は 1 に収束（重複なし）').toBe(1);
    expect(g2.outbox, 'Outbox も 1 のまま').toBe(1);
    // 主張の中心: Growth の失敗/retry は core 業務行（usage/reserve）を一切増やさない。
    expect(await prisma.eventProductUsage.count({ where: { tenantId: actor.tenantId, eventId: event.id } }), 'usage は 1 のまま（retry で重複しない）').toBe(1);
    expect(await prisma.inventoryMovement.count({ where: { tenantId: actor.tenantId, eventId: event.id, type: 'reserve' } }), 'reserve も 1 のまま').toBe(1);
  } finally {
    await cleanupEventAsset(actor.tenantId, event.id, asset.id);
  }
});

test('E-03 lease damage: DamageLossRecord＋damage Movement＋asset(status/condition) が all-or-nothing', async () => {
  const actor = await getActor();
  const asset = await makeAsset(actor.tenantId, 1);
  try {
    // Movement 直前（DamageLossRecord 作成後）に fault → tx 全 rollback。
    await expect(
      recordLeaseDamage(
        actor,
        { assetId: asset.id, cost: 12000, note: `破損-${stamp()}` },
        {
          __faultBetweenWritesForTest: () => {
            throw new Error('injected-fault:before-damage-movement');
          },
        },
      ),
    ).rejects.toThrow('injected-fault:before-damage-movement');
    expect(await prisma.damageLossRecord.count({ where: { tenantId: actor.tenantId, assetId: asset.id } }), 'fault で DamageLossRecord 0').toBe(0);
    expect(await prisma.inventoryMovement.count({ where: { tenantId: actor.tenantId, assetId: asset.id, type: 'damage' } }), 'damage Movement も 0').toBe(0);
    const assetMid = await prisma.productAsset.findUnique({ where: { id: asset.id }, select: { status: true, condition: true } });
    expect(assetMid, 'asset は不変（available/good）').toEqual({ status: 'available', condition: 'good' });

    // 肯定対照: 記録＋Movement＋asset(status=maintenance/condition=broken) が同一 tx で揃う。
    const r = await recordLeaseDamage(actor, { assetId: asset.id, cost: 12000, note: '破損記録' });
    expect(r.ok).toBe(true);
    expect(await prisma.damageLossRecord.count({ where: { tenantId: actor.tenantId, assetId: asset.id } })).toBe(1);
    expect(await prisma.inventoryMovement.count({ where: { tenantId: actor.tenantId, assetId: asset.id, type: 'damage' } })).toBe(1);
    const assetAfter = await prisma.productAsset.findUnique({ where: { id: asset.id }, select: { status: true, condition: true } });
    expect(assetAfter, 'damage で status=maintenance・condition=broken').toEqual({ status: 'maintenance', condition: 'broken' });
  } finally {
    await cleanupDamage(actor.tenantId, asset.id);
  }
});

test('E-03 event staff: Assignment.costRecorded＋EventCost＋Audit が整合（cost/audit直前faultで全0）', async () => {
  const actor = await getActor();
  const event = await makeEvent(actor.tenantId);
  const marker = `STAFF-${stamp()}`;
  try {
    // Assignment 作成後・EventCost/Audit 前に fault → tx 全 rollback（Assignment も消える）。
    await expect(
      assignEventStaff(actor, event.id, `${marker}-A`, 'lead', 50000, {
        __faultBetweenWritesForTest: () => {
          throw new Error('injected-fault:before-cost');
        },
      }),
    ).rejects.toThrow('injected-fault:before-cost');
    expect(await prisma.eventStaffAssignment.count({ where: { tenantId: actor.tenantId, eventId: event.id } }), 'fault で Assignment 0').toBe(0);
    expect(await prisma.eventCost.count({ where: { tenantId: actor.tenantId, eventId: event.id } }), 'EventCost 0').toBe(0);
    expect(await prisma.auditLog.count({ where: { tenantId: actor.tenantId, entityType: 'EventStaffAssignment', summary: { contains: marker } } }), 'Audit 0').toBe(0);

    // 肯定対照: cost>0 で Assignment(costRecorded=true)＋EventCost＋Audit が同一 tx で揃う。
    expect(await assignEventStaff(actor, event.id, `${marker}-A`, 'lead', 50000)).toBe(true);
    const assignments = await prisma.eventStaffAssignment.findMany({ where: { tenantId: actor.tenantId, eventId: event.id }, select: { costRecorded: true } });
    expect(assignments.length, 'Assignment 1').toBe(1);
    expect(assignments[0]!.costRecorded, 'costRecorded=true（cost>0）').toBe(true);
    expect(await prisma.eventCost.count({ where: { tenantId: actor.tenantId, eventId: event.id, category: { startsWith: '人件費' } } }), 'EventCost 1').toBe(1);
    expect(await prisma.auditLog.count({ where: { tenantId: actor.tenantId, entityType: 'EventStaffAssignment', summary: { contains: marker } } }), 'Audit 1').toBe(1);
    expect(await staffGrowthCounts(actor.tenantId, event.id), 'post-commit Growth 各1').toEqual({ domainEvents: 1, outbox: 1, growth: 1 });
  } finally {
    await cleanupEventStaff(actor.tenantId, event.id, marker);
  }
});

test('E-03 event staff post-commit Growth: commit後fault→core永続→Growth-only冪等retryでassignment不増', async () => {
  const actor = await getActor();
  const event = await makeEvent(actor.tenantId);
  const marker = `STAFF-${stamp()}`;
  try {
    await expect(
      assignEventStaff(actor, event.id, `${marker}-B`, 'staff', 30000, {
        __faultAfterCommitForTest: () => {
          throw new Error('injected-fault:staff-post-commit');
        },
      }),
    ).rejects.toThrow('injected-fault:staff-post-commit');
    // core（Assignment＋EventCost＋Audit）は単一 commit で確定済み。Growth は未発火。
    expect(await prisma.eventStaffAssignment.count({ where: { tenantId: actor.tenantId, eventId: event.id } }), 'core Assignment 1').toBe(1);
    expect(await prisma.eventCost.count({ where: { tenantId: actor.tenantId, eventId: event.id } }), 'core EventCost 1').toBe(1);
    expect(await prisma.auditLog.count({ where: { tenantId: actor.tenantId, entityType: 'EventStaffAssignment', summary: { contains: marker } } }), 'core Audit 1').toBe(1);
    expect(await staffGrowthCounts(actor.tenantId, event.id), 'Growth 未発火(0)').toEqual({ domainEvents: 0, outbox: 0, growth: 0 });

    const resume = () =>
      emitGrowthEvent({
        tenantId: actor.tenantId,
        type: 'event.staff.assigned',
        title: `人員配置: ${marker}-B → ${event.name}`,
        actorId: actor.userId,
        entityType: 'EventProject',
        entityId: event.id,
        metric: { cost: 30000, role: 'staff' },
        alsoDomainEvent: { domainType: 'EVENT_STAFF_ASSIGNED' as DomainEventType, aggregateType: 'EventProject', aggregateId: event.id },
      });
    await resume();
    await resume();
    const g = await staffGrowthCounts(actor.tenantId, event.id);
    expect(g.domainEvents, 'Growth-only retry でも DomainEvent は 1 に収束').toBe(1);
    expect(g.outbox, 'Outbox も 1').toBe(1);
    // 主張の中心: Growth の失敗/retry は core の assignment を重複させない。
    expect(await prisma.eventStaffAssignment.count({ where: { tenantId: actor.tenantId, eventId: event.id } }), 'assignment は 1 のまま（retry で重複しない）').toBe(1);
    expect(await prisma.eventCost.count({ where: { tenantId: actor.tenantId, eventId: event.id } }), 'EventCost も 1 のまま').toBe(1);
  } finally {
    await cleanupEventStaff(actor.tenantId, event.id, marker);
  }
});
