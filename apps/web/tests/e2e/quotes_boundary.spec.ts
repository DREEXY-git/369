import { test, expect, type Page } from '@playwright/test';

// 見積・請求・印刷画面の閲覧境界（WIP-4・roadmap65）。
// 見積の金額・粗利は quote:read 配下の業務データ（STAFF の値引き・見積業務フロー）。
// 請求は FINANCIAL_CONFIDENTIAL の ABAC を fetch 前に判定する（印刷画面も同様）。
// アサーションは件数・金額の値に依存しない。

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

test('社長は見積一覧→詳細→印刷画面を閲覧できる', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/quotes');
  await expect(page.getByRole('heading', { name: '見積管理' })).toBeVisible();
  await page.getByRole('link', { name: /Q-/ }).first().click();
  await page.waitForURL(/\/quotes\/(?!new(?:[/?#]|$))[^/?#]+$/);
  // 原価列（quote:read 配下の業務データ）と粗利 Stat が表示される。
  await expect(page.getByRole('columnheader', { name: '原価', exact: true })).toBeVisible();
  await expect(page.getByText('粗利率').first()).toBeVisible();
  // 印刷画面（同じ quote:read ゲート）も表示される。
  const quoteId = page.url().split('/quotes/')[1]!.split(/[/?#]/)[0]!;
  await page.goto(`/print/quotes/${quoteId}`);
  await expect(page.getByRole('heading', { name: '御 見 積 書' })).toBeVisible();
});

test('担当者も見積一覧・詳細を閲覧できる（quote:read の業務フロー回帰）', async ({ page }) => {
  await login(page, 'sales@ikezaki.local');
  await page.goto('/quotes');
  await expect(page.getByRole('heading', { name: '見積管理' })).toBeVisible();
  await expect(page.getByText('この情報の閲覧は許可されていません')).toHaveCount(0);
  await page.getByRole('link', { name: /Q-/ }).first().click();
  await page.waitForURL(/\/quotes\/(?!new(?:[/?#]|$))[^/?#]+$/);
  await expect(page.getByText('粗利率').first()).toBeVisible();
});

test('担当者は請求詳細・請求書印刷を fetch 前に拒否される（財務境界）', async ({ page }) => {
  // 社長で実在する請求 ID を取得してから、担当者で直接 URL を叩く（存在するのに見えないことの検証）。
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/invoices');
  await page.getByRole('link', { name: /INV-/ }).first().click();
  await page.waitForURL('**/invoices/**');
  const invoiceId = page.url().split('/invoices/')[1]!.split(/[/?#]/)[0]!;
  await page.context().clearCookies();

  await login(page, 'sales@ikezaki.local');
  await page.goto(`/invoices/${invoiceId}`);
  await expect(page.getByText('この情報の閲覧は許可されていません').first()).toBeVisible();
  // 金額（合計/未収 Stat）は描画されない。
  await expect(page.getByText('合計(税込)')).toHaveCount(0);
  // 印刷画面も同じ ABAC で拒否される。
  await page.goto(`/print/invoices/${invoiceId}`);
  await expect(page.getByText('この情報の閲覧は許可されていません').first()).toBeVisible();
  await expect(page.getByText('ご請求金額（税込）')).toHaveCount(0);
  // 実在しない ID でも同一の拒否表示（拒否閲覧者に ID の存在有無を返さない＝存在オラクルなし）。
  await page.goto('/invoices/nonexistent-invoice-id');
  await expect(page.getByText('この情報の閲覧は許可されていません').first()).toBeVisible();
});
