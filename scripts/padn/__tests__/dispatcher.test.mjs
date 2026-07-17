import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfigs, contextFromEnv, evaluateWritePreconditions, decide, emitDecisions } from '../dispatcher.mjs';
import { buildSnapshot } from '../discover.mjs';
import { normalizeEvent } from '../events.mjs';
import { FakeGH, standardWorld, simpleComment } from './fixtures.mjs';

const configs = loadConfigs(new URL('../../../', import.meta.url).pathname);

function ghFromWorld(world) {
  return new FakeGH({
    issues: world.issues,
    commentsByIssue: world.commentsByIssue,
    pulls: world.pulls,
    branchShas: world.branchShas,
  });
}

async function snapshotOf(world) {
  return buildSnapshot(ghFromWorld(world), configs.policy, { now: world.now });
}

const tick = normalizeEvent('schedule', {});

function ctxWith(overrides = {}) {
  return {
    enabled: true,
    mode: 'rt1_pilot',
    writeLanesVar: 2,
    reportsEnabled: false,
    allowlist: [],
    hasAppToken: true,
    repo: 'DREEXY-git/369',
    ...overrides,
  };
}

test('§18 default off: enabled=false なら一切決定しない', async () => {
  const snap = await snapshotOf(standardWorld());
  const r = decide({ snapshot: snap, event: tick, ctx: ctxWith({ enabled: false }), configs });
  assert.equal(r.status, 'DISABLED');
  assert.equal(r.decisions.length, 0);
});

test('§9: B1（RT2 相当・未クレーム）は事前許可が無い限り write dispatch されない', async () => {
  const snap = await snapshotOf(standardWorld());
  const r = decide({ snapshot: snap, event: tick, ctx: ctxWith(), configs });
  // B1 は DISPATCHED だが allowed paths が RT2（apps/web/**）なので rt2 事前許可なし → 除外
  assert.equal(r.decisions.some((d) => d.event_type === 'padn_claude_implement'), false);
});

test('§9: RT2 事前許可（PADN_RT2_APPROVED by owner）があれば B1 implement を決定・payload 完全', async () => {
  const world = standardWorld();
  world.commentsByIssue[67].push(simpleComment('2026-07-17T02:59:00Z', 'PADN_RT2_APPROVED この WIP は人間が事前許可した'));
  const snap = await snapshotOf(world);
  const r = decide({ snapshot: snap, event: tick, ctx: ctxWith(), configs, rt2Approvals: { 67: true } });
  const d = r.decisions.find((x) => x.event_type === 'padn_claude_implement');
  assert.ok(d, 'implement decision があるはず');
  const p = d.payload;
  assert.equal(p.schema, '369-l2-dispatch-v1');
  assert.equal(p.wip_id, 'WIP-PADN-B1-001');
  assert.equal(p.wip_issue, 67);
  assert.equal(p.lease_id, 'LEASE-369PADN-B1-001');
  assert.equal(p.fencing_token, 'FT-369PADN-E1-B1-L1-7e50a04');
  assert.equal(p.prompt_sha256, 'a'.repeat(64));
  assert.equal(p.chain_depth, 1);
  assert.ok(p.idempotency_key.includes('padn_claude_implement:WIP-PADN-B1-001'));
});

test('§9: 前提が 1 つ欠けるだけで write されない（lease 失効の例）', async () => {
  const world = standardWorld({ now: '2026-07-19T23:00:00Z' }); // 発行から 48h 超
  world.commentsByIssue[67].push(simpleComment('2026-07-17T02:59:00Z', 'PADN_RT2_APPROVED'));
  const snap = await snapshotOf(world);
  const r = decide({ snapshot: snap, event: tick, ctx: ctxWith(), configs, rt2Approvals: { 67: true } });
  assert.equal(r.decisions.some((d) => d.write), false);
  const checks = r.checksByWip['67:padn_claude_implement'];
  const leaseCheck = checks.find((c) => c.check === 'lease_and_fencing_valid');
  assert.equal(leaseCheck.ok, false);
});

test('§9: prompt hash が truncated（非 64 hex）なら write されない', async () => {
  const world = standardWorld({ b1Hash: 'ca57d9c1' }); // 短縮 hash しか無い
  world.commentsByIssue[67].push(simpleComment('2026-07-17T02:59:00Z', 'PADN_RT2_APPROVED'));
  const snap = await snapshotOf(world);
  const r = decide({ snapshot: snap, event: tick, ctx: ctxWith(), configs, rt2Approvals: { 67: true } });
  assert.equal(r.decisions.some((d) => d.write), false);
  const checks = r.checksByWip['67:padn_claude_implement'];
  assert.equal(checks.find((c) => c.check === 'prompt_hash_full_length').ok, false);
});

test('§9: base drift（main が進んだ）なら write されない', async () => {
  const world = standardWorld();
  world.branchShas.main = 'ffff000011112222333344445555666677778888';
  world.commentsByIssue[67].push(simpleComment('2026-07-17T02:59:00Z', 'PADN_RT2_APPROVED'));
  const snap = await snapshotOf(world);
  const r = decide({ snapshot: snap, event: tick, ctx: ctxWith(), configs, rt2Approvals: { 67: true } });
  assert.equal(r.decisions.some((d) => d.write), false);
});

test('capacity: PADN_WRITE_LANES=0 なら write 決定されない（observe 相当の絞り）', async () => {
  const world = standardWorld();
  world.commentsByIssue[67].push(simpleComment('2026-07-17T02:59:00Z', 'PADN_RT2_APPROVED'));
  const snap = await snapshotOf(world);
  const r = decide({ snapshot: snap, event: tick, ctx: ctxWith({ writeLanesVar: 0 }), configs, rt2Approvals: { 67: true } });
  assert.equal(r.decisions.some((d) => d.write), false);
});

test('budget: 日次上限超過で write されない', async () => {
  const world = standardWorld();
  world.commentsByIssue[67].push(simpleComment('2026-07-17T02:59:00Z', 'PADN_RT2_APPROVED'));
  const snap = await snapshotOf(world);
  const r = decide({
    snapshot: snap,
    event: tick,
    ctx: ctxWith(),
    configs,
    rt2Approvals: { 67: true },
    dispatchesToday: configs.policy.budget.max_role_dispatches_per_day,
  });
  assert.equal(r.decisions.some((d) => d.write), false);
});

test('idempotent: 同じ snapshot × 同じイベント → 同じ決定（duplicate webhook 安全）', async () => {
  const world = standardWorld();
  world.commentsByIssue[67].push(simpleComment('2026-07-17T02:59:00Z', 'PADN_RT2_APPROVED'));
  const snap = await snapshotOf(world);
  const args = { snapshot: snap, event: tick, ctx: ctxWith(), configs, rt2Approvals: { 67: true } };
  const r1 = decide(args);
  const r2 = decide(args);
  assert.deepEqual(
    r1.decisions.map((d) => d.payload.idempotency_key),
    r2.decisions.map((d) => d.payload.idempotency_key),
  );
});

test('duplicate adoption 防止: B2（READY_FOR_HUMAN_GATE）へは implement/review を送らない', async () => {
  const snap = await snapshotOf(standardWorld());
  const r = decide({ snapshot: snap, event: tick, ctx: ctxWith(), configs });
  assert.equal(r.decisions.some((d) => d.payload.wip_issue === 68), false);
});

test('review dispatch: FROZEN_FOR_REVIEW の WIP へ codex 3 監査が独立に決定される', async () => {
  const world = standardWorld();
  // B2 を FROZEN_FOR_REVIEW 状態に巻き戻した世界（PASS/HUMAN GATE コメントを除去）
  world.commentsByIssue[68] = world.commentsByIssue[68].slice(0, 5);
  const snap = await snapshotOf(world);
  const r = decide({ snapshot: snap, event: tick, ctx: ctxWith(), configs });
  const types = r.decisions.filter((d) => d.payload.wip_issue === 68).map((d) => d.event_type).sort();
  assert.deepEqual(types, ['padn_codex_arch', 'padn_codex_evidence', 'padn_codex_security']);
  for (const d of r.decisions) {
    assert.equal(d.write, false);
    assert.equal(d.payload.head_sha, world.B2_HEAD); // fixed head が payload に固定される
  }
});

test('fork PR / stale / chain 超過 / production deployment は IGNORED', async () => {
  const snap = await snapshotOf(standardWorld());
  const fork = normalizeEvent('pull_request', {
    action: 'opened',
    sender: { login: 'DREEXY-git' },
    pull_request: { number: 1, head: { sha: 'x', repo: { full_name: 'attacker/369' } }, base: { repo: { full_name: 'DREEXY-git/369' } } },
  });
  assert.equal(decide({ snapshot: snap, event: fork, ctx: ctxWith(), configs }).status, 'IGNORED');

  const stale = normalizeEvent('workflow_run', { workflow_run: { id: 1, head_sha: 'notcurrent', event: 'pull_request' } });
  assert.equal(decide({ snapshot: snap, event: stale, ctx: ctxWith(), configs }).status, 'IGNORED');

  const deep = normalizeEvent('repository_dispatch', { action: 'padn_dispatch', client_payload: { chain_depth: 5, idempotency_key: 'k' } });
  assert.equal(decide({ snapshot: snap, event: deep, ctx: ctxWith(), configs }).status, 'IGNORED');

  const prod = normalizeEvent('deployment_status', {
    deployment: { id: 1, sha: 'x', environment: 'Production' },
    deployment_status: { id: 2, state: 'success', environment: 'Production' },
  });
  assert.equal(decide({ snapshot: snap, event: prod, ctx: ctxWith(), configs }).status, 'IGNORED');
});

test('bot actor（自 App 含む）のイベントでは判断しない（bot ループ防止）', async () => {
  const snap = await snapshotOf(standardWorld());
  const botComment = normalizeEvent('issue_comment', {
    action: 'created',
    sender: { login: 'padn-orchestrator[bot]' },
    issue: { number: 66 },
    comment: { id: 1, body: 'L2_DISPATCHED …', created_at: 't' },
  });
  const r = decide({ snapshot: snap, event: botComment, ctx: ctxWith(), configs });
  assert.equal(r.status, 'IGNORED');
  assert.match(r.reason, /bot/);
});

test('backpressure / incident freeze 中は新規 dispatch しない', async () => {
  const world = standardWorld();
  world.commentsByIssue[66].push(
    simpleComment('2026-07-17T02:58:00Z', 'BACKPRESSURE_ON — review queue 超過'),
  );
  const snap = await snapshotOf(world);
  const r = decide({ snapshot: snap, event: tick, ctx: ctxWith(), configs });
  assert.equal(r.status, 'BACKPRESSURE');
  assert.equal(r.decisions.length, 0);
});

test('GITHUB_TOKEN 再帰仕様前提: App token 無しでは emit しない', async () => {
  const world = standardWorld();
  world.commentsByIssue[67].push(simpleComment('2026-07-17T02:59:00Z', 'PADN_RT2_APPROVED'));
  const snap = await snapshotOf(world);
  const r = decide({ snapshot: snap, event: tick, ctx: ctxWith(), configs, rt2Approvals: { 67: true } });
  assert.ok(r.decisions.length > 0);
  const gh = ghFromWorld(world);
  const emitted = await emitDecisions(gh, r.decisions, ctxWith({ hasAppToken: false }));
  assert.equal(gh.dispatched.length, 0);
  assert.ok(emitted.every((d) => d.emitted === false && d.note === 'app_token_missing'));
  // App token があれば emit される
  const emitted2 = await emitDecisions(gh, r.decisions, ctxWith({ hasAppToken: true }));
  assert.equal(gh.dispatched.length, r.decisions.length);
  assert.ok(emitted2.every((d) => d.emitted === true));
});

test('contextFromEnv: 既定値は最も安全側（disabled / observe / 0 lane / reports off）', () => {
  const ctx = contextFromEnv({});
  assert.equal(ctx.enabled, false);
  assert.equal(ctx.mode, 'observe');
  assert.equal(ctx.writeLanesVar, 0);
  assert.equal(ctx.reportsEnabled, false);
  assert.equal(ctx.hasAppToken, false);
});
