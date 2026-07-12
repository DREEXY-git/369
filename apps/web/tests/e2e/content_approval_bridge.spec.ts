import { test, expect, type Page } from '@playwright/test';

// C21 コンテンツ承認ブリッジ（Phase 3.5・roadmap81 §2）。
// review-only: AI 下書き(ContentAsset) → 内部 ApprovalRequest(content_review) → 人間 approve/reject。
// 公開・CMS 投稿・外部送信・実 LLM・課金は一切伴わない（社内承認状態のみ）。

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

// /marketing/assets の生成フローで lp 下書き(ContentAsset type=lp, status=draft)を作り、その id を返す。
async function createLpDraft(page: Page): Promise<string> {
  await page.goto('/marketing/assets');
  await page.locator('select[name="kind"]').selectOption('lp');
  await page.locator('input[name="campaignName"]').fill('E2E 承認ブリッジ');
  await page.locator('input[name="instruction"]').fill('サービス紹介の LP 下書き');
  await page.getByRole('button', { name: /生成/ }).click();
  await page.waitForURL(/\/marketing\/assets\?generated=/);
  const id = new URL(page.url()).searchParams.get('generated');
  if (!id) throw new Error('生成された ContentAsset の id が取得できませんでした');
  return id;
}

test('approve 経路: 下書き→承認申請→/approvals承認→approved表示・deep link往復・重複PENDINGなし', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  const id = await createLpDraft(page);

  await page.goto('/marketing/content');
  await expect(page.getByTestId(`content-approval-status-${id}`)).toHaveText('未申請');

  // 承認申請（review-only）
  await page.getByTestId(`content-request-approval-${id}`).click();
  await page.waitForURL(new RegExp(`/marketing/content\\?requested=1&highlight=${id}`));
  await expect(page.getByTestId('content-requested-banner')).toBeVisible();
  await expect(page.getByTestId(`content-approval-status-${id}`)).toHaveText('承認申請中');
  // 申請中は再申請ボタンが出ない（重複申請防止・第一段）
  await expect(page.getByTestId(`content-request-approval-${id}`)).toHaveCount(0);

  // /approvals に content_review が「1件だけ」（原子的 CAS で重複 PENDING を作らない）
  await page.goto('/approvals');
  await expect(page.getByTestId(`approval-content-deeplink-${id}`)).toHaveCount(1);

  // deep link 往復（承認前に元の下書きへ）
  await page.getByTestId(`approval-content-deeplink-${id}`).click();
  await page.waitForURL(new RegExp(`/marketing/content\\?highlight=${id}`));
  await expect(page.getByTestId(`content-approval-status-${id}`)).toBeVisible();

  // 戻って人間が承認
  await page.goto('/approvals');
  const item = page
    .locator('.rounded-md.border.p-3')
    .filter({ has: page.getByTestId(`approval-content-deeplink-${id}`) });
  await item.getByRole('button', { name: '承認' }).click();
  await page.waitForURL('**/approvals');

  // content 側が approved 表示・再申請ボタンなし（外部公開は一切していない）
  await page.goto('/marketing/content');
  await expect(page.getByTestId(`content-approval-status-${id}`)).toHaveText('承認済み');
  await expect(page.getByTestId(`content-request-approval-${id}`)).toHaveCount(0);
});

test('reject 経路: 却下後は再申請可能（rejected は requestable）', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  const id = await createLpDraft(page);

  await page.goto('/marketing/content');
  await page.getByTestId(`content-request-approval-${id}`).click();
  await page.waitForURL(new RegExp(`/marketing/content\\?requested=1`));

  await page.goto('/approvals');
  const item = page
    .locator('.rounded-md.border.p-3')
    .filter({ has: page.getByTestId(`approval-content-deeplink-${id}`) });
  await item.getByRole('button', { name: '却下' }).click();
  await page.waitForURL('**/approvals');

  await page.goto('/marketing/content');
  await expect(page.getByTestId(`content-approval-status-${id}`)).toHaveText('却下');
  // 却下後は再申請できる（状態が rejected → requestable）
  await expect(page.getByTestId(`content-request-approval-${id}`)).toBeVisible();
});

test('AI ロールは承認申請ボタンを持たない（申請は人間かつ marketing:update のみ）', async ({ page }) => {
  // 先に ceo で lp 下書きを1件用意
  await login(page, 'ceo@ikezaki.local');
  const id = await createLpDraft(page);

  // AI 社員（AI_AGENT・marketing:update なし・isAi）へ切替
  await page.context().clearCookies();
  await login(page, 'ai-sales@ikezaki.local');
  await page.goto('/marketing/content');

  // AI は閲覧可（marketing:read）だが、承認申請ボタンは一切出ない
  await expect(page.getByTestId(`content-approval-status-${id}`)).toBeVisible();
  await expect(page.locator('[data-testid^="content-request-approval-"]')).toHaveCount(0);
});
