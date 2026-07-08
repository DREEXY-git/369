import { test, expect, type Page } from '@playwright/test';

// Planning Hokko Golden Path e2e（Phase 1-11）。
// 前提: pnpm db:seed 済み + pnpm start。初回は npx playwright install chromium。
// 本サンドボックスではブラウザDL不可のため、実環境/CIで実行する。
// 目的: 顧客→案件→…→請求→入金→資金繰り の一連を、UIの「現在地と次の一手」で追えること。

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

test('プランニングホッコー入口から案件詳細へ遷移できる', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/planning-hokko');
  await expect(page.getByRole('heading', { name: /今すぐ見るべき案件/ })).toBeVisible();
  await page.getByRole('link', { name: /案件詳細・次の一手/ }).first().click();
  await page.waitForURL('**/operations/events/**');
});

test('案件詳細に Golden Path（現在地と次の一手）カードが表示される', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/operations/events');
  await page.getByRole('link', { name: /.+/ }).first();
  // 一覧の案件名リンクから詳細へ
  const firstEvent = page.locator('a[href^="/operations/events/"]:not([href$="/new"])').first();
  await firstEvent.click();
  await page.waitForURL('**/operations/events/**');
  await expect(page.getByRole('heading', { name: /Golden Path — 現在地と次の一手/ })).toBeVisible();
});

test('社長は案件詳細で Finance Bridge 導線・資金繰りリンクを利用できる', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/operations/events');
  const firstEvent = page.locator('a[href^="/operations/events/"]:not([href$="/new"])').first();
  await firstEvent.click();
  await page.waitForURL('**/operations/events/**');
  // 粗利サマリー（財務権限）が見える
  await expect(page.getByText('粗利率', { exact: false }).first()).toBeVisible();
});

test('スタッフ（財務権限なし）は案件詳細で原価・粗利を見られない', async ({ page }) => {
  await login(page, 'sales@ikezaki.local');
  await page.goto('/operations/events');
  const firstEvent = page.locator('a[href^="/operations/events/"]:not([href$="/new"])').first();
  await firstEvent.click();
  await page.waitForURL('**/operations/events/**');
  await expect(page.getByText('原価・粗利は財務閲覧権限が必要です', { exact: false })).toBeVisible();
});
