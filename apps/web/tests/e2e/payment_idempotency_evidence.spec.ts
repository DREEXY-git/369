import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { prisma } from '@hokko/db';
import { derivePaymentRequestId } from '@hokko/shared';
import { recordInvoicePayment } from '../../lib/domains/finance/payments';

// 369-PADN-V5 Phase B: request-level 冪等性の fail-closed / net-new 証拠（cda7188 payment_idempotency_evidence
// からの**選択移植**）。A2 既存 spec で既にカバー済みのケースは移植しない:
//   - 逐次 retry / 並行 5 本 retry / 異なる request の別 Payment … payment_rollback_roundtrip・
//     payment_mixed_writer_race・payment_event_identity_phase_a2 が実測済み（冗長）。
//   - 真 barrier 閾値越え並行入金 … payment_mixed_writer_race required_tests 7 の観測ゲートが実測済み（冗長）。
// 本 spec は A2 未カバーの net-new のみ:
//   payload mismatch / 入力境界 / method mismatch / P2002 cross-invoice / dedupe(FNV) 衝突回避 /
//   fault injection rollback / RECEIVABLE_COLLECTED 非再発火 / AI 拒否。
// Payment.id は derivePaymentRequestId（server-derived 単射・raw key を PK にしない）。切替後 writer は
// canonical だが、本 spec の主眼は payments.ts の fail-closed 契約であり encoding には非依存。
// 外部送信・実支払・課金・schema 変更は一切なし。retries=0・cleanup は作成行 ID/invoice に限定。

const mkKey = () => `c${randomUUID().replace(/-/g, '').slice(0, 24)}`;

async function tenantId(): Promise<string> {
  const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { tenantId: true } });
  return ceo!.tenantId;
}
async function ceoUserId(): Promise<string> {
  const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { id: true } });
  return ceo!.id;
}
async function makeIssuedInvoice(total: number): Promise<string> {
  const t = await tenantId();
  const inv = await prisma.invoice.create({
    data: {
      tenantId: t, number: `INV-IDEM-${process.pid}-${Date.now()}-${Math.floor(performance.now())}`.slice(0, 40), status: 'ISSUED', issueDate: new Date(), dueDate: new Date(),
      subtotal: total, taxAmount: 0, total, paidAmount: 0,
      receivable: { create: { tenantId: t, amount: total, dueDate: new Date(), status: 'open' } },
    },
  });
  return inv.id;
}
// 明示 id で ISSUED invoice を作る（FNV 衝突 fixture を再現するため id を固定する）。
async function makeIssuedInvoiceWithId(id: string, total: number): Promise<string> {
  const t = await tenantId();
  const inv = await prisma.invoice.create({
    data: {
      id, tenantId: t, number: `INV-COL-${process.pid}-${Date.now()}-${Math.floor(performance.now())}`.slice(0, 40), status: 'ISSUED', issueDate: new Date(), dueDate: new Date(),
      subtotal: total, taxAmount: 0, total, paidAmount: 0,
      receivable: { create: { tenantId: t, amount: total, dueDate: new Date(), status: 'open' } },
    },
  });
  return inv.id;
}

async function cleanupInvoice(id: string) {
  const t = await tenantId();
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

// tenant を明示指定して ISSUED invoice を作る（fault injection テストの並列安全な tenant 隔離用）。
async function makeIssuedInvoiceFor(t: string, total: number): Promise<string> {
  const inv = await prisma.invoice.create({
    data: {
      tenantId: t, number: `INV-IDEMF-${process.pid}-${Date.now()}-${Math.floor(performance.now())}`.slice(0, 40), status: 'ISSUED', issueDate: new Date(), dueDate: new Date(),
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

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('payload mismatch fail-closed: 別 invoice へ同一 idempotencyKey を転用すると拒否し 2件目 Payment を作らない', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const invA = await makeIssuedInvoice(50000);
  const invB = await makeIssuedInvoice(50000);
  const key = mkKey();
  try {
    const a = await recordInvoicePayment({ tenantId: t, userId: uid }, invA, 2000, 'bank', { idempotencyKey: key });
    expect(a.ok).toBe(true);
    // 同一 key を別 invoice B に使う（payload mismatch）。
    const b = await recordInvoicePayment({ tenantId: t, userId: uid }, invB, 2000, 'bank', { idempotencyKey: key });
    expect(b.ok, 'payload mismatch は拒否').toBe(false);
    expect(b.reason).toBe('idempotency-mismatch');
    expect(await prisma.payment.count({ where: { invoiceId: invA } })).toBe(1);
    expect(await prisma.payment.count({ where: { invoiceId: invB } }), 'B には Payment を作らない').toBe(0);
  } finally {
    await cleanupInvoice(invA);
    await cleanupInvoice(invB);
  }
});

test('入力境界: idempotencyKey 欠落/不正は fail-closed（invalid-request）で Payment を作らない', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const invId = await makeIssuedInvoice(10000);
  try {
    const missing = await recordInvoicePayment({ tenantId: t, userId: uid }, invId, 1000, 'bank', {});
    expect(missing.ok).toBe(false);
    expect(missing.reason).toBe('invalid-request');
    const bad = await recordInvoicePayment({ tenantId: t, userId: uid }, invId, 1000, 'bank', { idempotencyKey: 'not-a-valid-key!!' });
    expect(bad.ok).toBe(false);
    expect(bad.reason).toBe('invalid-request');
    expect(await prisma.payment.count({ where: { invoiceId: invId } })).toBe(0);
  } finally {
    await cleanupInvoice(invId);
  }
});

test('method mismatch fail-closed: 同一 key・同一 invoice/amount でも method 差異は収束させず、行/監査/event を増やさない', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const invId = await makeIssuedInvoice(100000);
  const key = mkKey();
  try {
    // 先行入金（method='bank'）。
    const a = await recordInvoicePayment({ tenantId: t, userId: uid }, invId, 4000, 'bank', { idempotencyKey: key });
    expect(a.ok).toBe(true);
    // 同一 key・同一 invoice/amount だが method='cash'（fingerprint 差異）→ 収束禁止・fail-closed。
    const b = await recordInvoicePayment({ tenantId: t, userId: uid }, invId, 4000, 'cash', { idempotencyKey: key });
    expect(b.ok, 'method 差異は収束させない').toBe(false);
    expect(b.reason).toBe('idempotency-mismatch');
    // 既存 Payment（bank）は不変・二重計上なし・副次証拠も 1 件のまま。
    const pays = await prisma.payment.findMany({ where: { invoiceId: invId }, select: { method: true } });
    expect(pays.length, 'Payment は 1 件のまま').toBe(1);
    expect(pays[0]?.method).toBe('bank');
    expect(await prisma.auditLog.count({ where: { entityId: invId, action: 'payment_record' } })).toBe(1);
    expect(await prisma.financeEvent.count({ where: { sourceId: invId, type: 'payment_received' } })).toBe(1);
    expect(await prisma.domainEvent.count({ where: { tenantId: t, aggregateId: invId } })).toBe(1);
    expect(Number((await prisma.invoice.findUnique({ where: { id: invId }, select: { paidAmount: true } }))!.paidAmount)).toBe(4000);
  } finally {
    await cleanupInvoice(invId);
  }
});

test('P2002 barrier race fail-closed: 別 invoice へ同一 key を実 PostgreSQL 並行競合させると、敗者を success 扱いせず孤児 0', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const invA = await makeIssuedInvoice(50000);
  const invB = await makeIssuedInvoice(50000);
  const key = mkKey();
  try {
    // 同一 key を別 invoice A/B へ同時投入。両者は別 invoice 行をロックするため invoice ロックでは直列化されず、
    // Payment PK（deterministic=derived ID）の unique が最終 barrier になる。勝者 1・敗者は P2002→再照合で mismatch→fail-closed。
    const [ra, rb] = await Promise.all([
      recordInvoicePayment({ tenantId: t, userId: uid }, invA, 2000, 'bank', { idempotencyKey: key }),
      recordInvoicePayment({ tenantId: t, userId: uid }, invB, 3000, 'bank', { idempotencyKey: key }),
    ]);
    const oks = [ra, rb].filter((r) => r.ok);
    const rejected = [ra, rb].filter((r) => !r.ok);
    expect(oks.length, '勝者はちょうど 1').toBe(1);
    expect(rejected.length, '敗者はちょうど 1').toBe(1);
    expect(rejected[0]?.reason, '敗者は success 扱いせず fail-closed').toBe('idempotency-mismatch');
    // Payment はキー全体で 1 件のみ（deterministic PK）。derived ID で勝者を特定する。
    const derivedA = derivePaymentRequestId(t, key);
    const totalPayments = await prisma.payment.count({ where: { OR: [{ invoiceId: invA }, { invoiceId: invB }] } });
    expect(totalPayments, 'Payment はキーで 1 件のみ').toBe(1);
    const winnerInv = (await prisma.payment.findUnique({ where: { id: derivedA }, select: { invoiceId: true } }))!.invoiceId;
    const loserInv = winnerInv === invA ? invB : invA;
    expect(await prisma.payment.count({ where: { invoiceId: loserInv } }), '敗者 invoice に孤児 Payment 0').toBe(0);
    expect(await prisma.domainEvent.count({ where: { tenantId: t, aggregateId: loserInv } }), '敗者 invoice に孤児 DomainEvent 0').toBe(0);
    expect(await prisma.growthEvent.count({ where: { tenantId: t, entityId: loserInv } }), '敗者 invoice に孤児 GrowthEvent 0').toBe(0);
    expect(await prisma.auditLog.count({ where: { entityId: loserInv, action: 'payment_record' } }), '敗者 invoice に孤児 Audit 0').toBe(0);
    // 勝者側は Payment 1 + 副次 event 1 が原子的に揃う。
    expect(await prisma.domainEvent.count({ where: { tenantId: t, aggregateId: winnerInv } })).toBe(1);
    const winnerEvIds = (await prisma.domainEvent.findMany({ where: { tenantId: t, aggregateId: winnerInv }, select: { id: true } })).map((e) => e.id);
    expect(await prisma.outboxMessage.count({ where: { tenantId: t, eventId: { in: winnerEvIds } } })).toBe(1);
  } finally {
    await cleanupInvoice(invA);
    await cleanupInvoice(invB);
  }
});

test('canonical writer で dedupe(FNV)衝突を回避: legacy FNV 衝突する 2 invoice の全額入金がそれぞれ成立し RECEIVABLE_COLLECTED を各 1 件残す', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  // 旧 legacy FNV-1a 32bit では RECEIVABLE_COLLECTED の dedupe key が両 invoice で同一へ衝突し、A を全額入金後に
  // B を全額入金すると B の DomainEvent create が P2002→tx 全 rollback→外側 catch が idempotency-mismatch を返し、
  // B の正当入金を恒久拒否した。canonical writer（切替後）では別 invoice は別キーになり両者が独立成立する。
  const invA = 'cq9iaml5de11dumtx4u1esvz6';
  const invB = 'cvo49ccci03xjt8an4vyr0u9p';
  await makeIssuedInvoiceWithId(invA, 10000);
  await makeIssuedInvoiceWithId(invB, 10000);
  try {
    const a = await recordInvoicePayment({ tenantId: t, userId: uid }, invA, 10000, 'bank', { idempotencyKey: mkKey() });
    expect(a.ok, 'A 全額入金は成立').toBe(true);
    expect(a.fullyPaid).toBe(true);
    const b = await recordInvoicePayment({ tenantId: t, userId: uid }, invB, 10000, 'bank', { idempotencyKey: mkKey() });
    expect(b.ok, 'B 全額入金も独立して成立（canonical で衝突しない）').toBe(true);
    expect(b.fullyPaid).toBe(true);

    for (const inv of [invA, invB]) {
      const evs = await prisma.domainEvent.findMany({ where: { tenantId: t, aggregateId: inv, eventType: 'RECEIVABLE_COLLECTED' }, select: { id: true } });
      expect(evs.length, `${inv} の RECEIVABLE_COLLECTED 1 件`).toBe(1);
      expect(await prisma.outboxMessage.count({ where: { tenantId: t, eventId: { in: evs.map((e) => e.id) } } }), `${inv} の回収 Outbox 1 件`).toBe(1);
      expect(await prisma.growthEvent.count({ where: { tenantId: t, entityId: inv, type: 'finance.receivable.collected' } }), `${inv} の回収 Growth 1 件`).toBe(1);
      expect(await prisma.payment.count({ where: { invoiceId: inv } }), `${inv} の Payment 1 件`).toBe(1);
    }
    // 2 invoice の RECEIVABLE_COLLECTED DomainEvent は別キー（canonical writer で衝突していない）。
    const keys = (await prisma.domainEvent.findMany({ where: { tenantId: t, aggregateId: { in: [invA, invB] }, eventType: 'RECEIVABLE_COLLECTED' }, select: { idempotencyKey: true } })).map((e) => e.idempotencyKey);
    expect(new Set(keys).size, '2 invoice の回収イベントキーは相異なる').toBe(2);
  } finally {
    await cleanupInvoice(invA);
    await cleanupInvoice(invB);
  }
});

test('fault injection rollback: イベント作成後の例外で Payment/DomainEvent/Outbox/Growth を孤児化せず全 rollback し、同一 key retry で 1 件へ収束', async () => {
  // 並列安全化（rework 1）: tenant 全域の Outbox baseline は、同一 seed tenant を使う他 spec の並行な
  // Outbox 作成/削除で drift する（CI 実測: expected 19 / received 18）。専用 tenant で隔離し、cda7188 の
  // 「孤児 Outbox 0（tenant baseline 不変）」という orphan 検出セマンティクスを並列安全に維持する。
  const tenant = await prisma.tenant.create({ data: { name: `PADN-B fault-injection ${Date.now()}-${randomUUID().replace(/-/g, '').slice(0, 8)}` } });
  const t = tenant.id;
  const invId = await makeIssuedInvoiceFor(t, 100000);
  const key = mkKey();
  const derivedId = derivePaymentRequestId(t, key);
  // 専用 tenant のため baseline は 0（他 spec と共有せず＝drift しない）。rollback 後も不変を要求する。
  const outboxBefore = await prisma.outboxMessage.count({ where: { tenantId: t } });
  try {
    // 1回目: 副次イベント作成 **後** に例外注入 → 単一 tx なので Payment 含め全 rollback（孤児 0 を要求）。
    let threw = false;
    try {
      await recordInvoicePayment({ tenantId: t, userId: null }, invId, 4000, 'bank', {
        idempotencyKey: key,
        __faultAfterEventsForTest: () => {
          throw new Error('injected-fault-after-events');
        },
      });
    } catch {
      threw = true;
    }
    expect(threw, 'fault は呼び出し側へ伝播（握り潰さない）').toBe(true);
    expect(await prisma.payment.count({ where: { invoiceId: invId } }), 'rollback 後 Payment 孤児 0').toBe(0);
    expect(await prisma.domainEvent.count({ where: { tenantId: t, aggregateId: invId } }), 'rollback 後 DomainEvent 孤児 0').toBe(0);
    expect(await prisma.outboxMessage.count({ where: { tenantId: t } }), 'rollback 後 Outbox は baseline から不変（孤児 0）').toBe(outboxBefore);
    expect(await prisma.growthEvent.count({ where: { tenantId: t, entityId: invId } }), 'rollback 後 GrowthEvent 孤児 0').toBe(0);
    expect(await prisma.financeEvent.count({ where: { sourceId: invId, type: 'payment_received' } }), 'rollback 後 FinanceEvent 孤児 0').toBe(0);
    expect(await prisma.auditLog.count({ where: { entityId: invId, action: 'payment_record' } }), 'rollback 後 Audit 孤児 0').toBe(0);
    expect(Number((await prisma.invoice.findUnique({ where: { id: invId }, select: { paidAmount: true } }))!.paidAmount), 'paidAmount 不変').toBe(0);

    // 2回目: 同一 key で正常 retry → Payment 1 と副次 event が原子的に揃う（前回は rollback 済のため新規）。
    const r = await recordInvoicePayment({ tenantId: t, userId: null }, invId, 4000, 'bank', { idempotencyKey: key });
    expect(r.ok, 'retry は成功').toBe(true);
    expect(r.idempotent ?? false, 'retry は新規（前回は rollback 済）').toBe(false);
    expect(await prisma.payment.count({ where: { invoiceId: invId } }), 'retry 後 Payment ちょうど 1').toBe(1);
    expect(await prisma.domainEvent.count({ where: { tenantId: t, aggregateId: invId } }), 'DomainEvent ちょうど 1').toBe(1);
    const evIds = (await prisma.domainEvent.findMany({ where: { tenantId: t, aggregateId: invId }, select: { id: true } })).map((e) => e.id);
    expect(await prisma.outboxMessage.count({ where: { tenantId: t, eventId: { in: evIds } } }), 'OutboxMessage ちょうど 1').toBe(1);
    expect(await prisma.growthEvent.count({ where: { tenantId: t, entityId: derivedId } }), 'GrowthEvent(entity=Payment=derived ID) ちょうど 1').toBe(1);
    expect(await prisma.financeEvent.count({ where: { sourceId: invId, type: 'payment_received' } }), 'FinanceEvent ちょうど 1').toBe(1);
    expect(await prisma.auditLog.count({ where: { entityId: invId, action: 'payment_record' } }), 'Audit ちょうど 1').toBe(1);
    expect(Number((await prisma.invoice.findUnique({ where: { id: invId }, select: { paidAmount: true } }))!.paidAmount)).toBe(4000);
  } finally {
    await cleanupInvoiceFor(t, invId);
    await prisma.tenant.deleteMany({ where: { id: t } });
  }
});

test('RECEIVABLE_COLLECTED は非PAID→PAID遷移時のみ1件: partial→full→PAID後の別key追加入金で回収eventを再発火しない', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const invId = await makeIssuedInvoice(10000);
  try {
    // partial（4000）→ 回収 event はまだ 0（未 full）。
    await recordInvoicePayment({ tenantId: t, userId: uid }, invId, 4000, 'bank', { idempotencyKey: mkKey() });
    expect(await prisma.domainEvent.count({ where: { tenantId: t, aggregateId: invId, eventType: 'RECEIVABLE_COLLECTED' } }), 'partial では回収 event なし').toBe(0);
    // full（6000）→ 非PAID→PAID 遷移で回収 event 1 件。
    const full = await recordInvoicePayment({ tenantId: t, userId: uid }, invId, 6000, 'bank', { idempotencyKey: mkKey() });
    expect(full.fullyPaid).toBe(true);
    // PAID 済みへの別 key 追加入金 → 回収 event を **再発火しない**。
    const extra = await recordInvoicePayment({ tenantId: t, userId: uid }, invId, 1000, 'bank', { idempotencyKey: mkKey() });
    expect(extra.ok).toBe(true);

    const collectedEvs = await prisma.domainEvent.findMany({ where: { tenantId: t, aggregateId: invId, eventType: 'RECEIVABLE_COLLECTED' }, select: { id: true } });
    expect(collectedEvs.length, 'RECEIVABLE_COLLECTED DomainEvent 1 件').toBe(1);
    expect(await prisma.outboxMessage.count({ where: { tenantId: t, eventId: { in: collectedEvs.map((e) => e.id) } } }), '回収 Outbox 1 件').toBe(1);
    expect(await prisma.growthEvent.count({ where: { tenantId: t, entityId: invId, type: 'finance.receivable.collected' } }), '回収 Growth 1 件').toBe(1);
    // PAYMENT_RECEIVED は成立 Payment ごと（3 件）。
    expect(await prisma.domainEvent.count({ where: { tenantId: t, aggregateId: invId, eventType: 'PAYMENT_RECEIVED' } }), 'PAYMENT_RECEIVED は 3 件').toBe(3);
    expect(await prisma.payment.count({ where: { invoiceId: invId } })).toBe(3);
  } finally {
    await cleanupInvoice(invId);
  }
});

test('AI 拒否: actorIsAi は key があっても DB 接触前に forbidden（Payment 0）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const invId = await makeIssuedInvoice(10000);
  try {
    const res = await recordInvoicePayment({ tenantId: t, userId: uid }, invId, 1000, 'bank', { idempotencyKey: mkKey(), actorIsAi: true });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('forbidden');
    expect(await prisma.payment.count({ where: { invoiceId: invId } })).toBe(0);
  } finally {
    await cleanupInvoice(invId);
  }
});
