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

// v6.9（Codex r3565885990/r3565885993）: AI ロール＋承認権限の誤設定 fixture からの「直接 Server Action」否定。
// RBAC（AI_AGENT に approval:approve なし）とは独立に、action 境界の user.isAi 拒否が効くことを実 UI で証明する。
import { prisma } from '@hokko/db';

test.describe('AI ロールは承認権限が付与されていても決定できない（action 境界の不変条件）', () => {
  const AI_EMAIL = 'e2e-ai-approver-v69@ikezaki.local';
  let assetId = '';
  let approvalId = '';

  test.beforeAll(async () => {
    const ceo = await prisma.user.findFirst({
      where: { email: 'ceo@ikezaki.local' },
      select: { tenantId: true, passwordHash: true },
    });
    if (!ceo) throw new Error('seed ceo not found');
    const ownerRole = await prisma.role.findFirst({ where: { tenantId: ceo.tenantId, key: 'OWNER' } });
    if (!ownerRole) throw new Error('OWNER role not found');
    // 誤設定 fixture: isAiAgent=true なのに OWNER role（approval:approve を含む）を持つユーザー。
    const aiUser = await prisma.user.create({
      data: { tenantId: ceo.tenantId, email: AI_EMAIL, name: 'AI承認否定fixture', passwordHash: ceo.passwordHash, isAiAgent: true },
    });
    await prisma.userRole.create({ data: { tenantId: ceo.tenantId, userId: aiUser.id, roleId: ownerRole.id } });
    const asset = await prisma.contentAsset.create({
      data: { tenantId: ceo.tenantId, type: 'lp', title: 'v69 AI決定否定 fixture', body: '', status: 'pending_approval', approvalStatus: 'pending', generatedByAi: true },
    });
    assetId = asset.id;
    const approval = await prisma.approvalRequest.create({
      data: { tenantId: ceo.tenantId, type: 'content_review', requestedForAction: 'content_review', title: 'v69 AI決定否定 fixture 申請', entityType: 'content_asset', entityId: asset.id, status: 'PENDING', riskLevel: 'LOW' },
    });
    approvalId = approval.id;
  });

  test.afterAll(async () => {
    if (approvalId) await prisma.approvalRequest.deleteMany({ where: { id: approvalId } });
    if (assetId) await prisma.contentAsset.deleteMany({ where: { id: assetId } });
    const u = await prisma.user.findFirst({ where: { email: AI_EMAIL } });
    if (u) {
      await prisma.userRole.deleteMany({ where: { userId: u.id } });
      await prisma.user.deleteMany({ where: { id: u.id } });
    }
    await prisma.$disconnect();
  });

  test('AI＋OWNER role fixture の承認 submit は denied・ApprovalRequest/asset は不変', async ({ page }) => {
    await login(page, AI_EMAIL); // approval:approve を持つため /approvals は閲覧できてしまう前提の fixture
    await page.goto('/approvals');
    const item = page
      .locator('.rounded-md.border.p-3')
      .filter({ has: page.getByTestId(`approval-content-deeplink-${assetId}`) });
    await expect(item).toHaveCount(1);
    await item.getByRole('button', { name: '承認' }).click();
    await page.waitForURL(/\/approvals\?denied=1/);

    // DB 実測: 決定も状態遷移も起きていない（action 境界で拒否）。
    const approval = await prisma.approvalRequest.findUnique({ where: { id: approvalId } });
    expect(approval?.status).toBe('PENDING');
    expect(approval?.decidedById).toBeNull();
    const asset = await prisma.contentAsset.findUnique({ where: { id: assetId } });
    expect(asset?.status).toBe('pending_approval');
    expect(asset?.approvalStatus).toBe('pending');
  });
});
