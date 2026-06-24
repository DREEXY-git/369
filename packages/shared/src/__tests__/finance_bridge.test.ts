import { describe, it, expect } from 'vitest';
import {
  financeEventDirection,
  journalCandidateFor,
  invoiceCandidateTotals,
  summarizeFinanceEvents,
  DEFAULT_TAX_RATE,
} from '../finance';
import { requiresApproval } from '../approval';
import { isGrowthEventType, growthCategoryOf } from '../growth';

describe('Finance Bridge — finance event direction', () => {
  it('classifies inflow / outflow / neutral', () => {
    expect(financeEventDirection('event_revenue')).toBe('inflow');
    expect(financeEventDirection('damage_charge')).toBe('inflow');
    expect(financeEventDirection('payment_expected')).toBe('inflow');
    expect(financeEventDirection('event_cost')).toBe('outflow');
    expect(financeEventDirection('purchase_order')).toBe('outflow');
    expect(financeEventDirection('cashflow_expected')).toBe('neutral'); // 文脈依存→明示指定
    expect(financeEventDirection('journal_candidate')).toBe('neutral');
  });
});

describe('Finance Bridge — journal candidate mapping', () => {
  it('maps each kind to debit/credit accounts', () => {
    expect(journalCandidateFor('revenue')).toMatchObject({ debitAccount: '売掛金', creditAccount: '売上高' });
    expect(journalCandidateFor('cost')).toMatchObject({ debitAccount: '売上原価', creditAccount: '未払金' });
    expect(journalCandidateFor('purchase')).toMatchObject({ debitAccount: '仕入', creditAccount: '買掛金' });
    expect(journalCandidateFor('damage')).toMatchObject({ debitAccount: '売掛金', creditAccount: '雑収入' });
  });
});

describe('Finance Bridge — invoice candidate totals', () => {
  it('computes tax and total at default 10%', () => {
    expect(invoiceCandidateTotals(100000)).toEqual({ subtotal: 100000, taxAmount: 10000, total: 110000 });
    expect(DEFAULT_TAX_RATE).toBe(0.1);
    expect(invoiceCandidateTotals(-50)).toEqual({ subtotal: 0, taxAmount: 0, total: 0 }); // 負はゼロ
    expect(invoiceCandidateTotals(12345, 0.08).taxAmount).toBe(Math.round(12345 * 0.08));
  });
});

describe('Finance Bridge — cashflow summary', () => {
  it('sums expected inflow/outflow only for non-finalized statuses', () => {
    const s = summarizeFinanceEvents([
      { type: 'cashflow_expected', direction: 'inflow', amount: 110000, status: 'draft' },
      { type: 'cashflow_expected', direction: 'outflow', amount: 50000, status: 'pending_approval' },
      { type: 'payment_received', direction: 'inflow', amount: 99999, status: 'posted' }, // posted は予定に含めない
      { type: 'event_cost', direction: 'outflow', amount: 30000, status: 'ignored' }, // ignored 除外
    ]);
    expect(s.inflowExpected).toBe(110000);
    expect(s.outflowExpected).toBe(50000);
    expect(s.netExpected).toBe(60000);
    expect(s.total).toBe(4);
    expect(s.byType.cashflow_expected).toBe(2);
  });
});

describe('Finance Bridge — dangerous finance ops require approval', () => {
  it('journal_finalize / invoice_send / payment_execute always need approval', () => {
    expect(requiresApproval('journal_finalize')).toBe(true);
    expect(requiresApproval('invoice_send')).toBe(true);
    expect(requiresApproval('payment_execute')).toBe(true);
  });
});

describe('Finance Bridge — new growth event types are valid (finance category)', () => {
  it('recognizes finance.* growth types', () => {
    for (const t of [
      'finance.event.created',
      'finance.journal_candidate.created',
      'finance.invoice_candidate.created',
      'finance.cashflow_expected.created',
      'finance.purchase_order.bridged',
      'finance.event_project.bridged',
      'finance.damage_charge.bridged',
    ]) {
      expect(isGrowthEventType(t)).toBe(true);
      expect(growthCategoryOf(t)).toBe('finance');
    }
  });
});
