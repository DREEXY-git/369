import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { prisma } from '@hokko/db';
import {
  makeCanonicalIdempotencyKey,
  idempotencyKeyMatchesIdentity,
  derivePaymentRequestId,
  RECEIVABLE_COLLECTED_DEDUPE,
  readIdemMetadata,
} from '@hokko/shared';
import { emitDomainEvent } from '../../lib/events';
import { recordInvoicePayment } from '../../lib/domains/finance/payments';

// 修正版 Phase A（369-PADN-V5 / Issue #66 CONTROL_REVISION 29）: 入金経路 DomainEvent の
// identity 契約（PA-BLK-1）の実 PostgreSQL 証拠。required_tests 1 / 2 / 5（design_verdict_D item 1/2/5）。
//  - PAYMENT_RECEIVED は**実際の非空 dedupe（= client requestKey）**で識別される（PR #71 旧 spec の
//    dedupe 空 fixture は本質を外していた）。Phase B（改訂 #57）形状の canonical 行を seed し、
//    Phase A reader が exact 認識して増分 0 になることを実測する。
//  - RECEIVABLE_COLLECTED は dedupe='receivable-collected'（invoice 安定 dedupe）。
//  - 同一 tenant・同一 invoice・異なる payment token のイベントは**失われない**（request 単位 identity）。
// 外部送信・Webhook 配送・実 LLM は一切なし。cleanup は本テスト作成行の ID/invoice に限定。

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
      tenantId: t, number: `INV-PA2ID-${process.pid}-${Date.now()}-${Math.floor(performance.now())}`.slice(0, 40), status: 'ISSUED', issueDate: new Date(), dueDate: new Date(),
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

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('required_tests 1: PAYMENT_RECEIVED は実非空 dedupe（requestKey）で識別され、Phase B canonical 行へ増分 0 で収束・新規行は契約 identity を持つ', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const invA = await makeIssuedInvoice(100000);
  const invB = await makeIssuedInvoice(100000);
  const token = mkKey();
  const token2 = mkKey();
  try {
    // Phase B（改訂 #57）形状の canonical PAYMENT_RECEIVED 行（**非空 dedupe=token**）＋Outbox を直接 seed。
    const identityA = { tenantId: t, eventType: 'PAYMENT_RECEIVED' as const, aggregateId: invA, dedupe: token };
    const canonicalKey = makeCanonicalIdempotencyKey(identityA);
    expect(canonicalKey).toBe(`PAYMENT_RECEIVED:${encodeURIComponent(t)}:${encodeURIComponent(invA)}:${encodeURIComponent(token)}`);
    const fixture = await prisma.domainEvent.create({
      data: {
        tenantId: t, eventType: 'PAYMENT_RECEIVED', aggregateType: 'Invoice', aggregateId: invA, actorType: 'user',
        payload: { growthType: 'finance.payment.received', idem: { aggregateType: 'Invoice', aggregateId: invA, dedupe: token, enc: 'canonical', v: 1 } },
        idempotencyKey: canonicalKey, status: 'pending',
      },
    });
    await prisma.outboxMessage.create({ data: { tenantId: t, eventId: fixture.id, eventType: 'PAYMENT_RECEIVED', status: 'pending' } });

    // (i) 同一 identity（非空 dedupe）の emit 再実行 2 回 → canonical 行へ収束・増分 0。
    for (let i = 0; i < 2; i++) {
      const r = await emitDomainEvent({ tenantId: t, eventType: 'PAYMENT_RECEIVED', aggregateType: 'Invoice', aggregateId: invA, dedupe: token });
      expect(r.duplicated, `${i + 1}回目の emit は canonical 行へ収束`).toBe(true);
      expect(r.eventId, '同一 eventId へ収束').toBe(fixture.id);
    }
    expect(await prisma.domainEvent.count({ where: { tenantId: t, aggregateId: invA } }), 'DomainEvent 増分 0').toBe(1);
    expect(await prisma.outboxMessage.count({ where: { tenantId: t, eventId: fixture.id } }), 'Outbox 増分 0').toBe(1);

    // (ii) 修正版フローの実 emit が契約 identity（dedupe=実 token）を byte で持つことを pin。
    const r2 = await recordInvoicePayment({ tenantId: t, userId: uid }, invB, 4000, 'bank', { idempotencyKey: token2 });
    expect(r2.ok).toBe(true);
    const row = await prisma.domainEvent.findFirst({
      where: { tenantId: t, aggregateId: invB, eventType: 'PAYMENT_RECEIVED' },
      select: { idempotencyKey: true, payload: true },
    });
    expect(row, 'PAYMENT_RECEIVED 行が作成される').toBeTruthy();
    expect(
      idempotencyKeyMatchesIdentity(row!.idempotencyKey, { tenantId: t, eventType: 'PAYMENT_RECEIVED', aggregateId: invB, dedupe: token2 }),
      '保存 key は request 単位 identity（dedupe=token2）に一致',
    ).toBe(true);
    expect(
      idempotencyKeyMatchesIdentity(row!.idempotencyKey, { tenantId: t, eventType: 'PAYMENT_RECEIVED', aggregateId: invB, dedupe: '' }),
      'dedupe 空の旧 identity には一致しない（PA-BLK-1 の封鎖）',
    ).toBe(false);
    // payload.idem に identity が無損失保存される（ID-2・legacy 照合を決定的にする）。
    expect(readIdemMetadata(row!.payload)).toEqual({ dedupe: token2 });
    // Payment.id は server-derived 単射 ID（ID-1）。
    expect(await prisma.payment.count({ where: { id: derivePaymentRequestId(t, token2), tenantId: t, invoiceId: invB } })).toBe(1);
  } finally {
    await cleanupInvoice(invA);
    await cleanupInvoice(invB);
  }
});

test('required_tests 2: RECEIVABLE_COLLECTED の identity 契約（dedupe=receivable-collected）で Phase B 行へ収束・新規行も契約準拠', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const invA = await makeIssuedInvoice(10000);
  const invB = await makeIssuedInvoice(10000);
  try {
    // Phase B 形状の canonical RECEIVABLE_COLLECTED 行（dedupe='receivable-collected'）＋Outbox を seed。
    const identityA = { tenantId: t, eventType: 'RECEIVABLE_COLLECTED' as const, aggregateId: invA, dedupe: RECEIVABLE_COLLECTED_DEDUPE };
    const canonicalKey = makeCanonicalIdempotencyKey(identityA);
    const fixture = await prisma.domainEvent.create({
      data: {
        tenantId: t, eventType: 'RECEIVABLE_COLLECTED', aggregateType: 'Invoice', aggregateId: invA, actorType: 'user',
        payload: { growthType: 'finance.receivable.collected', idem: { aggregateType: 'Invoice', aggregateId: invA, dedupe: RECEIVABLE_COLLECTED_DEDUPE, enc: 'canonical', v: 1 } },
        idempotencyKey: canonicalKey, status: 'pending',
      },
    });
    await prisma.outboxMessage.create({ data: { tenantId: t, eventId: fixture.id, eventType: 'RECEIVABLE_COLLECTED', status: 'pending' } });

    const r = await emitDomainEvent({ tenantId: t, eventType: 'RECEIVABLE_COLLECTED', aggregateType: 'Invoice', aggregateId: invA, dedupe: RECEIVABLE_COLLECTED_DEDUPE });
    expect(r.duplicated, 'emit 再実行は canonical 行へ収束').toBe(true);
    expect(r.eventId).toBe(fixture.id);
    expect(await prisma.domainEvent.count({ where: { tenantId: t, aggregateId: invA } }), '増分 0').toBe(1);
    expect(await prisma.outboxMessage.count({ where: { tenantId: t, eventId: fixture.id } }), 'Outbox 増分 0').toBe(1);

    // 修正版フローの全額入金 → 生成された RECEIVABLE_COLLECTED 行が契約 identity に一致。
    const pay = await recordInvoicePayment({ tenantId: t, userId: uid }, invB, 10000, 'bank', { idempotencyKey: mkKey() });
    expect(pay.ok).toBe(true);
    expect(pay.fullyPaid).toBe(true);
    const row = await prisma.domainEvent.findFirst({
      where: { tenantId: t, aggregateId: invB, eventType: 'RECEIVABLE_COLLECTED' },
      select: { idempotencyKey: true, payload: true },
    });
    expect(row, 'RECEIVABLE_COLLECTED 行が作成される').toBeTruthy();
    expect(
      idempotencyKeyMatchesIdentity(row!.idempotencyKey, { tenantId: t, eventType: 'RECEIVABLE_COLLECTED', aggregateId: invB, dedupe: RECEIVABLE_COLLECTED_DEDUPE }),
      '保存 key は契約 identity（dedupe=receivable-collected）に一致',
    ).toBe(true);
    expect(
      idempotencyKeyMatchesIdentity(row!.idempotencyKey, { tenantId: t, eventType: 'RECEIVABLE_COLLECTED', aggregateId: invB, dedupe: '' }),
      'dedupe 空の旧 identity には一致しない',
    ).toBe(false);
    expect(readIdemMetadata(row!.payload)).toEqual({ dedupe: RECEIVABLE_COLLECTED_DEDUPE });
  } finally {
    await cleanupInvoice(invA);
    await cleanupInvoice(invB);
  }
});

test('required_tests 5: 同一 tenant・同一 invoice・異なる payment token のイベントは失われない（request 単位 identity・全 6 系 2 件）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const invId = await makeIssuedInvoice(100000);
  const tokenA = mkKey();
  const tokenB = mkKey();
  try {
    const r1 = await recordInvoicePayment({ tenantId: t, userId: uid }, invId, 4000, 'bank', { idempotencyKey: tokenA });
    const r2 = await recordInvoicePayment({ tenantId: t, userId: uid }, invId, 3000, 'bank', { idempotencyKey: tokenB });
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r1.idempotent ?? false, '1件目は新規').toBe(false);
    expect(r2.idempotent ?? false, '2件目も新規（別 request）').toBe(false);

    expect(await prisma.payment.count({ where: { invoiceId: invId } }), 'Payment 2件').toBe(2);
    const evs = await prisma.domainEvent.findMany({
      where: { tenantId: t, aggregateId: invId, eventType: 'PAYMENT_RECEIVED' },
      select: { id: true, idempotencyKey: true },
    });
    expect(evs.length, 'PAYMENT_RECEIVED DomainEvent 2件（2件目を失わない）').toBe(2);
    expect(new Set(evs.map((e) => e.idempotencyKey)).size, 'key は相異なる（request 単位）').toBe(2);
    expect(
      await prisma.outboxMessage.count({ where: { tenantId: t, eventId: { in: evs.map((e) => e.id) } } }),
      'Outbox 2件（Webhook 再配送対象も 2）',
    ).toBe(2);
    const payIds = [derivePaymentRequestId(t, tokenA), derivePaymentRequestId(t, tokenB)];
    expect(
      await prisma.growthEvent.count({ where: { tenantId: t, type: 'finance.payment.received', entityId: { in: payIds } } }),
      'GrowthEvent 2件',
    ).toBe(2);
    expect(await prisma.financeEvent.count({ where: { tenantId: t, sourceId: invId, type: 'payment_received' } }), 'FinanceEvent 2件').toBe(2);
    expect(await prisma.auditLog.count({ where: { tenantId: t, entityId: invId, action: 'payment_record' } }), 'Audit 2件').toBe(2);
    expect(
      Number((await prisma.invoice.findUnique({ where: { id: invId }, select: { paidAmount: true } }))!.paidAmount),
      'paidAmount は 7000（二重計上なし・欠落なし）',
    ).toBe(7000);
  } finally {
    await cleanupInvoice(invId);
  }
});
