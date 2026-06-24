import { test, expect, type Page } from '@playwright/test';

// 請求送信ゲート + 入金消込 e2e（Phase 1-10）。
// 前提: pnpm db:seed 済み + pnpm start。初回は npx playwright install chromium。
// 本サンドボックスではブラウザDL不可のため、実環境/CIで実行する。

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

test('請求一覧→詳細で送信・入金カードが表示される', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/invoices');
  await expect(page.getByRole('heading', { name: /請求/ })).toBeVisible();
  // 最初の請求書詳細へ
  await page.getByRole('link', { name: /INV-/ }).first().click();
  await page.waitForURL('**/invoices/**');
  await expect(page.getByText('外部送信（承認必須）', { exact: false })).toBeVisible();
});

test('資金繰り画面に予定 vs 実績が表示される', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/finance/cashflow');
  await expect(page.getByText('資金繰り 予定 vs 実績', { exact: false })).toBeVisible();
  await expect(page.getByText('入金実績', { exact: false })).toBeVisible();
});

test('スタッフは請求金額・入金履歴・資金繰りを閲覧できない', async ({ page }) => {
  await login(page, 'sales@ikezaki.local');
  await page.goto('/finance/cashflow');
  await expect(page.getByText('閲覧権限がありません', { exact: false })).toBeVisible();
});
