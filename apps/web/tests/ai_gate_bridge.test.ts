import { describe, expect, it } from 'vitest';
import { decideAiGateCore, type GateBridgeDb } from '../lib/ai-gate-bridge';

// v7.0 Lane P4（roadmap82）／v7.0 R2（Codex comment 4951050657）: AI 承認ゲート判断の transaction 契約テスト
// （mock db 注入）。実 DB の並行・rollback・stale 証拠は tests/e2e/ai_gate_bridge.spec.ts（実 PostgreSQL）が正。
// v7.0 R2 の契約: approve = NEEDS_APPROVAL→QUEUED（再開待ち・SUCCEEDED/finishedAt を付けない）、
// stale gate の approve は confirmStale が無い限り DB を一切変更しない。

interface Call {
  model: string;
  op: string;
  args: any;
}

const FRESH = new Date('2026-07-12T12:00:00Z');
const NOW = new Date('2026-07-12T13:00:00Z'); // gate 作成から 1h（fresh）
const OLD = new Date('2026-07-10T00:00:00Z'); // 24h 超（stale）

function makeMockDb(opts: {
  gateCasCount?: number;
  gateRow?: { id: string; runId: string | null; action: string; status: string; createdAt: Date | null } | null;
  runRow?: { id: string; status: string; startedAt: Date | null } | null;
  runQueuedCount?: number;
  runFailedCount?: number;
} = {}) {
  const calls: Call[] = [];
  let txDepth = 0;
  const record = (model: string, op: string, args: any) => {
    expect(txDepth, `${model}.${op} が $transaction の外`).toBeGreaterThan(0);
    calls.push({ model, op, args });
  };
  const tx = {
    aIApprovalGate: {
      updateMany: async (args: any) => {
        record('aIApprovalGate', 'updateMany', args);
        return { count: opts.gateCasCount ?? 1 };
      },
      findFirst: async (args: any) => {
        record('aIApprovalGate', 'findFirst', args);
        return opts.gateRow === undefined
          ? { id: 'gate_1', runId: 'run_1', action: 'morning_report', status: 'PENDING', createdAt: FRESH }
          : opts.gateRow;
      },
    },
    aIAgentRun: {
      findFirst: async (args: any) => {
        record('aIAgentRun', 'findFirst', args);
        return opts.runRow === undefined
          ? { id: 'run_1', status: 'NEEDS_APPROVAL', startedAt: FRESH }
          : opts.runRow;
      },
      updateMany: async (args: any) => {
        record('aIAgentRun', 'updateMany', args);
        if (args.data.status === 'QUEUED') return { count: opts.runQueuedCount ?? 1 };
        return { count: opts.runFailedCount ?? 1 };
      },
    },
    aIAgentAction: { create: async (args: any) => { record('aIAgentAction', 'create', args); return {}; } },
    approvalRequest: { create: async (args: any) => { record('approvalRequest', 'create', args); return { id: 'apr_1' }; } },
    auditLog: { create: async (args: any) => { record('auditLog', 'create', args); return {}; } },
    dataAccessLog: { create: async (args: any) => { record('dataAccessLog', 'create', args); return {}; } },
  };
  const db: GateBridgeDb = {
    async $transaction(fn) {
      txDepth += 1;
      try {
        return await fn(tx as any);
      } finally {
        txDepth -= 1;
      }
    },
  };
  return { db, calls };
}

const INPUT = {
  tenantId: 't1',
  gateId: 'gate_1',
  decision: 'approve' as const,
  decidedById: 'u1',
  note: '',
  actorIsAi: false,
  now: NOW,
};

describe('decideAiGateCore（契約・v7.0 R2）', () => {
  it('approve: gate取得→run freshness→gate CAS→run QUEUED（再開待ち）→Action→ApprovalRequest 1:1→監査が同一 transaction', async () => {
    const { db, calls } = makeMockDb();
    const r = await decideAiGateCore(db, INPUT);
    expect(r).toEqual({ outcome: 'decided' });
    expect(calls.map((c) => `${c.model}.${c.op}`)).toEqual([
      'aIApprovalGate.findFirst',
      'aIAgentRun.findFirst',
      'aIApprovalGate.updateMany', // PENDING CAS
      'aIAgentRun.updateMany', // NEEDS_APPROVAL→QUEUED（再開待ち）
      'aIAgentAction.create',
      'approvalRequest.create',
      'auditLog.create',
      'dataAccessLog.create',
    ]);
    for (const c of calls) {
      const scope = c.args?.where?.tenantId ?? c.args?.data?.tenantId;
      expect(scope, `${c.model}.${c.op} tenant スコープ`).toBe('t1');
    }
    // approve は SUCCEEDED/finishedAt を付けない（実行証拠なしに成果を記録しない）。
    const runUpdate = calls.find((c) => c.model === 'aIAgentRun' && c.op === 'updateMany')!.args.data;
    expect(runUpdate.status).toBe('QUEUED');
    expect('finishedAt' in runUpdate).toBe(false); // 実行完了の記録は作らない（startedAt は履歴として不変）
    expect('startedAt' in runUpdate).toBe(false);
    const action = calls.find((c) => c.model === 'aIAgentAction')!.args.data;
    expect(action.summary).toContain('再開待ち');
    expect(action.summary).toContain('実行はまだ行われていません');
    // ApprovalRequest は決定済み 1:1 レコード（メタのみ payload・stale 確認フラグを含む）。
    const apr = calls.find((c) => c.model === 'approvalRequest')!.args.data;
    expect(apr.status).toBe('APPROVED');
    expect(apr.decidedById).toBe('u1');
    expect(Object.keys(apr.payload).sort()).toEqual(['action', 'runId', 'staleConfirmed']);
    expect(apr.summary).toContain('再開待ち');
  });

  it('reject: run は FAILED（terminal・再開不可）・AIAgentAction は作らない', async () => {
    const { db, calls } = makeMockDb();
    const r = await decideAiGateCore(db, { ...INPUT, decision: 'reject' });
    expect(r).toEqual({ outcome: 'decided' });
    const runUpdates = calls.filter((c) => c.model === 'aIAgentRun' && c.op === 'updateMany');
    expect(runUpdates).toHaveLength(1);
    expect(runUpdates[0]!.args.data.status).toBe('FAILED');
    expect(calls.filter((c) => c.model === 'aIAgentAction')).toHaveLength(0);
  });

  it('stale gate（createdAt 24h超）の approve は confirmStale なしでは一切 DB を変更しない', async () => {
    const { db, calls } = makeMockDb({
      gateRow: { id: 'gate_1', runId: 'run_1', action: 'x', status: 'PENDING', createdAt: OLD },
    });
    const r = await decideAiGateCore(db, INPUT);
    expect(r).toEqual({ outcome: 'stale' });
    expect(calls.filter((c) => c.op === 'updateMany' || c.op === 'create')).toHaveLength(0); // 読み取りのみ
  });

  it('stale gate も confirmStale=true（人間の明示再確認）なら approve できる・reject は stale でも可', async () => {
    const stale = { gateRow: { id: 'gate_1', runId: 'run_1', action: 'x', status: 'PENDING', createdAt: OLD } };
    {
      const { db } = makeMockDb(stale);
      expect((await decideAiGateCore(db, { ...INPUT, confirmStale: true })).outcome).toBe('decided');
    }
    {
      const { db, calls } = makeMockDb(stale);
      expect((await decideAiGateCore(db, { ...INPUT, decision: 'reject' })).outcome).toBe('decided');
      expect(calls.some((c) => c.model === 'aIAgentRun' && c.op === 'updateMany' && c.args.data.status === 'FAILED')).toBe(true);
    }
  });

  it('startedAt null の NEEDS_APPROVAL run（実行系譜を断定できない）も fail-closed で stale', async () => {
    const { db, calls } = makeMockDb({ runRow: { id: 'run_1', status: 'NEEDS_APPROVAL', startedAt: null } });
    const r = await decideAiGateCore(db, INPUT);
    expect(r).toEqual({ outcome: 'stale' });
    expect(calls.filter((c) => c.op === 'updateMany' || c.op === 'create')).toHaveLength(0);
  });

  it('並行判断の敗者（gate CAS count 0）: run にも記録にも触れない', async () => {
    const { db, calls } = makeMockDb({ gateCasCount: 0 });
    const r = await decideAiGateCore(db, INPUT);
    expect(r).toEqual({ outcome: 'already' });
    expect(calls.filter((c) => c.op === 'create')).toHaveLength(0);
    expect(calls.filter((c) => c.model === 'aIAgentRun' && c.op === 'updateMany')).toHaveLength(0);
  });

  it('gate が PENDING でない/不存在/別 tenant: already（存在シグナルなし・読み取りのみ）', async () => {
    const { db, calls } = makeMockDb({ gateRow: null });
    const r = await decideAiGateCore(db, INPUT);
    expect(r).toEqual({ outcome: 'already' });
    expect(calls.filter((c) => c.op !== 'findFirst')).toHaveLength(0);
  });

  it('run 遷移 count 0（消失/terminal/競合）: throw = 判断ごと rollback 契約', async () => {
    // freshness fetch は NEEDS_APPROVAL を返すが CAS 直後に競合で遷移が失敗したケース。
    const { db, calls } = makeMockDb({ runQueuedCount: 0 });
    await expect(decideAiGateCore(db, INPUT)).rejects.toThrow('ai-run-transition-failed');
    expect(calls.filter((c) => c.model === 'approvalRequest')).toHaveLength(0);
    expect(calls.filter((c) => c.model === 'auditLog')).toHaveLength(0);
  });

  it('runId null の孤立 gate: 判断のみで完結（run へは一切触れない）', async () => {
    const { db, calls } = makeMockDb({ gateRow: { id: 'gate_1', runId: null, action: 'x', status: 'PENDING', createdAt: FRESH } });
    const r = await decideAiGateCore(db, INPUT);
    expect(r).toEqual({ outcome: 'decided' });
    expect(calls.filter((c) => c.model === 'aIAgentRun')).toHaveLength(0);
    expect(calls.filter((c) => c.model === 'approvalRequest')).toHaveLength(1);
  });

  it('AI 主体は DB 接触前に forbidden', async () => {
    const { db, calls } = makeMockDb();
    const r = await decideAiGateCore(db, { ...INPUT, actorIsAi: true });
    expect(r).toEqual({ outcome: 'forbidden' });
    expect(calls).toHaveLength(0);
  });
});
