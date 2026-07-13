import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { prisma } from '@hokko/db';
import { REFERRAL_PR_DISCLOSURE } from '@hokko/shared';

// C22 read-only 縦切り（v7.2 Lane B・roadmap76/83 §4）の実 UI E2E。
// 分析・下書きプレビューまで（外部送信・報酬・公開・実LLM・外部API・schema 変更なし）。
// fixture は本テストが作る合成データのみ・afterAll で fixture だけを削除する。

const FIXTURE_CUSTOMER = 'C22テスト製作所（fixture）';
// v7.2 R2（Codex CHANGE_REQUEST_V72_C22 P2-2）: 別 tenant の実在顧客（sentinel 名）— 非開示を実 fixture で証明。
const FOREIGN_CUSTOMER_SENTINEL = 'C22-FOREIGN-TENANT-CUSTOMER-SENTINEL-V74';
// worker 並列（repeat-each 含む）で beforeAll が同時実行されても衝突しないよう worker ごとに一意化。
const PARTNER_EMAIL = `partner-c22-${process.pid}-${Date.now()}@ikezaki.local`;

let tenantId = '';
let customerId = '';
let foreignTenantId = '';
let foreignCustomerId = '';
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

    // P2-2: 別 tenant の実在顧客（候補条件を満たす成約実績あり）— 非開示・非漏洩を実 fixture で検証する。
    const ft = await prisma.tenant.create({ data: { name: `c22-foreign-${process.pid}-${Date.now()}` } });
    foreignTenantId = ft.id;
    const foreignCustomer = await prisma.customer.create({
      data: {
        tenantId: foreignTenantId, name: FOREIGN_CUSTOMER_SENTINEL, rank: 'A', status: 'active',
        satisfaction: 95, churnRisk: 5, lastContactAt: new Date(), label: 'INTERNAL',
      },
    });
    foreignCustomerId = foreignCustomer.id;
    await prisma.deal.create({
      data: { tenantId: foreignTenantId, customerId: foreignCustomerId, title: 'foreign 成約', stage: 'CONTRACT', amount: 200000 },
    });
  });

  test.afterAll(async () => {
    await prisma.dataAccessLog.deleteMany({ where: { tenantId, entityId: customerId } });
    // P2-3: 一覧閲覧の metadata-only 監査（entityType='ReferralAnalysis'）も片付ける。
    await prisma.dataAccessLog.deleteMany({ where: { tenantId, entityType: 'ReferralAnalysis' } });
    await prisma.deal.deleteMany({ where: { tenantId, customerId } });
    await prisma.customer.deleteMany({ where: { id: customerId } });
    if (foreignCustomerId) {
      await prisma.deal.deleteMany({ where: { tenantId: foreignTenantId, customerId: foreignCustomerId } });
      await prisma.customer.deleteMany({ where: { id: foreignCustomerId } });
    }
    if (foreignTenantId) await prisma.tenant.deleteMany({ where: { id: foreignTenantId } });
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
    await prisma.dataAccessLog.deleteMany({ where: { tenantId, entityType: 'ReferralAnalysis' } });
    await login(page, 'ai-sales@ikezaki.local');
    await page.goto('/growth/referral');
    await expect(page.getByTestId(`referral-candidate-${customerId}`)).toBeVisible(); // 閲覧分析は可
    await expect(page.getByTestId(`referral-preview-link-${customerId}`)).toHaveCount(0); // 生成導線なし
    const aiUser = await prisma.user.findFirst({ where: { tenantId, email: 'ai-sales@ikezaki.local' }, select: { id: true } });
    // 責任主体の正確性: AI ロールの一覧閲覧は actorType='ai_agent' で記録される（'user' に誤帰属しない）。
    const aiListLogs = await prisma.dataAccessLog.findMany({
      where: { tenantId, entityType: 'ReferralAnalysis', actorId: aiUser!.id, purpose: 'referral_candidate_list' },
    });
    expect(aiListLogs.length).toBeGreaterThanOrEqual(1);
    for (const log of aiListLogs) expect(log.actorType, 'AI 閲覧の責任主体は ai_agent').toBe('ai_agent');
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

  test('P2-1: 顧客名は取得段階でゲートされる（select は name: canReadCustomerNames・詳細 link も同権限で遮断）', async ({ page }) => {
    // 現状の組込み human role は marketing:read と customer:read を必ず同時付与するため（rbac: RESOURCES/
    // STAFF_RESOURCES）、両者を分離した runtime role は存在しない。取得段階ゲートは将来/誤設定 role への
    // 多重防御であり、ここではソース上の取得段階ゲート（描画時の伏字ではなく DB 取得の条件化）と、
    // customer:read 保持者（ceo）で実名・詳細 link が出る肯定経路で担保する。
    const src = readFileSync(resolve(dirname(test.info().file), '../../app/(app)/growth/referral/page.tsx'), 'utf8');
    expect(src, 'name は取得段階で customer:read に条件化されている').toContain('name: canReadCustomerNames');
    expect(src, '無条件 name: true で取得していない').not.toMatch(/name:\s*true/);
    expect(src, '顧客詳細 link は showCustomerLink でゲート').toContain('showCustomerLink');
    // 肯定経路: customer:read 保持者は実名と詳細 link が見える。
    await login(page, 'ceo@ikezaki.local');
    await page.goto('/growth/referral');
    const row = page.getByTestId(`referral-candidate-${customerId}`);
    await expect(row).toContainText(FIXTURE_CUSTOMER);
    await expect(row.getByTestId(`referral-customer-link-${customerId}`)).toHaveCount(1);
  });

  test('P2-2: 別 tenant の実在顧客は候補にも DOM にも出ず、DataAccessLog にも残らない（sentinel 0）', async ({ page }) => {
    await login(page, 'ceo@ikezaki.local');
    await page.goto('/growth/referral');
    await expect(page.getByTestId(`referral-candidate-${customerId}`)).toBeVisible(); // 自 tenant 候補は出る
    // 別 tenant 顧客の sentinel 名・候補行・詳細 link はどこにも出ない。
    const content = await page.content();
    expect(content, 'foreign 顧客名 sentinel が露出').not.toContain(FOREIGN_CUSTOMER_SENTINEL);
    await expect(page.getByTestId(`referral-candidate-${foreignCustomerId}`)).toHaveCount(0);
    await expect(page.locator(`a[href="/customers/${foreignCustomerId}"]`)).toHaveCount(0);
    // 別 tenant 顧客 id でプレビューを要求しても notfound（存在シグナルなし）で、機密参照監査も残らない。
    await page.goto(`/growth/referral?preview=${foreignCustomerId}`);
    await expect(page.getByTestId('referral-preview-notfound')).toBeVisible();
    await expect(page.getByTestId('referral-preview')).toHaveCount(0);
    expect(await prisma.dataAccessLog.count({ where: { entityId: foreignCustomerId } })).toBe(0);
  });

  test('P2-3: 候補一覧の閲覧は metadata-only で監査される（名前・sentinel を含まない・件数と field のみ）', async ({ page }) => {
    // 監査の存在を確実にするため直前の ReferralAnalysis ログを消してから1回閲覧する。
    await prisma.dataAccessLog.deleteMany({ where: { tenantId, entityType: 'ReferralAnalysis' } });
    await login(page, 'ceo@ikezaki.local');
    await page.goto('/growth/referral');
    await expect(page.getByTestId(`referral-candidate-${customerId}`)).toBeVisible();
    const ceo = await prisma.user.findFirst({ where: { tenantId, email: 'ceo@ikezaki.local' }, select: { id: true } });
    const logs = await prisma.dataAccessLog.findMany({
      where: { tenantId, entityType: 'ReferralAnalysis', actorId: ceo!.id, purpose: 'referral_candidate_list' },
    });
    expect(logs.length).toBeGreaterThanOrEqual(1);
    for (const log of logs) {
      const json = JSON.stringify(log);
      expect(json, '一覧監査に顧客名が複製されている').not.toContain(FIXTURE_CUSTOMER);
      expect(json, '一覧監査に foreign sentinel が入っている').not.toContain(FOREIGN_CUSTOMER_SENTINEL);
      expect(json).toMatch(/scanned|candidates/); // 件数メタ
      expect(json).toContain('churnRisk'); // どの機密 field を読んだかのメタ（値ではなく field 名）
      expect(log.actorType, '人間閲覧の責任主体は user').toBe('user'); // 責任主体の正確性
    }
  });
});
