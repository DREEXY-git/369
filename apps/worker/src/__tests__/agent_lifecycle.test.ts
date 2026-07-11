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

  it('v6.3 P1: escaped-quoted / 改行入り秘密も、保存エラーと再throwの両方でマスクされる', async () => {
    const { db, runs } = makeDb();
    await expect(
      runWithAgentLifecycle(
        params,
        async () => {
          // P1-1（comma）と P1-2（newline）を含む秘密。保存値・再throw値のどちらにも残ってはならない。
          throw new Error('upstream {"password":"abc,COMMASECRET63"} and {"token":"x\nNEWLINESECRET63"}');
        },
        db,
      ),
    ).rejects.toThrow(/agent lifecycle job failed/);
    expect(runs[0]!.status).toBe('FAILED');
    for (const sec of ['COMMASECRET63', 'NEWLINESECRET63']) {
      expect(runs[0]!.error).not.toContain(sec);
    }
    try {
      await runWithAgentLifecycle(
        { ...params, task: '別タスク63' },
        async () => {
          throw new Error('{"password":"abc,COMMASECRET63"}\n{"token":"x\nNEWLINESECRET63"}');
        },
        db,
      );
      expect.unreachable('should throw');
    } catch (e) {
      expect(String(e)).not.toContain('COMMASECRET63');
      expect(String(e)).not.toContain('NEWLINESECRET63');
    }
  });

  it('v6.4 P1: 内部 depth3 escaped quote 直後の秘密も、保存エラー・再throw・Action要約でマスクされる', async () => {
    const { db, runs, actions } = makeDb();
    // 開始 depth 1・内部 quote depth 3・直後 comma（Codex 再現ケース）を含む秘密。
    const payload = String.raw`upstream {\"password\":\"abc\\\",DEPTH3SECRET64\"} boom`;
    await expect(
      runWithAgentLifecycle(params, async () => {
        throw new Error(payload);
      }, db),
    ).rejects.toThrow(/agent lifecycle job failed/);
    expect(runs[0]!.status).toBe('FAILED');
    expect(runs[0]!.error).not.toContain('DEPTH3SECRET64'); // 保存値
    // 失敗 Action 要約にも残らない。
    for (const a of actions as { data: { summary: string } }[]) {
      expect(a.data.summary).not.toContain('DEPTH3SECRET64');
    }
    try {
      await runWithAgentLifecycle({ ...params, task: 'depth3別' }, async () => {
        throw new Error(payload);
      }, db);
      expect.unreachable('should throw');
    } catch (e) {
      expect(String(e)).not.toContain('DEPTH3SECRET64'); // 再throw値
    }
  });

  it('v6.5 P1: 一般化 quote-depth matrix を保存・再throw・Action要約の全経路で封鎖する', async () => {
    const delimiters = [',', ' ', ';', '\n', '}', ']'];
    let checked = 0;
    for (let openDepth = 0; openDepth <= 4; openDepth++) {
      for (let terminalDepth = 0; terminalDepth <= 6; terminalDepth++) {
        if (terminalDepth === openDepth) continue;
        for (let d = 0; d < delimiters.length; d++) {
          const { db, runs, actions } = makeDb();
          const sentinel = `WORKER_${openDepth}_${terminalDepth}_${d}_SECRET`;
          const slashes = (n: number) => '\\'.repeat(n);
          const payload =
            `{"password":${slashes(openDepth)}"abc${slashes(openDepth)}"` +
            delimiters[d] +
            sentinel +
            `${slashes(terminalDepth)}"}`;
          let thrown = '';
          try {
            await runWithAgentLifecycle(params, async () => {
              throw new Error(payload);
            }, db);
            expect.unreachable('should throw');
          } catch (e) {
            thrown = String(e);
          }
          expect(runs[0]!.error, `stored error leaked: ${payload}`).not.toContain(sentinel);
          expect(thrown, `rethrow leaked: ${payload}`).not.toContain(sentinel);
          for (const action of actions as { data: { summary: string } }[]) {
            expect(action.data.summary, `action summary leaked: ${payload}`).not.toContain(sentinel);
          }
          checked++;
        }
      }
    }
    expect(checked).toBe(180);
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

  it('v6.1: stale（クラッシュ残骸）RUNNING は競合に含めず、新規 run は成功する', async () => {
    // 3 時間前に起動して finishedAt を持たない RUNNING は crash 残骸。作成前 gate は作成を許可し、
    // 作成後 rival 判定でも「先行」と見なさない（さもなくば残骸が新規 run を恒久的に潰す）。
    const stale = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const { db, runs } = makeDb({
      preexisting: [
        { id: 'run-stale', tenantId: 't1', agentId: 'agent-1', task: 'テストタスク', status: 'RUNNING', startedAt: stale, finishedAt: null, error: null },
      ],
    });
    let executed = false;
    const out = await runWithAgentLifecycle(params, async () => ((executed = true), { value: 42 }), db);
    expect(executed).toBe(true);
    expect(out.ok).toBe(true);
    const mine = runs.find((r) => r.id !== 'run-stale');
    expect(mine!.status).toBe('SUCCEEDED');
    // 残骸はそのまま（履歴は巻き戻さない）
    expect(runs.find((r) => r.id === 'run-stale')!.status).toBe('RUNNING');
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
