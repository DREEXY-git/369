import { describe, expect, it } from 'vitest';
import {
  materializeSuggestionCore,
  requestSuggestionReviewCore,
  decideSuggestionReviewCore,
  type SuggestionBridgeDb,
} from '../lib/suggestion-review-bridge';

// v7.0 R2（Codex CODEX_C19_REVIEW_RESULT_V70 comment 4951281950）→ v7.2 R2
// （CODEX_CHANGE_REQUEST_V72_C19 comment 4951705481）: C19 承認ブリッジの mock 契約テスト。
// - 「AI＋権限誤設定からの直接呼び出しで DB query/call が 0 件」を呼び出し記録付き mock db で証明。
// - materialize の v7.2 契約: deterministic PK（suggestionId 入力が MarketingSuggestion.id になる）、
//   呼び出し順 = findFirst(fast-path) → create(id 指定) → audit(suggestion_materialize) → audit(ai_run)、
//   unique violation（P2002）→ 'already'、既存キー → fast-path 'already'、非 P2002 は再 throw。
// - 全 DB 遷移が $transaction callback 内・全 where/data の tenantId スコープ。
// 並行収束・rollback の実 DB 証拠は suggestion_review_db_evidence.spec.ts（実 PostgreSQL）。

interface Call {
  model: string;
  op: string;
  args: any;
}

function makeMockDb(
  opts: { priorSuggestion?: boolean; createConflict?: boolean; createError?: Error; casCount?: number; approvalCasCount?: number; sugUpdateCount?: number } = {},
) {
  const calls: Call[] = [];
  let txDepth = 0;
  const record = (model: string, op: string, args: any) => {
    expect(txDepth, `${model}.${op} が $transaction の外で呼ばれた`).toBeGreaterThan(0);
    calls.push({ model, op, args });
  };
  const tx = {
    marketingSuggestion: {
      findFirst: async (args: any) => {
        record('marketingSuggestion', 'findFirst', args);
        return opts.priorSuggestion ? { id: args?.where?.id } : null;
      },
      create: async (args: any) => {
        record('marketingSuggestion', 'create', args);
        if (opts.createError) throw opts.createError;
        if (opts.createConflict) {
          const e: any = new Error('Unique constraint failed on the fields: (`id`)');
          e.code = 'P2002';
          throw e;
        }
        return { id: args?.data?.id ?? 'sug_mock_1' }; // deterministic PK を echo
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

const KEY = 'cmockidempotencykey0001';
const MAT_INPUT = {
  tenantId: 't1',
  actorId: 'u1',
  actorIsAi: false,
  suggestionId: KEY,
  aiOutputId: 'out1',
  title: '広告改善案: mock',
  detail: '本文',
  campaignId: 'c1',
  runAudit: { entityType: 'MarketingCampaign', entityId: 'c1', summary: '広告改善案の下書きを生成: mock' },
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

describe('suggestion-review-bridge — materialize の transaction / deterministic PK 契約（v7.2 R2）', () => {
  it('実体化は findFirst→create(id=冪等キー)→audit(materialize)→audit(ai_run) がすべて $transaction 内・tenant スコープ', async () => {
    const { db, calls } = makeMockDb();
    const r = await materializeSuggestionCore(db, MAT_INPUT);
    expect(r).toEqual({ outcome: 'created', suggestionId: KEY });
    expect(calls.map((c) => `${c.model}.${c.op}`)).toEqual([
      'marketingSuggestion.findFirst',
      'marketingSuggestion.create',
      'auditLog.create',
      'auditLog.create',
    ]);
    // deterministic PK: create の data.id が冪等キーそのもの。
    const create = calls.find((c) => c.model === 'marketingSuggestion' && c.op === 'create');
    expect(create?.args?.data?.id).toBe(KEY);
    // 2つの監査の役割: materialize（entityId=aiOutputId）→ ai_run（runAudit の entityType/entityId）。
    const audits = calls.filter((c) => c.model === 'auditLog');
    expect(audits[0]?.args?.data?.action).toBe('suggestion_materialize');
    expect(audits[0]?.args?.data?.entityId).toBe('out1');
    expect(audits[1]?.args?.data?.action).toBe('ai_run');
    expect(audits[1]?.args?.data?.entityType).toBe('MarketingCampaign');
    expect(audits[1]?.args?.data?.entityId).toBe('c1');
    for (const c of calls) {
      const scope = c.args?.where ?? c.args?.data ?? {};
      expect(scope.tenantId, `${c.model}.${c.op} が tenantId でスコープされていない`).toBe('t1');
    }
  });

  it('runAudit なし（output なし経路は action 側で分岐）は audit 1 件のみ', async () => {
    const { db, calls } = makeMockDb();
    const r = await materializeSuggestionCore(db, { ...MAT_INPUT, runAudit: null });
    expect(r).toEqual({ outcome: 'created', suggestionId: KEY });
    expect(calls.map((c) => `${c.model}.${c.op}`)).toEqual([
      'marketingSuggestion.findFirst',
      'marketingSuggestion.create',
      'auditLog.create',
    ]);
  });

  it('既存キー（fast-path）は already を返し create/audit を発行しない（逐次冪等）', async () => {
    const { db, calls } = makeMockDb({ priorSuggestion: true });
    const r = await materializeSuggestionCore(db, MAT_INPUT);
    expect(r).toEqual({ outcome: 'already', suggestionId: KEY });
    expect(calls.map((c) => `${c.model}.${c.op}`)).toEqual(['marketingSuggestion.findFirst']);
  });

  it('unique violation（P2002・並行の敗者）は already に収束し、以降の監査 create を発行しない', async () => {
    const { db, calls } = makeMockDb({ createConflict: true });
    const r = await materializeSuggestionCore(db, MAT_INPUT);
    expect(r).toEqual({ outcome: 'already', suggestionId: KEY });
    // create で throw → transaction ごと中断（audit は 1 件も発行されない）。
    expect(calls.map((c) => `${c.model}.${c.op}`)).toEqual([
      'marketingSuggestion.findFirst',
      'marketingSuggestion.create',
    ]);
  });

  it('P2002 以外の失敗は already に握りつぶさず再 throw する', async () => {
    const { db } = makeMockDb({ createError: new Error('db-down') });
    await expect(materializeSuggestionCore(db, MAT_INPUT)).rejects.toThrow('db-down');
  });

  it('監査へ detail 本文を渡さない（title のみ・metadata は suggestionId/campaignId）', async () => {
    const { db, calls } = makeMockDb();
    await materializeSuggestionCore(db, { ...MAT_INPUT, detail: 'SECRET-DETAIL-MOCK' });
    const audits = calls.filter((c) => c.model === 'auditLog' && c.op === 'create');
    for (const audit of audits) {
      expect(JSON.stringify(audit.args)).not.toContain('SECRET-DETAIL-MOCK');
    }
    expect(audits[0]?.args?.data?.metadata).toEqual({ suggestionId: KEY, campaignId: 'c1' });
  });
});
