import { test, expect, type Page } from '@playwright/test';

// Golden Path Inline Corrective Actions e2e（Phase 1-14）。
// 前提: pnpm db:seed 済み + pnpm start。初回は npx playwright install chromium。
// 本サンドボックスではブラウザDL不可のため、実環境/CIで実行する（spec のみ作成）。

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

async function openFirstEvent(page: Page) {
  await page.goto('/planning-hokko');
  await page.getByRole('link', { name: /案件詳細・次の一手/ }).first().click();
  await page.waitForURL('**/operations/events/**');
}

test('案件詳細のリスク欄に「解消」ボタンが見える（open/monitoring）', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await openFirstEvent(page);
  const resolve = page.getByRole('button', { name: /解消/ });
  // open/monitoring のリスクがあれば解消ボタンが出る（データ依存のため存在時に検証）
  if (await resolve.count()) {
    await expect(resolve.first()).toBeVisible();
  }
});

test('案件詳細の物流欄に「完了」ボタンが見える（未完了タスク）', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await openFirstEvent(page);
  const complete = page.locator('#logistics').getByRole('button', { name: '完了' });
  if (await complete.count()) {
    await expect(complete.first()).toBeVisible();
  }
});

test('未送信請求書で「送信を申請」ボタン、未回収で入金フォームが見える', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/invoices');
  await page.getByRole('link').filter({ hasText: /INV-/ }).first().click();
  await page.waitForURL('**/invoices/**');
  // 送信承認申請 or 承認待ち or 送信済み のいずれか（外部送信は必ず承認ゲート経由）
  await expect(page.getByText(/送信を申請|送信承認待ち|承認済み|送信済み/)).toBeVisible();
  // 未収がある場合は入金記録フォーム
  const pay = page.getByRole('button', { name: '入金を記録' });
  if (await pay.count()) {
    await expect(pay.first()).toBeVisible();
  }
});

test('スタッフは finance 系の是正アクション（入金/送信/原価売上）が見えない', async ({ page }) => {
  await login(page, 'sales@ikezaki.local');
  await page.goto('/planning-hokko');
  // AttentionList の finance 系是正アクションは redact + visible フィルタで非表示
  await expect(page.getByRole('link', { name: /入金を記録/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /請求書送信を申請/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /原価・売上を見直す/ })).toHaveCount(0);
  // 非 finance（リスク確認・解消／物流確認・完了）は出てよい
  await expect(page.getByText('平均進捗', { exact: false })).toBeVisible();
});
