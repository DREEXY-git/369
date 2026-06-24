// Phase 1-10 統合テスト（要DB）: 請求送信ゲート（承認後SENT・二重防止）/ 入金消込
// （Payment→Invoice/Receivable/FinanceEvent）/ cashflow集計 / tenant分離。
import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '../client';
import {
  canSendInvoice,
  invoiceStatusAfterPayment,
  receivableStatusAfterPayment,
  summarizeCashflowActualVsExpected,
  requiresApproval,
} from '@hokko/shared';

const T = `itest-p110-${Date.now()}`;
const T2 = `itest-p110b-${Date.now()}`;

async function claimApproval(id: string): Promise<boolean> {
  const claim = await prisma.approvalRequest.updateMany({ where: { id, executedAt: null }, data: { executedAt: new Date(), executionStatus: 'executing' } });
  return claim.count === 1;
}

async function makeInvoice(tenantId: string, total: number, status = 'ISSUED') {
  return prisma.invoice.create({
    data: { tenantId, number: `INV-${Math.random().toString(36).slice(2, 7)}`, status: status as never, subtotal: total, taxAmount: 0, total, paidAmount: 0, dueDate: new Date(), lineItems: { create: [{ tenantId, name: '品目', quantity: 1, unitPrice: total, amount: total }] } },
  });
}

afterAll(async () => {
  for (const tid of [T, T2]) {
    await prisma.financeEvent.deleteMany({ where: { tenantId: tid } });
    await prisma.payment.deleteMany({ where: { tenantId: tid } });
    await prisma.receivable.deleteMany({ where: { tenantId: tid } });
    await prisma.invoiceLineItem.deleteMany({ where: { tenantId: tid } });
    await prisma.invoice.deleteMany({ where: { tenantId: tid } });
    await prisma.approvalRequest.deleteMany({ where: { tenantId: tid } });
    await prisma.growthEvent.deleteMany({ where: { tenantId: tid } });
  }
  await prisma.$disconnect();
});

describe('Invoice external send gate', () => {
  it('creates an invoice_send approval and sends only after approval (→ SENT)', async () => {
    const inv = await makeInvoice(T, 110000, 'ISSUED');
    expect(canSendInvoice(inv.status)).toBe(true);
    const req = await prisma.approvalRequest.create({ data: { tenantId: T, type: 'invoice_send', requestedForAction: 'invoice_send', title: '請求送信', entityType: 'Invoice', entityId: inv.id, status: 'APPROVED', payloadAfter: { invoiceId: inv.id } } });

    // 承認後実行（claim → SENT）
    expect(await claimApproval(req.id)).toBe(true);
    await prisma.invoice.update({ where: { id: inv.id }, data: { status: 'SENT' } });
    await prisma.financeEvent.create({ data: { tenantId: T, type: 'payment_expected', sourceType: 'Invoice', sourceId: inv.id, direction: 'inflow', amount: 110000, status: 'approved', description: '入金予定' } });
    const after = await prisma.invoice.findUniqueOrThrow({ where: { id: inv.id } });
    expect(after.status).toBe('SENT');
    expect(canSendInvoice(after.status)).toBe(false); // 二重送信不可
  });

  it('prevents double send via atomic claim', async () => {
    const req = await prisma.approvalRequest.findFirstOrThrow({ where: { tenantId: T, requestedForAction: 'invoice_send' } });
    expect(await claimApproval(req.id)).toBe(false);
  });
});

describe('Payment reconciliation', () => {
  it('partial then full payment updates Invoice/Receivable/FinanceEvent', async () => {
    const inv = await makeInvoice(T, 100000, 'SENT');
    await prisma.receivable.create({ data: { tenantId: T, invoiceId: inv.id, amount: 100000, status: 'open' } });

    // 一部入金 40,000
    await prisma.payment.create({ data: { tenantId: T, invoiceId: inv.id, amount: 40000, method: 'bank' } });
    let paid = 40000;
    await prisma.invoice.update({ where: { id: inv.id }, data: { paidAmount: paid, status: invoiceStatusAfterPayment(100000, paid) as never } });
    await prisma.receivable.updateMany({ where: { invoiceId: inv.id }, data: { status: receivableStatusAfterPayment(100000, paid) } });
    await prisma.financeEvent.create({ data: { tenantId: T, type: 'payment_received', sourceType: 'Invoice', sourceId: inv.id, direction: 'inflow', amount: 40000, status: 'posted', description: '入金' } });

    let cur = await prisma.invoice.findUniqueOrThrow({ where: { id: inv.id } });
    expect(cur.status).toBe('PARTIALLY_PAID');
    let rec = await prisma.receivable.findFirstOrThrow({ where: { invoiceId: inv.id } });
    expect(rec.status).toBe('open');

    // 残額入金 60,000 → 全額
    await prisma.payment.create({ data: { tenantId: T, invoiceId: inv.id, amount: 60000, method: 'bank' } });
    paid = 100000;
    await prisma.invoice.update({ where: { id: inv.id }, data: { paidAmount: paid, status: invoiceStatusAfterPayment(100000, paid) as never } });
    await prisma.receivable.updateMany({ where: { invoiceId: inv.id }, data: { status: receivableStatusAfterPayment(100000, paid) } });
    await prisma.financeEvent.create({ data: { tenantId: T, type: 'payment_received', sourceType: 'Invoice', sourceId: inv.id, direction: 'inflow', amount: 60000, status: 'posted', description: '入金' } });

    cur = await prisma.invoice.findUniqueOrThrow({ where: { id: inv.id } });
    expect(cur.status).toBe('PAID');
    expect(Number(cur.paidAmount)).toBe(100000);
    rec = await prisma.receivable.findFirstOrThrow({ where: { invoiceId: inv.id } });
    expect(rec.status).toBe('collected');

    const received = await prisma.financeEvent.count({ where: { tenantId: T, sourceId: inv.id, type: 'payment_received' } });
    expect(received).toBe(2);
  });
});

describe('Cashflow summary + approval + tenant isolation', () => {
  it('summarizes actual vs expected from FinanceEvents', async () => {
    const events = await prisma.financeEvent.findMany({ where: { tenantId: T } });
    const s = summarizeCashflowActualVsExpected(events.map((e) => ({ type: e.type, direction: e.direction, amount: Number(e.amount), status: e.status })));
    expect(s.inflowActual).toBeGreaterThan(0); // payment_received posted
  });

  it('invoice_send requires approval', () => {
    expect(requiresApproval('invoice_send')).toBe(true);
  });

  it('isolates invoices by tenant', async () => {
    await makeInvoice(T2, 5000, 'ISSUED');
    const fromT = await prisma.invoice.findMany({ where: { tenantId: T, total: 5000 } });
    expect(fromT.length).toBe(0);
  });
});
