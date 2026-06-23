import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill('ceo@ikezaki.local');
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

test('CEO ログインしてダッシュボードが表示される', async ({ page }) => {
  await login(page);
  await expect(page.getByText('ようこそ')).toBeVisible();
  await page.goto('/dashboard/ceo');
  await expect(page.getByRole('heading', { name: '社長コックピット' })).toBeVisible();
});

test('顧客一覧が表示される', async ({ page }) => {
  await login(page);
  await page.goto('/customers');
  await expect(page.getByRole('heading', { name: '顧客管理 CRM' })).toBeVisible();
  await expect(page.getByText('株式会社', { exact: false }).first()).toBeVisible();
});

test('案件カンバンが表示される', async ({ page }) => {
  await login(page);
  await page.goto('/deals/kanban');
  await expect(page.getByText('営業パイプライン（カンバン）')).toBeVisible();
});

test('在庫ページが表示される', async ({ page }) => {
  await login(page);
  await page.goto('/inventory');
  await expect(page.getByRole('heading', { name: '在庫・商品管理' })).toBeVisible();
});

test('LeadMap リード一覧と地図が表示される', async ({ page }) => {
  await login(page);
  await page.goto('/leadmap/leads');
  await expect(page.getByRole('heading', { name: 'リード一覧' })).toBeVisible();
  await page.goto('/leadmap/map');
  await expect(page.getByText('地図CRM')).toBeVisible();
});

test('LeadMap キャンペーン作成フロー', async ({ page }) => {
  await login(page);
  await page.goto('/leadmap/campaigns/new');
  await page.getByRole('button', { name: /営業先を抽出/ }).click();
  await page.waitForURL('**/leadmap/campaigns/**');
  await expect(page.getByText('リード数')).toBeVisible();
});

test('リードのAI分析と営業メール生成が表示される', async ({ page }) => {
  await login(page);
  await page.goto('/leadmap/leads');
  await page.getByRole('link', { name: /.+/ }).filter({ hasText: /店|院|サロン|salon|hair|Lien|CALM|feliz/ }).first().click();
  await page.waitForURL('**/leadmap/leads/**');
  await expect(page.getByText('営業先情報')).toBeVisible();
});

test('議事録の取込→AI議事録生成', async ({ page }) => {
  await login(page);
  await page.goto('/meetings/upload');
  await page.getByRole('button', { name: 'AI議事録を生成' }).click();
  await page.waitForURL('**/meetings/**');
  await expect(page.getByText('AI議事録')).toBeVisible();
});

test('承認待ちが表示される', async ({ page }) => {
  await login(page);
  await page.goto('/approvals');
  await expect(page.getByRole('heading', { name: '承認待ち' })).toBeVisible();
});

test('監査ログが表示される', async ({ page }) => {
  await login(page);
  await page.goto('/admin/audit');
  await expect(page.getByRole('heading', { name: '監査ログ' })).toBeVisible();
});

test('ナレッジ検索でAI回答が出る', async ({ page }) => {
  await login(page);
  await page.goto('/knowledge/search?q=' + encodeURIComponent('美容室の営業切り口'));
  await expect(page.getByText('AIの回答', { exact: false })).toBeVisible();
});
