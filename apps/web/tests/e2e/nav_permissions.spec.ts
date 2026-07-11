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
});

test('モバイルドロワーでも担当者に承認待ちリンクが出ない（Sidebar と同一フィルタ）', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 'sales@ikezaki.local');
  await page.getByRole('button', { name: 'メニューを開く' }).click();
  const drawer = page.getByTestId('mobile-nav-drawer');
  await expect(drawer.getByRole('link', { name: '顧客CRM' })).toBeVisible();
  await expect(drawer.getByRole('link', { name: '承認待ち' })).toHaveCount(0);
});

// v6.4 WIP-4: モバイルドロワーの受入（67導線の DOM 描画・overlay クリックで閉じる・背景スクロール復元・
// focus/aria・role=dialog）。desktop 非退行は上の Sidebar テスト群が担保。
test('v6.4 モバイルドロワー受入: 67導線 DOM 描画・overlay close・背景復元・focus/aria', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/dashboard');

  const trigger = page.getByRole('button', { name: 'メニューを開く' });
  await trigger.click();
  const drawer = page.getByTestId('mobile-nav-drawer');
  await expect(drawer).toBeVisible();

  // role/aria: dialog + modal。トリガーの aria-expanded が開に反応。
  await expect(drawer).toHaveAttribute('role', 'dialog');
  await expect(drawer).toHaveAttribute('aria-modal', 'true');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');

  // OWNER は 67 導線すべてが DOM に描画される（表示は overflow scroll 内・スクロールで到達可能）。
  await expect(drawer.getByRole('link')).toHaveCount(67);

  // 開いている間は背面（body）スクロールが止まる。
  const overflowOpen = await page.evaluate(() => getComputedStyle(document.body).overflow);
  expect(overflowOpen).toBe('hidden');

  // 初期フォーカスは drawer 内（閉じるボタン）へ移っている。
  await expect(page.getByRole('button', { name: '閉じる' })).toBeFocused();

  // overlay（drawer 外の暗幕）クリックで閉じる。
  const portal = page.getByTestId('mobile-nav-portal');
  await portal.click({ position: { x: 360, y: 700 } }); // drawer(幅~72=288px)外の右下
  await expect(page.getByTestId('mobile-nav-drawer')).toHaveCount(0);

  // 閉じた後: 背景スクロール復元・フォーカスがトリガーへ戻る・aria-expanded=false。
  const overflowClosed = await page.evaluate(() => getComputedStyle(document.body).overflow);
  expect(overflowClosed).not.toBe('hidden');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
});
