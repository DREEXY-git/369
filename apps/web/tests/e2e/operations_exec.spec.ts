import { test, expect, type Page } from '@playwright/test';

// Operations 実行管理 e2e（Phase 1-7）。
// 前提: pnpm db:seed 済み + pnpm start。初回は npx playwright install chromium。
// 本サンドボックスではブラウザDL不可のため、実環境/CIで実行する。

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

test('棚卸ページが表示される', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/operations/stocktakes');
  await expect(page.getByRole('heading', { name: '棚卸（実地在庫照合）' })).toBeVisible();
});

test('発注管理ページが表示される', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/operations/purchase-orders');
  await expect(page.getByRole('heading', { name: /発注管理/ })).toBeVisible();
});

test('配送・設営・回収ページが表示される', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/operations/logistics');
  await expect(page.getByRole('heading', { name: /配送・設営・撤去・回収/ })).toBeVisible();
});

test('Operations 承認済み実行ページが表示される', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/admin/operations-actions');
  await expect(page.getByRole('heading', { name: /Operations 承認済み実行/ })).toBeVisible();
});

test('イベント詳細に人員・リスク・物流が表示される', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/operations/events/new');
  await page.locator('input[name="name"]').fill('E2E実行テスト案件');
  await page.getByRole('button', { name: '案件を作成' }).click();
  await page.waitForURL('**/operations/events/**');
  await expect(page.getByRole('heading', { name: /人員配置/ }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: /リスク/ }).first()).toBeVisible();
  await expect(page.getByText('物流タスク', { exact: false })).toBeVisible();
});

test('スタッフは発注金額・単価の機密を閲覧できない', async ({ page }) => {
  await login(page, 'sales@ikezaki.local');
  await page.goto('/operations/purchase-orders');
  // 金額カラムは財務閲覧権限が無いと表示されない
  await expect(page.getByRole('columnheader', { name: '金額' })).toHaveCount(0);
});
