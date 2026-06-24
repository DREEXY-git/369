import { test, expect, type Page } from '@playwright/test';

// Finance Bridge e2e（Phase 1-8）。
// 前提: pnpm db:seed 済み + pnpm start。初回は npx playwright install chromium。
// 本サンドボックスではブラウザDL不可のため、実環境/CIで実行する。

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

test('Finance Bridge ダッシュボードが表示される', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/finance/bridge');
  await expect(page.getByRole('heading', { name: /Finance Bridge/ })).toBeVisible();
  await expect(page.getByText('FinanceEvent', { exact: false })).toBeVisible();
});

test('イベント案件からFinanceブリッジを作成できる', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/finance/bridge');
  // 最初のイベント案件を選択してブリッジ
  await page.locator('select[name="eventId"]').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'ブリッジ' }).first().click();
  await page.waitForURL('**/finance/bridge**');
  await expect(page.getByText('Financeへブリッジしました', { exact: false })).toBeVisible();
});

test('仕訳候補・請求候補一覧が表示される', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/finance/journal-candidates');
  await expect(page.getByRole('heading', { name: /仕訳候補/ })).toBeVisible();
  await page.goto('/finance/invoice-candidates');
  await expect(page.getByRole('heading', { name: /請求候補/ })).toBeVisible();
});

test('スタッフは仕訳候補・原価・粗利の機密を閲覧できない', async ({ page }) => {
  await login(page, 'sales@ikezaki.local');
  await page.goto('/finance/bridge');
  await expect(page.getByText('財務閲覧権限が必要です', { exact: false })).toBeVisible();
  await page.goto('/finance/journal-candidates');
  await expect(page.getByText('財務閲覧権限が必要です', { exact: false })).toBeVisible();
});

test('Operations承認済み実行に棚卸・発注が統合されている', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/admin/operations-actions');
  await expect(page.getByRole('heading', { name: /Operations 承認済み実行/ })).toBeVisible();
});
