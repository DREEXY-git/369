// scheduler simulation（§17）: 現実の WIP ライフサイクルを時系列イベント列として流し、
// 「dispatcher が各時点で何を起動するか」を state machine + decide で通し検証する。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadStateMachine } from '../state.mjs';
import { loadConfigs, decide } from '../dispatcher.mjs';
import { buildSnapshot } from '../discover.mjs';
import { normalizeEvent } from '../events.mjs';
import { FakeGH, standardWorld, simpleComment } from './fixtures.mjs';

const configs = loadConfigs(new URL('../../../', import.meta.url).pathname);
const smConfig = JSON.parse(readFileSync(new URL('../../../config/padn/state-machine.json', import.meta.url), 'utf8'));

const tick = normalizeEvent('schedule', {});
const ctx = {
  enabled: true,
  mode: 'rt1_pilot',
  writeLanesVar: 2,
  reportsEnabled: false,
  allowlist: [],
  hasAppToken: true,
  repo: 'DREEXY-git/369',
};

async function snapshotOf(world) {
  const gh = new FakeGH({
    issues: world.issues,
    commentsByIssue: world.commentsByIssue,
    pulls: world.pulls,
    branchShas: world.branchShas,
  });
  return buildSnapshot(gh, configs.policy, { now: world.now });
}

test('state machine 通し: dispatch→claim→freeze→PASS→human gate→merge→close', () => {
  const sm = loadStateMachine(smConfig);
  let state = 'PROPOSED';
  const walk = (event) => {
    const r = sm.next(state, event);
    assert.equal(r.ok, true, `${state} → ${event} が拒否された`);
    state = r.to;
    return r;
  };
  walk('PROMPT_DISPATCHED');
  walk('WIP_CLAIMED');
  walk('IMPLEMENTATION_STARTED');
  walk('IMPLEMENTATION_FREEZE');
  walk('REVIEW_CHANGES_REQUIRED');
  walk('REWORK_STARTED');
  walk('IMPLEMENTATION_FREEZE');
  walk('REVIEW_PASS');
  walk('READY_FOR_HUMAN_GATE');
  const merge = walk('HUMAN_MERGE');
  assert.equal(merge.humanOnly, true);
  walk('POST_MERGE_VERIFIED');
  walk('WIP_CLOSED');
  assert.equal(state, 'CLOSED');
});

test('state machine 通し: lease 失効と再ディスパッチ・rework 上限で REPLAN', () => {
  const sm = loadStateMachine(smConfig);
  assert.equal(sm.next('DISPATCHED', 'LEASE_EXPIRED').to, 'EXPIRED');
  assert.equal(sm.next('EXPIRED', 'PROMPT_DISPATCHED').to, 'DISPATCHED');
  assert.equal(sm.next('CHANGES_REQUESTED', 'REWORK_LIMIT_EXCEEDED').to, 'REPLAN_REQUIRED');
  assert.equal(sm.next('REPLAN_REQUIRED', 'PROMPT_DISPATCHED').to, 'DISPATCHED');
});

test('シミュレーション: 30分 tick を跨いで同じ状態なら決定は安定・状態が進めば決定が変わる', async () => {
  // t0: B1 未クレーム（RT2 未許可なので何も起動しない）
  const w0 = standardWorld({ now: '2026-07-17T03:00:00Z' });
  const r0 = decide({ snapshot: await snapshotOf(w0), event: tick, ctx, configs });
  assert.equal(r0.decisions.length, 0);

  // t1: 人間が RT2 を事前許可 → implement が 1 件だけ決定
  const w1 = standardWorld({ now: '2026-07-17T03:30:00Z' });
  w1.commentsByIssue[67].push(simpleComment('2026-07-17T03:10:00Z', 'PADN_RT2_APPROVED'));
  const r1 = decide({ snapshot: await snapshotOf(w1), event: tick, ctx, configs, rt2Approvals: { 67: true } });
  assert.deepEqual(r1.decisions.map((d) => d.event_type), ['padn_claude_implement']);

  // t2: B1 がクレーム済みに進んだ → implement は再送されない（duplicate 防止）
  const w2 = standardWorld({ now: '2026-07-17T04:00:00Z' });
  w2.commentsByIssue[67].push(
    simpleComment('2026-07-17T03:10:00Z', 'PADN_RT2_APPROVED'),
    simpleComment('2026-07-17T03:40:00Z', 'WIP_CLAIMED — packet 検証済み'),
    simpleComment('2026-07-17T03:41:00Z', 'IMPLEMENTATION_STARTED'),
  );
  const r2 = decide({ snapshot: await snapshotOf(w2), event: tick, ctx, configs, rt2Approvals: { 67: true } });
  assert.equal(r2.decisions.some((d) => d.event_type === 'padn_claude_implement'), false);
  // IMPLEMENTING では padn_claude_test が実際に 1 件決定される
  //（空配列での空虚な成立を防ぐため件数も検証: 自レーンの自己カウント回帰の検出）
  const types2 = r2.decisions.filter((d) => d.payload.wip_issue === 67).map((d) => d.event_type);
  assert.deepEqual(types2, ['padn_claude_test']);

  // t3: freeze された → codex 監査 3 種が決定される
  const w3 = standardWorld({ now: '2026-07-17T05:00:00Z' });
  w3.commentsByIssue[67].push(
    simpleComment('2026-07-17T03:10:00Z', 'PADN_RT2_APPROVED'),
    simpleComment('2026-07-17T03:40:00Z', 'WIP_CLAIMED'),
    simpleComment('2026-07-17T03:41:00Z', 'IMPLEMENTATION_STARTED'),
    simpleComment('2026-07-17T04:30:00Z', 'IMPLEMENTATION_FREEZE — fixed head deadbeefcafe00112233445566778899aabbccdd'),
  );
  w3.branchShas['claude/padn-b1-contract-child-tenant-v1'] = 'deadbeefcafe00112233445566778899aabbccdd';
  const r3 = decide({ snapshot: await snapshotOf(w3), event: tick, ctx, configs, rt2Approvals: { 67: true } });
  const types3 = r3.decisions.filter((d) => d.payload.wip_issue === 67).map((d) => d.event_type).sort();
  assert.deepEqual(types3, ['padn_codex_arch', 'padn_codex_evidence', 'padn_codex_security']);
});
