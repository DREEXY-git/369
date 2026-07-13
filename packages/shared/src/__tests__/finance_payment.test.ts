import { describe, it, expect } from 'vitest';
import {
  invoiceOutstanding,
  invoiceStatusAfterPayment,
  receivableStatusAfterPayment,
  canSendInvoice,
  isInvoiceSent,
  summarizeCashflowActualVsExpected,
  canConvertQuoteToInvoice,
  quoteStatusOnIssueDecision,
  buildInvoiceDraftFromQuote,
  canIssueReceipt,
  agingBucketOf,
  bucketReceivablesByAge,
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

describe('P3-Q2C — 見積発行承認の決定後ステータス', () => {
  it('approve → approved / reject → rejected', () => {
    expect(quoteStatusOnIssueDecision('approve')).toEqual({ status: 'approved' });
    expect(quoteStatusOnIssueDecision('reject')).toEqual({ status: 'rejected' });
  });
});

describe('P3-Q2C — 請求書へ変換できる見積ステータス', () => {
  it('approved のみ変換可（他は不可・fail-closed）', () => {
    expect(canConvertQuoteToInvoice('approved')).toBe(true);
    for (const s of ['draft', 'pending_approval', 'rejected', 'sent', 'accepted', '']) {
      expect(canConvertQuoteToInvoice(s)).toBe(false);
    }
  });
});

describe('P3-Q2C — 見積→請求書ドラフトの金額導出（値引きを明細へ按分）', () => {
  it('値引きなし: 明細をそのまま写し subtotal/税/合計が整合する', () => {
    const d = buildInvoiceDraftFromQuote(
      { discountRate: 0, taxRate: 10 },
      [
        { name: 'A', quantity: 1, unitPrice: 70000, amount: 70000 },
        { name: 'B', quantity: 1, unitPrice: 30000, amount: 30000 },
      ],
    );
    expect(d.subtotal).toBe(100000);
    expect(d.taxAmount).toBe(10000);
    expect(d.total).toBe(110000);
    expect(d.lineItems).toEqual([
      { name: 'A', quantity: 1, unitPrice: 70000, amount: 70000 },
      { name: 'B', quantity: 1, unitPrice: 30000, amount: 30000 },
    ]);
  });

  it('値引き20%: 各明細に factor を掛け Σ(行金額)=subtotal・税/合計が一致', () => {
    const d = buildInvoiceDraftFromQuote(
      { discountRate: 20, taxRate: 10 },
      [
        { name: 'A', quantity: 1, unitPrice: 70000, amount: 70000 },
        { name: 'B', quantity: 1, unitPrice: 30000, amount: 30000 },
      ],
    );
    // 70000*0.8=56000, 30000*0.8=24000
    expect(d.lineItems.map((l) => l.amount)).toEqual([56000, 24000]);
    expect(d.subtotal).toBe(80000);
    expect(d.taxAmount).toBe(8000);
    expect(d.total).toBe(88000);
    // 内訳合計と小計は常に一致（丸めは行単位で確定）。
    expect(d.lineItems.reduce((s, l) => s + l.amount, 0)).toBe(d.subtotal);
  });

  it('端数を含む値引き: 2桁で丸め、内訳合計＝小計・合計＝小計＋税を維持', () => {
    const d = buildInvoiceDraftFromQuote(
      { discountRate: 15, taxRate: 10 },
      [{ name: 'X', quantity: 3, unitPrice: 3333, amount: 9999 }],
    );
    // 9999*0.85 = 8499.15
    expect(d.subtotal).toBe(8499.15);
    expect(d.taxAmount).toBe(849.92); // round2(849.915)
    expect(d.total).toBe(9349.07);
    expect(d.lineItems.reduce((s, l) => s + l.amount, 0)).toBe(d.subtotal);
  });
});

describe('P3-Q2C-A — 領収書発行の可否', () => {
  it('PAID のみ発行可（他は不可）', () => {
    expect(canIssueReceipt('PAID')).toBe(true);
    for (const s of ['DRAFT', 'ISSUED', 'SENT', 'PARTIALLY_PAID', 'OVERDUE', 'VOID', '']) {
      expect(canIssueReceipt(s)).toBe(false);
    }
  });
});

describe('P3-Q2C-B — 売掛エイジング', () => {
  it('経過日数でバケットが決まる（0以下=current・境界含む）', () => {
    expect(agingBucketOf(-5)).toBe('current');
    expect(agingBucketOf(0)).toBe('current');
    expect(agingBucketOf(1)).toBe('d1_30');
    expect(agingBucketOf(30)).toBe('d1_30');
    expect(agingBucketOf(31)).toBe('d31_60');
    expect(agingBucketOf(60)).toBe('d31_60');
    expect(agingBucketOf(61)).toBe('d61_90');
    expect(agingBucketOf(90)).toBe('d61_90');
    expect(agingBucketOf(91)).toBe('d90plus');
    expect(agingBucketOf(999)).toBe('d90plus');
  });

  it('未回収を経過日数で集計（0以下の未回収は除外・合計/延滞分/件数）', () => {
    const now = new Date('2026-07-13T00:00:00Z');
    const d = (days: number) => new Date(now.getTime() - days * 86_400_000);
    const s = bucketReceivablesByAge(
      [
        { outstanding: 10000, dueDate: d(-5) }, // 未到来 → current
        { outstanding: 20000, dueDate: d(10) }, // 10日超過 → d1_30
        { outstanding: 30000, dueDate: d(45) }, // 45日 → d31_60
        { outstanding: 40000, dueDate: d(120) }, // 120日 → d90plus
        { outstanding: 0, dueDate: d(200) }, // 除外（回収済み）
        { outstanding: 5000, dueDate: null }, // null → current
      ],
      now,
    );
    expect(s.count).toBe(5);
    expect(s.totalOutstanding).toBe(105000);
    expect(s.overdueAmount).toBe(90000); // current(10000+5000) を除いた延滞分
    const byKey = Object.fromEntries(s.buckets.map((b) => [b.key, b]));
    expect(byKey.current!.amount).toBe(15000);
    expect(byKey.current!.count).toBe(2);
    expect(byKey.d1_30!.amount).toBe(20000);
    expect(byKey.d31_60!.amount).toBe(30000);
    expect(byKey.d90plus!.amount).toBe(40000);
    expect(byKey.d61_90!.count).toBe(0);
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
