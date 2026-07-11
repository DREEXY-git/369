import { test, expect, type Page } from '@playwright/test';

// C19 Ads Management read model（Phase 3.5 Stream A・roadmap70）。
// 外部連携は封印中・AI は下書きまで。seed には channel='ads' のキャンペーン1件＋実績1件がある。

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

test('社長は広告分析の状態盤と封印中表示を閲覧できる', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/marketing/ads');
  await expect(page.getByRole('heading', { name: '広告・チャネル分析（read-only）' })).toBeVisible();
  // チャネル状態盤: 既知6チャネル分の行（外部連携はすべて封印中）。
  await expect(page.getByText('封印中').first()).toBeVisible();
  await expect(page.getByText('広告（Ads）')).toBeVisible();
  // seed の ads キャンペーンは実績記録があるので「記録あり」、seo は記録がなく「未接続」。
  await expect(page.getByText('記録あり').first()).toBeVisible();
  await expect(page.getByText('未接続').first()).toBeVisible();
});

test('社長は広告改善案の下書きを生成でき、根拠・データ不足・人間確認が表示される', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/marketing/ads');
  await page.getByTestId('ads-generate-draft').first().click();
  await page.waitForURL('**/marketing/ads?generated=1');
  await expect(page.getByText('改善案の下書きを生成しました（実行はされません）。')).toBeVisible();
  const card = page.getByTestId('ads-draft-card').first();
  await expect(card).toBeVisible();
  await expect(card.getByText(/根拠:/)).toBeVisible();
  await expect(card.getByText(/次の人間確認:/)).toBeVisible();
  await expect(card.getByText(/封印中/)).toBeVisible();
});

test('担当者も閲覧でき生成ボタンが表示され、金額は marketing ドメイン注記つきで表示される', async ({ page }) => {
  await login(page, 'sales@ikezaki.local');
  await page.goto('/marketing/ads');
  await expect(page.getByRole('heading', { name: '広告・チャネル分析（read-only）' })).toBeVisible();
  // 計画値/自己申告値の注記（会計実績と混同させない・roadmap70 §2 の境界判断）。
  await expect(page.getByText('会計実績ではありません')).toBeVisible();
  // STAFF は marketing:create 保持のため生成ボタンが見える（AI ロールには出さない実装）。
  await expect(page.getByTestId('ads-generate-draft').first()).toBeVisible();
});
