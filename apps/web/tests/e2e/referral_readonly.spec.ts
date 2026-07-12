import { test, expect, type Page } from '@playwright/test';
import { prisma } from '@hokko/db';
import { REFERRAL_PR_DISCLOSURE } from '@hokko/shared';

// C22 read-only 縦切り（v7.2 Lane B・roadmap76/83 §4）の実 UI E2E。
// 分析・下書きプレビューまで（外部送信・報酬・公開・実LLM・外部API・schema 変更なし）。
// fixture は本テストが作る合成データのみ・afterAll で fixture だけを削除する。

const FIXTURE_CUSTOMER = 'C22テスト製作所（fixture）';
// worker 並列（repeat-each 含む）で beforeAll が同時実行されても衝突しないよう worker ごとに一意化。
const PARTNER_EMAIL = `partner-c22-${process.pid}-${Date.now()}@ikezaki.local`;

let tenantId = '';
let customerId = '';
const fixtureUserIds: string[] = [];

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

test.describe('C22 紹介・リファラル read-only（v7.2 Lane B）', () => {
  test.beforeAll(async () => {
    const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { tenantId: true, passwordHash: true } });
    if (!ceo) throw new Error('seed ceo not found');
    tenantId = ceo.tenantId;
    // 決定論 fixture: 成約実績あり・rank A・active・直近接触 → 必ず候補になる。
    const customer = await prisma.customer.create({
      data: {
        tenantId,
        name: FIXTURE_CUSTOMER,
        rank: 'A',
        status: 'active',
        satisfaction: 90,
        churnRisk: 10,
        lastContactAt: new Date(),
        label: 'INTERNAL',
      },
    });
    customerId = customer.id;
    await prisma.deal.create({
      data: { tenantId, customerId, title: 'c22 fixture 成約商談', stage: 'CONTRACT', amount: 100000 },
    });
    // marketing:read を持たない role（EXTERNAL_PARTNER）の否定 fixture（seed は全 RoleKey を作成する）。
    const partnerRole = await prisma.role.findFirst({ where: { tenantId, key: 'EXTERNAL_PARTNER' }, select: { id: true } });
    if (!partnerRole) throw new Error('seed EXTERNAL_PARTNER role not found');
    const partner = await prisma.user.create({
      data: { tenantId, email: PARTNER_EMAIL, name: 'C22権限外fixture', passwordHash: ceo.passwordHash, isAiAgent: false },
    });
    fixtureUserIds.push(partner.id);
    await prisma.userRole.create({ data: { tenantId, userId: partner.id, roleId: partnerRole.id } });
  });

  test.afterAll(async () => {
    await prisma.dataAccessLog.deleteMany({ where: { tenantId, entityId: customerId } });
    await prisma.deal.deleteMany({ where: { tenantId, customerId } });
    await prisma.customer.deleteMany({ where: { id: customerId } });
    if (fixtureUserIds.length) {
      await prisma.userRole.deleteMany({ where: { userId: { in: fixtureUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: fixtureUserIds } } });
    }
    await prisma.$disconnect();
  });

  test('ceo: 4チャネル封印表示・外部チャネルはデータなしの正直表示・fixture 顧客が候補に出る（deep link 導線含む）', async ({ page }) => {
    await login(page, 'ceo@ikezaki.local');
    // /growth ダッシュボードからの導線（NAV 67 契約は不変・deep link 経由）。
    await page.goto('/growth');
    await page.getByTestId('growth-referral-link').click();
    await page.waitForURL('**/growth/referral');
    for (const key of ['referral', 'affiliate', 'creator', 'business_network']) {
      const ch = page.getByTestId(`referral-channel-${key}`);
      await expect(ch).toBeVisible();
      await expect(ch.getByText('封印中', { exact: true })).toBeVisible();
    }
    await expect(page.getByTestId('referral-channel-affiliate')).toContainText('対象データなし');
    await expect(page.getByTestId('referral-channel-creator')).toContainText('対象データなし');
    const row = page.getByTestId(`referral-candidate-${customerId}`);
    await expect(row).toBeVisible();
    await expect(row).toContainText(FIXTURE_CUSTOMER); // customer:read 保持者は実名表示
    await expect(row).toContainText('成約実績');
    await expect(row.getByTestId(`referral-customer-link-${customerId}`)).toHaveAttribute('href', `/customers/${customerId}`);
    // 推測 ROI・架空成果を表示しない。
    await expect(row).not.toContainText('ROI');
    // 実行系ボタン（送信・確定・報酬）が存在しない（read-only）。
    expect(await page.getByRole('button', { name: /送信|確定|報酬/ }).count()).toBe(0);
  });

  test('ceo: 下書きプレビューは PR 表記削除不能・実名を本文へ複製しない・DataAccessLog は metadata-only・外部送信 0', async ({ page }) => {
    const sendBefore = await prisma.outreachSendLog.count({ where: { tenantId } });
    await login(page, 'ceo@ikezaki.local');
    await page.goto('/growth/referral');
    await page.getByTestId(`referral-preview-link-${customerId}`).click();
    await page.waitForURL(new RegExp(`preview=${customerId}`));
    const preview = page.getByTestId('referral-preview');
    await expect(preview).toBeVisible();
    const body = await page.getByTestId('referral-preview-body').textContent();
    expect(body).toContain(REFERRAL_PR_DISCLOSURE); // PR 表記（固定・削除経路なし）
    expect(body).toContain('{自社名}'); // 本文はプレースホルダのまま
    await expect(preview).toContainText('{お客様名}'); // 件名もプレースホルダのまま
    expect(body).not.toContain(FIXTURE_CUSTOMER); // 実名を本文へ複製しない
    await expect(page.getByTestId('referral-pr-note')).toBeVisible();
    // DataAccessLog: metadata-only（顧客名・下書き本文を複製しない）。
    const logs = await prisma.dataAccessLog.findMany({ where: { tenantId, entityId: customerId, purpose: 'referral_draft_preview' } });
    expect(logs.length).toBeGreaterThanOrEqual(1);
    for (const log of logs) {
      const json = JSON.stringify(log);
      expect(json).not.toContain(FIXTURE_CUSTOMER);
      expect(json).not.toContain('お客様名'); // 下書き本文も非複製
    }
    // 外部作用 0: プレビューで送信ログは増えない。
    expect(await prisma.outreachSendLog.count({ where: { tenantId } })).toBe(sendBefore);
  });

  test('AI ロール: 分析の閲覧は可・プレビュー link 非表示・直接 URL は拒否（DataAccessLog も作られない）', async ({ page }) => {
    await login(page, 'ai-sales@ikezaki.local');
    await page.goto('/growth/referral');
    await expect(page.getByTestId(`referral-candidate-${customerId}`)).toBeVisible(); // 閲覧分析は可
    await expect(page.getByTestId(`referral-preview-link-${customerId}`)).toHaveCount(0); // 生成導線なし
    const aiUser = await prisma.user.findFirst({ where: { tenantId, email: 'ai-sales@ikezaki.local' }, select: { id: true } });
    await page.goto(`/growth/referral?preview=${customerId}`);
    await expect(page.getByTestId('referral-preview-denied')).toBeVisible();
    await expect(page.getByTestId('referral-preview')).toHaveCount(0);
    expect(
      await prisma.dataAccessLog.count({ where: { tenantId, purpose: 'referral_draft_preview', actorId: aiUser!.id } }),
    ).toBe(0); // AI の試行では機密参照が発生していない（DB 接触前拒否）
  });

  test('marketing:read なし（EXTERNAL_PARTNER）はデータ取得前に遮断', async ({ page }) => {
    await login(page, PARTNER_EMAIL);
    await page.goto('/growth/referral');
    await expect(page.getByText('マーケティング閲覧権限（marketing:read）が必要です')).toBeVisible();
    await expect(page.getByTestId('referral-candidates')).toHaveCount(0);
  });

  test('malformed preview param はエラーにならず notfound banner（存在シグナルなし）', async ({ page }) => {
    await login(page, 'ceo@ikezaki.local');
    await page.goto('/growth/referral?preview=%3Cscript%3Ealert(1)%3C/script%3E');
    await expect(page.getByTestId('referral-preview-notfound')).toBeVisible();
    await expect(page.getByTestId('referral-preview')).toHaveCount(0);
  });

  test('mobile 390px: チャネル盤・候補・プレビューが横 overflow なしで収まる（視覚証拠）', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, 'ceo@ikezaki.local');
    await page.goto(`/growth/referral?preview=${customerId}`);
    for (const id of ['referral-channel-board', `referral-candidate-${customerId}`, 'referral-preview']) {
      const el = page.getByTestId(id);
      await expect(el).toBeVisible();
      expect(await el.evaluate((e) => e.scrollWidth - e.clientWidth), `${id} overflow@390px`).toBeLessThanOrEqual(1);
      const box = await el.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(-1);
      expect(box!.x + box!.width).toBeLessThanOrEqual(391);
    }
    await page.getByTestId('referral-preview').screenshot({ path: 'test-results/c22-referral-preview-mobile-390.png' });
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`/growth/referral?preview=${customerId}`);
    await page.getByTestId('referral-channel-board').screenshot({ path: 'test-results/c22-referral-channels-desktop.png' });
    await page.getByTestId('referral-preview').screenshot({ path: 'test-results/c22-referral-preview-desktop.png' });
  });
});
