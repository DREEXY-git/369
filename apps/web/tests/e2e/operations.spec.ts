import { test, expect, type Page } from '@playwright/test';

// Operations OS e2e（Phase 1-6）。
// 前提: pnpm db:seed 済み + pnpm start。初回は npx playwright install chromium。
// 本サンドボックスではブラウザDL不可のため、実環境/CIで実行する。

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

test('Operations ダッシュボードが表示される', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/operations');
  await expect(page.getByRole('heading', { name: /経営資産ダッシュボード/ })).toBeVisible();
  await expect(page.getByText('在庫資産')).toBeVisible();
});

test('イベント案件を作成できる', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/operations/events/new');
  await page.locator('input[name="name"]').fill('E2Eテスト案件');
  await page.locator('input[name="revenue"]').fill('800000');
  await page.getByRole('button', { name: '案件を作成' }).click();
  await page.waitForURL('**/operations/events/**');
  await expect(page.getByRole('heading', { name: 'E2Eテスト案件' })).toBeVisible();
  // 社長は粗利サマリーを閲覧できる
  await expect(page.getByText('粗利率').first()).toBeVisible();
});

test('在庫移動を記録できる', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/operations/inventory-movements/new');
  await page.locator('select[name="assetId"]').first().selectOption({ index: 1 });
  await page.locator('select[name="type"]').selectOption('receive');
  await page.getByRole('button', { name: '記録する' }).click();
  await page.waitForURL('**/operations/inventory-movements**');
  await expect(page.getByRole('heading', { name: /在庫移動台帳/ })).toBeVisible();
});

test('スタッフはイベント原価・粗利の機密情報を閲覧できない', async ({ page }) => {
  // まず社長が案件を作成
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/operations/events/new');
  await page.locator('input[name="name"]').fill('機密ガード案件');
  await page.locator('input[name="revenue"]').fill('500000');
  await Promise.all([
    page.waitForURL(/\/operations\/events\/(?!new(?:[/?#]|$))[^/?#]+/),
    page.getByRole('button', { name: '案件を作成' }).click(),
  ]);
  const url = page.url();

  // スタッフでログインし直し、同じ案件を開く
  await page.goto('/login');
  await login(page, 'sales@ikezaki.local');
  await page.goto(url);
  await expect(page.getByText('原価・粗利は財務閲覧権限が必要です', { exact: false })).toBeVisible();
});
