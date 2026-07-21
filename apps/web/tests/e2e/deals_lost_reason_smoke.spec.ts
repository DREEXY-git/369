import { test, expect, type Page } from '@playwright/test';

// M3-3 失注理由（lostReason）の描画スモーク。案件一覧の「失注理由の傾向」集計カードと、
// 案件詳細のステージ変更フォームに失注理由セレクトが出ることを seed 非依存で確認する
// （集計カードは LOST 案件が無くても空状態で常に描画される安定アサーション）。CI の既存 e2e は
// この集計/セレクトを訪れないため、新クエリ・新フォーム要素の runtime 崩れを塞ぐ最小スモーク。

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

test('案件一覧に「失注理由の傾向」カードが描画される', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/deals');
  await expect(page.getByRole('heading', { name: '案件管理' })).toBeVisible();
  await expect(page.getByText('失注理由の傾向')).toBeVisible();
});

test('案件詳細のステージ変更フォームに失注理由セレクトが表示される', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/deals');
  // 一覧の先頭案件の詳細へ（tbody 内リンクに限定＝ヘッダの「カンバン表示」を拾わない）。
  await page.locator('tbody a[href^="/deals/"]').first().click();
  await page.waitForURL('**/deals/**');
  await expect(page.locator('select[name="lostReason"]')).toBeVisible();
});
