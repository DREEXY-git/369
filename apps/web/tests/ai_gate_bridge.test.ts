import { describe, expect, it } from 'vitest';
import { decideAiGateCore, type GateBridgeDb } from '../lib/ai-gate-bridge';

// v7.0 Lane P4（roadmap82）: AI 承認ゲート判断の transaction 契約テスト（mock db 注入）。
// 実 DB の並行・rollback 証拠は tests/e2e/ai_gate_bridge.spec.ts（実 PostgreSQL）が正。

interface Call {
  model: string;
  op: string;
  args: any;
}

function makeMockDb(opts: {
  gateCasCount?: number;
  gateRow?: { id: string; runId: string | null; action: string } | null;
  runNeedsApprovalCount?: number;
  runRunningCount?: number;
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
        return opts.gateRow === undefined ? { id: 'gate_1', runId: 'run_1', action: 'morning_report' } : opts.gateRow;
      },
    },
    aIAgentRun: {
      updateMany: async (args: any) => {
        record('aIAgentRun', 'updateMany', args);
        if (args.where.status === 'NEEDS_APPROVAL') return { count: opts.runNeedsApprovalCount ?? 1 };
        return { count: opts.runRunningCount ?? 1 };
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

const INPUT = { tenantId: 't1', gateId: 'gate_1', decision: 'approve' as const, decidedById: 'u1', note: '', actorIsAi: false };

describe('decideAiGateCore（契約）', () => {
  it('approve: gate CAS→run 2段遷移→AIAgentAction→ApprovalRequest 1:1→監査が同一 transaction', async () => {
    const { db, calls } = makeMockDb();
    const r = await decideAiGateCore(db, INPUT);
    expect(r).toEqual({ outcome: 'decided' });
    expect(calls.map((c) => `${c.model}.${c.op}`)).toEqual([
      'aIApprovalGate.updateMany',
      'aIApprovalGate.findFirst',
      'aIAgentRun.updateMany', // NEEDS_APPROVAL→RUNNING
      'aIAgentRun.updateMany', // RUNNING→SUCCEEDED
      'aIAgentAction.create',
      'approvalRequest.create',
      'auditLog.create',
      'dataAccessLog.create',
    ]);
    for (const c of calls) {
      const scope = c.args?.where?.tenantId ?? c.args?.data?.tenantId;
      expect(scope, `${c.model}.${c.op} tenant スコープ`).toBe('t1');
    }
    // ApprovalRequest は決定済み 1:1 レコード（メタのみ payload）。
    const apr = calls.find((c) => c.model === 'approvalRequest')!.args.data;
    expect(apr.status).toBe('APPROVED');
    expect(apr.decidedById).toBe('u1');
    expect(Object.keys(apr.payload).sort()).toEqual(['action', 'runId']);
  });

  it('reject: run は FAILED（terminal・再開不可）・AIAgentAction は作らない', async () => {
    const { db, calls } = makeMockDb();
    const r = await decideAiGateCore(db, { ...INPUT, decision: 'reject' });
    expect(r).toEqual({ outcome: 'decided' });
    const runUpdates = calls.filter((c) => c.model === 'aIAgentRun');
    expect(runUpdates).toHaveLength(1);
    expect(runUpdates[0]!.args.data.status).toBe('FAILED');
    expect(calls.filter((c) => c.model === 'aIAgentAction')).toHaveLength(0);
  });

  it('並行判断の敗者（gate CAS count 0）: run にも記録にも触れない', async () => {
    const { db, calls } = makeMockDb({ gateCasCount: 0 });
    const r = await decideAiGateCore(db, INPUT);
    expect(r).toEqual({ outcome: 'already' });
    expect(calls.filter((c) => c.model !== 'aIApprovalGate')).toHaveLength(0);
  });

  it('run 遷移 count 0（消失/terminal/競合）: throw = 判断ごと rollback 契約', async () => {
    const { db, calls } = makeMockDb({ runNeedsApprovalCount: 0 });
    await expect(decideAiGateCore(db, INPUT)).rejects.toThrow('ai-run-transition-failed');
    expect(calls.filter((c) => c.model === 'approvalRequest')).toHaveLength(0);
    expect(calls.filter((c) => c.model === 'auditLog')).toHaveLength(0);
  });

  it('runId null の孤立 gate: 判断のみで完結（run へは一切触れない）', async () => {
    const { db, calls } = makeMockDb({ gateRow: { id: 'gate_1', runId: null, action: 'x' } });
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
