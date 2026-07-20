import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { globToRegExp, pathMatches, checkAllowedPaths, loadTaxonomy, resourcesForPaths, canAcquire, laneConflicts } from '../locks.mjs';

const taxonomyConfig = JSON.parse(readFileSync(new URL('../../../config/padn/resource-taxonomy.json', import.meta.url), 'utf8'));

test('glob: ** / * の基本挙動', () => {
  assert.equal(globToRegExp('docs/**').test('docs/a/b.md'), true);
  assert.equal(globToRegExp('docs/**').test('docs'), false);
  assert.equal(globToRegExp('apps/web/lib/*.ts').test('apps/web/lib/utils.ts'), true);
  assert.equal(globToRegExp('apps/web/lib/*.ts').test('apps/web/lib/sub/x.ts'), false);
  assert.equal(pathMatches('packages/shared/rbac.ts', ['packages/shared/rbac.ts']), true);
});

test('path lock: ALLOWED_PATHS 逸脱の検出（1件でも write 禁止）', () => {
  const allowed = ['apps/web/app/(app)/contracts/page.tsx', 'apps/web/lib/domains/legal/**', 'apps/web/tests/e2e/contract_child_tenant_evidence.spec.ts'];
  const ok = checkAllowedPaths(['apps/web/lib/domains/legal/contracts.ts'], allowed);
  assert.equal(ok.ok, true);
  const bad = checkAllowedPaths(['apps/web/lib/domains/legal/contracts.ts', 'packages/db/prisma/schema.prisma'], allowed);
  assert.equal(bad.ok, false);
  assert.deepEqual(bad.violations, ['packages/db/prisma/schema.prisma']);
});

test('semantic lock: 互換行列（SNAPSHOT_READ < INTENT_WRITE < WRITE < EXCLUSIVE）', () => {
  const tax = loadTaxonomy(taxonomyConfig);
  assert.equal(tax.isCompatible('SNAPSHOT_READ', 'WRITE'), true);
  assert.equal(tax.isCompatible('WRITE', 'WRITE'), false);
  assert.equal(tax.isCompatible('WRITE', 'SNAPSHOT_READ'), true);
  assert.equal(tax.isCompatible('EXCLUSIVE', 'SNAPSHOT_READ'), false);
  assert.equal(tax.isCompatible('INTENT_WRITE', 'INTENT_WRITE'), true);
  assert.equal(tax.isCompatible('INTENT_WRITE', 'WRITE'), false);
  // 未定義 level は fail-closed
  assert.equal(tax.isCompatible('WRITE', 'UNKNOWN_LEVEL'), false);
});

test('semantic lock: パス→資源解決と競合検出（#63×#64 operations.ts 事例）', () => {
  const tax = loadTaxonomy(taxonomyConfig);
  assert.deepEqual(resourcesForPaths(tax, ['apps/web/lib/operations.ts']), ['operations']);
  const conflicts = laneConflicts(tax, [
    { holder: 'WIP-63', paths: ['apps/web/lib/operations.ts'], level: 'WRITE' },
    { holder: 'WIP-64', paths: ['apps/web/lib/operations.ts'], level: 'WRITE' },
  ]);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].resource, 'operations');
});

test('semantic lock: 同一 holder は自分と競合しない・read は write と併走可', () => {
  const tax = loadTaxonomy(taxonomyConfig);
  const held = [{ resource: 'operations', level: 'WRITE', holder: 'WIP-63' }];
  assert.equal(canAcquire(tax, held, { resource: 'operations', level: 'WRITE', holder: 'WIP-63' }).ok, true);
  assert.equal(canAcquire(tax, held, { resource: 'operations', level: 'SNAPSHOT_READ', holder: 'WIP-99' }).ok, true);
  assert.equal(canAcquire(tax, held, { resource: 'operations', level: 'WRITE', holder: 'WIP-99' }).ok, false);
});
