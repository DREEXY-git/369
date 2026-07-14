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
async function cleanupInvoice(id: string) {
  const t = await tenantId();
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
