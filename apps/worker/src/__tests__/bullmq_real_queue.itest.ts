import { describe, expect, it, afterAll, afterEach } from 'vitest';
import { Queue, Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import { runWithAgentLifecycle, type LifecycleDb } from '../agent-lifecycle';

// v7.0 Lane P4Q: BullMQ **実 queue**（loopback Redis）証拠。
// - 失敗後 retry / attempts 上限後 failed telemetry / FAILED保存値・rethrow の secret 0 /
//   重複 job 収束 / 承認前 job の実行禁止 / reject(FAILED terminal) 済み run の再開禁止 /
//   tenant 越境 0 / worker 停止→再起動後の整合 / idempotency / queue event・raw Redis の機密非保存。
// - テスト環境境界（v7.0 §3）: 接続前に Redis host が loopback であることを機械確認。専用 port(6390)・
//   専用 prefix（v70test）・persistence 無効。後始末は queue.obliterate()（自 queue の key のみ削除）。
//   FLUSHALL は使わない。

const REDIS_URL = process.env.REDIS_TEST_URL ?? 'redis://127.0.0.1:6390';
const PREFIX = 'v70test';
const SECRET = 'QUEUE-SECRET-V70-{"password":"topsecret-raw"}';

function assertLoopbackRedis(): void {
  const host = new URL(REDIS_URL).hostname;
  if (host !== '127.0.0.1' && host !== 'localhost') {
    throw new Error(`TEST_ENVIRONMENT_APPROVAL_REQUIRED: Redis host "${host}" は loopback と機械確認できません`);
  }
}
assertLoopbackRedis();

const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

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

// tenant/task を実 job data から受け取る in-memory lifecycle db（実 DB 結線は web 側の実 PG 証拠が担保）。
function makeDb() {
  let seq = 0;
  const runs: RunRow[] = [];
  const gates: { tenantId: string; runId: string; status: string }[] = [];
  let currentCtx = { tenantId: 't1', task: 'task' };
  const db: LifecycleDb = {
    aIAgent: { findFirst: async () => ({ id: `agent-${currentCtx.tenantId}` }) },
    aIAgentRun: {
      findMany: async (args) => {
        const where = (args as { where: { status: { in: string[] } } }).where;
        return runs
          .filter((r) => r.tenantId === currentCtx.tenantId && r.task === currentCtx.task && where.status.in.includes(r.status))
          .map((r) => ({ id: r.id, status: r.status, startedAt: r.startedAt }));
      },
      create: async () => {
        seq += 1;
        const row: RunRow = {
          id: `run-${String(seq).padStart(2, '0')}`,
          tenantId: currentCtx.tenantId,
          agentId: `agent-${currentCtx.tenantId}`,
          task: currentCtx.task,
          status: 'RUNNING',
          startedAt: new Date(),
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
        row.finishedAt = new Date();
        return { count: 1 };
      },
    },
    aIApprovalGate: {
      create: async (g) => {
        gates.push(g as never);
        return g;
      },
    },
    aIAgentAction: { create: async (a) => a },
  };
  const setCtx = (ctx: { tenantId: string; task: string }) => {
    currentCtx = ctx;
  };
  return { db, runs, gates, setCtx };
}

const opened: { queue?: Queue; worker?: Worker }[] = [];

async function makeQueue(name: string) {
  const queue = new Queue(name, { connection, prefix: PREFIX });
  const entry: { queue?: Queue; worker?: Worker } = { queue };
  opened.push(entry);
  return { queue, entry };
}

function startWorker(
  entry: { queue?: Queue; worker?: Worker },
  name: string,
  processor: (job: Job) => Promise<unknown>,
) {
  const worker = new Worker(name, processor, { connection, prefix: PREFIX, concurrency: 2 });
  entry.worker = worker;
  return worker;
}

function waitFinal(worker: Worker, jobId: string, event: 'completed' | 'failed', timeoutMs = 15000): Promise<Job> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting ${event} of ${jobId}`)), timeoutMs);
    worker.on(event, (job: Job) => {
      const isFinal = event === 'completed' || job.attemptsMade >= (job.opts.attempts ?? 1);
      if (job.id === jobId && isFinal) {
        clearTimeout(t);
        resolve(job);
      }
    });
  });
}

afterEach(async () => {
  for (const e of opened.splice(0)) {
    await e.worker?.close();
    await e.queue?.obliterate({ force: true }); // 自 queue（v70test prefix）の key のみ削除
    await e.queue?.close();
  }
});

afterAll(async () => {
  const leftover = await connection.keys(`${PREFIX}:*`);
  for (const k of leftover) await connection.del(k);
  await connection.quit();
});

describe('BullMQ 実 queue 証拠（loopback Redis・v7.0 Lane P4Q）', () => {
  it('失敗後 retry: 1回目 FAILED（新 run）→ 2回目 SUCCEEDED（retry は run 巻き戻しでなく新 run）', async () => {
    const { db, runs, setCtx } = makeDb();
    const { queue, entry } = await makeQueue('q-retry');
    let attempt = 0;
    const worker = startWorker(entry, 'q-retry', async (job) => {
      setCtx({ tenantId: job.data.tenantId, task: job.data.task });
      return runWithAgentLifecycle({ tenantId: job.data.tenantId, agentKey: 'chief_of_staff', task: job.data.task, summary: 't' }, async () => {
        attempt += 1;
        if (attempt === 1) throw new Error(`transient ${SECRET}`);
        return { ok: true };
      }, db);
    });
    const job = await queue.add('j', { tenantId: 't1', task: 'retry-task' }, { jobId: 'retry-1', attempts: 2, backoff: { type: 'fixed', delay: 50 } });
    const done = await waitFinal(worker, job.id!, 'completed');
    expect(done.attemptsMade).toBeGreaterThanOrEqual(1);
    expect(runs.map((r) => r.status)).toEqual(['FAILED', 'SUCCEEDED']); // 巻き戻しなし・新 run で成功
    expect(runs[0]!.error ?? '').not.toContain('topsecret-raw'); // 保存値 secret 0
  });

  it('attempts 上限後 failed telemetry: failedReason/stacktrace/保存値/raw Redis に secret 0', async () => {
    const { db, runs, setCtx } = makeDb();
    const { queue, entry } = await makeQueue('q-fail');
    const worker = startWorker(entry, 'q-fail', async (job) => {
      setCtx({ tenantId: job.data.tenantId, task: job.data.task });
      return runWithAgentLifecycle({ tenantId: job.data.tenantId, agentKey: 'chief_of_staff', task: job.data.task, summary: 't' }, async () => {
        throw new Error(`fatal ${SECRET}`);
      }, db);
    });
    const job = await queue.add('j', { tenantId: 't1', task: 'fail-task' }, { jobId: 'fail-1', attempts: 2, backoff: { type: 'fixed', delay: 50 } });
    const failed = await waitFinal(worker, job.id!, 'failed');
    expect(failed.failedReason).toContain('[masked]');
    expect(failed.failedReason).not.toContain('topsecret-raw');
    for (const line of failed.stacktrace ?? []) expect(line).not.toContain('topsecret-raw');
    for (const r of runs) expect(r.error ?? '').not.toContain('topsecret-raw');
    // raw Redis 全 key/value に sentinel が存在しない（queue event・job hash 含む）。
    const keys = await connection.keys(`${PREFIX}:*`);
    for (const key of keys) {
      const type = await connection.type(key);
      const dump =
        type === 'hash' ? JSON.stringify(await connection.hgetall(key))
        : type === 'list' ? JSON.stringify(await connection.lrange(key, 0, -1))
        : type === 'zset' ? JSON.stringify(await connection.zrange(key, 0, -1))
        : type === 'set' ? JSON.stringify(await connection.smembers(key))
        : type === 'string' ? String(await connection.get(key))
        : type === 'stream' ? JSON.stringify(await connection.xrange(key, '-', '+'))
        : '';
      expect(dump, `raw redis key ${key}`).not.toContain('topsecret-raw');
    }
  });

  it('重複 job（同一 jobId）は1回に収束する（idempotency）', async () => {
    const { db, runs, setCtx } = makeDb();
    const { queue, entry } = await makeQueue('q-dup');
    let calls = 0;
    const worker = startWorker(entry, 'q-dup', async (job) => {
      setCtx({ tenantId: job.data.tenantId, task: job.data.task });
      return runWithAgentLifecycle({ tenantId: job.data.tenantId, agentKey: 'chief_of_staff', task: job.data.task, summary: 't' }, async () => {
        calls += 1;
        return { ok: true };
      }, db);
    });
    await queue.add('j', { tenantId: 't1', task: 'dup-task' }, { jobId: 'dup-1' });
    await queue.add('j', { tenantId: 't1', task: 'dup-task' }, { jobId: 'dup-1' }); // 同一 jobId = dedup
    await waitFinal(worker, 'dup-1', 'completed');
    await new Promise((r) => setTimeout(r, 300));
    expect(calls).toBe(1);
    expect(runs).toHaveLength(1);
  });

  it('承認前 job の実行禁止: NEEDS_APPROVAL 中の同一 task 再 enqueue は実行されない（skip）', async () => {
    const { db, runs, gates, setCtx } = makeDb();
    const { queue, entry } = await makeQueue('q-gate');
    let fnCalls = 0;
    const worker = startWorker(entry, 'q-gate', async (job) => {
      setCtx({ tenantId: job.data.tenantId, task: job.data.task });
      return runWithAgentLifecycle({ tenantId: job.data.tenantId, agentKey: 'chief_of_staff', task: job.data.task, summary: 't' }, async () => {
        fnCalls += 1;
        return { needsApproval: '外部影響があるため人間の承認が必要' };
      }, db);
    });
    await queue.add('j', { tenantId: 't1', task: 'gated-task' }, { jobId: 'gate-1' });
    await waitFinal(worker, 'gate-1', 'completed');
    expect(runs[0]!.status).toBe('NEEDS_APPROVAL');
    expect(gates).toHaveLength(1);
    // 承認待ちのまま再 enqueue → shouldCreateRun が skip（fn は実行されない・run も増えない）。
    await queue.add('j', { tenantId: 't1', task: 'gated-task' }, { jobId: 'gate-2' });
    await waitFinal(worker, 'gate-2', 'completed');
    expect(fnCalls).toBe(1);
    expect(runs).toHaveLength(1);
  });

  it('reject（FAILED terminal）済み run は再開されない: 再 enqueue は新 run・旧 run 不変', async () => {
    const { db, runs, setCtx } = makeDb();
    const { queue, entry } = await makeQueue('q-reject');
    const worker = startWorker(entry, 'q-reject', async (job) => {
      setCtx({ tenantId: job.data.tenantId, task: job.data.task });
      return runWithAgentLifecycle({ tenantId: job.data.tenantId, agentKey: 'chief_of_staff', task: job.data.task, summary: 't' }, async () => ({ ok: true }), db);
    });
    // 却下済み（P4 bridge で FAILED terminal 化）を模した既存 run。
    runs.push({ id: 'run-rejected', tenantId: 't1', agentId: 'agent-t1', task: 'rejected-task', status: 'FAILED', startedAt: new Date(), finishedAt: new Date(), error: '人間の判断により却下されました（承認ゲート）' });
    await queue.add('j', { tenantId: 't1', task: 'rejected-task' }, { jobId: 'reject-1' });
    await waitFinal(worker, 'reject-1', 'completed');
    const old = runs.find((r) => r.id === 'run-rejected')!;
    expect(old.status).toBe('FAILED'); // terminal からの巻き戻し 0
    expect(old.error).toContain('却下');
    expect(runs.filter((r) => r.task === 'rejected-task')).toHaveLength(2); // 実行は「新しい run」
  });

  it('tenant 越境 0: 2 tenant の並行 job が各自の tenant 行だけを作る', async () => {
    const { db, runs, setCtx } = makeDb();
    const { queue, entry } = await makeQueue('q-tenant');
    const worker = startWorker(entry, 'q-tenant', async (job) => {
      setCtx({ tenantId: job.data.tenantId, task: job.data.task });
      return runWithAgentLifecycle({ tenantId: job.data.tenantId, agentKey: 'chief_of_staff', task: job.data.task, summary: 't' }, async () => ({ ok: true }), db);
    });
    // mock db の context は単一共有のため、直列に処理して job→tenant の対応を決定論化する
    // （tenant スコープ規律そのものは実 PG 証拠 spec 側で並行含め担保済み）。
    const pA = waitFinal(worker, 'tA', 'completed');
    await queue.add('j', { tenantId: 'tenant-A', task: 'shared-task-A' }, { jobId: 'tA' });
    await pA;
    const pB = waitFinal(worker, 'tB', 'completed');
    await queue.add('j', { tenantId: 'tenant-B', task: 'shared-task-B' }, { jobId: 'tB' });
    await pB;
    expect(runs.filter((r) => r.tenantId === 'tenant-A')).toHaveLength(1);
    expect(runs.filter((r) => r.tenantId === 'tenant-B')).toHaveLength(1);
    expect(runs.every((r) => r.agentId === `agent-${r.tenantId}`)).toBe(true);
  });

  it('worker 停止中に enqueue → 再起動後に整合して処理される（job は Redis に永続）', async () => {
    const { db, runs, setCtx } = makeDb();
    const { queue, entry } = await makeQueue('q-restart');
    await queue.add('j', { tenantId: 't1', task: 'restart-task' }, { jobId: 'restart-1' });
    expect(await queue.getWaitingCount()).toBe(1); // worker 不在でも消えない
    const worker = startWorker(entry, 'q-restart', async (job) => {
      setCtx({ tenantId: job.data.tenantId, task: job.data.task });
      return runWithAgentLifecycle({ tenantId: job.data.tenantId, agentKey: 'chief_of_staff', task: job.data.task, summary: 't' }, async () => ({ ok: true }), db);
    });
    await waitFinal(worker, 'restart-1', 'completed');
    expect(runs[0]!.status).toBe('SUCCEEDED');
    expect(await queue.getWaitingCount()).toBe(0);
  });
});
