import { describe, expect, it } from 'vitest';
import { issueReceiptCore, type ReceiptBridgeDb } from '../lib/receipt-bridge';

// P3-Q2C-A 領収書発行 core の mock 契約テスト。
// - AI 主体は DB 接触前に forbidden（call 0）。
// - Receipt+監査が単一 $transaction 内・tenant スコープ・invoiceId/メタ整合。
// - invoiceId の P2002 は 'already'（監査を出さない）／invoiceId 以外の P2002・非 P2002 は再 throw。
// - 監査失敗は握りつぶさず throw（実 DB では領収書ごと rollback）。

interface Call { model: string; op: string; args: any }

function makeMockDb(opts: { createError?: any; auditError?: any } = {}) {
  const calls: Call[] = [];
  let txDepth = 0;
  const rec = (model: string, op: string, args: any) => {
    expect(txDepth, `${model}.${op} が $transaction の外`).toBeGreaterThan(0);
    calls.push({ model, op, args });
  };
  const tx = {
    receipt: {
      create: async (args: any) => {
        rec('receipt', 'create', args);
        if (opts.createError) throw opts.createError;
        return { id: 'rct_mock_1' };
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
  const db: ReceiptBridgeDb = {
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
  invoiceId: 'inv1',
  invoiceNumber: 'INV-2026-200',
  receiptNumber: 'RCT-2026-1',
  amount: 110000,
  method: 'bank',
};

function p2002(target: unknown) {
  const e: any = new Error('Unique constraint failed');
  e.code = 'P2002';
  e.meta = { target };
  return e;
}

describe('receipt-bridge — 契約', () => {
  it('AI 主体は forbidden・呼び出し 0', async () => {
    const { db, calls } = makeMockDb();
    expect((await issueReceiptCore(db, { ...INPUT, actorIsAi: true })).outcome).toBe('forbidden');
    expect(calls).toHaveLength(0);
  });

  it('created: receipt.create→auditLog.create が単一 transaction・tenant/invoiceId/メタ整合', async () => {
    const { db, calls } = makeMockDb();
    const r = await issueReceiptCore(db, INPUT);
    expect(r).toEqual({ outcome: 'created', receiptId: 'rct_mock_1' });
    expect(calls.map((c) => `${c.model}.${c.op}`)).toEqual(['receipt.create', 'auditLog.create']);
    expect(calls[0]!.args.data.tenantId).toBe('t1');
    expect(calls[0]!.args.data.invoiceId).toBe('inv1');
    expect(calls[0]!.args.data.amount).toBe(110000);
    expect(calls[1]!.args.data.action).toBe('receipt_issue');
    expect(calls[1]!.args.data.metadata).toEqual({ invoiceId: 'inv1' });
  });

  it('invoiceId の P2002（並行/再送）は already・監査を出さない', async () => {
    const { db, calls } = makeMockDb({ createError: p2002(['invoiceId']) });
    expect((await issueReceiptCore(db, INPUT)).outcome).toBe('already');
    expect(calls.map((c) => `${c.model}.${c.op}`)).toEqual(['receipt.create']);
  });

  it('invoiceId 以外の P2002 は再 throw（誤収束しない）', async () => {
    const { db } = makeMockDb({ createError: p2002(['number']) });
    await expect(issueReceiptCore(db, INPUT)).rejects.toMatchObject({ code: 'P2002' });
  });

  it('監査失敗は握りつぶさず throw', async () => {
    const { db } = makeMockDb({ auditError: new Error('audit-down') });
    await expect(issueReceiptCore(db, INPUT)).rejects.toThrow('audit-down');
  });
});
