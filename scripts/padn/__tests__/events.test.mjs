import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeEvent, actorAllowed, isForkEvent, chainDepthExceeded, isStaleEvent, isProductionDeployment, dedupeKey } from '../events.mjs';

const policy = JSON.parse(readFileSync(new URL('../../../config/padn/dispatch-policy.json', import.meta.url), 'utf8'));

test('normalize: pull_request（fork 判定含む）', () => {
  const ev = normalizeEvent('pull_request', {
    action: 'synchronize',
    sender: { login: 'DREEXY-git' },
    pull_request: {
      number: 69,
      updated_at: '2026-07-17T01:00:00Z',
      head: { sha: 'aaa1111', ref: 'claude/padn-b2-cashflow-line-tenant-v1', repo: { full_name: 'DREEXY-git/369' } },
      base: { repo: { full_name: 'DREEXY-git/369' } },
    },
  });
  assert.equal(ev.type, 'pull_request');
  assert.equal(ev.fork, false);
  const forkEv = normalizeEvent('pull_request', {
    pull_request: {
      number: 1,
      head: { sha: 'bbb', repo: { full_name: 'attacker/369' } },
      base: { repo: { full_name: 'DREEXY-git/369' } },
    },
  });
  assert.equal(isForkEvent(forkEv), true);
});

test('normalize: workflow_run / deployment_status / repository_dispatch', () => {
  const ci = normalizeEvent('workflow_run', {
    workflow: { name: 'CI' },
    workflow_run: { id: 1, run_attempt: 2, conclusion: 'success', head_sha: 'abc', event: 'pull_request', head_branch: 'x', updated_at: 't' },
  });
  assert.equal(ci.type, 'ci');
  assert.equal(ci.workflowName, 'CI');
  assert.equal(ci.key, 'workflow_run:1:2');

  const dep = normalizeEvent('deployment_status', {
    deployment: { id: 9, sha: 'abc', environment: 'Preview' },
    deployment_status: { id: 5, state: 'success', environment: 'Preview' },
  });
  assert.equal(dep.type, 'deployment');
  assert.equal(isProductionDeployment(dep), false);
  const prod = normalizeEvent('deployment_status', {
    deployment: { id: 9, sha: 'abc', environment: 'Production' },
    deployment_status: { id: 5, state: 'success', environment: 'Production' },
  });
  assert.equal(isProductionDeployment(prod), true);

  const rd = normalizeEvent('repository_dispatch', { action: 'padn_dispatch', client_payload: { chain_depth: 1, idempotency_key: 'k' } });
  assert.equal(rd.type, 'padn');
  assert.equal(rd.dispatchType, 'padn_dispatch');
});

test('actor guard: bot ループ防止と allowlist', () => {
  const mk = (login) => normalizeEvent('issue_comment', { action: 'created', sender: { login }, issue: { number: 1 }, comment: { id: 1, body: 'x', created_at: 't' } });
  assert.equal(actorAllowed(mk('DREEXY-git'), policy).allowed, true);
  assert.equal(actorAllowed(mk('vercel[bot]'), policy).allowed, false);
  assert.equal(actorAllowed(mk('github-actions[bot]'), policy).allowed, false);
  assert.equal(actorAllowed(mk('my-padn-app[bot]'), policy).allowed, false); // 自 App も suffix で遮断
  assert.equal(actorAllowed(mk('random-user'), policy).allowed, false);
  // allowlist override（Actions Variable）
  assert.equal(actorAllowed(mk('random-user'), policy, ['random-user']).allowed, true);
  // system 系イベントは actor ガード対象外
  assert.equal(actorAllowed(normalizeEvent('schedule', {}), policy).allowed, true);
});

test('chain depth: 上限で bot ループを遮断', () => {
  const mk = (depth) => normalizeEvent('repository_dispatch', { action: 'padn_dispatch', client_payload: { chain_depth: depth } });
  assert.equal(chainDepthExceeded(mk(0), policy), false);
  assert.equal(chainDepthExceeded(mk(1), policy), false);
  assert.equal(chainDepthExceeded(mk(2), policy), true);
  assert.equal(chainDepthExceeded(mk(99), policy), true);
});

test('stale event: 現在 head と不一致の CI 完了は破棄・duplicate webhook は同一 key', () => {
  const snapshot = {
    mainSha: 'mmm',
    prs: [{ number: 69, headSha: 'aaa1111' }],
  };
  const staleCi = normalizeEvent('workflow_run', { workflow_run: { id: 2, head_sha: 'old0000', event: 'pull_request' } });
  assert.equal(isStaleEvent(staleCi, snapshot), true);
  const freshCi = normalizeEvent('workflow_run', { workflow_run: { id: 3, head_sha: 'aaa1111', event: 'pull_request' } });
  assert.equal(isStaleEvent(freshCi, snapshot), false);
  const mainCi = normalizeEvent('workflow_run', { workflow_run: { id: 4, head_sha: 'mmm', event: 'push', head_branch: 'main' } });
  assert.equal(isStaleEvent(mainCi, snapshot), false);
  const stalePr = normalizeEvent('pull_request', {
    action: 'synchronize',
    pull_request: { number: 69, head: { sha: 'old9999', repo: { full_name: 'r' } }, base: { repo: { full_name: 'r' } } },
  });
  assert.equal(isStaleEvent(stalePr, snapshot), true);

  const a = normalizeEvent('workflow_run', { workflow_run: { id: 7, run_attempt: 1 } });
  const b = normalizeEvent('workflow_run', { workflow_run: { id: 7, run_attempt: 1 } });
  assert.equal(dedupeKey(a), dedupeKey(b)); // 重複配送 → 同一 key → 同一判断
});
