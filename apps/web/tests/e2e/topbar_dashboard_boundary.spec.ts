import { test, expect, type Page } from '@playwright/test';

// Topbar の承認待ちバッジと /dashboard のページ基礎権限（WIP-5・roadmap66）。
// 承認待ち件数はテナント全体の承認業務の存在シグナルのため、approval:read / approval:approve
// 保持者にのみ取得・表示する。アサーションは件数の値に依存しない。

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

test('社長のトップバーには承認待ちの入口が表示される', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  // ヘッダー（Topbar）内の /approvals 入口（サイドバーのナビリンクとは区別する）。
  await expect(page.locator('header a[href="/approvals"]')).toBeVisible();
});

test('担当者のトップバーには承認待ちの入口が表示されない（承認権限なし）', async ({ page }) => {
  await login(page, 'sales@ikezaki.local');
  // ダッシュボード自体は閲覧できる（dashboard:read の回帰）。
  await expect(page.getByText('としてログイン中')).toBeVisible();
  // Topbar の承認入口・件数バッジは出ない（DB クエリ段階でも件数を取得しない実装）。
  await expect(page.locator('header a[href="/approvals"]')).toHaveCount(0);
});
