import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { prisma, PrismaClient } from '@hokko/db';
import {
  makeCanonicalIdempotencyKey,
  makeLegacyIdempotencyKey,
  makeEventIdentityLockMaterial,
  idempotencyKeyMatchesIdentity,
  legacyRowMatchesIdentity,
  derivePaymentRequestId,
  invoiceStatusAfterPayment,
  receivableStatusAfterPayment,
} from '@hokko/shared';
import { emitDomainEvent } from '../../lib/events';
import { recordInvoicePayment } from '../../lib/domains/finance/payments';

// 修正版 Phase A（369-PADN-V5）: tenant 独立性（ID-5）と mixed-version 同時 writer（PA-BLK-3）の
// 実 PostgreSQL 証拠。required_tests 6 / 7（design_verdict_D item 6/7・ID-5 完全独立性へ昇格）。
//  - item 6: 同じ token を異なる tenant で使用しても**双方成功**（derived ID が構造的に相違）・相互の
//    データ非変異・各 tenant 内で idempotent 収束。event 層は @@unique([tenantId,idempotencyKey]) による分離。
//  - item 7: Phase A（本実装）と改訂 Phase B（cda7188 の tx シーケンスを ID-1/ID-2 conformance へ改訂した
//    replica・専用 PrismaClient=別 backend）の同時 writer で Event/Outbox/Payment 各 1 件。
//    barrier の行使は pg_blocking_pids の**観測ゲート**で機械確認（タイマー非依存・縮退直列実行を green にしない）。
// 外部送信・Webhook 配送・実 LLM は一切なし。cleanup は本テスト作成行に限定。

const mkKey = () => `c${randomUUID().replace(/-/g, '').slice(0, 24)}`;

async function tenantId(): Promise<string> {
  const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { tenantId: true } });
  return ceo!.tenantId;
}
async function ceoUserId(): Promise<string> {
  const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { id: true } });
  return ceo!.id;
}
async function makeIssuedInvoiceFor(t: string, total: number): Promise<string> {
  const inv = await prisma.invoice.create({
    data: {
      tenantId: t, number: `INV-PA2MX-${process.pid}-${Date.now()}-${Math.floor(performance.now())}`.slice(0, 40), status: 'ISSUED', issueDate: new Date(), dueDate: new Date(),
      subtotal: total, taxAmount: 0, total, paidAmount: 0,
      receivable: { create: { tenantId: t, amount: total, dueDate: new Date(), status: 'open' } },
    },
  });
  return inv.id;
}

async function cleanupInvoiceFor(t: string, id: string) {
  const payIds = (await prisma.payment.findMany({ where: { invoiceId: id }, select: { id: true } })).map((p) => p.id);
  const evs = await prisma.domainEvent.findMany({ where: { tenantId: t, aggregateId: id }, select: { id: true } });
  await prisma.outboxMessage.deleteMany({ where: { tenantId: t, eventId: { in: evs.map((e) => e.id) } } });
  await prisma.growthEvent.deleteMany({ where: { tenantId: t, entityId: { in: [id, ...payIds] } } });
  await prisma.domainEvent.deleteMany({ where: { tenantId: t, aggregateId: id } });
  await prisma.auditLog.deleteMany({ where: { tenantId: t, entityId: id, action: 'payment_record' } });
  await prisma.financeEvent.deleteMany({ where: { tenantId: t, sourceId: id } });
  await prisma.payment.deleteMany({ where: { invoiceId: id } });
  await prisma.receivable.deleteMany({ where: { invoiceId: id } });
  await prisma.invoice.deleteMany({ where: { id } });
}

// 決定論 barrier: holder backend を根とする blocking graph（直接 block＋既計上 waiter 経由の
// tuple-lock queue 閉包）に、入金 FOR UPDATE 待ち waiter が n 本入るまで観測する
//（cda7188 payment_idempotency_evidence の実証済み手法を踏襲・タイマー非依存）。
async function waitForWaitersBlockedBy(monitor: PrismaClient, holderPid: number, n: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const rows = await monitor.$queryRaw<Array<{ pid: number; blockers: number[] }>>`
      SELECT pid, pg_blocking_pids(pid) AS blockers FROM pg_stat_activity
      WHERE pid <> ${holderPid}
        AND cardinality(pg_blocking_pids(pid)) > 0
        AND query LIKE '%SELECT status FROM "Invoice"%FOR UPDATE%'`;
    const counted = new Set<number>();
    let grown = true;
    while (grown) {
      grown = false;
      for (const r of rows) {
        if (counted.has(r.pid)) continue;
        if (r.blockers.includes(holderPid) || r.blockers.some((b) => counted.has(b))) {
          counted.add(r.pid);
          grown = true;
        }
      }
    }
    if (counted.size >= n) return;
    if (Date.now() > deadline) throw new Error(`barrier: holder(pid=${holderPid}) の blocking graph に waiter ${n} 本を ${timeoutMs}ms 以内に観測できなかった`);
    await new Promise((r) => setTimeout(r, 40));
  }
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('required_tests 6（event 層）: 同一 identity 成分でも別 tenant の emit は独立に新規作成され、他 tenant の行は不変', async () => {
  const T1 = 'tenant-padn-phasea2-mix-ev-1';
  const T2 = 'tenant-padn-phasea2-mix-ev-2';
  // 再実行/repeat-each 安全: 専用 tenant 文字列の残骸を先に掃除（DomainEvent.tenantId はスカラ・FK 無し）。
  for (const tn of [T1, T2]) {
    const old = await prisma.domainEvent.findMany({ where: { tenantId: tn }, select: { id: true } });
    await prisma.outboxMessage.deleteMany({ where: { tenantId: tn, eventId: { in: old.map((e) => e.id) } } });
    await prisma.domainEvent.deleteMany({ where: { tenantId: tn } });
  }
  const token = mkKey();
  const aggregateId = `inv-mix-ev-${process.pid}-${Date.now()}`;
  try {
    // T1 に canonical 行（Phase B 形状・非空 dedupe）を seed。
    const t1Key = makeCanonicalIdempotencyKey({ tenantId: T1, eventType: 'PAYMENT_RECEIVED', aggregateId, dedupe: token });
    const t1Row = await prisma.domainEvent.create({
      data: {
        tenantId: T1, eventType: 'PAYMENT_RECEIVED', aggregateType: 'Invoice', aggregateId, actorType: 'user',
        payload: { idem: { aggregateType: 'Invoice', aggregateId, dedupe: token, enc: 'canonical', v: 1 } },
        idempotencyKey: t1Key, status: 'pending',
      },
    });
    // T2 で同一 identity 成分（eventType/aggregateId/dedupe）を emit → tenant が異なるため**新規作成**。
    const r = await emitDomainEvent({ tenantId: T2, eventType: 'PAYMENT_RECEIVED', aggregateType: 'Invoice', aggregateId, dedupe: token });
    expect(r.duplicated, '別 tenant の同一成分 identity へ誤収束しない').toBe(false);
    expect(r.eventId).not.toBe(t1Row.id);
    expect(await prisma.domainEvent.count({ where: { tenantId: T1, aggregateId } }), 'T1 は 1 件のまま').toBe(1);
    expect(await prisma.domainEvent.count({ where: { tenantId: T2, aggregateId } }), 'T2 に 1 件（イベントを失わない）').toBe(1);
    // T1 行は byte 不変。
    const t1After = await prisma.domainEvent.findUnique({ where: { id: t1Row.id }, select: { idempotencyKey: true, tenantId: true, status: true } });
    expect(t1After).toEqual({ idempotencyKey: t1Key, tenantId: T1, status: 'pending' });
  } finally {
    for (const tn of [T1, T2]) {
      const evs = await prisma.domainEvent.findMany({ where: { tenantId: tn }, select: { id: true } });
      await prisma.outboxMessage.deleteMany({ where: { tenantId: tn, eventId: { in: evs.map((e) => e.id) } } });
      await prisma.domainEvent.deleteMany({ where: { tenantId: tn } });
    }
  }
});

test('required_tests 6（payment 層・ID-5 完全独立性）: 同じ token を別 tenant で使用しても双方成功・相互非変異・各 tenant 内で冪等収束', async () => {
  const t1 = await tenantId();
  const uid = await ceoUserId();
  const token = mkKey();
  const inv1 = await makeIssuedInvoiceFor(t1, 100000);
  const tenant2 = await prisma.tenant.create({ data: { name: `PADN-A2 独立性検証 ${Date.now()}` } });
  const inv2 = await makeIssuedInvoiceFor(tenant2.id, 100000);
  try {
    // T1 が token を先に使用。
    const r1 = await recordInvoicePayment({ tenantId: t1, userId: uid }, inv1, 4000, 'bank', { idempotencyKey: token });
    expect(r1.ok).toBe(true);
    expect(r1.idempotent ?? false).toBe(false);
    const t1PaymentBefore = await prisma.payment.findUnique({ where: { id: derivePaymentRequestId(t1, token) } });
    expect(t1PaymentBefore).toBeTruthy();
    const t1EventBefore = await prisma.domainEvent.findFirst({
      where: { tenantId: t1, aggregateId: inv1, eventType: 'PAYMENT_RECEIVED' },
      select: { id: true, idempotencyKey: true },
    });
    expect(t1EventBefore).toBeTruthy();

    // T2 が**同じ token**を使用 → derived ID が構造的に相違するため双方成功（ID-5・存在オラクル/干渉なし）。
    const r2 = await recordInvoicePayment({ tenantId: tenant2.id, userId: null }, inv2, 6000, 'card', { idempotencyKey: token });
    expect(r2.ok, '別 tenant の同一 token も成功（完全独立）').toBe(true);
    expect(r2.idempotent ?? false, 'T1 の Payment へ収束しない（新規作成）').toBe(false);
    expect(derivePaymentRequestId(t1, token)).not.toBe(derivePaymentRequestId(tenant2.id, token));
    expect(await prisma.payment.count({ where: { id: derivePaymentRequestId(tenant2.id, token), tenantId: tenant2.id, invoiceId: inv2 } }), 'T2 の Payment 1件').toBe(1);

    // T1 のデータは byte 不変（相互非変異）。
    const t1PaymentAfter = await prisma.payment.findUnique({ where: { id: derivePaymentRequestId(t1, token) } });
    expect(t1PaymentAfter).toEqual(t1PaymentBefore);
    expect(Number((await prisma.invoice.findUnique({ where: { id: inv1 }, select: { paidAmount: true } }))!.paidAmount)).toBe(4000);
    expect(Number((await prisma.invoice.findUnique({ where: { id: inv2 }, select: { paidAmount: true } }))!.paidAmount)).toBe(6000);
    const t1EventAfter = await prisma.domainEvent.findFirst({
      where: { tenantId: t1, aggregateId: inv1, eventType: 'PAYMENT_RECEIVED' },
      select: { id: true, idempotencyKey: true },
    });
    expect(t1EventAfter).toEqual(t1EventBefore);

    // 各 tenant 内の retry は idempotent 収束（増分 0）。
    const r1b = await recordInvoicePayment({ tenantId: t1, userId: uid }, inv1, 4000, 'bank', { idempotencyKey: token });
    expect(r1b.ok).toBe(true);
    expect(r1b.idempotent).toBe(true);
    const r2b = await recordInvoicePayment({ tenantId: tenant2.id, userId: null }, inv2, 6000, 'card', { idempotencyKey: token });
    expect(r2b.ok).toBe(true);
    expect(r2b.idempotent).toBe(true);
    expect(await prisma.payment.count({ where: { invoiceId: inv1 } })).toBe(1);
    expect(await prisma.payment.count({ where: { invoiceId: inv2 } })).toBe(1);
    expect(await prisma.domainEvent.count({ where: { tenantId: t1, aggregateId: inv1 } })).toBe(1);
    expect(await prisma.domainEvent.count({ where: { tenantId: tenant2.id, aggregateId: inv2 } })).toBe(1);
  } finally {
    await cleanupInvoiceFor(t1, inv1);
    await cleanupInvoiceFor(tenant2.id, inv2);
    await prisma.tenant.deleteMany({ where: { id: tenant2.id } });
  }
});

test('required_tests 7（flow 層）: Phase A / 改訂 Phase B replica の mixed-version 同時 writer で Payment/Event/Outbox 各 1 件（観測ゲート・順序非依存）', async () => {
  test.setTimeout(120000);
  const t = await tenantId();
  const uid = await ceoUserId();
  const invId = await makeIssuedInvoiceFor(t, 10000);
  const token = mkKey();
  const amount = 5000; // 部分入金にして RECEIVABLE_COLLECTED を発生させず「各1件」を純化。
  const derivedId = derivePaymentRequestId(t, token);
  const client2 = new PrismaClient(); // 改訂 Phase B writer 用の専用 client（別 backend を保証）。
  const monitor = new PrismaClient();
  let releaseHolder!: () => void;
  const holderGate = new Promise<void>((res) => (releaseHolder = res));
  let holderTx: Promise<void> | null = null;
  let aPromise: ReturnType<typeof recordInvoicePayment> | null = null;
  let bPromise: Promise<{ ok: boolean; idempotent: boolean }> | null = null;

  // 改訂 Phase B writer replica（参照: cda7188 apps/web/lib/domains/finance/payments.ts recordInvoicePayment
  // の tx 全シーケンス L100-190 相当を、ID-1（Payment.id=derived ID）・ID-2（payload.idem 保存）・
  // C 設計（direct writer にも advisory barrier 義務付け）conformance へ改訂して行単位で複製）。
  const phaseBWriterReplica = async (): Promise<{ ok: boolean; idempotent: boolean }> => {
    try {
      return await client2.$transaction(
        async (tx) => {
          const locked = await tx.$queryRaw<Array<{ status: string }>>`
        SELECT status FROM "Invoice" WHERE id = ${invId} AND "tenantId" = ${t} FOR UPDATE`;
          if (!locked[0] || locked[0].status === 'VOID' || locked[0].status === 'DRAFT') throw new Error('not-payable');
          const dup = await tx.payment.findUnique({
            where: { id: derivedId },
            select: { tenantId: true, invoiceId: true, amount: true, method: true },
          });
          if (dup) {
            if (dup.tenantId !== t || dup.invoiceId !== invId || Number(dup.amount) !== amount || dup.method !== 'bank') {
              throw new Error('idempotency-mismatch');
            }
            return { ok: true, idempotent: true };
          }
          await tx.payment.create({ data: { id: derivedId, tenantId: t, invoiceId: invId, amount, method: 'bank' } });
          const agg = await tx.payment.aggregate({ where: { tenantId: t, invoiceId: invId }, _sum: { amount: true } });
          const paidSum = Number(agg._sum.amount ?? 0);
          const status = invoiceStatusAfterPayment(10000, paidSum);
          await tx.invoice.updateMany({ where: { id: invId, tenantId: t, status: { notIn: ['VOID', 'DRAFT'] } }, data: { paidAmount: paidSum, status } });
          await tx.receivable.updateMany({ where: { invoiceId: invId, tenantId: t }, data: { status: receivableStatusAfterPayment(10000, paidSum) } });
          await tx.financeEvent.create({
            data: { tenantId: t, type: 'payment_received', sourceType: 'Invoice', sourceId: invId, direction: 'inflow', amount, status: 'posted', occurredAt: new Date(), description: '入金: replica' },
          });
          await tx.auditLog.create({
            data: { tenantId: t, actorId: uid, actorType: 'user', action: 'payment_record', entityType: 'Invoice', entityId: invId, summary: `入金記録 ${amount.toLocaleString()}円（一部入金）` },
          });
          // 改訂 Phase B の event writer: 行ロック→advisory barrier→canonical-first 検証付き dual-read→canonical create。
          const identity = { tenantId: t, eventType: 'PAYMENT_RECEIVED' as const, aggregateId: invId, dedupe: token };
          const lockMaterial = makeEventIdentityLockMaterial(identity);
          await tx.$executeRaw`SET LOCAL lock_timeout = '5s'`;
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockMaterial}::text, 0))`;
          const canonicalKey = makeCanonicalIdempotencyKey(identity);
          const legacyKey = makeLegacyIdempotencyKey(identity);
          let evId: string | null = null;
          const byCanonical = await tx.domainEvent.findUnique({
            where: { tenantId_idempotencyKey: { tenantId: t, idempotencyKey: canonicalKey } },
            select: { id: true },
          });
          if (byCanonical) evId = byCanonical.id;
          if (!evId) {
            const byLegacy = await tx.domainEvent.findFirst({
              where: { tenantId: t, idempotencyKey: legacyKey, eventType: 'PAYMENT_RECEIVED', aggregateType: 'Invoice', aggregateId: invId },
              select: { id: true, eventType: true, aggregateType: true, aggregateId: true, payload: true },
            });
            if (byLegacy && legacyRowMatchesIdentity(byLegacy, { ...identity, aggregateType: 'Invoice' })) evId = byLegacy.id;
          }
          if (!evId) {
            const ev = await tx.domainEvent.create({
              data: {
                tenantId: t, eventType: 'PAYMENT_RECEIVED', aggregateType: 'Invoice', aggregateId: invId, actorId: uid, actorType: 'user',
                payload: { growthType: 'finance.payment.received', idem: { aggregateType: 'Invoice', aggregateId: invId, dedupe: token, enc: 'canonical', v: 1 } },
                idempotencyKey: canonicalKey, status: 'pending',
              },
            });
            await tx.outboxMessage.create({ data: { tenantId: t, eventId: ev.id, eventType: 'PAYMENT_RECEIVED', payload: { growthType: 'finance.payment.received' }, status: 'pending' } });
            await tx.growthEvent.create({
              data: { tenantId: t, type: 'finance.payment.received', category: 'finance', title: '入金: replica', description: '', actorId: uid, actorType: 'user', entityType: 'Payment', entityId: derivedId, amount, revenueImpact: amount, domainEventId: ev.id },
            });
          }
          return { ok: true, idempotent: false };
        },
        { timeout: 60000 },
      );
    } catch (e) {
      // P2002（Payment derived ID の並行競合）: 勝者 Payment を再照合して converge（cda7188 と同方針）。
      if (typeof e === 'object' && e !== null && (e as { code?: string }).code === 'P2002') {
        const dup = await client2.payment.findUnique({ where: { id: derivedId }, select: { tenantId: true, invoiceId: true, amount: true, method: true } });
        if (dup && dup.tenantId === t && dup.invoiceId === invId && Number(dup.amount) === amount && dup.method === 'bank') {
          return { ok: true, idempotent: true };
        }
      }
      throw e;
    }
  };

  try {
    // holder: 対象 Invoice を FOR UPDATE で保持し、両 writer の block を観測してから commit する。
    let holderReady!: (pid: number) => void;
    const ready = new Promise<number>((res) => (holderReady = res));
    holderTx = prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${invId} AND "tenantId" = ${t} FOR UPDATE`;
        const pidRows = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid()::int AS pid`;
        holderReady(pidRows[0]!.pid);
        await holderGate;
      },
      { timeout: 60000 },
    );
    const holderPid = await ready;

    // holder がロック保持中に mixed-version の両 writer を起動（どちらも FOR UPDATE 待ちに入る）。
    aPromise = recordInvoicePayment({ tenantId: t, userId: uid }, invId, amount, 'bank', { idempotencyKey: token });
    bPromise = phaseBWriterReplica();

    // 観測ゲート: holder を根とする blocking graph に **2 waiter**（Phase A + Phase B replica）を実測してから
    // release（観測できなければ fail＝競合経路が行使されない縮退実行を green にしない）。
    await waitForWaitersBlockedBy(monitor, holderPid, 2, 30000);
    releaseHolder();
    await holderTx;

    const [ra, rb] = await Promise.all([aPromise, bPromise]);
    expect(ra.ok, 'Phase A writer は成功（新規 or 収束）').toBe(true);
    expect(rb.ok, 'Phase B replica も成功（新規 or 収束）').toBe(true);
    const idempotentCount = (ra.idempotent === true ? 1 : 0) + (rb.idempotent === true ? 1 : 0);
    expect(idempotentCount, '勝者どちらでも収束側はちょうど 1（順序非依存）').toBe(1);

    // 最終状態の固定件数（logical identity ごとに高々 1・PA-BLK-3）。
    const payments = await prisma.payment.findMany({ where: { invoiceId: invId }, select: { id: true } });
    expect(payments.length, 'Payment 1件').toBe(1);
    expect(payments[0]!.id).toBe(derivedId);
    const evs = await prisma.domainEvent.findMany({
      where: { tenantId: t, aggregateId: invId, eventType: 'PAYMENT_RECEIVED' },
      select: { id: true, idempotencyKey: true },
    });
    expect(evs.length, 'PAYMENT_RECEIVED DomainEvent 1件').toBe(1);
    expect(
      idempotencyKeyMatchesIdentity(evs[0]!.idempotencyKey, { tenantId: t, eventType: 'PAYMENT_RECEIVED', aggregateId: invId, dedupe: token }),
      '勝者の encoding（legacy/canonical）に依らず同一論理 identity',
    ).toBe(true);
    expect(await prisma.outboxMessage.count({ where: { tenantId: t, eventId: evs[0]!.id } }), 'Outbox 1件').toBe(1);
    expect(await prisma.financeEvent.count({ where: { tenantId: t, sourceId: invId, type: 'payment_received' } }), 'FinanceEvent 1件').toBe(1);
    expect(await prisma.auditLog.count({ where: { tenantId: t, entityId: invId, action: 'payment_record' } }), 'Audit 1件').toBe(1);
    expect(await prisma.growthEvent.count({ where: { tenantId: t, entityId: derivedId, type: 'finance.payment.received' } }), 'Growth 1件').toBe(1);
    expect(Number((await prisma.invoice.findUnique({ where: { id: invId }, select: { paidAmount: true } }))!.paidAmount), 'paidAmount 二重計上なし').toBe(amount);
  } finally {
    releaseHolder();
    await Promise.allSettled([holderTx, aPromise, bPromise].filter(Boolean));
    await monitor.$disconnect();
    await client2.$disconnect();
    await cleanupInvoiceFor(t, invId);
  }
});

test('required_tests 7（event 層）: 未 commit の canonical insert と emit の直接競合が advisory barrier で直列化され DomainEvent/Outbox 各 1 件（観測ゲート）', async () => {
  test.setTimeout(120000);
  const T = 'tenant-padn-phasea2-mix-ev-race';
  // 再実行安全: 専用 tenant の残骸を掃除。
  {
    const old = await prisma.domainEvent.findMany({ where: { tenantId: T }, select: { id: true } });
    await prisma.outboxMessage.deleteMany({ where: { tenantId: T, eventId: { in: old.map((e) => e.id) } } });
    await prisma.domainEvent.deleteMany({ where: { tenantId: T } });
  }
  const token = mkKey();
  const aggregateId = `inv-ev-race-${process.pid}-${Date.now()}`;
  const identity = { tenantId: T, eventType: 'PAYMENT_RECEIVED' as const, aggregateId, dedupe: token };
  const canonicalKey = makeCanonicalIdempotencyKey(identity);
  const lockMaterial = makeEventIdentityLockMaterial(identity);
  const client2 = new PrismaClient(); // writer-1（改訂 Phase B 形状・advisory barrier 保持）用の別 backend。
  const monitor = new PrismaClient();
  let releaseWriter1!: () => void;
  const w1Gate = new Promise<void>((res) => (releaseWriter1 = res));
  let w1Tx: Promise<void> | null = null;
  let w2Promise: ReturnType<typeof emitDomainEvent> | null = null;
  try {
    // writer-1: advisory lock を取得し canonical DomainEvent+Outbox を insert したまま**未 commit**保持。
    let w1Ready!: (v: { pid: number; evId: string }) => void;
    const ready = new Promise<{ pid: number; evId: string }>((res) => (w1Ready = res));
    w1Tx = client2.$transaction(
      async (tx) => {
        const pidRows = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid()::int AS pid`;
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockMaterial}::text, 0))`;
        const ev = await tx.domainEvent.create({
          data: {
            tenantId: T, eventType: 'PAYMENT_RECEIVED', aggregateType: 'Invoice', aggregateId, actorType: 'user',
            payload: { idem: { aggregateType: 'Invoice', aggregateId, dedupe: token, enc: 'canonical', v: 1 } },
            idempotencyKey: canonicalKey, status: 'pending',
          },
        });
        await tx.outboxMessage.create({ data: { tenantId: T, eventId: ev.id, eventType: 'PAYMENT_RECEIVED', status: 'pending' } });
        w1Ready({ pid: pidRows[0]!.pid, evId: ev.id });
        await w1Gate; // writer-2 の block 観測まで commit を保留（保持時間は観測で決まる・タイマー非依存）。
      },
      { timeout: 60000 },
    );
    const { pid: w1Pid, evId } = await ready;

    // writer-2: 同一 identity の emit。fast-path は READ COMMITTED で未 commit 行を見ず通過し、
    // tx 内の advisory lock 取得で writer-1 に block される（check-then-insert 窓の実行使を経路判別）。
    w2Promise = emitDomainEvent({ tenantId: T, eventType: 'PAYMENT_RECEIVED', aggregateType: 'Invoice', aggregateId, dedupe: token });

    // 観測ゲート: writer-2 backend が writer-1 に block されたことを pg_blocking_pids で実測してから release。
    let blocked: Array<{ pid: number }> = [];
    for (let i = 0; i < 600 && blocked.length === 0; i++) {
      blocked = await monitor.$queryRaw<Array<{ pid: number }>>`
        SELECT pid::int AS pid FROM pg_stat_activity
        WHERE wait_event_type = 'Lock' AND pg_blocking_pids(pid) @> ARRAY[${w1Pid}]::int[]`;
      if (blocked.length === 0) await new Promise((r) => setTimeout(r, 25));
    }
    expect(blocked.length, '経路判別: writer-2 が writer-1 の advisory barrier で block された').toBeGreaterThan(0);

    releaseWriter1(); // 観測済み → writer-1 commit（canonical 行が可視化・lock 自動解放）。
    await w1Tx;
    const r2 = await w2Promise;
    expect(r2.duplicated, 'writer-2 は lock 取得後の canonical-first 再検索で既存へ収束').toBe(true);
    expect(r2.eventId, 'writer-1 の行へ収束（二重作成なし）').toBe(evId);

    expect(await prisma.domainEvent.count({ where: { tenantId: T, aggregateId } }), 'DomainEvent 1件').toBe(1);
    expect(await prisma.outboxMessage.count({ where: { tenantId: T, eventId: evId } }), 'Outbox 1件').toBe(1);
  } finally {
    releaseWriter1();
    await Promise.allSettled([w1Tx, w2Promise].filter(Boolean));
    await monitor.$disconnect();
    await client2.$disconnect();
    const evs = await prisma.domainEvent.findMany({ where: { tenantId: T }, select: { id: true } });
    await prisma.outboxMessage.deleteMany({ where: { tenantId: T, eventId: { in: evs.map((e) => e.id) } } });
    await prisma.domainEvent.deleteMany({ where: { tenantId: T } });
  }
});
