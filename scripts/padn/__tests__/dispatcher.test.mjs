import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfigs, contextFromEnv, evaluateWritePreconditions, decide, emitDecisions, collectRuntimeSignals } from '../dispatcher.mjs';
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

test('capacity: 候補 WIP 自身のレーンは数えない（1 レーン運用で padn_claude_test が到達可能）', async () => {
  // B1 を IMPLEMENTING（唯一のアクティブレーン）まで進めた世界。writeLanesVar=1。
  const world = standardWorld();
  world.commentsByIssue[67].push(
    simpleComment('2026-07-17T02:59:00Z', 'PADN_RT2_APPROVED'),
    simpleComment('2026-07-17T03:00:00Z', 'WIP_CLAIMED'),
    simpleComment('2026-07-17T03:01:00Z', 'IMPLEMENTATION_STARTED'),
  );
  const snap = await snapshotOf(world);
  const r = decide({
    snapshot: snap,
    event: tick,
    ctx: ctxWith({ writeLanesVar: 1 }),
    configs,
    rt2Approvals: { 67: true },
  });
  const testDispatch = r.decisions.filter((d) => d.payload.wip_issue === 67).map((d) => d.event_type);
  assert.deepEqual(testDispatch, ['padn_claude_test']);
});

test('冪等: TEST_JOB_STARTED marker があれば padn_claude_test を再 emit しない', async () => {
  const world = standardWorld();
  world.commentsByIssue[67].push(
    simpleComment('2026-07-17T02:59:00Z', 'PADN_RT2_APPROVED'),
    simpleComment('2026-07-17T03:00:00Z', 'WIP_CLAIMED'),
    simpleComment('2026-07-17T03:01:00Z', 'IMPLEMENTATION_STARTED'),
    simpleComment('2026-07-17T03:02:00Z', 'TEST_JOB_STARTED — L2 role job'),
  );
  const snap = await snapshotOf(world);
  const r = decide({
    snapshot: snap,
    event: tick,
    ctx: ctxWith({ writeLanesVar: 1 }),
    configs,
    rt2Approvals: { 67: true },
  });
  assert.equal(r.decisions.some((d) => d.event_type === 'padn_claude_test'), false);
});

test('冪等: verdict 済み codex レビューレーンは quorum 待ち中に再 emit しない（Codex R8 P2）', async () => {
  const HEAD = 'deadbeefcafe00112233445566778899aabbccdd';
  const verdict = (at, lane) =>
    simpleComment(
      at,
      ['## CODEX_VERDICT — ' + lane, '```json', JSON.stringify({ schema: '369-padn-l2-review-verdict-v1', verdict: 'PASS', head_sha: HEAD, role_event_type: lane, findings: [], summary_ja: 'x' }), '```'].join('\n'),
    );
  const world = standardWorld();
  world.commentsByIssue[67].push(
    simpleComment('2026-07-17T03:00:00Z', 'WIP_CLAIMED'),
    simpleComment('2026-07-17T03:01:00Z', 'IMPLEMENTATION_STARTED'),
    simpleComment('2026-07-17T03:10:00Z', `IMPLEMENTATION_FREEZE — fixed head ${HEAD}`),
    verdict('2026-07-17T03:20:00Z', 'padn_codex_arch'), // arch のみ PASS 済み
  );
  world.branchShas['claude/padn-b1-contract-child-tenant-v1'] = HEAD;
  const snap = await snapshotOf(world);
  const r = decide({ snapshot: snap, event: tick, ctx: ctxWith(), configs });
  const types = r.decisions.filter((d) => d.payload.wip_issue === 67).map((d) => d.event_type).sort();
  assert.deepEqual(types, ['padn_codex_evidence', 'padn_codex_security'], 'arch は再 emit されない');
});

test('冪等: integration audit は同一サイクル・同一 head で 1 回だけ emit（Codex R7 P2）', async () => {
  const HEAD = 'deadbeefcafe00112233445566778899aabbccdd';
  const verdict = (at, lane) =>
    simpleComment(
      at,
      ['## CODEX_VERDICT — ' + lane, '```json', JSON.stringify({ schema: '369-padn-l2-review-verdict-v1', verdict: 'PASS', head_sha: HEAD, role_event_type: lane, findings: [], summary_ja: 'x' }), '```'].join('\n'),
    );
  const mkWorld = () => {
    const world = standardWorld();
    world.commentsByIssue[67].push(
      simpleComment('2026-07-17T03:00:00Z', 'WIP_CLAIMED'),
      simpleComment('2026-07-17T03:01:00Z', 'IMPLEMENTATION_STARTED'),
      simpleComment('2026-07-17T03:10:00Z', `IMPLEMENTATION_FREEZE — fixed head ${HEAD}`),
      verdict('2026-07-17T03:20:00Z', 'padn_codex_arch'),
      verdict('2026-07-17T03:21:00Z', 'padn_codex_security'),
      verdict('2026-07-17T03:22:00Z', 'padn_codex_evidence'),
    );
    world.branchShas['claude/padn-b1-contract-child-tenant-v1'] = HEAD;
    return world;
  };
  // 3 レーン PASS → REVIEW_PASSED → integration audit が 1 回決定される
  const snap1 = await snapshotOf(mkWorld());
  const r1 = decide({ snapshot: snap1, event: tick, ctx: ctxWith(), configs });
  assert.deepEqual(
    r1.decisions.filter((d) => d.payload.wip_issue === 67).map((d) => d.event_type),
    ['padn_integration_audit'],
  );
  // integration verdict が投稿済みなら再 emit しない
  const world2 = mkWorld();
  world2.commentsByIssue[67].push(verdict('2026-07-17T03:30:00Z', 'padn_integration_audit'));
  const snap2 = await snapshotOf(world2);
  const r2 = decide({ snapshot: snap2, event: tick, ctx: ctxWith(), configs });
  assert.equal(r2.decisions.some((d) => d.event_type === 'padn_integration_audit'), false);
});

test('per-tier capacity: 同一 tier の他レーンが上限に達していれば write しない', async () => {
  // rt1_pilot で RT1 レーンが既に 1 本アクティブな状態を手組み snapshot で再現
  const mkWip = (issueNumber, wipId, state, paths) => ({
    issueNumber,
    wipId,
    state,
    reworkCount: 0,
    frozenHead: null,
    lease: {
      leaseId: `LEASE-369PADN-X-${issueNumber}`,
      revision: 1,
      fencingToken: 'FT-369PADN-E1-B1-L1-7e50a04',
      baseSha: '7e50a04df6dcc8043689958cbfd9be42e15e1af7',
      branch: `claude/x-${issueNumber}`,
      issuedAt: '2026-07-17T02:00:00Z',
      lastCheckpointAt: '2026-07-17T02:30:00Z',
    },
    allowedPaths: paths,
    promptSha256: 'c'.repeat(64),
    packetCommentId: 1,
  });
  const snapshot = {
    now: '2026-07-17T03:00:00Z',
    ok: true,
    controlRoot: { number: 66 },
    control: {
      programId: '369-PADN-V5',
      directorEpoch: 1,
      controlRevision: 7,
      writeCapacity: 2,
      activeWriteLanes: 1,
      backpressure: false,
      incidentFreeze: false,
      lastDirectorActivityAt: '2026-07-17T02:51:00Z',
    },
    mainSha: '7e50a04df6dcc8043689958cbfd9be42e15e1af7',
    prs: [],
    wips: [
      mkWip(70, 'WIP-PADN-R1A-001', 'IMPLEMENTING', ['packages/shared/src/leads.ts']),
      mkWip(71, 'WIP-PADN-R1B-001', 'DISPATCHED', ['packages/shared/src/format.ts']),
    ],
    duplicateWips: [],
  };
  const r = evaluateWritePreconditions({ snapshot, wip: snapshot.wips[1], ctx: ctxWith(), configs });
  const perTier = r.checks.find((c) => c.check === 'per_tier_capacity_ok');
  assert.equal(perTier.ok, false, 'RT1 2本目が per-tier 上限で止まるはず');
  // 別 tier（RT0 docs）なら per-tier では止まらない
  const rt0 = mkWip(72, 'WIP-PADN-R0-001', 'DISPATCHED', ['docs/roadmap/99_x.md']);
  const r2 = evaluateWritePreconditions({ snapshot: { ...snapshot, wips: [snapshot.wips[0], rt0] }, wip: rt0, ctx: ctxWith(), configs });
  assert.equal(r2.checks.find((c) => c.check === 'per_tier_capacity_ok').ok, true);
});

test('collectRuntimeSignals: 当日 PADN run 数と直近連続失敗を実測（API 失敗時は 0 縮退）', async () => {
  const world = standardWorld();
  const gh = ghFromWorld(world);
  gh.workflowRunsResponse = {
    workflow_runs: [
      { name: '369 PADN L2 Claude Role Jobs', status: 'completed', conclusion: 'failure', created_at: '2026-07-17T02:50:00Z' },
      { name: '369 PADN L2 Codex Audit Jobs', status: 'completed', conclusion: 'failure', created_at: '2026-07-17T02:40:00Z' },
      { name: '369 PADN L2 Codex Audit Jobs', status: 'completed', conclusion: 'success', created_at: '2026-07-17T02:00:00Z' },
      { name: 'CI', status: 'completed', conclusion: 'failure', created_at: '2026-07-17T01:00:00Z' },
    ],
  };
  const s = await collectRuntimeSignals(gh, { now: world.now });
  assert.equal(s.dispatchesToday, 3); // CI は数えない
  assert.equal(s.consecutiveFailures, 2);

  const broken = ghFromWorld(world);
  broken.listWorkflowRuns = async () => {
    throw new Error('api down');
  };
  const s2 = await collectRuntimeSignals(broken, { now: world.now });
  assert.deepEqual(s2, { dispatchesToday: 0, consecutiveFailures: 0 });
});

test('contextFromEnv: 既定値は最も安全側（disabled / observe / 0 lane / reports off）', () => {
  const ctx = contextFromEnv({});
  assert.equal(ctx.enabled, false);
  assert.equal(ctx.mode, 'observe');
  assert.equal(ctx.writeLanesVar, 0);
  assert.equal(ctx.reportsEnabled, false);
  assert.equal(ctx.hasAppToken, false);
});
