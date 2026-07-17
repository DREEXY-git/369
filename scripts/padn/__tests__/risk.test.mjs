import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { classifyPaths, tierAllowed, findRt2Approval, detectGateViolations } from '../risk.mjs';

const riskPolicy = JSON.parse(readFileSync(new URL('../../../config/padn/risk-policy.json', import.meta.url), 'utf8'));
const humanGates = JSON.parse(readFileSync(new URL('../../../config/padn/human-gates.json', import.meta.url), 'utf8'));

test('risk tier: 代表パスの分類', () => {
  assert.equal(classifyPaths(['docs/roadmap/99_x.md'], riskPolicy).tier, 'RT0');
  assert.equal(classifyPaths(['369-vault/知識/x.md'], riskPolicy).tier, 'RT0');
  assert.equal(classifyPaths(['packages/shared/src/leads.ts'], riskPolicy).tier, 'RT1');
  assert.equal(classifyPaths(['apps/web/app/(app)/contracts/page.tsx'], riskPolicy).tier, 'RT2');
  assert.equal(classifyPaths(['apps/worker/src/jobs.ts'], riskPolicy).tier, 'RT3');
  assert.equal(classifyPaths(['.github/workflows/ci.yml'], riskPolicy).tier, 'RT4');
  assert.equal(classifyPaths(['packages/db/prisma/schema.prisma'], riskPolicy).tier, 'RT4');
  // RBAC は shared 配下だが RT1 の exclude → RT4
  assert.equal(classifyPaths(['packages/shared/rbac.ts'], riskPolicy).tier, 'RT4');
  // L2 自身（scripts/padn・config/padn）は RT4＝自己書き換えの自動開始禁止（Codex R12 P1）
  assert.equal(classifyPaths(['scripts/padn/dispatcher.mjs'], riskPolicy).tier, 'RT4');
  assert.equal(classifyPaths(['config/padn/risk-policy.json'], riskPolicy).tier, 'RT4');
});

test('risk tier: 混在は最高 tier・未知パスは fail-closed で RT3', () => {
  assert.equal(classifyPaths(['docs/x.md', 'apps/worker/src/jobs.ts'], riskPolicy).tier, 'RT3');
  assert.equal(classifyPaths(['totally/unknown/path.xyz'], riskPolicy).tier, 'RT3');
  assert.equal(classifyPaths([], riskPolicy).tier, 'RT3');
});

test('mode 別の自動開始可否（§11）', () => {
  assert.equal(tierAllowed('RT0', 'observe', riskPolicy).allowed, false); // observe は write 0
  assert.equal(tierAllowed('RT0', 'rt0_pilot', riskPolicy).allowed, true);
  assert.equal(tierAllowed('RT1', 'rt0_pilot', riskPolicy).allowed, false);
  assert.equal(tierAllowed('RT1', 'rt1_pilot', riskPolicy).allowed, true);
  // RT2 は人間の事前許可が必要
  assert.equal(tierAllowed('RT2', 'rt1_pilot', riskPolicy).allowed, false);
  assert.equal(tierAllowed('RT2', 'rt1_pilot', riskPolicy, { rt2Approved: true }).allowed, true);
  assert.equal(tierAllowed('RT2', 'observe', riskPolicy, { rt2Approved: true }).allowed, false);
  // RT3 / RT4 は常に自動開始禁止（事前許可があっても）
  assert.equal(tierAllowed('RT3', 'rt1_pilot', riskPolicy, { rt2Approved: true }).allowed, false);
  assert.equal(tierAllowed('RT4', 'rt1_pilot', riskPolicy, { rt2Approved: true }).allowed, false);
});

test('RT2 事前許可 marker は許可者 login のコメントのみ有効', () => {
  const marker = riskPolicy.rt2_preapproval.marker;
  assert.equal(findRt2Approval([{ user: { login: 'DREEXY-git' }, body: `${marker} この WIP を許可` }], riskPolicy), true);
  assert.equal(findRt2Approval([{ user: { login: 'someone-else' }, body: `${marker}` }], riskPolicy), false);
  assert.equal(findRt2Approval([{ user: { login: 'DREEXY-git' }, body: '許可っぽいが marker なし' }], riskPolicy), false);
});

test('Human Gate 検出: schema / package / rbac / .github への path で越境検出', () => {
  const hits = detectGateViolations(
    { paths: ['packages/db/prisma/schema.prisma', 'package.json', 'packages/shared/rbac.ts', '.github/workflows/x.yml'] },
    humanGates,
  );
  const gates = hits.map((h) => h.gate);
  assert.ok(gates.includes('schema_migration'));
  assert.ok(gates.includes('package_lock'));
  assert.ok(gates.includes('rbac_abac_labels'));
  assert.ok(gates.includes('workflow_main_reflect'));
  assert.equal(detectGateViolations({ paths: ['apps/web/lib/x.ts'] }, humanGates).length, 0);
});

test('Human Gate 検出: action ベース（external_send / billing）', () => {
  const hits = detectGateViolations({ actions: ['external_send', 'billing'] }, humanGates);
  const gates = hits.map((h) => h.gate);
  assert.ok(gates.includes('external_send'));
  assert.ok(gates.includes('billing_payment'));
});
