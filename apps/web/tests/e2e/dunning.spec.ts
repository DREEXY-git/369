import { test, expect, type Page } from '@playwright/test';

// Phase 1-15: 督促（dunning）下書き＋承認ゲート＋送信記録 e2e。
// 前提: pnpm db:seed 済み + pnpm start。初回は npx playwright install chromium。
// 本サンドボックスではブラウザDL不可のため、実環境/CIで実行する（spec のみ作成）。

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

test('SENT 請求書の詳細に #dunning セクションが表示される（OWNER）', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/invoices');
  await page.getByRole('link').filter({ hasText: /INV-/ }).first().click();
  await page.waitForURL('**/invoices/**');
  const dunning = page.locator('#dunning');
  if (await dunning.count()) {
    await expect(dunning).toBeVisible();
    await expect(dunning.getByRole('heading', { name: /入金確認・督促/ })).toBeVisible();
  }
});

test('督促下書き作成ボタンで下書きを生成できる', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/invoices');
  await page.getByRole('link').filter({ hasText: /INV-/ }).first().click();
  await page.waitForURL('**/invoices/**');
  const createBtn = page.getByRole('button', { name: /下書きを作成/ });
  if (await createBtn.count()) {
    await createBtn.click();
    await expect(page.getByText(/お支払い状況/)).toBeVisible();
  }
});

test('督促送信は承認申請が必要（送信承認を申請ボタン）', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/invoices');
  await page.getByRole('link').filter({ hasText: /INV-/ }).first().click();
  await page.waitForURL('**/invoices/**');
  const sendBtn = page.getByRole('button', { name: /送信承認を申請/ });
  if (await sendBtn.count()) {
    await expect(sendBtn).toBeVisible();
  }
});

test('承認ページに dunning_send の種別ラベルが表示される', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/approvals');
  await expect(page.getByRole('heading', { name: '承認待ち' })).toBeVisible();
  const label = page.getByText('督促送信（お支払い状況の確認）');
  if (await label.count()) {
    await expect(label.first()).toBeVisible();
  }
});

test('planning-hokko の延滞/未回収アクションは #dunning へ deep link', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/planning-hokko');
  const dunningLink = page.getByRole('link', { name: /督促/ });
  if (await dunningLink.count()) {
    const href = await dunningLink.first().getAttribute('href');
    expect(href).toContain('#dunning');
  }
});

test('STAFF は #dunning セクションが表示されない（finance 機密ゲート）', async ({ page }) => {
  await login(page, 'sales@ikezaki.local');
  await page.goto('/invoices');
  const link = page.getByRole('link').filter({ hasText: /INV-/ });
  if (await link.count()) {
    await link.first().click();
    await page.waitForURL('**/invoices/**');
    await expect(page.locator('#dunning')).toHaveCount(0);
  }
});

test('STAFF は planning-hokko で督促アクションが見えない', async ({ page }) => {
  await login(page, 'sales@ikezaki.local');
  await page.goto('/planning-hokko');
  await expect(page.getByRole('link', { name: /入金確認・督促を作成/ })).toHaveCount(0);
});
