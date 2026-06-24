import { test, expect, type Page } from '@playwright/test';

// Golden Path Action Deep Links e2e（Phase 1-13）。
// 前提: pnpm db:seed 済み + pnpm start。初回は npx playwright install chromium。
// 本サンドボックスではブラウザDL不可のため、実環境/CIで実行する（spec のみ作成）。

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

test('社長は「今すぐ見るべき案件」に是正アクション（対処）が表示される', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/dashboard/ceo');
  await expect(page.getByText('今すぐ見るべき案件', { exact: false })).toBeVisible();
  // 是正アクションの導線ラベル
  await expect(page.getByText('対処:', { exact: false }).first()).toBeVisible();
});

test('高リスク案件の「リスクを確認」から案件詳細のリスク欄(#risks)へ飛べる', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/planning-hokko');
  const riskAction = page.getByRole('link', { name: /リスクを確認/ }).first();
  if (await riskAction.count()) {
    await riskAction.click();
    await expect(page).toHaveURL(/\/operations\/events\/.*#risks/);
    await expect(page.getByRole('heading', { name: /リスク/ })).toBeVisible();
  }
});

test('低粗利案件の「原価・売上を確認」から案件詳細の財務サマリー(#finance-summary)へ飛べる', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/planning-hokko');
  const marginAction = page.getByRole('link', { name: /原価・売上を確認/ }).first();
  if (await marginAction.count()) {
    await marginAction.click();
    await expect(page).toHaveURL(/\/operations\/events\/.*#finance-summary/);
  }
});

test('スタッフには finance 系の是正アクション（請求書/原価売上）が表示されない', async ({ page }) => {
  await login(page, 'sales@ikezaki.local');
  await page.goto('/planning-hokko');
  // finance 系アクションは redact + visible フィルタで非表示
  await expect(page.getByRole('link', { name: /請求書・入金状況を確認/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /入金記録へ/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /原価・売上を確認/ })).toHaveCount(0);
  // 非 finance（リスク/物流/承認）は出てよい
  await expect(page.getByText('平均進捗', { exact: false })).toBeVisible();
});
