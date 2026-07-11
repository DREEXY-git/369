import { describe, expect, it } from 'vitest';
import { runWithAgentLifecycle, type LifecycleDb } from '../agent-lifecycle';

// v5.8 High-2 / Medium-1 / Medium-6 の回帰テスト（DB 非依存・mock db 注入）。
// 実 DB との結線は CI の e2e（seed 済み ephemeral DB）で担保する。

interface RunRow {
  id: string;
  tenantId: string;
  agentId: string;
  task: string;
  status: string;
  startedAt: Date | null;
  finishedAt: Date | null;
  error: string | null;
}

function makeDb(opts: { agentExists?: boolean; preexisting?: RunRow[]; now?: () => Date } = {}) {
  let seq = 0;
  const clock = opts.now ?? (() => new Date());
  const runs: RunRow[] = [...(opts.preexisting ?? [])];
  const gates: unknown[] = [];
  const actions: unknown[] = [];
  const db: LifecycleDb = {
    aIAgent: {
      findFirst: async () => (opts.agentExists === false ? null : { id: 'agent-1' }),
    },
    aIAgentRun: {
      findMany: async (args) => {
        const where = (args as { where: { status: { in: string[] } } }).where;
        return runs
          .filter((r) => where.status.in.includes(r.status))
          .map((r) => ({ id: r.id, status: r.status, startedAt: r.startedAt }));
      },
      create: async () => {
        seq += 1;
        const row: RunRow = {
          id: `run-${String(seq).padStart(2, '0')}`,
          tenantId: 't1',
          agentId: 'agent-1',
          task: 'テストタスク',
          status: 'RUNNING',
          startedAt: clock(),
          finishedAt: null,
          error: null,
        };
        runs.push(row);
        return { id: row.id, startedAt: row.startedAt! };
      },
      updateMany: async (args) => {
        const a = args as { where: { id: string; status: { in: string[] } }; data: { status: string; error?: string | null } };
        const row = runs.find((r) => r.id === a.where.id && a.where.status.in.includes(r.status));
        if (!row) return { count: 0 };
        row.status = a.data.status;
        row.error = a.data.error ?? null;
        return { count: 1 };
      },
    },
    aIApprovalGate: { create: async (g) => (gates.push(g), g) },
    aIAgentAction: { create: async (a) => (actions.push(a), a) },
  };
  return { db, runs, gates, actions };
}

const params = { tenantId: 't1', agentKey: 'chief_of_staff', task: 'テストタスク', summary: 'テスト' };

describe('runWithAgentLifecycle（v5.8 hardening）', () => {
  it('成功時は SUCCEEDED を記録し result を返す', async () => {
    const { db, runs, actions } = makeDb();
    const out = await runWithAgentLifecycle(params, async () => ({ value: 1 }), db);
    expect(out.ok).toBe(true);
    expect(runs[0]!.status).toBe('SUCCEEDED');
    expect(actions).toHaveLength(1);
  });

  it('High-2: fn の失敗は FAILED 記録後に再 throw され、メッセージに秘密が残らない', async () => {
    const { db, runs } = makeDb();
    await expect(
      runWithAgentLifecycle(
        params,
        async () => {
          throw new Error('boom Authorization: Bearer sk-live-VERYSECRET99 while calling https://api.example.com/x?key=abc');
        },
        db,
      ),
    ).rejects.toThrow(/agent lifecycle job failed/);
    // FAILED として記録され、保存エラーにも throw メッセージにも秘密が残らない。
    expect(runs[0]!.status).toBe('FAILED');
    expect(runs[0]!.error).not.toContain('VERYSECRET99');
    try {
      await runWithAgentLifecycle(
        { ...params, task: '別タスク' },
        async () => {
          throw new Error('Authorization: Bearer sk-live-VERYSECRET99');
        },
        db,
      );
      expect.unreachable('should throw');
    } catch (e) {
      expect(String(e)).not.toContain('VERYSECRET99');
    }
  });

  it('二重 Run 防止: 新鮮な RUNNING が既存なら実行せず skip する', async () => {
    const { db } = makeDb({
      preexisting: [
        { id: 'run-00', tenantId: 't1', agentId: 'agent-1', task: 'テストタスク', status: 'RUNNING', startedAt: new Date(), finishedAt: null, error: null },
      ],
    });
    let executed = false;
    const out = await runWithAgentLifecycle(params, async () => ((executed = true), { value: 1 }), db);
    expect(out.ok).toBe(false);
    expect(out.skipped).toContain('重複');
    expect(executed).toBe(false);
  });

  it('Medium-1: create 後に先行 active を検出したら自分を FAILED(重複) にして fn を実行しない', async () => {
    // pre-check は通る（先行が pre-check 後に現れた想定）→ post-check で降りる状況を、
    // create 直前に先行 run を滑り込ませて再現する。
    const { db, runs } = makeDb();
    const origCreate = db.aIAgentRun.create.bind(db.aIAgentRun);
    db.aIAgentRun.create = async (args) => {
      // 競合 worker が一瞬先に RUNNING を作った
      runs.push({ id: 'run-00-rival', tenantId: 't1', agentId: 'agent-1', task: 'テストタスク', status: 'RUNNING', startedAt: new Date(Date.now() - 1000), finishedAt: null, error: null });
      return origCreate(args);
    };
    let executed = false;
    const out = await runWithAgentLifecycle(params, async () => ((executed = true), { value: 1 }), db);
    expect(executed).toBe(false);
    expect(out.ok).toBe(false);
    const mine = runs.find((r) => r.id !== 'run-00-rival');
    expect(mine!.status).toBe('FAILED');
    expect(mine!.error).toContain('二重実行');
    // 先行側はそのまま RUNNING（勝者は 1 本に収束）
    expect(runs.find((r) => r.id === 'run-00-rival')!.status).toBe('RUNNING');
  });

  it('needsApproval は NEEDS_APPROVAL＋AIApprovalGate(PENDING) を作り、承認はしない', async () => {
    const { db, runs, gates } = makeDb();
    const out = await runWithAgentLifecycle(params, async () => ({ needsApproval: '外部送信を含むため人間の承認が必要' }), db);
    expect(out.ok).toBe(true);
    expect(runs[0]!.status).toBe('NEEDS_APPROVAL');
    expect(gates).toHaveLength(1);
    expect((gates[0] as { data: { status: string } }).data.status).toBe('PENDING');
  });

  it('Medium-6: 遷移 CAS が失敗（count 0）したら Gate/Action を作らず競合例外を投げる', async () => {
    const { db, gates, actions } = makeDb();
    // updateMany を常に count:0 に固定（競合で他者が terminal へ動かした想定）
    db.aIAgentRun.updateMany = async () => ({ count: 0 });
    await expect(runWithAgentLifecycle(params, async () => ({ needsApproval: 'x' }), db)).rejects.toThrow(/競合/);
    expect(gates).toHaveLength(0);
    // 競合例外の記録 action は best-effort 側で作られ得るが、承認待ち action は作られていない
    expect(actions.every((a) => !String((a as { data: { summary: string } }).data.summary).includes('承認待ち'))).toBe(true);
  });
});
