import { test, expect, type Page } from '@playwright/test';

// 追客（フォローアップ）ボード（M3 薄い縦切り）の描画スモーク。
// 送信済みで未反応（SENT/OPENED/CLICKED）リードの追客ビュー。read-only の集計＋既存 action の再利用のため、
// ここでは「ページが実行時エラーなく描画され、見出しとサマリータイルが出る」ことを seed 非依存で確認する
// （CI の既存 e2e は本ページを訪れないため、runtime render 崩れの取りこぼしを塞ぐ最小スモーク）。

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

test('社長は追客ボードを開ける（見出し＋サマリータイルが描画される）', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/leadmap/followup');
  await expect(page.getByRole('heading', { name: '追客ボード' })).toBeVisible();
  // サマリータイルはデータの有無に依らず常に描画される（seed 非依存の安定アサーション）。
  await expect(page.getByText('追客対象')).toBeVisible();
  await expect(page.getByText('本日接触')).toBeVisible();
});
