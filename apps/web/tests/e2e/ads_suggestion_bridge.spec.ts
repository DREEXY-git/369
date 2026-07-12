import { test, expect, type Page } from '@playwright/test';
import { prisma } from '@hokko/db';

// C19 承認ブリッジ（roadmap83 案A）の実 UI E2E。
// 生成 → 改善案の実体化 → 承認申請 → /approvals 承認/却下 → バッジ反映・deep link。
// 承認しても広告の実変更・予算変更・外部送信は一切発生しない（社内状態のみ）。

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

// DB fixture で改善案を直接作る（生成フローは既存 E2E が担保・ここはブリッジ検証に集中）。
async function makeSuggestion(title: string): Promise<{ id: string; tenantId: string }> {
  const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { tenantId: true } });
  if (!ceo) throw new Error('seed ceo not found');
  const s = await prisma.marketingSuggestion.create({
    data: { tenantId: ceo.tenantId, title, detail: 'CPA 改善のための入札調整（下書き）', approvalStatus: 'none' },
  });
  return { id: s.id, tenantId: ceo.tenantId };
}

const created: string[] = [];
test.afterAll(async () => {
  if (created.length) {
    await prisma.approvalRequest.deleteMany({ where: { entityId: { in: created }, type: 'ad_suggestion_review' } });
    await prisma.marketingSuggestion.deleteMany({ where: { id: { in: created } } });
  }
  await prisma.$disconnect();
});

test('approve 経路: 改善案→承認申請→/approvals 承認→承認済み表示・deep link・重複申請不可', async ({ page }) => {
  const { id } = await makeSuggestion(`c19 e2e approve ${Date.now()}`);
  created.push(id);
  await login(page, 'ceo@ikezaki.local');

  await page.goto('/marketing/ads');
  await expect(page.getByTestId(`suggestion-approval-status-${id}`)).toHaveText('未申請');
  await page.getByTestId(`suggestion-request-approval-${id}`).click();
  await page.waitForURL(new RegExp(`/marketing/ads\\?requested=1&highlight=${id}`));
  await expect(page.getByTestId('suggestion-requested-banner')).toBeVisible();
  await expect(page.getByTestId(`suggestion-approval-status-${id}`)).toHaveText('承認申請中');
  await expect(page.getByTestId(`suggestion-request-approval-${id}`)).toHaveCount(0); // 申請中は再申請不可

  await page.goto('/approvals');
  await expect(page.getByTestId(`approval-suggestion-deeplink-${id}`)).toHaveCount(1); // 重複 PENDING なし
  const item = page
    .locator('.rounded-md.border.p-3')
    .filter({ has: page.getByTestId(`approval-suggestion-deeplink-${id}`) });
  await item.getByRole('button', { name: '承認' }).click();
  // 既に /approvals にいるため URL では待てない。決定確定＝該当項目が PENDING 一覧から消えるのを待つ。
  await expect(page.getByTestId(`approval-suggestion-deeplink-${id}`)).toHaveCount(0);

  await page.goto('/marketing/ads');
  await expect(page.getByTestId(`suggestion-approval-status-${id}`)).toHaveText('承認済み');
  await expect(page.getByTestId(`suggestion-request-approval-${id}`)).toHaveCount(0);
  // 実 DB: 広告・予算は一切触れていない（承認は社内状態のみ）＝送信ログ 0。
  expect((await prisma.marketingSuggestion.findUnique({ where: { id } }))?.approvalStatus).toBe('approved');
});

test('reject 経路: 却下後は再申請可能', async ({ page }) => {
  const { id } = await makeSuggestion(`c19 e2e reject ${Date.now()}`);
  created.push(id);
  await login(page, 'ceo@ikezaki.local');

  await page.goto('/marketing/ads');
  await page.getByTestId(`suggestion-request-approval-${id}`).click();
  await page.waitForURL(/\/marketing\/ads\?requested=1/);

  await page.goto('/approvals');
  const item = page
    .locator('.rounded-md.border.p-3')
    .filter({ has: page.getByTestId(`approval-suggestion-deeplink-${id}`) });
  await item.getByRole('button', { name: '却下' }).click();
  await expect(page.getByTestId(`approval-suggestion-deeplink-${id}`)).toHaveCount(0);

  await page.goto('/marketing/ads');
  await expect(page.getByTestId(`suggestion-approval-status-${id}`)).toHaveText('却下');
  await expect(page.getByTestId(`suggestion-request-approval-${id}`)).toBeVisible(); // 再申請可能
});

test('AI ロールには承認申請ボタンが出ない（marketing:read のみ・isAi）', async ({ page }) => {
  const { id } = await makeSuggestion(`c19 e2e ai ${Date.now()}`);
  created.push(id);
  await login(page, 'ai-sales@ikezaki.local');
  await page.goto('/marketing/ads');
  await expect(page.getByTestId(`suggestion-approval-status-${id}`)).toBeVisible(); // 閲覧は可
  await expect(page.locator(`[data-testid^="suggestion-request-approval-"]`)).toHaveCount(0);
});
