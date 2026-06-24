// 候補 → 正式データの変換サービス（承認後にのみ実行）。Phase 1-9。
// 正式/候補の境界はこのファイルだけ。candidate.status で冪等（posted/sent 済は再実行不可）。
// 設計ルール: docs/audit/12_maintenance_architecture.md。
import { prisma, writeAudit } from '@/lib/db';
import { writeConfidentialViewLog } from '@/lib/audit';
import { emitGrowthEvent } from '@/lib/growth';
import { toNumber } from '@/lib/utils';
import {
  journalEntryLinesFor,
  canFormalizeJournal,
  inferAccountType,
  type ConfidentialityLabel,
  type DomainEventType,
} from '@hokko/shared';

export interface Actor {
  tenantId: string;
  userId?: string | null;
}

export interface FormalizeResult {
  ok: boolean;
  reason?: string;
  journalEntryId?: string;
  invoiceId?: string;
}

/** 勘定科目名から Account を解決（無ければ最小作成）。 */
async function resolveAccount(tenantId: string, name: string) {
  const existing = await prisma.account.findFirst({ where: { tenantId, name } });
  if (existing) return existing;
  return prisma.account.create({ data: { tenantId, code: name.slice(0, 8), name, type: inferAccountType(name) } });
}

/** 承認済み仕訳候補 → 正式 JournalEntry/JournalEntryLine。冪等（posted済は再実行不可）。 */
export async function finalizeJournalCandidate(actor: Actor, candidateId: string): Promise<FormalizeResult> {
  const jc = await prisma.journalCandidate.findFirst({ where: { id: candidateId, tenantId: actor.tenantId } });
  if (!jc) return { ok: false, reason: 'not-found' };
  if (jc.status === 'posted' || jc.journalEntryId) return { ok: false, reason: 'already-posted' };
  const amount = toNumber(jc.amount);
  if (!canFormalizeJournal({ amount, debitAccount: jc.debitAccount, creditAccount: jc.creditAccount })) {
    return { ok: false, reason: 'invalid-journal' };
  }

  const [debit, credit] = await Promise.all([
    resolveAccount(actor.tenantId, jc.debitAccount),
    resolveAccount(actor.tenantId, jc.creditAccount),
  ]);
  const lines = journalEntryLinesFor(jc.debitAccount, jc.creditAccount, amount);

  const entry = await prisma.journalEntry.create({
    data: {
      tenantId: actor.tenantId,
      date: new Date(),
      memo: jc.description,
      source: 'finance_bridge',
      lines: {
        create: [
          { tenantId: actor.tenantId, accountId: debit.id, debit: lines[0]!.debit, credit: 0 },
          { tenantId: actor.tenantId, accountId: credit.id, debit: 0, credit: lines[1]!.credit },
        ],
      },
    },
  });
  await prisma.journalCandidate.update({ where: { id: candidateId }, data: { status: 'posted', journalEntryId: entry.id } });

  await writeAudit({ tenantId: actor.tenantId, actorId: actor.userId, action: 'journal_finalize', entityType: 'JournalEntry', entityId: entry.id, summary: `仕訳候補を正式化: ${jc.description}（${amount}円）` });
  await writeConfidentialViewLog({ tenantId: actor.tenantId, actorId: actor.userId, entityType: 'JournalEntry', entityId: entry.id, label: 'FINANCIAL_CONFIDENTIAL' as ConfidentialityLabel, purpose: '正式仕訳の作成' });
  await emitGrowthEvent({
    tenantId: actor.tenantId,
    type: 'finance.journal_entry.posted',
    title: `正式仕訳: ${jc.description}`,
    actorId: actor.userId,
    entityType: 'JournalEntry',
    entityId: entry.id,
    amount,
    alsoDomainEvent: { domainType: 'JOURNAL_ENTRY_POSTED' as DomainEventType, aggregateType: 'JournalEntry', aggregateId: entry.id },
  });
  return { ok: true, journalEntryId: entry.id };
}

/** 承認済み請求候補 → 正式 Invoice/InvoiceLineItem/Receivable。外部送信なし。冪等。 */
export async function finalizeInvoiceCandidate(actor: Actor, candidateId: string): Promise<FormalizeResult> {
  const ic = await prisma.invoiceCandidate.findFirst({ where: { id: candidateId, tenantId: actor.tenantId } });
  if (!ic) return { ok: false, reason: 'not-found' };
  if (ic.status === 'sent' || ic.invoiceId) return { ok: false, reason: 'already-formalized' };
  const subtotal = toNumber(ic.subtotal);
  const taxAmount = toNumber(ic.taxAmount);
  const total = toNumber(ic.total);
  if (total <= 0) return { ok: false, reason: 'invalid-amount' };

  const number = `INV-${Date.now().toString().slice(-8)}`;
  // 正式 Invoice は status=ISSUED（内部発行）。外部送信は次Phase（prepareExternalPayload＋送信ゲート）。
  const invoice = await prisma.invoice.create({
    data: {
      tenantId: actor.tenantId,
      customerId: ic.customerId,
      number,
      status: 'ISSUED',
      issueDate: new Date(),
      dueDate: ic.dueAt,
      subtotal,
      taxAmount,
      total,
      lineItems: { create: [{ tenantId: actor.tenantId, name: ic.title, quantity: 1, unitPrice: subtotal, amount: subtotal }] },
    },
  });
  const receivable = await prisma.receivable.create({
    data: { tenantId: actor.tenantId, invoiceId: invoice.id, amount: total, dueDate: ic.dueAt, status: 'open' },
  });
  await prisma.invoiceCandidate.update({ where: { id: candidateId }, data: { status: 'sent', invoiceId: invoice.id } });

  await writeAudit({ tenantId: actor.tenantId, actorId: actor.userId, action: 'invoice_send', entityType: 'Invoice', entityId: invoice.id, summary: `請求候補を正式化: ${ic.title}（${total}円・${number}）` });
  await writeConfidentialViewLog({ tenantId: actor.tenantId, actorId: actor.userId, entityType: 'Invoice', entityId: invoice.id, label: 'FINANCIAL_CONFIDENTIAL' as ConfidentialityLabel, purpose: '正式請求書の作成' });
  await emitGrowthEvent({
    tenantId: actor.tenantId,
    type: 'finance.invoice.formalized',
    title: `正式請求書: ${ic.title}`,
    actorId: actor.userId,
    entityType: 'Invoice',
    entityId: invoice.id,
    amount: total,
    revenueImpact: total,
    alsoDomainEvent: { domainType: 'INVOICE_FORMALIZED' as DomainEventType, aggregateType: 'Invoice', aggregateId: invoice.id },
  });
  await emitGrowthEvent({
    tenantId: actor.tenantId,
    type: 'finance.receivable.created',
    title: `売掛金計上: ${ic.title}`,
    actorId: actor.userId,
    entityType: 'Receivable',
    entityId: receivable.id,
    amount: total,
    alsoDomainEvent: { domainType: 'RECEIVABLE_CREATED' as DomainEventType, aggregateType: 'Receivable', aggregateId: receivable.id },
  });
  return { ok: true, invoiceId: invoice.id };
}
