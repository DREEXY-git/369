import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { discoverControlRoot, buildSnapshot, prForWip } from '../discover.mjs';
import { FakeGH, standardWorld, controlRootIssue, MAIN_SHA } from './fixtures.mjs';

const policy = JSON.parse(readFileSync(new URL('../../../config/padn/dispatch-policy.json', import.meta.url), 'utf8'));

function ghFromWorld(world) {
  return new FakeGH({
    issues: world.issues,
    commentsByIssue: world.commentsByIssue,
    pulls: world.pulls,
    branchShas: world.branchShas,
  });
}

test('discovery: Control Root を marker で一意に発見（Issue 番号固定前提なし）', async () => {
  const world = standardWorld();
  const r = await discoverControlRoot(ghFromWorld(world), policy);
  assert.equal(r.ok, true);
  assert.equal(r.issue.number, 66);
});

test('discovery: Control Root 0 件 → NO_CONTROL_ROOT / 2 件 → DUPLICATE_CONTROL_ROOT', async () => {
  const none = await discoverControlRoot(new FakeGH({ issues: [] }), policy);
  assert.equal(none.ok, false);
  assert.equal(none.reason, 'NO_CONTROL_ROOT');

  const dup = await discoverControlRoot(
    new FakeGH({ issues: [controlRootIssue(66), controlRootIssue(99)] }),
    policy,
  );
  assert.equal(dup.ok, false);
  assert.equal(dup.reason, 'DUPLICATE_CONTROL_ROOT');
  assert.deepEqual(dup.duplicates, [66, 99]);
});

test('import: 既存 L1 状態（B1 未クレーム / B2 READY_FOR_HUMAN_GATE）を再作成なしで採用', async () => {
  const world = standardWorld();
  const gh = ghFromWorld(world);
  const snap = await buildSnapshot(gh, policy, { now: world.now });

  assert.equal(snap.ok, true);
  assert.equal(snap.mainSha, MAIN_SHA);
  assert.equal(snap.control.controlRevision, 6);
  assert.equal(snap.wips.length, 2);

  const b1 = snap.wips.find((w) => w.issueNumber === 67);
  assert.equal(b1.wipId, 'WIP-PADN-B1-001');
  assert.equal(b1.state, 'DISPATCHED');
  assert.equal(b1.lease.leaseId, 'LEASE-369PADN-B1-001');
  assert.equal(b1.promptSha256, 'a'.repeat(64));
  assert.equal(b1.packetCommentId, 5001);

  const b2 = snap.wips.find((w) => w.issueNumber === 68);
  assert.equal(b2.state, 'READY_FOR_HUMAN_GATE');
  assert.equal(b2.frozenHead, world.B2_HEAD);
  const pr = prForWip(snap, b2);
  assert.equal(pr.number, 69);

  // discovery は read-only: 何も作成・投稿していない
  assert.equal(gh.dispatched.length, 0);
  assert.equal(gh.commentsPosted.length, 0);
  // 重複 WIP なし
  assert.deepEqual(snap.duplicateWips, []);
});

test('import: 同一 lease branch の重複 WIP（別 wipId）も検出する（Codex R11 P2）', async () => {
  const world = standardWorld();
  // B1 と同じ branch をリースする別 wipId の WIP を追加
  const dupBranch = {
    ...world.issues[1],
    number: 168,
    title: '[WIP] WIP-PADN-B9-001 別IDで同一branch',
    body: world.issues[1].body.replace('WIP-PADN-B1-001', 'WIP-PADN-B9-001'),
  };
  const gh = new FakeGH({
    issues: [...world.issues, dupBranch],
    commentsByIssue: { ...world.commentsByIssue, 168: world.commentsByIssue[67] },
    pulls: world.pulls,
    branchShas: world.branchShas,
  });
  const snap = await buildSnapshot(gh, policy, { now: world.now });
  assert.ok(
    snap.duplicateWips.some((d) => String(d.key).startsWith('branch:claude/padn-b1-contract-child-tenant-v1')),
    '同一 branch の二重リースが検出されるはず',
  );
});

test('import: 同一 wipId の重複 WIP Issue を検出（作成はしない）', async () => {
  const world = standardWorld();
  const dupIssue = { ...world.issues[1], number: 167 }; // B1 と同じ wipId
  const gh = new FakeGH({
    issues: [...world.issues, dupIssue],
    commentsByIssue: { ...world.commentsByIssue, 167: world.commentsByIssue[67] },
    pulls: world.pulls,
    branchShas: world.branchShas,
  });
  const snap = await buildSnapshot(gh, policy, { now: world.now });
  // wipId キーと branch キーの両方で検出される（R11 で branch キー追加）
  const byId = snap.duplicateWips.find((d) => d.key === 'WIP-PADN-B1-001');
  assert.ok(byId, 'wipId キーで検出されるはず');
  assert.deepEqual(byId.issues, [67, 167]);
});
