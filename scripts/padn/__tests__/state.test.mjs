import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractJsonBlocks, parseControlState, directorActive, parseWipBody, foldWipState, loadStateMachine } from '../state.mjs';
import { controlRootIssue, controlEventComment, wipIssue, standardWorld, MAIN_SHA } from './fixtures.mjs';

const smConfig = JSON.parse(readFileSync(new URL('../../../config/padn/state-machine.json', import.meta.url), 'utf8'));

test('extractJsonBlocks: HTML entity 混入や壊れた block に耐える', () => {
  const text = '```json\n{"a":1,"s":&#34;x&#34;}\n```\n\n```json\n{broken\n```\n\n```json\n{"b":2}\n```';
  const blocks = extractJsonBlocks(text);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].s, 'x');
  assert.equal(blocks[1].b, 2);
});

test('control state fold: revision は単調に最新へ・Director 活動が追跡される', () => {
  const issue = controlRootIssue();
  const comments = [
    controlEventComment({ at: '2026-07-16T23:56:53Z', revision: 2, markers: ['LEASE_GRANTED'] }),
    controlEventComment({ at: '2026-07-17T01:31:23Z', revision: 3, markers: ['PROMPT_DISPATCHED'] }),
    controlEventComment({ at: '2026-07-17T02:51:31Z', revision: 7, markers: ['QUEUE_UPDATE', 'HOLD'] }),
  ];
  const state = parseControlState(issue, comments);
  assert.equal(state.programId, '369-PADN-V5');
  assert.equal(state.controlRevision, 7);
  assert.equal(state.directorEpoch, 1);
  assert.equal(state.writeCapacity, 2);
  assert.equal(state.appMainBase, MAIN_SHA);
  assert.equal(state.backpressure, false);
  assert.equal(state.incidentFreeze, false);
  assert.equal(state.lastDirectorActivityAt, '2026-07-17T02:51:31Z');
  assert.equal(directorActive(state, '2026-07-17T10:00:00Z', 24), true);
  assert.equal(directorActive(state, '2026-07-19T10:00:00Z', 24), false);
});

test('control state fold: BACKPRESSURE_ON / INCIDENT_FREEZE marker を検出', () => {
  const issue = controlRootIssue();
  const state = parseControlState(issue, [
    controlEventComment({ at: '2026-07-17T03:00:00Z', revision: 8, markers: ['BACKPRESSURE_ON'] }),
  ]);
  assert.equal(state.backpressure, true);
  const state2 = parseControlState(issue, [
    controlEventComment({ at: '2026-07-17T03:00:00Z', revision: 8, markers: ['INCIDENT_FREEZE'] }),
  ]);
  assert.equal(state2.incidentFreeze, true);
});

test('WIP body parse: lease table と ALLOWED_PATHS（#67 実フォーマット準拠）', () => {
  const issue = wipIssue({
    number: 67,
    wipId: 'WIP-PADN-B1-001',
    lane: 'B1',
    branch: 'claude/padn-b1-contract-child-tenant-v1',
    allowedPaths: ['apps/web/app/(app)/contracts/page.tsx', 'apps/web/lib/domains/legal/**'],
  });
  const parsed = parseWipBody(issue.body);
  assert.equal(parsed.wipId, 'WIP-PADN-B1-001');
  assert.equal(parsed.lease.leaseId, 'LEASE-369PADN-B1-001');
  assert.equal(parsed.lease.revision, 1);
  assert.equal(parsed.lease.fencingToken, 'FT-369PADN-E1-B1-L1-7e50a04');
  assert.equal(parsed.lease.baseSha, MAIN_SHA);
  assert.equal(parsed.lease.branch, 'claude/padn-b1-contract-child-tenant-v1');
  assert.deepEqual(parsed.allowedPaths, ['apps/web/app/(app)/contracts/page.tsx', 'apps/web/lib/domains/legal/**']);
});

test('WIP fold: B2 実ライフサイクル（dispatch→claim→freeze→PASS→human gate）', () => {
  const world = standardWorld();
  const fold = foldWipState(world.commentsByIssue[68]);
  assert.equal(fold.state, 'READY_FOR_HUMAN_GATE');
  assert.equal(fold.frozenHead, world.B2_HEAD);
  assert.equal(fold.reworkCount, 0);
  const b1fold = foldWipState(world.commentsByIssue[67]);
  assert.equal(b1fold.state, 'DISPATCHED'); // 未クレーム
});

test('state machine: 正常遷移・不正遷移・human_only・HEAD_MOVED での PASS 失効', () => {
  const sm = loadStateMachine(smConfig);
  assert.equal(sm.next('PROPOSED', 'PROMPT_DISPATCHED').to, 'DISPATCHED');
  assert.equal(sm.next('DISPATCHED', 'WIP_CLAIMED').to, 'CLAIMED');
  assert.equal(sm.next('FROZEN_FOR_REVIEW', 'REVIEW_PASS').to, 'REVIEW_PASSED');
  // fixed SHA が動いたら PASS 失効 → IMPLEMENTING へ戻る
  assert.equal(sm.next('REVIEW_PASSED', 'HEAD_MOVED').to, 'IMPLEMENTING');
  // 不正遷移は拒否
  assert.equal(sm.next('DISPATCHED', 'REVIEW_PASS').ok, false);
  assert.equal(sm.next('CLAIMED', 'HUMAN_MERGE').ok, false);
  // human_only
  const merge = sm.next('READY_FOR_HUMAN_GATE', 'HUMAN_MERGE');
  assert.equal(merge.ok, true);
  assert.equal(merge.humanOnly, true);
  // wildcard HOLD
  assert.equal(sm.next('IMPLEMENTING', 'HOLD').to, 'HOLD');
  assert.equal(sm.next('CLOSED', 'HOLD').ok, false);
});

test('state machine: L2 が起動してよい (state, event_type) 組（重複採用の防止）', () => {
  const sm = loadStateMachine(smConfig);
  assert.equal(sm.canDispatch('DISPATCHED', 'padn_claude_implement'), true);
  // 既に CLAIMED なら implement は再送しない（duplicate adoption 防止）
  assert.equal(sm.canDispatch('CLAIMED', 'padn_claude_implement'), false);
  assert.equal(sm.canDispatch('FROZEN_FOR_REVIEW', 'padn_codex_security'), true);
  assert.equal(sm.canDispatch('REVIEW_PASSED', 'padn_codex_security'), false);
  assert.equal(sm.canDispatch('READY_FOR_HUMAN_GATE', 'padn_claude_implement'), false);
});
