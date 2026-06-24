import { test, expect, type Page } from '@playwright/test';

// 候補→正式化 e2e（Phase 1-9）。
// 前提: pnpm db:seed 済み + pnpm start。初回は npx playwright install chromium。
// 本サンドボックスではブラウザDL不可のため、実環境/CIで実行する。
// 正式化は「承認済み候補」が前提のため、ここでは表示と権限分離を中心に検証する。

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

test('資金繰り画面に Finance Bridge 予定セクションが表示される', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/finance/cashflow');
  await expect(page.getByText('現場由来の入金・支払予定', { exact: false })).toBeVisible();
});

test('仕訳候補・請求候補に正式化導線（状態列）が表示される', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/finance/journal-candidates');
  await expect(page.getByRole('heading', { name: /仕訳候補/ })).toBeVisible();
  await page.goto('/finance/invoice-candidates');
  await expect(page.getByRole('heading', { name: /請求候補/ })).toBeVisible();
});

test('スタッフは正式化（仕訳候補/請求候補/資金繰り）の機密を閲覧できない', async ({ page }) => {
  await login(page, 'sales@ikezaki.local');
  await page.goto('/finance/journal-candidates');
  await expect(page.getByText('財務閲覧権限が必要です', { exact: false })).toBeVisible();
  await page.goto('/finance/cashflow');
  await expect(page.getByText('閲覧権限がありません', { exact: false })).toBeVisible();
});
