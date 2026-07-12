import { test, expect, type Page } from '@playwright/test';

// CRM 閲覧境界（WIP1・roadmap61）e2e。
// 目的:
//  - 一覧・詳細の read ゲート＋二段階取得＋label クエリ除外の導入後も、権限のある閲覧が壊れていないこと（無回帰）。
//  - インサイト画面が page render で AI 生成（顧客名・履歴の LLM 送出）を行わないこと（未計測表示の恒久監視）。
// 未実施と理由: label 拒否・customer:read なしロールの負系は、seed の全顧客が label 未指定
// = CUSTOMER_CONFIDENTIAL（schema default・OWNER/STAFF/ADMIN の全ログインユーザーが閲覧可）で、
// 拒否を起こす CONFIDENTIAL/STRICT_SECRET 等の顧客・権限なしログインが seed に存在せず、
// seed 変更が禁止のため作成不能（roadmap61 §4/§8 に記録・純エンジン unit が代替）。

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

test('社長は顧客一覧から詳細へ遷移できる（二段階取得の無回帰）', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/customers');
  await expect(page.getByRole('heading', { name: '顧客管理 CRM' })).toBeVisible();
  // 一覧の先頭顧客から詳細へ（envelope→ABAC→本体取得の順でも正常表示されること）。
  const firstCustomer = page.locator('tbody tr').first().getByRole('link').first();
  const name = await firstCustomer.innerText();
  await firstCustomer.click();
  await expect(page.getByRole('heading', { name })).toBeVisible();
  await expect(page.getByText('機密ラベル').first()).toBeVisible();
});

test('担当者（STAFF）も NORMAL 顧客の一覧・詳細を閲覧できる（label クエリ除外の無回帰）', async ({ page }) => {
  await login(page, 'sales@ikezaki.local');
  await page.goto('/customers');
  await expect(page.getByRole('heading', { name: '顧客管理 CRM' })).toBeVisible();
  await expect(page.getByText('株式会社', { exact: false }).first()).toBeVisible();
  const firstCustomer = page.locator('tbody tr').first().getByRole('link').first();
  await firstCustomer.click();
  // 詳細が AccessDenied にならず表示される（seed 顧客は CUSTOMER_CONFIDENTIAL = STAFF 閲覧可）。
  await expect(page.getByText('機密ラベル').first()).toBeVisible();
});

test('インサイト画面は保存済みが無い顧客で「未計測」を表示し AI 生成を行わない', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  // 新規顧客を UI から作成（保存済みインサイトが存在しない顧客を用意する・seed 非依存）。
  await page.goto('/customers/new');
  await page.locator('input[name="name"]').fill('境界テスト株式会社');
  // waitForURL は現在 URL（/customers/new）がパターンに即時マッチすると redirect を待たずに
  // 解決するため、operations.spec.ts と同型の負先読み regex ＋ Promise.all で detail 遷移を待つ。
  await Promise.all([
    page.waitForURL(/\/customers\/(?!new(?:[/?#]|$))[^/?#]+$/),
    page.getByRole('button', { name: '登録' }).click(),
  ]);
  // 作成直後の顧客のインサイト画面: AI 生成は走らず「未計測」表示になる（render 時 LLM 送出経路の遮断を恒久監視）。
  await page.goto(page.url().replace(/\/$/, '') + '/insights');
  await expect(page.getByText('保存済みのインサイトはありません（未計測）')).toBeVisible();
  await expect(page.getByText('AI 生成・外部送信は行いません', { exact: false })).toBeVisible();
});
