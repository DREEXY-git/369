import { describe, expect, it } from 'vitest';
import { decideQuoteIssueCore, type QuoteIssueBridgeDb } from '../lib/quote-issue-bridge';

// P3-Q2C: 見積発行承認（quote_issue）決定ブリッジの mock 契約テスト。
// - AI＋権限誤設定からの直接呼び出しで DB call が 0 件（接触前拒否）。
// - 決定は ApprovalRequest CAS → Quote 遷移 count===1 → audit がすべて $transaction 内・tenant スコープ。
// - 承認 CAS 敗者（count===0）は 'already'（Quote 更新・監査を出さない）。
// - Quote 遷移 count!==1 は決定ごと throw（rollback で ApprovalRequest は PENDING のまま）。
// 実 DB の並行/rollback 証拠は quote_to_invoice.spec.ts（実 PostgreSQL・実 UI）で担保。

interface Call {
  model: string;
  op: string;
  args: any;
}

function makeMockDb(opts: { approvalCasCount?: number; quoteUpdateCount?: number } = {}) {
  const calls: Call[] = [];
  let txDepth = 0;
  const record = (model: string, op: string, args: any) => {
    expect(txDepth, `${model}.${op} が $transaction の外で呼ばれた`).toBeGreaterThan(0);
    calls.push({ model, op, args });
  };
  const tx = {
    approvalRequest: {
      updateMany: async (args: any) => {
        record('approvalRequest', 'updateMany', args);
        return { count: opts.approvalCasCount ?? 1 };
      },
    },
    quote: {
      updateMany: async (args: any) => {
        record('quote', 'updateMany', args);
        return { count: opts.quoteUpdateCount ?? 1 };
      },
    },
    auditLog: {
      create: async (args: any) => {
        record('auditLog', 'create', args);
        return {};
      },
    },
  };
  const db: QuoteIssueBridgeDb = {
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

const BASE = {
  tenantId: 't1',
  approvalId: 'apr1',
  entityId: 'quote1',
  decidedById: 'u1',
  note: '',
  approvalTitle: '見積発行承認: テスト',
  actorIsAi: false,
} as const;

describe('quote-issue-bridge — AI 主体は DB call 0（権限誤設定でも接触前拒否）', () => {
  it('actorIsAi=true は forbidden・mock 呼び出し 0 件', async () => {
    const { db, calls } = makeMockDb();
    const r = await decideQuoteIssueCore(db, { ...BASE, decision: 'approve', actorIsAi: true });
    expect(r.outcome).toBe('forbidden');
    expect(calls).toHaveLength(0);
  });
});

describe('quote-issue-bridge — 決定の transaction 契約', () => {
  it('approve: approvalRequest.updateMany→quote.updateMany→auditLog.create が全て $transaction 内・tenant スコープ', async () => {
    const { db, calls } = makeMockDb();
    const r = await decideQuoteIssueCore(db, { ...BASE, decision: 'approve' });
    expect(r).toEqual({ outcome: 'decided' });
    expect(calls.map((c) => `${c.model}.${c.op}`)).toEqual([
      'approvalRequest.updateMany',
      'quote.updateMany',
      'auditLog.create',
    ]);
    // ApprovalRequest は PENDING 限定 CAS で APPROVED へ。
    const apr = calls[0]!;
    expect(apr.args.where.status).toBe('PENDING');
    expect(apr.args.data.status).toBe('APPROVED');
    // Quote は pending_approval 限定で approved へ。
    const q = calls[1]!;
    expect(q.args.where.status).toBe('pending_approval');
    expect(q.args.where.id).toBe('quote1');
    expect(q.args.data.status).toBe('approved');
    // 監査 action=approve・metadata に quoteId。
    expect(calls[2]!.args.data.action).toBe('approve');
    expect(calls[2]!.args.data.metadata).toEqual({ approvalAction: 'quote_issue', quoteId: 'quote1' });
    for (const c of calls) {
      const scope = c.args?.where ?? c.args?.data ?? {};
      expect(scope.tenantId, `${c.model}.${c.op} が tenantId でスコープされていない`).toBe('t1');
    }
  });

  it('reject: ApprovalRequest→REJECTED・Quote→rejected', async () => {
    const { db, calls } = makeMockDb();
    const r = await decideQuoteIssueCore(db, { ...BASE, decision: 'reject' });
    expect(r).toEqual({ outcome: 'decided' });
    expect(calls[0]!.args.data.status).toBe('REJECTED');
    expect(calls[1]!.args.data.status).toBe('rejected');
    expect(calls[2]!.args.data.action).toBe('reject');
  });

  it('承認 CAS 敗者（count===0）は already・Quote 更新も監査も出さない', async () => {
    const { db, calls } = makeMockDb({ approvalCasCount: 0 });
    const r = await decideQuoteIssueCore(db, { ...BASE, decision: 'approve' });
    expect(r).toEqual({ outcome: 'already' });
    expect(calls.map((c) => `${c.model}.${c.op}`)).toEqual(['approvalRequest.updateMany']);
  });

  it('Quote 遷移 count!==1（対象消失/状態不整合）は決定ごと throw（rollback）', async () => {
    const { db, calls } = makeMockDb({ quoteUpdateCount: 0 });
    await expect(decideQuoteIssueCore(db, { ...BASE, decision: 'approve' })).rejects.toThrow('quote-issue-transition-failed');
    // 監査は出ない（quote.updateMany の後で throw）。
    expect(calls.map((c) => `${c.model}.${c.op}`)).toEqual(['approvalRequest.updateMany', 'quote.updateMany']);
  });

  it('entityId なしは throw（不正な quote_issue 承認）', async () => {
    const { db } = makeMockDb();
    await expect(decideQuoteIssueCore(db, { ...BASE, entityId: null, decision: 'approve' })).rejects.toThrow('without entityId');
  });
});
