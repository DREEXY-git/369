import { test, expect, type Page } from '@playwright/test';

// /growth（Growth OS ダッシュボード）と /growth/events の財務情報境界（WIP-3・roadmap64）。
// 金額（売上インパクト・削減コスト換算・DX 推定金額・イベント別金額）は finance:read 保持者のみ。
// アサーションは件数・金額の値に依存しない（CI の実行順非依存）。

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

test('社長には /growth の金額集計が表示される', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/growth');
  await expect(page.getByRole('heading', { name: 'Growth OS — 成長ダッシュボード' })).toBeVisible();
  await expect(page.getByText('売上インパクト').first()).toBeVisible();
  await expect(page.getByText('削減コスト換算').first()).toBeVisible();
  // 台帳側も金額列が見える。
  await page.goto('/growth/events');
  await expect(page.getByRole('columnheader', { name: '売上影響' })).toBeVisible();
});

test('担当者には /growth の金額集計が表示されない（財務境界）', async ({ page }) => {
  await login(page, 'sales@ikezaki.local');
  await page.goto('/growth');
  // ページ自体は閲覧できる（dashboard:read）。
  await expect(page.getByRole('heading', { name: 'Growth OS — 成長ダッシュボード' })).toBeVisible();
  // 金額系の Stat・換算値は出ない（DB クエリ段階でも金額列を取得しない実装）。
  await expect(page.getByText('売上インパクト')).toHaveCount(0);
  await expect(page.getByText('削減コスト換算')).toHaveCount(0);
  // 代替表示（削減工数・権限案内）は出る。
  await expect(page.getByText('削減工数(30日)')).toBeVisible();
  await expect(page.getByText('金額の集計は財務閲覧権限のある人にのみ表示されます。').first()).toBeVisible();
});

test('担当者には /growth/events の金額列と finance カテゴリが表示されない', async ({ page }) => {
  await login(page, 'sales@ikezaki.local');
  await page.goto('/growth/events');
  await expect(page.getByRole('heading', { name: '成長イベント台帳（Growth Event Ledger）' })).toBeVisible();
  // 金額列（売上影響）は列ごと存在しない。
  await expect(page.getByRole('columnheader', { name: '売上影響' })).toHaveCount(0);
  // finance カテゴリの行は取得もされない（バッジ「財務」不在・cat=finance の直接指定も無効）。
  await expect(page.getByText('財務', { exact: true })).toHaveCount(0);
  await page.goto('/growth/events?cat=finance');
  await expect(page.getByText('財務', { exact: true })).toHaveCount(0);
});
