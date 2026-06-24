import { describe, it, expect } from 'vitest';
import {
  journalEntryLinesFor,
  isBalancedJournal,
  canFormalizeJournal,
  inferAccountType,
  invoiceCandidateTotals,
} from '../finance';
import { isGrowthEventType, growthCategoryOf } from '../growth';
import { isDomainEventType } from '../events';

describe('Candidate formalization — journal entry lines', () => {
  it('builds balanced debit/credit lines', () => {
    const lines = journalEntryLinesFor('売掛金', '売上高', 100000);
    expect(lines).toEqual([
      { account: '売掛金', debit: 100000, credit: 0 },
      { account: '売上高', debit: 0, credit: 100000 },
    ]);
    expect(isBalancedJournal(lines)).toBe(true);
  });

  it('rejects unbalanced or zero journals', () => {
    expect(isBalancedJournal([{ account: 'a', debit: 100, credit: 0 }, { account: 'b', debit: 0, credit: 50 }])).toBe(false);
    expect(isBalancedJournal([{ account: 'a', debit: 0, credit: 0 }, { account: 'b', debit: 0, credit: 0 }])).toBe(false);
  });

  it('guards formalization (amount>0 and accounts present)', () => {
    expect(canFormalizeJournal({ amount: 1000, debitAccount: '売掛金', creditAccount: '売上高' })).toBe(true);
    expect(canFormalizeJournal({ amount: 0, debitAccount: '売掛金', creditAccount: '売上高' })).toBe(false);
    expect(canFormalizeJournal({ amount: 1000, debitAccount: '', creditAccount: '売上高' })).toBe(false);
    expect(canFormalizeJournal({ amount: 1000, debitAccount: '売掛金', creditAccount: '  ' })).toBe(false);
  });
});

describe('Candidate formalization — account type inference', () => {
  it('infers account types from common names', () => {
    expect(inferAccountType('売掛金')).toBe('asset');
    expect(inferAccountType('買掛金')).toBe('liability');
    expect(inferAccountType('売上高')).toBe('revenue');
    expect(inferAccountType('売上原価')).toBe('expense');
    expect(inferAccountType('謎勘定')).toBe('asset'); // 既定
  });
});

describe('Candidate formalization — invoice totals reused for Invoice', () => {
  it('keeps tax consistent for formalized invoice', () => {
    const t = invoiceCandidateTotals(200000);
    expect(t.total).toBe(220000);
    expect(t.subtotal + t.taxAmount).toBe(t.total);
  });
});

describe('Candidate formalization — new event types', () => {
  it('recognizes finance posted/formalized growth + domain types', () => {
    for (const t of ['finance.journal_entry.posted', 'finance.invoice.formalized', 'finance.receivable.created']) {
      expect(isGrowthEventType(t)).toBe(true);
      expect(growthCategoryOf(t)).toBe('finance');
    }
    for (const d of ['JOURNAL_ENTRY_POSTED', 'INVOICE_FORMALIZED', 'RECEIVABLE_CREATED']) {
      expect(isDomainEventType(d)).toBe(true);
    }
  });
});
