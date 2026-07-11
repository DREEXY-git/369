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

test('v6.4 モバイルドロワーは viewport 全高で、深い導線までスクロール・クリックできる（portal）', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'メニューを開く' }).click();
  const drawer = page.getByTestId('mobile-nav-drawer');
  await expect(drawer).toBeVisible();
  const links = drawer.getByTestId('mobile-nav-link');
  await expect(links).toHaveCount(67);
  const hrefs = await links.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-nav-href')));
  expect(new Set(hrefs).size).toBe(67);
  // backdrop-blur の containing block に閉じ込められていないこと＝drawer 高さが viewport 相当。
  const box = (await drawer.boundingBox())!;
  expect(box.height, 'drawer height').toBeGreaterThan(700);
  // 先頭導線と、最下部グループの導線（Operations実行）の両方へ到達できる。
  await expect(drawer.getByRole('link', { name: 'ダッシュボード', exact: true })).toBeVisible();
  const deep = drawer.getByRole('link', { name: 'Operations実行' });
  await deep.scrollIntoViewIfNeeded();
  await expect(deep).toBeVisible();
  // 深い導線をクリックして遷移できる。
  await deep.click();
  await page.waitForURL('**/admin/operations-actions');
  // 再度開いて Escape で閉じる。
  await page.getByRole('button', { name: 'メニューを開く' }).click();
  await expect(page.getByTestId('mobile-nav-drawer')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('mobile-nav-drawer')).toHaveCount(0);
  // オーバーレイクリックでも閉じる（透明層が drawer を塞ぐ/閉じない回帰を防止）。
  await page.getByRole('button', { name: 'メニューを開く' }).click();
  await expect(page.getByTestId('mobile-nav-overlay')).toBeVisible();
  await page.getByTestId('mobile-nav-overlay').click({ position: { x: 350, y: 100 } });
  await expect(page.getByTestId('mobile-nav-drawer')).toHaveCount(0);
});

test('モバイルドロワーでも担当者に承認待ちリンクが出ない（Sidebar と同一フィルタ）', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 'sales@ikezaki.local');
  await page.getByRole('button', { name: 'メニューを開く' }).click();
  const drawer = page.getByTestId('mobile-nav-drawer');
  await expect(drawer.getByRole('link', { name: '顧客CRM' })).toBeVisible();
  await expect(drawer.getByRole('link', { name: '承認待ち' })).toHaveCount(0);
});
