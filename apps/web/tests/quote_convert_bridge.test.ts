import { describe, expect, it } from 'vitest';
import { convertQuoteToInvoiceCore, type ConvertBridgeDb } from '../lib/quote-convert-bridge';

// P3-Q2C hardening（Codex V75 Q2C P2-2/P2-4）: 見積→請求 変換 core の mock 契約テスト。
// - AI 主体は DB 接触前に forbidden（call 0）。
// - Invoice+lineItems+監査が単一 $transaction 内・tenant スコープ・quoteId/メタ整合。
// - quoteId の P2002 は 'already'（監査は出さない）／quoteId 以外の P2002・非 P2002 は再 throw。
// - 監査失敗は握りつぶさず throw（＝実 DB では請求書ごと rollback・孤児 0。実証は db_evidence spec）。

interface Call { model: string; op: string; args: any }

function makeMockDb(opts: { createError?: any; auditError?: any } = {}) {
  const calls: Call[] = [];
  let txDepth = 0;
  const rec = (model: string, op: string, args: any) => {
    expect(txDepth, `${model}.${op} が $transaction の外`).toBeGreaterThan(0);
    calls.push({ model, op, args });
  };
  const tx = {
    invoice: {
      create: async (args: any) => {
        rec('invoice', 'create', args);
        if (opts.createError) throw opts.createError;
        return { id: 'inv_mock_1' };
      },
    },
    auditLog: {
      create: async (args: any) => {
        rec('auditLog', 'create', args);
        if (opts.auditError) throw opts.auditError;
        return {};
      },
    },
  };
  const db: ConvertBridgeDb = {
    async $transaction<T>(fn: (t: any) => Promise<T>): Promise<T> {
      txDepth += 1;
      try {
        return await fn(tx);
      } finally {
        txDepth -= 1;
      }
    },
  };
  return { db, calls };
}

const INPUT = {
  tenantId: 't1',
  actorId: 'u1',
  actorIsAi: false,
  quoteId: 'quote1',
  quoteNumber: 'Q-2026-100',
  invoiceNumber: 'INV-2026-201',
  customerId: 'cust1',
  dealId: 'deal1',
  dueDate: new Date('2026-08-01T00:00:00Z'),
  draft: { subtotal: 80000, taxAmount: 8000, total: 88000, lineItems: [{ name: 'A', quantity: 1, unitPrice: 56000, amount: 56000 }, { name: 'B', quantity: 1, unitPrice: 24000, amount: 24000 }] },
};

function p2002(target: unknown) {
  const e: any = new Error('Unique constraint failed');
  e.code = 'P2002';
  e.meta = { target };
  return e;
}

describe('quote-convert-bridge — AI 主体は DB call 0', () => {
  it('actorIsAi=true は forbidden・呼び出し 0', async () => {
    const { db, calls } = makeMockDb();
    const r = await convertQuoteToInvoiceCore(db, { ...INPUT, actorIsAi: true });
    expect(r.outcome).toBe('forbidden');
    expect(calls).toHaveLength(0);
  });
});

describe('quote-convert-bridge — 変換の transaction 契約', () => {
  it('created: invoice.create→auditLog.create が単一 transaction 内・tenant スコープ・quoteId/メタ整合', async () => {
    const { db, calls } = makeMockDb();
    const r = await convertQuoteToInvoiceCore(db, INPUT);
    expect(r).toEqual({ outcome: 'created', invoiceId: 'inv_mock_1' });
    expect(calls.map((c) => `${c.model}.${c.op}`)).toEqual(['invoice.create', 'auditLog.create']);
    const inv = calls[0]!.args.data;
    expect(inv.tenantId).toBe('t1');
    expect(inv.quoteId).toBe('quote1');
    expect(inv.status).toBe('DRAFT');
    expect(inv.total).toBe(88000);
    expect(inv.lineItems.create).toHaveLength(2);
    const audit = calls[1]!.args.data;
    expect(audit.action).toBe('invoice_create_from_quote');
    expect(audit.entityId).toBe('inv_mock_1');
    expect(audit.metadata).toEqual({ quoteId: 'quote1' });
    expect(audit.tenantId).toBe('t1');
  });

  it('quoteId の P2002（並行敗者）は already・監査を出さない', async () => {
    const { db, calls } = makeMockDb({ createError: p2002(['quoteId']) });
    const r = await convertQuoteToInvoiceCore(db, INPUT);
    expect(r).toEqual({ outcome: 'already' });
    expect(calls.map((c) => `${c.model}.${c.op}`)).toEqual(['invoice.create']); // audit 未実行
  });

  it('制約名文字列（Invoice_quoteId_key）でも already に収束', async () => {
    const { db } = makeMockDb({ createError: p2002('Invoice_quoteId_key') });
    expect((await convertQuoteToInvoiceCore(db, INPUT)).outcome).toBe('already');
  });

  it('quoteId 以外の P2002 は already に握りつぶさず再 throw', async () => {
    const { db } = makeMockDb({ createError: p2002(['number']) });
    await expect(convertQuoteToInvoiceCore(db, INPUT)).rejects.toMatchObject({ code: 'P2002' });
  });

  it('非 P2002 の失敗は再 throw', async () => {
    const { db } = makeMockDb({ createError: new Error('db-down') });
    await expect(convertQuoteToInvoiceCore(db, INPUT)).rejects.toThrow('db-down');
  });

  it('監査失敗は握りつぶさず throw（実 DB では請求書ごと rollback＝孤児 0）', async () => {
    const { db, calls } = makeMockDb({ auditError: new Error('audit-down') });
    await expect(convertQuoteToInvoiceCore(db, INPUT)).rejects.toThrow('audit-down');
    // invoice.create は試行されるが transaction は throw で中断（実 DB では rollback）。
    expect(calls.map((c) => `${c.model}.${c.op}`)).toEqual(['invoice.create', 'auditLog.create']);
  });
});
