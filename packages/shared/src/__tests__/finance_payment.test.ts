import { describe, it, expect } from 'vitest';
import {
  invoiceOutstanding,
  invoiceStatusAfterPayment,
  receivableStatusAfterPayment,
  canSendInvoice,
  isInvoiceSent,
  summarizeCashflowActualVsExpected,
} from '../finance';
import { requiresApproval } from '../approval';
import { isGrowthEventType, growthCategoryOf } from '../growth';
import { isDomainEventType } from '../events';

describe('Invoice payment — amounts and statuses', () => {
  it('computes outstanding (never negative)', () => {
    expect(invoiceOutstanding(110000, 40000)).toBe(70000);
    expect(invoiceOutstanding(110000, 120000)).toBe(0);
  });

  it('derives invoice status after payment', () => {
    expect(invoiceStatusAfterPayment(110000, 40000)).toBe('PARTIALLY_PAID');
    expect(invoiceStatusAfterPayment(110000, 110000)).toBe('PAID');
    expect(invoiceStatusAfterPayment(110000, 130000)).toBe('PAID');
  });

  it('derives receivable status after payment', () => {
    expect(receivableStatusAfterPayment(110000, 40000)).toBe('open');
    expect(receivableStatusAfterPayment(110000, 110000)).toBe('collected');
  });
});

describe('Invoice send — gate logic (double-send prevention)', () => {
  it('only DRAFT/ISSUED can be sent', () => {
    expect(canSendInvoice('DRAFT')).toBe(true);
    expect(canSendInvoice('ISSUED')).toBe(true);
    expect(canSendInvoice('SENT')).toBe(false);
    expect(canSendInvoice('PAID')).toBe(false);
  });
  it('isInvoiceSent flags sent/beyond (not VOID)', () => {
    expect(isInvoiceSent('SENT')).toBe(true);
    expect(isInvoiceSent('PARTIALLY_PAID')).toBe(true);
    expect(isInvoiceSent('PAID')).toBe(true);
    expect(isInvoiceSent('ISSUED')).toBe(false);
    expect(isInvoiceSent('VOID')).toBe(false);
  });
  it('invoice_send always requires approval', () => {
    expect(requiresApproval('invoice_send')).toBe(true);
  });
});

describe('Cashflow — actual vs expected', () => {
  it('separates expected (draft/pending/approved) from actual (posted) by direction', () => {
    const s = summarizeCashflowActualVsExpected([
      { type: 'payment_expected', direction: 'inflow', amount: 110000, status: 'approved' },
      { type: 'cashflow_expected', direction: 'outflow', amount: 60000, status: 'draft' },
      { type: 'payment_received', direction: 'inflow', amount: 50000, status: 'posted' },
      { type: 'event_cost', direction: 'outflow', amount: 999, status: 'posted' }, // 非フロー種別→除外
    ]);
    expect(s.inflowExpected).toBe(110000);
    expect(s.outflowExpected).toBe(60000);
    expect(s.inflowActual).toBe(50000);
    expect(s.outflowActual).toBe(0); // event_cost は集計対象外
    expect(s.netExpected).toBe(50000);
    expect(s.netActual).toBe(50000);
  });

  it('warns when expected outflow exceeds expected inflow', () => {
    const s = summarizeCashflowActualVsExpected([
      { type: 'payment_expected', direction: 'inflow', amount: 10000, status: 'approved' },
      { type: 'cashflow_expected', direction: 'outflow', amount: 80000, status: 'approved' },
    ]);
    expect(s.paymentShortfallWarning).toBe(true);
  });
});

describe('Phase 1-10 — new event types', () => {
  it('recognizes invoice.sent/payment.received/receivable.collected growth + domain types', () => {
    for (const t of ['finance.invoice.sent', 'finance.payment.received', 'finance.receivable.collected', 'finance.cashflow.actual_recorded']) {
      expect(isGrowthEventType(t)).toBe(true);
      expect(growthCategoryOf(t)).toBe('finance');
    }
    for (const d of ['INVOICE_SENT', 'RECEIVABLE_COLLECTED', 'CASHFLOW_ACTUAL_RECORDED']) {
      expect(isDomainEventType(d)).toBe(true);
    }
  });
});
