import { test, expect, type Page } from '@playwright/test';
import { prisma } from '@hokko/db';
import { decideAiGateCore, type GateBridgeDb } from '../../lib/ai-gate-bridge';

// Phase 4 Control Plane（v7.2 Lane C・read-only）の実 UI E2E。
// Inbox/Receipt/実測集計・承認シグナル遮断・AI 遮断・canonical 状態一致・raw 本文非表示・mobile。
// fixture は本テストが作る合成データのみ・afterAll で fixture だけを削除する。

const SECRET_INPUT = 'CP-SECRET-INPUT-V72';
const SECRET_OUTPUT = 'CP-SECRET-OUTPUT-V72';
const SECRET_ERROR = 'CP-SECRET-ERROR-V72';

let tenantId = '';
let agentId = '';
let staleGateId = '';
let receiptGateId = '';
let queuedRunId = '';
const fixtureRunIds: string[] = [];
const fixtureGateIds: string[] = [];

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

async function makeRun(data: { status: string; startedAt: Date; finishedAt?: Date | null; humanReviewed?: boolean; task?: string }) {
  const run = await prisma.aIAgentRun.create({
    data: {
      tenantId,
      agentId,
      task: data.task ?? `v72-cp-${Date.now()}-${Math.random()}`,
      status: data.status as never,
      input: { note: SECRET_INPUT },
      output: { note: SECRET_OUTPUT },
      error: data.status === 'FAILED' ? SECRET_ERROR : null,
      startedAt: data.startedAt,
      finishedAt: data.finishedAt ?? null,
      humanReviewed: data.humanReviewed ?? false,
    },
  });
  fixtureRunIds.push(run.id);
  return run;
}

test.describe('Phase 4 Control Plane（v7.2 Lane C・read-only）', () => {
  test.beforeAll(async () => {
    const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { tenantId: true } });
    if (!ceo) throw new Error('seed ceo not found');
    tenantId = ceo.tenantId;
    const agent = await prisma.aIAgent.findFirst({ where: { tenantId }, select: { id: true } });
    if (!agent) throw new Error('seed agent not found');
    agentId = agent.id;

    const now = Date.now();
    // 実測対象: SUCCEEDED 30分・FAILED 60分。
    await makeRun({ status: 'SUCCEEDED', startedAt: new Date(now - 3 * 3600_000), finishedAt: new Date(now - 3 * 3600_000 + 30 * 60_000) });
    await makeRun({ status: 'FAILED', startedAt: new Date(now - 2 * 3600_000), finishedAt: new Date(now - 2 * 3600_000 + 60 * 60_000), task: `v72-cp-failed-${now}` });
    // 承認済み・再開待ち（QUEUED + humanReviewed）。
    const queued = await makeRun({ status: 'QUEUED', startedAt: new Date(now - 3600_000), humanReviewed: true, task: `v72-cp-queued-${now}` });
    queuedRunId = queued.id;
    // stale RUNNING（3h 前開始・終了記録なし）。
    await makeRun({ status: 'RUNNING', startedAt: new Date(now - 3 * 3600_000), task: `v72-cp-stalerun-${now}` });
    // PENDING stale gate（25h 前・runId null の孤立 gate = 判断のみ）。
    const staleGate = await prisma.aIApprovalGate.create({
      data: { tenantId, runId: null, action: 'v72_cp_stale_gate', reason: '判断待ち（fixture）', status: 'PENDING', createdAt: new Date(now - 25 * 3600_000) },
    });
    staleGateId = staleGate.id;
    fixtureGateIds.push(staleGate.id);
    // Receipt fixture: stale gate + NEEDS_APPROVAL run → confirmStale 付き approve（QUEUED 再開待ち）。
    const receiptRun = await makeRun({ status: 'NEEDS_APPROVAL', startedAt: new Date(now - 26 * 3600_000), task: `v72-cp-receipt-${now}` });
    const receiptGate = await prisma.aIApprovalGate.create({
      data: { tenantId, runId: receiptRun.id, action: 'v72_cp_receipt_gate', reason: '判断待ち（fixture）', status: 'PENDING', createdAt: new Date(now - 25 * 3600_000) },
    });
    receiptGateId = receiptGate.id;
    fixtureGateIds.push(receiptGate.id);
    const decided = await decideAiGateCore(prisma as unknown as GateBridgeDb, {
      tenantId,
      gateId: receiptGate.id,
      decision: 'approve',
      decidedById: (await prisma.user.findFirst({ where: { tenantId, email: 'ceo@ikezaki.local' }, select: { id: true } }))!.id,
      note: '',
      actorIsAi: false,
      confirmStale: true,
    });
    if (decided.outcome !== 'decided') throw new Error(`receipt fixture setup failed: ${decided.outcome}`);
  });

  test.afterAll(async () => {
    await prisma.approvalRequest.deleteMany({ where: { tenantId, type: 'ai_run_resume', entityId: { in: fixtureGateIds } } });
    await prisma.auditLog.deleteMany({ where: { tenantId, entityType: 'AIApprovalGate', entityId: { in: fixtureGateIds } } });
    await prisma.dataAccessLog.deleteMany({ where: { tenantId, entityType: 'AIApprovalGate', entityId: { in: fixtureGateIds } } });
    await prisma.aIApprovalGate.deleteMany({ where: { id: { in: fixtureGateIds } } });
    await prisma.aIAgentAction.deleteMany({ where: { runId: { in: fixtureRunIds } } });
    await prisma.aIAgentRun.deleteMany({ where: { id: { in: fixtureRunIds } } });
    await prisma.$disconnect();
  });

  test('ceo: tiles が実 DB 件数と一致・Inbox に判断待ち/再開待ち/stale/失敗・Receipt に相関✓と stale 再確認 badge', async ({ page }) => {
    await login(page, 'ceo@ikezaki.local');
    await page.goto('/ai-control');

    // tiles は実 DB の件数と一致（fixture 固定値ではなく DB re-fetch と突き合わせ）。
    const since = new Date(Date.now() - 30 * 24 * 3600_000);
    const queuedResume = await prisma.aIAgentRun.count({ where: { tenantId, status: 'QUEUED', humanReviewed: true, startedAt: { gte: since } } });
    const failed = await prisma.aIAgentRun.count({ where: { tenantId, status: 'FAILED', startedAt: { gte: since } } });
    const pendingGates = await prisma.aIApprovalGate.count({ where: { tenantId, status: 'PENDING' } });
    const summary = page.getByTestId('cp-summary');
    await expect(summary).toContainText(`承認済み・再開待ち`);
    expect(await summary.locator('text=承認済み・再開待ち').locator('..').textContent()).toContain(String(queuedResume));
    await expect(summary).toContainText(String(failed));
    expect(pendingGates).toBeGreaterThanOrEqual(1);

    // Inbox: stale gate（stale badge 付き）・承認済み再開待ち・stale run・失敗。
    const staleItem = page.getByTestId(`cp-inbox-gate-${staleGateId}`);
    await expect(staleItem).toBeVisible();
    await expect(staleItem.getByText('stale', { exact: true })).toBeVisible();
    await expect(staleItem.getByRole('link', { name: '承認一覧で判断する' })).toHaveAttribute('href', '/approvals');
    await expect(page.getByTestId(`cp-inbox-queued-${queuedRunId}`)).toContainText('実行はまだ行われていません');

    // Receipt: 決定レコード/監査/run 記録の相関✓・stale 再確認 badge・「実行なし」ラベル。
    const receipt = page.getByTestId(`cp-receipt-${receiptGateId}`);
    await expect(receipt).toBeVisible();
    await expect(receipt).toContainText('承認済み・再開待ち（実行なし）');
    await expect(receipt).toContainText('stale を再確認して承認');
    await expect(receipt).toContainText('決定レコード ✓');
    await expect(receipt).toContainText('監査 ✓');
    await expect(receipt).toContainText('run 記録 ✓');
    await expect(receipt).toContainText('北郷 誠一'); // 判断者（人間）の実名

    // 実行系の導線が存在しない（read-only・判断は /approvals）。
    expect(await page.getByRole('button', { name: /承認|却下|実行|再開/ }).count()).toBe(0);
  });

  test('raw 本文非表示: run の input/output/error が Control Plane のどこにも描画されない', async ({ page }) => {
    await login(page, 'ceo@ikezaki.local');
    await page.goto('/ai-control');
    const content = await page.content();
    for (const sentinel of [SECRET_INPUT, SECRET_OUTPUT, SECRET_ERROR]) {
      expect(content, `page contains ${sentinel}`).not.toContain(sentinel);
    }
  });

  test('canonical 状態一致: Control Plane の状態は /ai-agents 一覧と同じ deriveAgentState 値・実測は未計測を捏造しない', async ({ page }) => {
    await login(page, 'ceo@ikezaki.local');
    // 一覧（canonical）の状態を取得。
    await page.goto('/ai-agents');
    const listState = await page.getByTestId(`ai-agent-card-${agentId}`).getAttribute('data-agent-state');
    expect(listState).toBeTruthy();
    // Control Plane 側が同じ値・同じラベル正本。
    await page.goto('/ai-control');
    const cpState = await page.getByTestId(`cp-agent-state-${agentId}`).getAttribute('data-agent-state');
    expect(cpState).toBe(listState);
    // 実測列: fixture の実測（30/60分）を含む平均が「n 分（実測 m 件）」形式・または未計測表示のみ。
    const avgText = await page.getByTestId(`cp-agent-avg-${agentId}`).textContent();
    expect(avgText).toMatch(/分（実測 \d+ 件）|未計測/);
    expect(avgText).not.toMatch(/推定|ROI|削減/); // 推測値を出さない
  });

  test('承認シグナル遮断: STAFF（approval:approve なし）は tiles/実測は見えるが Inbox ゲート・Receipt は権限者のみ表示', async ({ page }) => {
    await login(page, 'sales@ikezaki.local');
    await page.goto('/ai-control');
    await expect(page.getByTestId('cp-summary')).toContainText('権限者のみ'); // 判断待ちゲート数を返さない
    await expect(page.getByTestId('cp-inbox-restricted')).toBeVisible();
    await expect(page.getByTestId('cp-receipts-restricted')).toBeVisible();
    await expect(page.getByTestId(`cp-inbox-gate-${staleGateId}`)).toHaveCount(0);
    await expect(page.getByTestId(`cp-receipt-${receiptGateId}`)).toHaveCount(0);
    await expect(page.getByTestId(`cp-agent-${agentId}`)).toBeVisible(); // 実測集計は dashboard:read で可
  });

  test('AI ロール（dashboard:read なし）はデータ取得前に遮断', async ({ page }) => {
    await login(page, 'ai-sales@ikezaki.local');
    await page.goto('/ai-control');
    await expect(page.getByText('ダッシュボード閲覧権限（dashboard:read）が必要です')).toBeVisible();
    await expect(page.getByTestId('cp-summary')).toHaveCount(0);
  });

  test('deep link: /ai-office から Control Plane へ・mobile 390px overflow 0（視覚証拠）', async ({ page }) => {
    await login(page, 'ceo@ikezaki.local');
    await page.goto('/ai-office');
    await page.getByTestId('ai-office-control-link').click();
    await page.waitForURL('**/ai-control');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/ai-control');
    for (const id of ['cp-summary', 'cp-inbox', 'cp-receipts', 'cp-agent-stats']) {
      const el = page.getByTestId(id);
      await expect(el).toBeVisible();
      const box = await el.boundingBox();
      expect(box!.x, `${id} 左端@390`).toBeGreaterThanOrEqual(-1);
      expect(box!.x + box!.width, `${id} 右端@390`).toBeLessThanOrEqual(391);
    }
    // 表は自身のコンテナ内で横スクロール（ページ全体は横スクロールしない）。
    const clipped = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(clipped).toBeLessThanOrEqual(1);
    await page.getByTestId('cp-inbox').screenshot({ path: 'test-results/cp-inbox-mobile-390.png' });
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/ai-control');
    await page.getByTestId('cp-receipts').screenshot({ path: 'test-results/cp-receipts-desktop.png' });
    await page.getByTestId('cp-agent-stats').screenshot({ path: 'test-results/cp-agent-stats-desktop.png' });
  });
});
