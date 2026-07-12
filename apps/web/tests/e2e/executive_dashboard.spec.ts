import { test, expect, type Page } from '@playwright/test';

// Golden Path KPI Executive Dashboard e2e（Phase 1-12）。
// 前提: pnpm db:seed 済み + pnpm start。初回は npx playwright install chromium。
// 本サンドボックスではブラウザDL不可のため、実環境/CIで実行する（spec のみ作成）。

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

test('社長コックピットに Golden Path 経営KPI と「今すぐ見るべき案件」が表示される', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/dashboard/ceo');
  // 既存 Deal 中心 KPI（壊していないこと）
  await expect(page.getByRole('heading', { name: '社長コックピット' })).toBeVisible();
  // 追加した Golden Path 経営KPI セクション
  await expect(page.getByText('プランニングホッコー Golden Path', { exact: false })).toBeVisible();
  await expect(page.getByText('今すぐ見るべき案件', { exact: false })).toBeVisible();
  await expect(page.getByText('平均進捗', { exact: false })).toBeVisible();
  // OWNER は金額 KPI が見える
  await expect(page.getByText('未回収額', { exact: false })).toBeVisible();
});

test('プランニングホッコー画面に平均進捗・次の一手・今すぐ見るべき案件が表示される', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/planning-hokko');
  await expect(page.getByText('平均進捗', { exact: false })).toBeVisible();
  await expect(page.getByText('今すぐ見るべき案件', { exact: false })).toBeVisible();
  // 案件カードに「次の一手」または「Golden Path 完了」が出る
  await expect(page.getByText(/次の一手|Golden Path 完了/).first()).toBeVisible();
});

test('案件詳細から経営ダッシュボードへ戻る導線がある', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/planning-hokko');
  await page.getByRole('link', { name: /案件詳細・次の一手/ }).first().click();
  await page.waitForURL('**/operations/events/**');
  await expect(page.getByText('経営ダッシュボードで全体を見る', { exact: false })).toBeVisible();
  await expect(page.getByRole('link', { name: 'プランニングホッコー →' })).toBeVisible();
  await expect(page.getByRole('link', { name: '社長コックピット →' })).toBeVisible();
});

test('スタッフは経営KPIの金額（売上/粗利/未回収）を閲覧できない', async ({ page }) => {
  await login(page, 'sales@ikezaki.local');
  await page.goto('/planning-hokko');
  // 進捗・リスク等の業務KPIは見えるが、金額KPIは redact 済みで権限ノートが出る
  await expect(page.getByText('平均進捗', { exact: false })).toBeVisible();
  await expect(page.getByText('金額 KPI は財務閲覧権限が必要', { exact: false })).toBeVisible();
  // 案件カードの金額も非表示
  await expect(page.getByText('金額（売上・原価・粗利）は財務閲覧権限が必要', { exact: false }).first()).toBeVisible();
});
