import { test, expect, type Page } from '@playwright/test';

// ナビ権限フィルタ（Phase 4 Stream B2・roadmap74 §9）。
// 開けないページ（取得前の全ページ拒否ゲートあり）へのリンクをサイドバー/モバイルドロワーに出さない。
// これは行き止まり導線をなくす UX 検証であり、境界の正は各ページ側のゲート（既存 boundary spec）にある。
// sales = STAFF（approval:approve / finance:read なし）、ceo = OWNER（全権限）。

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

test('担当者のサイドバーには承認待ち・財務サマリーのリンクが表示されない（権限フィルタ）', async ({ page }) => {
  await login(page, 'sales@ikezaki.local');
  const aside = page.locator('aside');
  // 肯定アサーション: フィルタが nav 全体を壊していない（STAFF が開けるリンクは残る）。
  await expect(aside.getByRole('link', { name: '顧客CRM' })).toBeVisible();
  await expect(aside.getByRole('link', { name: 'ダッシュボード', exact: true })).toBeVisible();
  // STAFF は approval:approve / finance:read を持たない → 開けないページのリンクは出さない。
  await expect(aside.getByRole('link', { name: '承認待ち' })).toHaveCount(0);
  await expect(aside.getByRole('link', { name: '財務サマリー' })).toHaveCount(0);
});

test('社長のサイドバーには承認待ち・財務サマリーのリンクが表示される（回帰）', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  const aside = page.locator('aside');
  await expect(aside.getByRole('link', { name: '承認待ち' })).toBeVisible();
  await expect(aside.getByRole('link', { name: '財務サマリー' })).toBeVisible();
});

test('社長のサイドバーに復旧4導線が表示される（v6.1 多機能復旧の回帰）', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  const aside = page.locator('aside');
  // main(63) には無く integration(67) で追加された4導線が OWNER のナビに存在する。
  await expect(aside.getByRole('link', { name: 'Growthコントロールタワー' })).toBeVisible();
  await expect(aside.getByRole('link', { name: '広告・チャネル分析' })).toBeVisible();
  await expect(aside.getByRole('link', { name: 'SEO・コンテンツ' })).toBeVisible();
  await expect(aside.getByRole('link', { name: '3Dバーチャルオフィス' })).toBeVisible();
});

test('モバイルドロワーでも担当者に承認待ちリンクが出ない（Sidebar と同一フィルタ）', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 'sales@ikezaki.local');
  await page.getByRole('button', { name: 'メニューを開く' }).click();
  const drawer = page.getByTestId('mobile-nav-drawer');
  await expect(drawer.getByRole('link', { name: '顧客CRM' })).toBeVisible();
  await expect(drawer.getByRole('link', { name: '承認待ち' })).toHaveCount(0);
});
