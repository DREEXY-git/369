import { describe, expect, it } from 'vitest';
import {
  materializeSuggestionCore,
  requestSuggestionReviewCore,
  decideSuggestionReviewCore,
  type SuggestionBridgeDb,
} from '../lib/suggestion-review-bridge';

// v7.0 R2（Codex CODEX_C19_REVIEW_RESULT_V70 comment 4951281950）: C19 承認ブリッジの mock 契約テスト。
// 特に「AI＋権限誤設定からの直接呼び出しで DB query/call が 0 件」を、呼び出し記録付き mock db で
// 決定論的に証明する（実 DB の行数不変・source order 証拠は suggestion_review_db_evidence.spec.ts）。
// あわせて (a) 全 DB 遷移が $transaction callback 内、(b) materialize の冪等照会、(c) 全 where の
// tenantId スコープを検証する。

interface Call {
  model: string;
  op: string;
  args: any;
}

function makeMockDb(opts: { priorLedger?: boolean; casCount?: number; approvalCasCount?: number; sugUpdateCount?: number } = {}) {
  const calls: Call[] = [];
  let txDepth = 0;
  const record = (model: string, op: string, args: any) => {
    expect(txDepth, `${model}.${op} が $transaction の外で呼ばれた`).toBeGreaterThan(0);
    calls.push({ model, op, args });
  };
  const tx = {
    marketingSuggestion: {
      create: async (args: any) => {
        record('marketingSuggestion', 'create', args);
        return { id: 'sug_mock_1' };
      },
      updateMany: async (args: any) => {
        record('marketingSuggestion', 'updateMany', args);
        return { count: opts.sugUpdateCount ?? opts.casCount ?? 1 };
      },
    },
    approvalRequest: {
      create: async (args: any) => {
        record('approvalRequest', 'create', args);
        return { id: 'apr_mock_1' };
      },
      updateMany: async (args: any) => {
        record('approvalRequest', 'updateMany', args);
        return { count: opts.approvalCasCount ?? 1 };
      },
    },
    auditLog: {
      create: async (args: any) => {
        record('auditLog', 'create', args);
        return {};
      },
      findFirst: async (args: any) => {
        record('auditLog', 'findFirst', args);
        return opts.priorLedger ? { id: 'led_mock_1' } : null;
      },
    },
    dataAccessLog: {
      create: async (args: any) => {
        record('dataAccessLog', 'create', args);
        return {};
      },
    },
  };
  const db: SuggestionBridgeDb = {
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

const MAT_INPUT = {
  tenantId: 't1',
  actorId: 'u1',
  actorIsAi: false,
  aiOutputId: 'out1',
  title: '広告改善案: mock',
  detail: '本文',
  campaignId: 'c1',
};

describe('suggestion-review-bridge — AI 主体は DB call 0（権限誤設定でも接触前拒否）', () => {
  it('materialize / request / decide とも actorIsAi=true で forbidden・mock 呼び出し 0 件', async () => {
    const { db, calls } = makeMockDb();
    expect((await materializeSuggestionCore(db, { ...MAT_INPUT, actorIsAi: true })).outcome).toBe('forbidden');
    expect(
      (await requestSuggestionReviewCore(db, { tenantId: 't1', requestedById: 'ai1', actorIsAi: true, suggestion: { id: 's1', title: 'x' } })).outcome,
    ).toBe('forbidden');
    expect(
      (
        await decideSuggestionReviewCore(db, {
          tenantId: 't1', approvalId: 'a1', entityId: 's1', decision: 'approve',
          decidedById: 'ai1', note: '', approvalTitle: 'x', actorIsAi: true,
        })
      ).outcome,
    ).toBe('forbidden');
    expect(calls).toHaveLength(0); // DB query/call は一切発生しない
  });
});

describe('suggestion-review-bridge — materialize の transaction / 冪等契約', () => {
  it('人間の実体化は findFirst→create(suggestion)→create(audit) がすべて $transaction 内で行われる', async () => {
    const { db, calls } = makeMockDb();
    const r = await materializeSuggestionCore(db, MAT_INPUT);
    expect(r).toEqual({ outcome: 'created', suggestionId: 'sug_mock_1' });
    expect(calls.map((c) => `${c.model}.${c.op}`)).toEqual([
      'auditLog.findFirst',
      'marketingSuggestion.create',
      'auditLog.create',
    ]);
    for (const c of calls) {
      const where = c.args?.where ?? c.args?.data ?? {};
      expect(where.tenantId, `${c.model}.${c.op} が tenantId でスコープされていない`).toBe('t1');
    }
  });

  it('既実体化（ledger あり）は already を返し suggestion/audit を作らない（冪等）', async () => {
    const { db, calls } = makeMockDb({ priorLedger: true });
    const r = await materializeSuggestionCore(db, MAT_INPUT);
    expect(r).toEqual({ outcome: 'already' });
    expect(calls.map((c) => `${c.model}.${c.op}`)).toEqual(['auditLog.findFirst']);
  });

  it('監査へ detail 本文を渡さない（title のみ・metadata は suggestionId/campaignId）', async () => {
    const { db, calls } = makeMockDb();
    await materializeSuggestionCore(db, { ...MAT_INPUT, detail: 'SECRET-DETAIL-MOCK' });
    const audit = calls.find((c) => c.model === 'auditLog' && c.op === 'create');
    expect(JSON.stringify(audit?.args)).not.toContain('SECRET-DETAIL-MOCK');
    expect(audit?.args?.data?.metadata).toEqual({ suggestionId: 'sug_mock_1', campaignId: 'c1' });
  });
});
