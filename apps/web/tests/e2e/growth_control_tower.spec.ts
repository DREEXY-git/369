import { test, expect, type Page } from '@playwright/test';

// AI Growth Opportunity Control Tower v0（P3-CT-1）e2e。read-only smoke ＋ redaction。
// 前提: pnpm db:seed 済み + pnpm start。CI（stage3_e2e）で実行される。
// 目的:
//  - 社長（財務権限あり）は /growth/control-tower の成長機会カードを閲覧できる。
//  - 担当者（財務権限なし）には finance 系カードの金額実値が出ず redaction/件数中心になる。

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

test('社長は Control Tower で成長機会カードを閲覧できる', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/growth/control-tower');
  await expect(page.getByRole('heading', { name: 'AI Growth Opportunity Control Tower' })).toBeVisible();
  // 主要カード見出しが表示される（read-only 集約）。
  await expect(page.getByRole('heading', { name: '社長が見るべき成長機会' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '未追客リード' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '未回収リスク' })).toBeVisible();
  // 財務権限があるので「財務表示: 表示可」。
  await expect(page.getByText('表示可', { exact: false })).toBeVisible();
});

test('担当者（財務権限なし）は Control Tower で finance 系の実値を見られない', async ({ page }) => {
  await login(page, 'sales@ikezaki.local');
  await page.goto('/growth/control-tower');
  // ページ自体は閲覧できる（read-only）。
  await expect(page.getByRole('heading', { name: 'AI Growth Opportunity Control Tower' })).toBeVisible();
  // finance 系カード（未回収リスク）は redaction 表示になり、原価・粗利の実値が出ない。
  await expect(page.getByRole('heading', { name: '未回収リスク' })).toBeVisible();
  await expect(page.getByText('原価・粗利は財務閲覧権限が必要です', { exact: false })).toBeVisible();
  // 財務表示は「非表示」（canViewFinance=false）。
  await expect(page.getByText('非表示', { exact: false })).toBeVisible();
  // 非 finance カードは通常どおり見える。
  await expect(page.getByRole('heading', { name: '未追客リード' })).toBeVisible();
});
