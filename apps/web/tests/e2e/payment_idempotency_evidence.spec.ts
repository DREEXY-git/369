import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { prisma } from '@hokko/db';
import { recordInvoicePayment } from '../../lib/domains/finance/payments';

// Codex P3-FIN-1（PR #57 CR #4969823555）の request-level 冪等性 実 PostgreSQL 証拠。
// idempotencyKey を Payment の deterministic PK にし、同一 request の逐次/並行 retry・再送（post-commit
// 副次処理失敗後を含む）を 1 Payment / 1 payment_record Audit / 1 payment_received FinanceEvent へ収束する。
// 異なる key の同額支払は別 Payment。別 invoice/amount への同一 key（payload mismatch）は fail-closed。
// 外部送信・実支払・課金・schema 変更は一切なし。

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
// 明示 id で ISSUED invoice を作る（Codex 提示の FNV 衝突 fixture を再現するため id を固定する）。
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

// 決定論的 barrier: 対象 invoice への入金 FOR UPDATE 待ちで pending 中の backend が n 本になるまで観測する
// （payment コードのロック文 `SELECT status FROM "Invoice" ... FOR UPDATE` に一致する Lock 待ちを数える）。
async function waitForLockWaiters(n: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    // payment のロック文は複数行テンプレート（先頭が改行＋空白）なので LIKE は先頭 `%` で受ける。
    // `SELECT status FROM "Invoice" ... FOR UPDATE`（入金側）だけを数え、holder の `SELECT id ...` は除外する。
    const rows = await prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT count(*) AS n FROM pg_stat_activity
      WHERE wait_event_type = 'Lock' AND state = 'active'
        AND query LIKE '%SELECT status FROM "Invoice"%FOR UPDATE%'`;
    if (Number(rows[0]?.n ?? 0) >= n) return;
    if (Date.now() > deadline) throw new Error(`barrier: ${n} 本の FOR UPDATE 待ちを ${timeoutMs}ms 以内に観測できなかった`);
    await new Promise((r) => setTimeout(r, 40));
  }
}

async function cleanupInvoice(id: string) {
  const t = await tenantId();
  // Payment.id は idempotencyKey なので GrowthEvent(entityType=Payment) は payment.id で参照される。
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

test('逐次 retry: 同一 idempotencyKey の再送は 1 Payment / 1 Audit / 1 FinanceEvent に収束（再送で二重入金しない）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const invId = await makeIssuedInvoice(100000);
  const key = mkKey();
  try {
    const r1 = await recordInvoicePayment({ tenantId: t, userId: uid }, invId, 4000, 'bank', { idempotencyKey: key });
    expect(r1.ok).toBe(true);
    expect(r1.idempotent ?? false).toBe(false);
    // 同一 key で再送（= post-commit 失敗後の再送や二重 submit を模す）。
    const r2 = await recordInvoicePayment({ tenantId: t, userId: uid }, invId, 4000, 'bank', { idempotencyKey: key });
    expect(r2.ok, '再送も成功（idempotent）').toBe(true);
    expect(r2.idempotent, '2回目は既存へ収束').toBe(true);
    const r3 = await recordInvoicePayment({ tenantId: t, userId: uid }, invId, 4000, 'bank', { idempotencyKey: key });
    expect(r3.idempotent).toBe(true);

    expect(await prisma.payment.count({ where: { invoiceId: invId } }), 'Payment 1件のみ').toBe(1);
    expect(await prisma.auditLog.count({ where: { entityId: invId, action: 'payment_record' } }), '入金監査 1件のみ').toBe(1);
    expect(await prisma.financeEvent.count({ where: { sourceId: invId, type: 'payment_received' } }), '入金実績 1件のみ').toBe(1);
    expect(Number((await prisma.invoice.findUnique({ where: { id: invId }, select: { paidAmount: true } }))!.paidAmount), 'paidAmount 二重計上なし').toBe(4000);
  } finally {
    await cleanupInvoice(invId);
  }
});

test('並行 retry: 同一 idempotencyKey の barrier 並行 5 本は FOR UPDATE 直列化＋PK unique で 1 Payment に収束', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const invId = await makeIssuedInvoice(100000);
  const key = mkKey();
  try {
    const results = await Promise.all(
      Array.from({ length: 5 }, () => recordInvoicePayment({ tenantId: t, userId: uid }, invId, 3000, 'bank', { idempotencyKey: key })),
    );
    for (const r of results) expect(r.ok, '全 request が成功（1件は新規・残りは収束）').toBe(true);
    expect(await prisma.payment.count({ where: { invoiceId: invId } }), '並行同一キーでも Payment 1件').toBe(1);
    expect(await prisma.auditLog.count({ where: { entityId: invId, action: 'payment_record' } })).toBe(1);
    expect(await prisma.financeEvent.count({ where: { sourceId: invId, type: 'payment_received' } })).toBe(1);
    expect(Number((await prisma.invoice.findUnique({ where: { id: invId }, select: { paidAmount: true } }))!.paidAmount)).toBe(3000);
  } finally {
    await cleanupInvoice(invId);
  }
});

test('異なる request: 別 idempotencyKey の同額支払は別 Payment として 2 件成立する', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const invId = await makeIssuedInvoice(100000);
  try {
    const a = await recordInvoicePayment({ tenantId: t, userId: uid }, invId, 5000, 'bank', { idempotencyKey: mkKey() });
    const b = await recordInvoicePayment({ tenantId: t, userId: uid }, invId, 5000, 'bank', { idempotencyKey: mkKey() });
    expect(a.ok && b.ok).toBe(true);
    expect(a.idempotent ?? false).toBe(false);
    expect(b.idempotent ?? false).toBe(false);
    expect(await prisma.payment.count({ where: { invoiceId: invId } }), '別キーは別 Payment').toBe(2);
    expect(Number((await prisma.invoice.findUnique({ where: { id: invId }, select: { paidAmount: true } }))!.paidAmount)).toBe(10000);
  } finally {
    await cleanupInvoice(invId);
  }
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

test('method mismatch fail-closed: 同一 key・同一 invoice/amount でも method 差異は収束させず、行/監査/event を増やさない（Codex R2 #1）', async () => {
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

test('P2002 barrier race fail-closed: 別 invoice へ同一 key を実 PostgreSQL 並行競合させると、敗者を success 扱いせず孤児 0（Codex R2 #2）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const invA = await makeIssuedInvoice(50000);
  const invB = await makeIssuedInvoice(50000);
  const key = mkKey();
  try {
    // 同一 key を別 invoice A/B へ同時投入。両者は別 invoice 行をロックするため invoice ロックでは直列化されず、
    // Payment PK（deterministic）の unique が最終 barrier になる。勝者 1・敗者は P2002→再照合で mismatch→fail-closed。
    const [ra, rb] = await Promise.all([
      recordInvoicePayment({ tenantId: t, userId: uid }, invA, 2000, 'bank', { idempotencyKey: key }),
      recordInvoicePayment({ tenantId: t, userId: uid }, invB, 3000, 'bank', { idempotencyKey: key }),
    ]);
    const oks = [ra, rb].filter((r) => r.ok);
    const rejected = [ra, rb].filter((r) => !r.ok);
    expect(oks.length, '勝者はちょうど 1').toBe(1);
    expect(rejected.length, '敗者はちょうど 1').toBe(1);
    expect(rejected[0]?.reason, '敗者は success 扱いせず fail-closed').toBe('idempotency-mismatch');
    // Payment はキー全体で 1 件のみ（deterministic PK）。敗者 invoice 側に孤児 Payment/副次 event を作らない。
    const totalPayments = await prisma.payment.count({ where: { OR: [{ invoiceId: invA }, { invoiceId: invB }] } });
    expect(totalPayments, 'Payment はキーで 1 件のみ').toBe(1);
    // 勝者 invoice を特定し、敗者 invoice には Payment/DomainEvent/GrowthEvent/Audit を一切残さない。
    const winnerInv = (await prisma.payment.findUnique({ where: { id: key }, select: { invoiceId: true } }))!.invoiceId;
    const loserInv = winnerInv === invA ? invB : invA;
    expect(await prisma.payment.count({ where: { invoiceId: loserInv } }), '敗者 invoice に孤児 Payment 0').toBe(0);
    expect(await prisma.domainEvent.count({ where: { tenantId: t, aggregateId: loserInv } }), '敗者 invoice に孤児 DomainEvent 0').toBe(0);
    expect(await prisma.growthEvent.count({ where: { tenantId: t, entityId: loserInv } }), '敗者 invoice に孤児 GrowthEvent 0').toBe(0);
    expect(await prisma.auditLog.count({ where: { entityId: loserInv, action: 'payment_record' } }), '敗者 invoice に孤児 Audit 0').toBe(0);
    // 勝者側は Payment 1 + 副次 event 1 が原子的に揃う。
    expect(await prisma.domainEvent.count({ where: { tenantId: t, aggregateId: winnerInv } })).toBe(1);
    expect(await prisma.outboxMessage.count({ where: { tenantId: t, eventId: { in: (await prisma.domainEvent.findMany({ where: { tenantId: t, aggregateId: winnerInv }, select: { id: true } })).map((e) => e.id) } } })).toBe(1);
  } finally {
    await cleanupInvoice(invA);
    await cleanupInvoice(invB);
  }
});

test('dedupe 衝突 fail-closed回避: FNV衝突する2 invoiceの全額入金がそれぞれ成立し RECEIVABLE_COLLECTED を各1件残す（Codex R4 #1）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  // Codex 提示の衝突 fixture。旧実装（FNV-1a 32bit）では RECEIVABLE_COLLECTED の dedupe key が両 invoice で
  // 同一（`RECEIVABLE_COLLECTED:0df3fbed`）へ衝突し、A を全額入金後に B を全額入金すると B の DomainEvent create が
  // P2002 → tx 全 rollback → 外側 catch が idempotency-mismatch を返し、B の正当入金を恒久拒否した。
  // 完全 canonical key では別 invoice は別キーになり、両者が独立して 1 件ずつ回収イベントを残す。
  const invA = 'cq9iaml5de11dumtx4u1esvz6';
  const invB = 'cvo49ccci03xjt8an4vyr0u9p';
  await makeIssuedInvoiceWithId(invA, 10000);
  await makeIssuedInvoiceWithId(invB, 10000);
  try {
    const a = await recordInvoicePayment({ tenantId: t, userId: uid }, invA, 10000, 'bank', { idempotencyKey: mkKey() });
    expect(a.ok, 'A 全額入金は成立').toBe(true);
    expect(a.fullyPaid).toBe(true);
    // 旧実装ではここで B が dedupe 衝突により mismatch/rollback となる（RED）。canonical key では成立する。
    const b = await recordInvoicePayment({ tenantId: t, userId: uid }, invB, 10000, 'bank', { idempotencyKey: mkKey() });
    expect(b.ok, 'B 全額入金も独立して成立（衝突しない）').toBe(true);
    expect(b.fullyPaid).toBe(true);

    // 各 invoice が自分の RECEIVABLE_COLLECTED / Outbox / Growth を 1 件ずつ持つ（相互に潰し合わない）。
    for (const inv of [invA, invB]) {
      const evs = await prisma.domainEvent.findMany({ where: { tenantId: t, aggregateId: inv, eventType: 'RECEIVABLE_COLLECTED' }, select: { id: true } });
      expect(evs.length, `${inv} の RECEIVABLE_COLLECTED 1 件`).toBe(1);
      expect(await prisma.outboxMessage.count({ where: { tenantId: t, eventId: { in: evs.map((e) => e.id) } } }), `${inv} の回収 Outbox 1 件`).toBe(1);
      expect(await prisma.growthEvent.count({ where: { tenantId: t, entityId: inv, type: 'finance.receivable.collected' } }), `${inv} の回収 Growth 1 件`).toBe(1);
      expect(await prisma.payment.count({ where: { invoiceId: inv } }), `${inv} の Payment 1 件`).toBe(1);
    }
    // 2 invoice の RECEIVABLE_COLLECTED DomainEvent は別キー（衝突していない）。
    const keys = (await prisma.domainEvent.findMany({ where: { tenantId: t, aggregateId: { in: [invA, invB] }, eventType: 'RECEIVABLE_COLLECTED' }, select: { idempotencyKey: true } })).map((e) => e.idempotencyKey);
    expect(new Set(keys).size, '2 invoice の回収イベントキーは相異なる').toBe(2);
  } finally {
    await cleanupInvoice(invA);
    await cleanupInvoice(invB);
  }
});

test('fault injection rollback: イベント作成後の例外で Payment/DomainEvent/Outbox/Growth を孤児化せず全 rollback し、同一 key retry で 1 件へ収束（Codex R2 #3）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const invId = await makeIssuedInvoice(100000);
  const key = mkKey();
  // fault 前の tenant Outbox 総数を baseline に取り、rollback 後に **増えていない**ことで孤児 0 を実測する
  // （Codex R3 #2: 旧 assertion は eventId:{in:[]} で常に 0 になり実際の残存を検出できなかった）。
  const outboxBefore = await prisma.outboxMessage.count({ where: { tenantId: t } });
  try {
    // 1回目: 副次イベント作成 **後** に例外注入 → 単一 tx なので Payment 含め全 rollback（孤児 0 を要求）。
    let threw = false;
    try {
      await recordInvoicePayment({ tenantId: t, userId: uid }, invId, 4000, 'bank', {
        idempotencyKey: key,
        __faultAfterEventsForTest: () => {
          throw new Error('injected-fault-after-events');
        },
      });
    } catch {
      threw = true;
    }
    expect(threw, 'fault は呼び出し側へ伝播（握り潰さない）').toBe(true);
    // rollback により Payment/副次 event は 1 件も残らない（transactional outbox の要）。
    expect(await prisma.payment.count({ where: { invoiceId: invId } }), 'rollback 後 Payment 孤児 0').toBe(0);
    expect(await prisma.domainEvent.count({ where: { tenantId: t, aggregateId: invId } }), 'rollback 後 DomainEvent 孤児 0').toBe(0);
    // Outbox は tenant baseline から増えていない（＝この invoice 由来の孤児 Outbox 0）。
    expect(await prisma.outboxMessage.count({ where: { tenantId: t } }), 'rollback 後 Outbox は baseline から不変（孤児 0）').toBe(outboxBefore);
    expect(await prisma.growthEvent.count({ where: { tenantId: t, entityId: invId } }), 'rollback 後 GrowthEvent 孤児 0').toBe(0);
    expect(await prisma.financeEvent.count({ where: { sourceId: invId, type: 'payment_received' } }), 'rollback 後 FinanceEvent 孤児 0').toBe(0);
    expect(await prisma.auditLog.count({ where: { entityId: invId, action: 'payment_record' } }), 'rollback 後 Audit 孤児 0').toBe(0);
    expect(Number((await prisma.invoice.findUnique({ where: { id: invId }, select: { paidAmount: true } }))!.paidAmount), 'paidAmount 不変').toBe(0);

    // 2回目: 同一 key で正常 retry（reconcile 相当）→ Payment 1 と副次 event が原子的に揃う。
    const r = await recordInvoicePayment({ tenantId: t, userId: uid }, invId, 4000, 'bank', { idempotencyKey: key });
    expect(r.ok, 'retry は成功').toBe(true);
    expect(r.idempotent ?? false, 'retry は新規（前回は rollback 済のため収束ではない）').toBe(false);
    expect(await prisma.payment.count({ where: { invoiceId: invId } }), 'retry 後 Payment ちょうど 1').toBe(1);
    expect(await prisma.domainEvent.count({ where: { tenantId: t, aggregateId: invId } }), 'DomainEvent ちょうど 1').toBe(1);
    const evIds = (await prisma.domainEvent.findMany({ where: { tenantId: t, aggregateId: invId }, select: { id: true } })).map((e) => e.id);
    expect(await prisma.outboxMessage.count({ where: { tenantId: t, eventId: { in: evIds } } }), 'OutboxMessage ちょうど 1').toBe(1);
    expect(await prisma.growthEvent.count({ where: { tenantId: t, entityId: key } }), 'GrowthEvent(entity=Payment) ちょうど 1').toBe(1);
    expect(await prisma.financeEvent.count({ where: { sourceId: invId, type: 'payment_received' } }), 'FinanceEvent ちょうど 1').toBe(1);
    expect(await prisma.auditLog.count({ where: { entityId: invId, action: 'payment_record' } }), 'Audit ちょうど 1').toBe(1);
    expect(Number((await prisma.invoice.findUnique({ where: { id: invId }, select: { paidAmount: true } }))!.paidAmount)).toBe(4000);
  } finally {
    await cleanupInvoice(invId);
  }
});

test('RECEIVABLE_COLLECTED は非PAID→PAID遷移時のみ1件: partial→full→PAID後の別key追加入金で回収eventを再発火しない（Codex R3 #1）', async () => {
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
    // PAID 済みへの別 key 追加入金（Server Action/domain は正数入金を拒否しない）→ 回収 event を **再発火しない**。
    const extra = await recordInvoicePayment({ tenantId: t, userId: uid }, invId, 1000, 'bank', { idempotencyKey: mkKey() });
    expect(extra.ok).toBe(true);

    // 回収 event（DomainEvent / Outbox / Growth）は invoice で **ちょうど 1 件**。
    const collectedEvs = await prisma.domainEvent.findMany({ where: { tenantId: t, aggregateId: invId, eventType: 'RECEIVABLE_COLLECTED' }, select: { id: true } });
    expect(collectedEvs.length, 'RECEIVABLE_COLLECTED DomainEvent 1 件').toBe(1);
    expect(await prisma.outboxMessage.count({ where: { tenantId: t, eventId: { in: collectedEvs.map((e) => e.id) } } }), '回収 Outbox 1 件（Webhook 再配送なし）').toBe(1);
    expect(await prisma.growthEvent.count({ where: { tenantId: t, entityId: invId, type: 'finance.receivable.collected' } }), '回収 Growth 1 件').toBe(1);
    // PAYMENT_RECEIVED は成立 Payment ごと（3 件）。
    expect(await prisma.domainEvent.count({ where: { tenantId: t, aggregateId: invId, eventType: 'PAYMENT_RECEIVED' } }), 'PAYMENT_RECEIVED は 3 件').toBe(3);
    expect(await prisma.payment.count({ where: { invoiceId: invId } })).toBe(3);
  } finally {
    await cleanupInvoice(invId);
  }
});

test('真barrier 閾値越え並行入金: FOR UPDATE で2本をpending化→観測してからrelease後 RECEIVABLE_COLLECTED 1件（Codex R4 #2）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const invId = await makeIssuedInvoice(10000);
  try {
    // Codex R4 #2: 旧テストは Promise.all のみで「両 request が同時に lock 待ち＝競合」を観測・同期していなかった
    // （自然に逐次化しても green になり barrier を証明しない）。payment_void_race と同型の決定論的 barrier に置換する。
    let releaseBarrier!: () => void;
    const barrierReleased = new Promise<void>((res) => { releaseBarrier = res; });
    // T0: 対象 invoice 行を FOR UPDATE で保持し、2 入金 tx を自分の FOR UPDATE 取得前で確実にブロックさせる。
    const holder = prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${invId} AND "tenantId" = ${t} FOR UPDATE`;
        await barrierReleased; // 両 request の pending を観測するまでロックを保持する
      },
      { timeout: 30000 },
    );

    // それぞれ単独で閾値（10000）を越える 2 本を起動。両者は T0 のロックにより FOR UPDATE 待ちでブロックされる。
    const p1 = recordInvoicePayment({ tenantId: t, userId: uid }, invId, 10000, 'bank', { idempotencyKey: mkKey() });
    const p2 = recordInvoicePayment({ tenantId: t, userId: uid }, invId, 10000, 'bank', { idempotencyKey: mkKey() });

    // 決定論的 barrier: 2 backend が Invoice FOR UPDATE 待ちで pending になったことを観測してから release する。
    // 観測が失敗しても holder を長時間保持しないよう、必ず release する（cleanup が lock で詰まるのを防ぐ）。
    try {
      await waitForLockWaiters(2, 20000);
    } finally {
      releaseBarrier();
    }
    await holder; // T0 が commit しロック解放 → 2 tx が直列に FOR UPDATE 取得

    const results = await Promise.all([p1, p2]);
    for (const r of results) expect(r.ok).toBe(true);
    // PAYMENT_RECEIVED は成立 Payment 数（2）、RECEIVABLE_COLLECTED は非PAID→PAID 遷移 1 回のみ（FOR UPDATE 直列化＋安定 dedupe）。
    expect(await prisma.payment.count({ where: { invoiceId: invId } }), 'Payment 2 件').toBe(2);
    expect(await prisma.domainEvent.count({ where: { tenantId: t, aggregateId: invId, eventType: 'PAYMENT_RECEIVED' } }), 'PAYMENT_RECEIVED 2 件').toBe(2);
    const collectedEvs = await prisma.domainEvent.findMany({ where: { tenantId: t, aggregateId: invId, eventType: 'RECEIVABLE_COLLECTED' }, select: { id: true } });
    expect(collectedEvs.length, 'RECEIVABLE_COLLECTED は 1 件').toBe(1);
    expect(await prisma.outboxMessage.count({ where: { tenantId: t, eventId: { in: collectedEvs.map((e) => e.id) } } }), '配送対象 Outbox 1 件').toBe(1);
    expect(await prisma.growthEvent.count({ where: { tenantId: t, entityId: invId, type: 'finance.receivable.collected' } }), '回収 Growth 1 件').toBe(1);
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
