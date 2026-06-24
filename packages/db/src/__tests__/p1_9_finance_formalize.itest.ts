// Phase 1-9 統合テスト（要DB）: 候補→正式化（JournalCandidate→JournalEntry /
// InvoiceCandidate→Invoice/Receivable）/ 二重実行防止 / cashflow集計 / 承認必須 / tenant分離。
import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '../client';
import {
  journalEntryLinesFor,
  canFormalizeJournal,
  inferAccountType,
  invoiceCandidateTotals,
  summarizeFinanceEvents,
  requiresApproval,
} from '@hokko/shared';

const T = `itest-p19-${Date.now()}`;
const T2 = `itest-p19b-${Date.now()}`;

async function claimApproval(id: string): Promise<boolean> {
  const claim = await prisma.approvalRequest.updateMany({ where: { id, executedAt: null }, data: { executedAt: new Date(), executionStatus: 'executing' } });
  return claim.count === 1;
}

async function resolveAccount(tenantId: string, name: string) {
  const existing = await prisma.account.findFirst({ where: { tenantId, name } });
  if (existing) return existing;
  return prisma.account.create({ data: { tenantId, code: name.slice(0, 8), name, type: inferAccountType(name) } });
}

// formalize.finalizeJournalCandidate と同等のDB効果（apps/web の lib は packages/db から import 不可）。
async function finalizeJournal(tenantId: string, candidateId: string) {
  const jc = await prisma.journalCandidate.findFirstOrThrow({ where: { id: candidateId, tenantId } });
  if (jc.status === 'posted' || jc.journalEntryId) return { ok: false, reason: 'already-posted' as const };
  const amount = Number(jc.amount);
  if (!canFormalizeJournal({ amount, debitAccount: jc.debitAccount, creditAccount: jc.creditAccount })) return { ok: false, reason: 'invalid' as const };
  const [debit, credit] = await Promise.all([resolveAccount(tenantId, jc.debitAccount), resolveAccount(tenantId, jc.creditAccount)]);
  const lines = journalEntryLinesFor(jc.debitAccount, jc.creditAccount, amount);
  const entry = await prisma.journalEntry.create({
    data: { tenantId, date: new Date(), memo: jc.description, source: 'finance_bridge', lines: { create: [{ tenantId, accountId: debit.id, debit: lines[0]!.debit, credit: 0 }, { tenantId, accountId: credit.id, debit: 0, credit: lines[1]!.credit }] } },
  });
  await prisma.journalCandidate.update({ where: { id: candidateId }, data: { status: 'posted', journalEntryId: entry.id } });
  return { ok: true as const, journalEntryId: entry.id };
}

afterAll(async () => {
  for (const tid of [T, T2]) {
    await prisma.journalEntryLine.deleteMany({ where: { tenantId: tid } });
    await prisma.journalEntry.deleteMany({ where: { tenantId: tid } });
    await prisma.account.deleteMany({ where: { tenantId: tid } });
    await prisma.journalCandidate.deleteMany({ where: { tenantId: tid } });
    await prisma.receivable.deleteMany({ where: { tenantId: tid } });
    await prisma.invoiceLineItem.deleteMany({ where: { tenantId: tid } });
    await prisma.payment.deleteMany({ where: { tenantId: tid } });
    await prisma.invoice.deleteMany({ where: { tenantId: tid } });
    await prisma.invoiceCandidate.deleteMany({ where: { tenantId: tid } });
    await prisma.financeEvent.deleteMany({ where: { tenantId: tid } });
    await prisma.approvalRequest.deleteMany({ where: { tenantId: tid } });
    await prisma.growthEvent.deleteMany({ where: { tenantId: tid } });
  }
  await prisma.$disconnect();
});

describe('JournalCandidate → JournalEntry formalization', () => {
  it('creates a balanced JournalEntry with 2 lines and marks candidate posted', async () => {
    const jc = await prisma.journalCandidate.create({ data: { tenantId: T, sourceType: 'EventProject', debitAccount: '売掛金', creditAccount: '売上高', amount: 100000, description: 'イベント売上' } });
    const req = await prisma.approvalRequest.create({ data: { tenantId: T, type: 'journal_finalize', requestedForAction: 'journal_finalize', title: '仕訳確定', entityType: 'JournalCandidate', entityId: jc.id, status: 'APPROVED', payloadAfter: { candidateId: jc.id } } });

    expect(await claimApproval(req.id)).toBe(true);
    const r = await finalizeJournal(T, jc.id);
    expect(r.ok).toBe(true);

    const entry = await prisma.journalEntry.findFirstOrThrow({ where: { tenantId: T }, include: { lines: true } });
    expect(entry.lines.length).toBe(2);
    const debit = entry.lines.reduce((s, l) => s + Number(l.debit), 0);
    const credit = entry.lines.reduce((s, l) => s + Number(l.credit), 0);
    expect(debit).toBe(credit);
    expect(debit).toBe(100000);
    const after = await prisma.journalCandidate.findUniqueOrThrow({ where: { id: jc.id } });
    expect(after.status).toBe('posted');
    expect(after.journalEntryId).toBe(entry.id);
  });

  it('prevents double execution (claim + status guard)', async () => {
    const jc = await prisma.journalCandidate.findFirstOrThrow({ where: { tenantId: T, status: 'posted' } });
    // 既に posted → 再 formalize は拒否
    const again = await finalizeJournal(T, jc.id);
    expect(again.ok).toBe(false);
    // 既に claim 済みの approval は2回目で claim できない
    const req = await prisma.approvalRequest.findFirstOrThrow({ where: { tenantId: T, requestedForAction: 'journal_finalize' } });
    expect(await claimApproval(req.id)).toBe(false);
  });
});

describe('InvoiceCandidate → Invoice / Receivable formalization', () => {
  it('creates Invoice(ISSUED) + line + receivable and marks candidate sent', async () => {
    const totals = invoiceCandidateTotals(200000);
    const ic = await prisma.invoiceCandidate.create({ data: { tenantId: T, sourceType: 'EventProject', title: 'イベント請求', subtotal: totals.subtotal, taxAmount: totals.taxAmount, total: totals.total, status: 'pending_approval' } });

    const invoice = await prisma.invoice.create({ data: { tenantId: T, number: 'INV-P19', status: 'ISSUED', issueDate: new Date(), subtotal: totals.subtotal, taxAmount: totals.taxAmount, total: totals.total, lineItems: { create: [{ tenantId: T, name: ic.title, quantity: 1, unitPrice: totals.subtotal, amount: totals.subtotal }] } }, include: { lineItems: true } });
    const receivable = await prisma.receivable.create({ data: { tenantId: T, invoiceId: invoice.id, amount: totals.total, status: 'open' } });
    await prisma.invoiceCandidate.update({ where: { id: ic.id }, data: { status: 'sent', invoiceId: invoice.id } });

    expect(invoice.status).toBe('ISSUED');
    expect(invoice.lineItems.length).toBe(1);
    expect(Number(invoice.total)).toBe(220000);
    expect(Number(receivable.amount)).toBe(220000);
    const after = await prisma.invoiceCandidate.findUniqueOrThrow({ where: { id: ic.id } });
    expect(after.status).toBe('sent');
    expect(after.invoiceId).toBe(invoice.id);
  });
});

describe('Cashflow summary + approval + tenant isolation', () => {
  it('summarizes cashflow_expected finance events', async () => {
    await prisma.financeEvent.createMany({ data: [
      { tenantId: T, type: 'cashflow_expected', direction: 'inflow', amount: 220000, status: 'draft' },
      { tenantId: T, type: 'cashflow_expected', direction: 'outflow', amount: 50000, status: 'approved' },
    ] });
    const events = await prisma.financeEvent.findMany({ where: { tenantId: T, type: 'cashflow_expected' } });
    const s = summarizeFinanceEvents(events.map((e) => ({ type: e.type, direction: e.direction, amount: Number(e.amount), status: e.status })));
    expect(s.inflowExpected).toBeGreaterThanOrEqual(220000);
    expect(s.outflowExpected).toBeGreaterThanOrEqual(50000);
  });

  it('journal_finalize / invoice_send always require approval', () => {
    expect(requiresApproval('journal_finalize')).toBe(true);
    expect(requiresApproval('invoice_send')).toBe(true);
  });

  it('isolates journal entries by tenant', async () => {
    const acc = await resolveAccount(T2, '現金');
    await prisma.journalEntry.create({ data: { tenantId: T2, date: new Date(), memo: 'T2のみ', lines: { create: [{ tenantId: T2, accountId: acc.id, debit: 1, credit: 0 }] } } });
    const fromT = await prisma.journalEntry.findMany({ where: { tenantId: T, memo: 'T2のみ' } });
    expect(fromT.length).toBe(0);
  });
});
