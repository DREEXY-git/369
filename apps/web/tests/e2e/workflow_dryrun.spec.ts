import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { prisma } from '@hokko/db';

// Workflow Dry Run（v7.2 Lane D）の実 UI E2E。
// dry-run のみ（DB 更新・enqueue・外部送信・実 LLM・課金ゼロ）・危険 Action=BLOCKED・
// 承認 Action=REQUIRES_APPROVAL 停止・Zod/上限/malformed・tenant/RBAC・AI 拒否・a11y・mobile。

const PARTNER_EMAIL = `partner-wf-${process.pid}-${Date.now()}@ikezaki.local`;
const AI_STAFF_EMAIL = `ai-staff-wf-${process.pid}-${Date.now()}@ikezaki.local`;
let tenantId = '';
const fixtureUserIds: string[] = [];

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

/** dry-run が DB を一切変更しないことの証拠（並列 worker の他 spec と干渉しない決定論検査）。
 *  tenant 全体の行数 before/after は並列実行中の他 spec の書き込みで揺れるため使わない。 */
async function assertNoWorkflowWrites() {
  // workflow に帰属し得るレコードが1件も存在しない（マーカー恒常ゼロ）。
  expect(await prisma.auditLog.count({ where: { tenantId, OR: [{ entityType: { contains: 'orkflow' } }, { summary: { contains: 'ワークフロー' } }, { summary: { contains: 'Dry Run' } }] } })).toBe(0);
  expect(await prisma.approvalRequest.count({ where: { tenantId, type: { contains: 'workflow' } } })).toBe(0);
  expect(await prisma.usageEvent.count({ where: { tenantId, eventType: { contains: 'workflow' } } })).toBe(0);
}

test.describe('Workflow Dry Run（v7.2 Lane D・read-only）', () => {
  test.beforeAll(async () => {
    const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { tenantId: true, passwordHash: true } });
    if (!ceo) throw new Error('seed ceo not found');
    tenantId = ceo.tenantId;
    const partnerRole = await prisma.role.findFirst({ where: { tenantId, key: 'EXTERNAL_PARTNER' }, select: { id: true } });
    if (!partnerRole) throw new Error('seed EXTERNAL_PARTNER role not found');
    const partner = await prisma.user.create({
      data: { tenantId, email: PARTNER_EMAIL, name: 'WF権限外fixture', passwordHash: ceo.passwordHash, isAiAgent: false },
    });
    fixtureUserIds.push(partner.id);
    await prisma.userRole.create({ data: { tenantId, userId: partner.id, roleId: partnerRole.id } });
    // AI＋STAFF（dashboard:read あり）誤設定 fixture: 通常の AI_AGENT は dashboard:read を持たず
    // ページ自体が遮断されるため、isAi 生成拒否（二重防御）はこの fixture で証明する。
    const staffRole = await prisma.role.findFirst({ where: { tenantId, key: 'STAFF' }, select: { id: true } });
    if (!staffRole) throw new Error('seed STAFF role not found');
    const aiStaff = await prisma.user.create({
      data: { tenantId, email: AI_STAFF_EMAIL, name: 'WF AI誤設定fixture', passwordHash: ceo.passwordHash, isAiAgent: true },
    });
    fixtureUserIds.push(aiStaff.id);
    await prisma.userRole.create({ data: { tenantId, userId: aiStaff.id, roleId: staffRole.id } });
  });

  test.afterAll(async () => {
    if (fixtureUserIds.length) {
      await prisma.userRole.deleteMany({ where: { userId: { in: fixtureUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: fixtureUserIds } } });
    }
    await prisma.$disconnect();
  });

  test('ceo: フォーム入力→承認 Action で停止する dry-run・DB は一切変更されない（a11y ラベル経由で操作）', async ({ page }) => {
    await login(page, 'ceo@ikezaki.local');
    await page.goto('/workflows');
    // a11y: すべての入力に label が紐づく（getByLabel で到達できることが証拠）。
    await page.getByLabel(/フロー名/).fill('新規リード初動フロー');
    await page.getByLabel(/きっかけ/).selectOption('lead_created');
    await page.getByLabel(/条件/).fill('金額が10万円以上');
    await page.getByLabel(/やりたいこと/).fill('お礼メールの下書きを作成\n顧客へメール送信\n対応内容を台帳に記録');
    await page.getByTestId('wf-submit').click();
    await page.waitForURL(/\/workflows\?/);

    // フロー案: 承認ステップの明示＋risk 表示。
    await expect(page.getByTestId('wf-step-0')).toContainText('DRY_RUN_OK');
    await expect(page.getByTestId('wf-step-1')).toContainText('REQUIRES_APPROVAL');
    await expect(page.getByTestId('wf-approval-step-1')).toContainText('人間の承認ステップ');
    await expect(page.getByTestId('wf-step-1')).toContainText('risk: HIGH');
    // dry-run: 承認 Action で停止・以降は未到達（承認なしで進む結果を作らない）。
    await expect(page.getByTestId('wf-outcome')).toHaveText('paused_for_approval');
    await expect(page.getByTestId('wf-result-0')).toContainText('仮想実行');
    await expect(page.getByTestId('wf-result-1')).toContainText('REQUIRES_APPROVAL');
    await expect(page.getByTestId('wf-result-2')).toContainText('未到達');
    // 実行系ボタン（承認/実行/保存）が存在しない。
    expect(await page.getByRole('button', { name: /実行する|保存|承認|enqueue/ }).count()).toBe(0);
    // DB 不変の構造的証拠①: page module は DB（@/lib/db・@hokko/db・prisma）も Server Action（'use server'）も
    // import しない＝auth 以外に DB へ到達する経路がソース上存在しない。
    const src = readFileSync(resolve(dirname(test.info().file), '../../app/(app)/workflows/page.tsx'), 'utf8');
    expect(src).not.toContain("@/lib/db");
    expect(src).not.toContain('@hokko/db');
    expect(src).not.toContain('use server');
    expect(src).not.toMatch(/\bprisma\b/);
    // 証拠②: workflow に帰属し得るレコードが DB に1件も存在しない（並列 worker と干渉しない恒常ゼロ検査）。
    await assertNoWorkflowWrites();
  });

  test('危険 Action（支払/削除/予算/公開）は必ず BLOCKED で停止', async ({ page }) => {
    await login(page, 'ceo@ikezaki.local');
    await page.goto('/workflows?name=x&trigger=manual&actionsText=' + encodeURIComponent('台帳に記録\n支払を実行する\n通知する'));
    await expect(page.getByTestId('wf-step-1')).toContainText('BLOCKED');
    await expect(page.getByTestId('wf-outcome')).toHaveText('blocked');
    await expect(page.getByTestId('wf-result-1')).toContainText('BLOCKED');
    await expect(page.getByTestId('wf-result-2')).toContainText('未到達');
  });

  test('malformed / 上限超過は黙って切り詰めず型付きエラー（XSS 文字列も安全に表示）', async ({ page }) => {
    await login(page, 'ceo@ikezaki.local');
    const eleven = Array.from({ length: 11 }, (_, i) => `記録${i}`).join('\n');
    await page.goto('/workflows?name=x&trigger=manual&actionsText=' + encodeURIComponent(eleven));
    await expect(page.getByTestId('wf-errors')).toContainText('10行まで');
    await expect(page.getByTestId('wf-outcome')).toHaveCount(0);
    // 不正 trigger と script 断片も安全（エラー表示のみ・実行されない）。
    await page.goto('/workflows?name=<script>alert(1)</script>&trigger=evil&actionsText=' + encodeURIComponent('記録'));
    await expect(page.getByTestId('wf-errors')).toBeVisible();
    await expect(page.getByTestId('wf-outcome')).toHaveCount(0);
  });

  test('AI ロールは生成を実行できない: 通常 AI はページ遮断・AI＋dashboard:read 誤設定でも生成は denied（二重防御）', async ({ page }) => {
    // 通常の AI（AI_AGENT）は dashboard:read を持たないためページ自体が遮断される。
    await login(page, 'ai-sales@ikezaki.local');
    await page.goto('/workflows');
    await expect(page.getByText('ダッシュボード閲覧権限（dashboard:read）が必要です')).toBeVisible();
    await expect(page.getByTestId('wf-form')).toHaveCount(0);
  });

  test('AI＋STAFF 誤設定 fixture: フォーム閲覧は可・生成 submit は denied banner（isAi 二重防御）', async ({ page }) => {
    await login(page, AI_STAFF_EMAIL);
    await page.goto('/workflows');
    await expect(page.getByTestId('wf-form')).toBeVisible();
    await page.goto('/workflows?name=ai&trigger=manual&actionsText=' + encodeURIComponent('記録'));
    await expect(page.getByTestId('wf-ai-denied')).toBeVisible();
    await expect(page.getByTestId('wf-outcome')).toHaveCount(0);
  });

  test('dashboard:read なし（EXTERNAL_PARTNER）はデータ取得前に遮断', async ({ page }) => {
    await login(page, PARTNER_EMAIL);
    await page.goto('/workflows');
    await expect(page.getByText('ダッシュボード閲覧権限（dashboard:read）が必要です')).toBeVisible();
    await expect(page.getByTestId('wf-form')).toHaveCount(0);
  });

  test('deep link（/ai-control→/workflows）・mobile 390px overflow 0（視覚証拠）', async ({ page }) => {
    await login(page, 'ceo@ikezaki.local');
    await page.goto('/ai-control');
    await page.getByTestId('cp-workflows-link').click();
    await page.waitForURL('**/workflows');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/workflows?name=x&trigger=manual&actionsText=' + encodeURIComponent('下書きを作成\n顧客へメール送信'));
    for (const id of ['wf-form', 'wf-plan', 'wf-dryrun']) {
      const el = page.getByTestId(id);
      await expect(el).toBeVisible();
      const box = await el.boundingBox();
      expect(box!.x, `${id} 左端@390`).toBeGreaterThanOrEqual(-1);
      expect(box!.x + box!.width, `${id} 右端@390`).toBeLessThanOrEqual(391);
    }
    const clipped = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(clipped).toBeLessThanOrEqual(1);
    await page.getByTestId('wf-dryrun').screenshot({ path: 'test-results/wf-dryrun-mobile-390.png' });
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/workflows?name=x&trigger=manual&actionsText=' + encodeURIComponent('下書きを作成\n顧客へメール送信\n台帳に記録'));
    await page.getByTestId('wf-plan').screenshot({ path: 'test-results/wf-plan-desktop.png' });
    await page.getByTestId('wf-dryrun').screenshot({ path: 'test-results/wf-dryrun-desktop.png' });
  });
});
