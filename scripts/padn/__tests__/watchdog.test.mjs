import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runWatchdog, secretLike, redactSecrets } from '../watchdog.mjs';
import { buildSnapshot } from '../discover.mjs';
import { FakeGH, standardWorld, controlRootIssue, simpleComment } from './fixtures.mjs';

const policy = JSON.parse(readFileSync(new URL('../../../config/padn/dispatch-policy.json', import.meta.url), 'utf8'));

async function snapshotOf(world) {
  const gh = new FakeGH({
    issues: world.issues,
    commentsByIssue: world.commentsByIssue,
    pulls: world.pulls,
    branchShas: world.branchShas,
  });
  return buildSnapshot(gh, policy, { now: world.now });
}

test('健全な世界では findings なし', async () => {
  const snap = await snapshotOf(standardWorld());
  const { findings, action } = runWatchdog(snap, policy, {}, snap.now);
  assert.deepEqual(findings, []);
  assert.equal(action, null);
});

test('current head != reviewed head の PASS を FREEZE 検出（fixed-SHA 失効）', async () => {
  const world = standardWorld();
  world.pulls[0].head.sha = 'aaaa1111bbbb2222cccc3333dddd4444eeee5555'; // head が動いた
  const snap = await snapshotOf(world);
  const { findings, action } = runWatchdog(snap, policy, {}, snap.now);
  assert.ok(findings.some((f) => f.id === 'stale_pass_head_moved' && f.severity === 'freeze'));
  assert.equal(action, 'INCIDENT_FREEZE');
});

test('stale lease（claim 後に 24h checkpoint なし）を BACKPRESSURE 検出', async () => {
  const world = standardWorld({ now: '2026-07-18T09:00:00Z' });
  // B2 を CLAIMED のまま止まった世界にする（freeze 以降のコメント除去）
  world.commentsByIssue[68] = world.commentsByIssue[68].slice(0, 2); // packet + WIP_CLAIMED
  const snap = await snapshotOf(world);
  const { findings, action } = runWatchdog(snap, policy, {}, snap.now);
  assert.ok(findings.some((f) => f.id === 'stale_lease'));
  assert.equal(action, 'BACKPRESSURE_ON');
});

test('duplicate control root / duplicate WIP は FREEZE', async () => {
  const world = standardWorld();
  world.issues.push(controlRootIssue(199));
  const snap = await snapshotOf(world);
  const { findings, action } = runWatchdog(snap, policy, {}, snap.now);
  assert.ok(findings.some((f) => f.id === 'duplicate_control_root'));
  assert.equal(action, 'INCIDENT_FREEZE');
});

test('シグナル系: hash mismatch / CI 0 tests / 連続失敗 / budget / gate 越境 / secret / drift', async () => {
  const snap = await snapshotOf(standardWorld());
  const { findings, action } = runWatchdog(
    snap,
    policy,
    {
      promptHashMismatches: ['WIP-PADN-D-201 rev1'],
      ciZeroTests: true,
      consecutiveFailures: 2,
      dispatchesToday: 99,
      gateViolations: [{ gate: 'main_merge' }],
      scanTexts: ['ghp_' + 'a'.repeat(30)],
      vaultDrift: true,
    },
    snap.now,
  );
  const ids = findings.map((f) => f.id);
  for (const expected of [
    'prompt_hash_mismatch',
    'ci_zero_tests',
    'consecutive_failures',
    'budget_threshold',
    'human_gate_violation',
    'secret_like_value',
    'vault_drift',
  ]) {
    assert.ok(ids.includes(expected), `missing ${expected}`);
  }
  assert.equal(action, 'INCIDENT_FREEZE'); // freeze 級が混じれば freeze
});

test('rework > 2 と review backlog 超過を検出', async () => {
  const world = standardWorld();
  // 認証済み CHANGES_REQUIRED verdict（head 一致）を 3 サイクル注入
  const changesVerdict = (at) =>
    simpleComment(
      at,
      ['## CODEX_VERDICT — padn_codex_arch', '```json', JSON.stringify({ schema: '369-padn-l2-review-verdict-v1', verdict: 'CHANGES_REQUIRED', head_sha: world.B2_HEAD, role_event_type: 'padn_codex_arch', findings: [], summary_ja: 'x' }), '```'].join('\n'),
    );
  world.commentsByIssue[68].splice(
    5,
    2,
    changesVerdict('2026-07-17T01:20:00Z'),
    simpleComment('2026-07-17T01:30:00Z', 'IMPLEMENTATION_FREEZE — fixed head ' + world.B2_HEAD),
    changesVerdict('2026-07-17T01:40:00Z'),
    simpleComment('2026-07-17T01:50:00Z', 'IMPLEMENTATION_FREEZE — fixed head ' + world.B2_HEAD),
    changesVerdict('2026-07-17T02:00:00Z'),
  );
  const snap = await snapshotOf(world);
  const { findings } = runWatchdog(snap, policy, {}, snap.now);
  assert.ok(findings.some((f) => f.id === 'rework_exceeded'));
});

test('watchdog は削除系 action を持たない（不変条件）', async () => {
  const world = standardWorld();
  world.pulls[0].head.sha = 'aaaa1111bbbb2222cccc3333dddd4444eeee5555';
  const snap = await snapshotOf(world);
  const { action } = runWatchdog(snap, policy, { gateViolations: [{ gate: 'x' }] }, snap.now);
  assert.ok(['BACKPRESSURE_ON', 'INCIDENT_FREEZE', null].includes(action));
});

test('secretLike / redactSecrets', () => {
  assert.equal(secretLike('token: "abc"'), false);
  assert.equal(secretLike('ghp_' + 'x'.repeat(36)), true);
  assert.equal(secretLike('-----BEGIN RSA PRIVATE KEY-----'), true);
  assert.equal(secretLike('api_key = "0123456789abcdef0123"'), true);
  const red = redactSecrets('before ghp_' + 'x'.repeat(36) + ' after');
  assert.ok(!red.includes('ghp_'));
  assert.ok(red.includes('[REDACTED]'));
});
