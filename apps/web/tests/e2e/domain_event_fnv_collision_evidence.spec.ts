import { test, expect } from '@playwright/test';
import { prisma } from '@hokko/db';
import {
  makeIdempotencyKey,
  makeLegacyIdempotencyKey,
  makeCanonicalIdempotencyKey,
  EventIdentityCollisionError,
} from '@hokko/shared';
import { emitDomainEvent } from '../../lib/events';

// 修正版 Phase A（369-PADN-V5）: legacy FNV 32bit キーの**実衝突ペア**による決定論試験。
// required_tests 8（design_verdict_D item 8・ID-3/ID-4 修正込み）。
//  - 共存試験: canonical exact 行と FNV 衝突 legacy 行が併存しても、canonical-first の検証付き dual-read が
//    正本（canonical 行）へ収束し、衝突 legacy 行へ**誤収束しない**（PA-BLK-4）。
//  - 単独衝突試験: legacy キーが別 identity に占有されている場合、emit は typed
//    EventIdentityCollisionError で **fail-closed**（新規行 0・L 行不変・総数不変・ID-3/ID-4。
//    誤収束・キー変形・握り潰しをしない。復旧経路は Phase B canonical writer）。
// 衝突ペアは design_verdict_D fnv_collision 節の実測値（node 探索・31,750 試行）。FNV 状態は tenant prefix
// 依存のため tenant 文字列を固定し、**衝突の実在を spec 内 expect で毎回機械確認**する。
// 外部送信・Webhook 配送は一切なし。DomainEvent.tenantId はスカラ（FK 無し）＝専用 tenant 文字列で隔離。

const T = 'tenant-padn-phasea2-fnv';
// identity X（emit を行う側）と、X の legacy キーを占有する別 identity（衝突行 L）。
const AGG_X = 'cos548t95wxp466fnpjhju38e';
const AGG_L = 'cwkr44pwctu472mwavgtao6ix';
const COLLIDING_KEY = 'PAYMENT_RECEIVED:8dbc05a9';

async function cleanupTenant(): Promise<void> {
  const evs = await prisma.domainEvent.findMany({ where: { tenantId: T }, select: { id: true } });
  await prisma.outboxMessage.deleteMany({ where: { tenantId: T, eventId: { in: evs.map((e) => e.id) } } });
  await prisma.domainEvent.deleteMany({ where: { tenantId: T } });
}

test.beforeEach(async () => {
  // 再実行 / --repeat-each 安全: 専用 tenant の残骸を先に掃除（作成行は本 tenant に閉じる）。
  await cleanupTenant();
});

test.afterAll(async () => {
  await cleanupTenant();
  await prisma.$disconnect();
});

/** 衝突の実在を毎回機械確認（encoding が 1 byte でも変われば即 fail し fixture の前提崩壊を検出）。 */
function assertCollisionIsReal(): void {
  expect(makeIdempotencyKey({ tenantId: T, eventType: 'PAYMENT_RECEIVED', aggregateId: AGG_X, dedupe: '' })).toBe(COLLIDING_KEY);
  expect(makeIdempotencyKey({ tenantId: T, eventType: 'PAYMENT_RECEIVED', aggregateId: AGG_L, dedupe: '' })).toBe(COLLIDING_KEY);
  expect(makeLegacyIdempotencyKey({ tenantId: T, eventType: 'PAYMENT_RECEIVED', aggregateId: AGG_X })).toBe(COLLIDING_KEY);
  expect(AGG_X).not.toBe(AGG_L);
}

test('共存試験: canonical exact 行と FNV 衝突 legacy 行が併存 → canonical 正本へ収束し衝突行へ誤収束しない・総数不変', async () => {
  assertCollisionIsReal();
  const canonicalKey = makeCanonicalIdempotencyKey({ tenantId: T, eventType: 'PAYMENT_RECEIVED', aggregateId: AGG_X, dedupe: '' });
  expect(canonicalKey).not.toBe(COLLIDING_KEY);

  // L: X の legacy キーを占有する**別 identity**（aggregateId=AGG_L）の legacy 行（契約導入前形状・idem 無し）。
  const rowL = await prisma.domainEvent.create({
    data: {
      tenantId: T, eventType: 'PAYMENT_RECEIVED', aggregateType: 'Invoice', aggregateId: AGG_L, actorType: 'user',
      idempotencyKey: COLLIDING_KEY, status: 'pending',
    },
  });
  // C: X の canonical 完全一致行（Phase B 形状）。キー文字列が異なるため unique 非抵触で併存できる。
  const rowC = await prisma.domainEvent.create({
    data: {
      tenantId: T, eventType: 'PAYMENT_RECEIVED', aggregateType: 'Invoice', aggregateId: AGG_X, actorType: 'user',
      payload: { idem: { aggregateType: 'Invoice', aggregateId: AGG_X, dedupe: '', enc: 'canonical', v: 1 } },
      idempotencyKey: canonicalKey, status: 'pending',
    },
  });

  const r = await emitDomainEvent({ tenantId: T, eventType: 'PAYMENT_RECEIVED', aggregateType: 'Invoice', aggregateId: AGG_X });
  expect(r.duplicated, 'X の emit は既存へ収束').toBe(true);
  expect(r.eventId, 'canonical 完全一致行（正本）へ収束し、衝突 legacy 行 L へ誤収束しない').toBe(rowC.id);
  expect(r.eventId).not.toBe(rowL.id);

  expect(await prisma.domainEvent.count({ where: { tenantId: T } }), '総行数不変（L+C の 2 件のまま）').toBe(2);
  // L は全列不変（reader は他人の行に触らない）。
  const lAfter = await prisma.domainEvent.findUnique({
    where: { id: rowL.id },
    select: { tenantId: true, eventType: true, aggregateType: true, aggregateId: true, idempotencyKey: true, status: true, payload: true },
  });
  expect(lAfter).toEqual({
    tenantId: T, eventType: 'PAYMENT_RECEIVED', aggregateType: 'Invoice', aggregateId: AGG_L,
    idempotencyKey: COLLIDING_KEY, status: 'pending', payload: null,
  });
});

test('単独衝突試験: legacy キーが別 identity に占有 → typed EventIdentityCollisionError で fail-closed・新規行 0・L 行不変', async () => {
  assertCollisionIsReal();

  // L のみ存在（X の canonical 行は無い）= X の legacy キーが真に衝突占有された状態。
  const rowL = await prisma.domainEvent.create({
    data: {
      tenantId: T, eventType: 'PAYMENT_RECEIVED', aggregateType: 'Invoice', aggregateId: AGG_L, actorType: 'user',
      idempotencyKey: COLLIDING_KEY, status: 'pending',
    },
  });

  let thrown: unknown = null;
  try {
    await emitDomainEvent({ tenantId: T, eventType: 'PAYMENT_RECEIVED', aggregateType: 'Invoice', aggregateId: AGG_X });
  } catch (e) {
    thrown = e;
  }
  // typed fail-closed（ID-3/ID-4）: 他人の行 ID を返さない・キーを変形して書かない・黙って落とさない。
  expect(thrown, '衝突は例外として顕在化する（silent drop しない）').toBeTruthy();
  expect(thrown).toBeInstanceOf(EventIdentityCollisionError);
  const err = thrown as EventIdentityCollisionError;
  expect(err.name).toBe('EventIdentityCollisionError');
  expect(err.tenantId).toBe(T);
  expect(err.eventType).toBe('PAYMENT_RECEIVED');
  expect(err.aggregateId, '衝突を報告するのは emit しようとした identity X').toBe(AGG_X);
  expect(err.legacyKey).toBe(COLLIDING_KEY);

  // 新規行 0（X の行は作られない）・L 行不変・総数不変（fail-closed の物的証拠）。
  expect(await prisma.domainEvent.count({ where: { tenantId: T, aggregateId: AGG_X } }), 'X の新規行 0').toBe(0);
  expect(await prisma.domainEvent.count({ where: { tenantId: T } }), '総行数不変（L の 1 件のみ）').toBe(1);
  expect(await prisma.outboxMessage.count({ where: { tenantId: T } }), 'Outbox 増分 0').toBe(0);
  const lAfter = await prisma.domainEvent.findUnique({
    where: { id: rowL.id },
    select: { tenantId: true, eventType: true, aggregateType: true, aggregateId: true, idempotencyKey: true, status: true, payload: true },
  });
  expect(lAfter).toEqual({
    tenantId: T, eventType: 'PAYMENT_RECEIVED', aggregateType: 'Invoice', aggregateId: AGG_L,
    idempotencyKey: COLLIDING_KEY, status: 'pending', payload: null,
  });
});
