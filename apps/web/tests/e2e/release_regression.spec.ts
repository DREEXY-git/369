import { test, expect, type Page } from '@playwright/test';
import { prisma } from '@hokko/db';
import { NAV } from '../../components/shell/nav';

// v7.2 Lane E — 機能消失防止の回帰ハードニング（release regression hardening）。
// 既存テストの削除・弱体化はせず**追加のみ**。脆い全面 pixel snapshot は使わず、DOM 実測＋
// 要素単位 screenshot＋artifact で検証する。
// 対象: 全 route/nav inventory（67導線の実 GET 到達）・role 差分（OWNER/ADMIN/EXECUTIVE/READ_ONLY）・
// 320/375/768/1440px・Bell/ユーザーメニュー/テーマ・戻る/進む・deep link。
// AI社員8名 parity / canvas nonblank / WebGL fallback / NAV 67 契約は既存 spec
// （ai_agents_parity / visual_evidence / nav_permissions / nav-contract）が正本（重複させない）。

const ALL_HREFS: string[] = NAV.flatMap((g) => g.items.map((i) => i.href));

const EXEC_EMAIL = `exec-reg-${process.pid}-${Date.now()}@ikezaki.local`;
const RO_EMAIL = `readonly-reg-${process.pid}-${Date.now()}@ikezaki.local`;
let tenantId = '';
const fixtureUserIds: string[] = [];

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

async function makeRoleUser(email: string, roleKey: 'EXECUTIVE' | 'READ_ONLY', passwordHash: string) {
  const role = await prisma.role.findFirst({ where: { tenantId, key: roleKey }, select: { id: true } });
  if (!role) throw new Error(`seed ${roleKey} role not found`);
  const u = await prisma.user.create({ data: { tenantId, email, name: `回帰fixture ${roleKey}`, passwordHash, isAiAgent: false } });
  fixtureUserIds.push(u.id);
  await prisma.userRole.create({ data: { tenantId, userId: u.id, roleId: role.id } });
}

async function drawerHrefs(page: Page): Promise<string[]> {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'メニューを開く' }).click();
  const drawer = page.getByTestId('mobile-nav-drawer');
  await expect(drawer).toBeVisible();
  const hrefs = await drawer.getByRole('link').evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? ''));
  await page.keyboard.press('Escape');
  return hrefs.filter(Boolean);
}

test.describe('v7.2 Lane E — 機能消失防止回帰', () => {
  test.beforeAll(async () => {
    const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { tenantId: true, passwordHash: true } });
    if (!ceo) throw new Error('seed ceo not found');
    tenantId = ceo.tenantId;
    await makeRoleUser(EXEC_EMAIL, 'EXECUTIVE', ceo.passwordHash);
    await makeRoleUser(RO_EMAIL, 'READ_ONLY', ceo.passwordHash);
  });

  test.afterAll(async () => {
    if (fixtureUserIds.length) {
      await prisma.userRole.deleteMany({ where: { userId: { in: fixtureUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: fixtureUserIds } } });
    }
    await prisma.$disconnect();
  });

  test('route inventory: OWNER で 67 導線すべてが実 GET 200・login リダイレクトなし（消えた route 0）', async ({ page }) => {
    test.setTimeout(180_000);
    await login(page, 'ceo@ikezaki.local');
    expect(ALL_HREFS.length).toBe(67); // nav-contract と同じ導線数（契約はあちらが正本・ここは実到達）
    const broken: string[] = [];
    for (const href of ALL_HREFS) {
      const resp = await page.request.get(href);
      const finalUrl = resp.url();
      if (resp.status() !== 200 || finalUrl.includes('/login')) {
        broken.push(`${href} → ${resp.status()} (${finalUrl})`);
      }
    }
    expect(broken, `到達できない導線:\n${broken.join('\n')}`).toEqual([]);
  });

  test('role 差分: ADMIN/EXECUTIVE/READ_ONLY の drawer 導線は OWNER 67 の部分集合・各導線は実 GET で到達可能（権限内で 500 なし）', async ({ page }) => {
    test.setTimeout(240_000);
    const results: Record<string, number> = {};
    for (const email of ['admin@ikezaki.local', EXEC_EMAIL, RO_EMAIL]) {
      await login(page, email);
      const hrefs = await drawerHrefs(page);
      results[email] = hrefs.length;
      expect(hrefs.length, `${email} の導線数`).toBeGreaterThan(0);
      // 部分集合（OWNER に無い謎の導線が生えない・順序契約は nav-contract が正本）。
      for (const h of hrefs) expect(ALL_HREFS, `${email} の導線 ${h} が正本に無い`).toContain(h);
      // 各導線が 500/404 にならない（自分の権限内でリンクされた画面は必ず開ける＝空画面/事故ページ 0）。
      const broken: string[] = [];
      for (const h of hrefs) {
        const resp = await page.request.get(h);
        if (resp.status() !== 200 || resp.url().includes('/login')) broken.push(`${h} → ${resp.status()}`);
      }
      expect(broken, `${email} で開けない導線:\n${broken.join('\n')}`).toEqual([]);
      // 次のロールのために logout（別ユーザーの cookie を持ち越さない）。
      await page.context().clearCookies();
    }
    // READ_ONLY は OWNER より狭い（フィルタが機能している・全ロール同数=フィルタ死の検出）。
    expect(results[RO_EMAIL]!).toBeLessThan(67);
  });

  test('viewport 回帰: 320/375/768/1440px で topbar 必須 control が viewport 内・横スクロール 0（要素 screenshot 付き）', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 375, height: 812 });
    await login(page, 'ceo@ikezaki.local');
    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/dashboard');
      const header = page.getByTestId('topbar');
      await expect(header).toBeVisible();
      expect(await header.evaluate((h) => h.scrollWidth - h.clientWidth), `topbar overflow@${width}`).toBeLessThanOrEqual(1);
      for (const id of ['topbar-bell', 'topbar-avatar', 'topbar-logout']) {
        const el = page.getByTestId(id);
        await expect(el, `${id}@${width}`).toBeVisible();
        const box = await el.boundingBox();
        expect(box!.x, `${id} 左端@${width}`).toBeGreaterThanOrEqual(-1);
        expect(box!.x + box!.width, `${id} 右端@${width}`).toBeLessThanOrEqual(width + 1);
      }
      // ページ全体の横スクロールなし。
      const clipped = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(clipped, `document overflow@${width}`).toBeLessThanOrEqual(1);
      const hbox = await header.boundingBox();
      await page.screenshot({ path: `test-results/regression-topbar-${width}.png`, clip: { x: 0, y: 0, width, height: Math.ceil(hbox!.height) + 4 } });
    }
  });

  test('Bell・ユーザーメニュー・テーマの機能回帰: 実クリックで遷移/切替/ログアウトできる', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, 'ceo@ikezaki.local');
    await page.goto('/dashboard');
    // テーマ（desktop）: 実クリックで html.dark が反転し reload 後も維持。
    const isDark = () => page.evaluate(() => document.documentElement.classList.contains('dark'));
    const before = await isDark();
    await page.getByTestId('topbar-theme').click();
    expect(await isDark()).toBe(!before);
    await page.reload();
    expect(await isDark()).toBe(!before);
    await page.getByTestId('topbar-theme').click(); // 元に戻す
    // Bell: /notifications へ実遷移。
    await page.getByTestId('topbar-bell').click();
    await page.waitForURL('**/notifications');
    // ユーザーメニュー（logout）: 実クリックでセッション終了 → /login へ。
    await page.getByTestId('topbar-logout').click();
    await page.waitForURL('**/login');
    // ログアウト後は保護ページへ入れない。
    await page.goto('/dashboard');
    await page.waitForURL('**/login**');
  });

  test('戻る/進む・deep link 回帰: 履歴往復と直 URL（AI社員詳細・3D Office ?agent=）が壊れていない', async ({ page }) => {
    await login(page, 'ceo@ikezaki.local');
    const agent = await prisma.aIAgent.findFirst({ where: { tenantId }, select: { id: true } });
    if (!agent) throw new Error('seed agent not found');
    // 履歴往復。
    await page.goto('/dashboard');
    await page.goto('/customers');
    await page.goto('/approvals');
    await page.goBack();
    await expect(page).toHaveURL(/\/customers/);
    await page.goBack();
    await expect(page).toHaveURL(/\/dashboard/);
    await page.goForward();
    await expect(page).toHaveURL(/\/customers/);
    // deep link: AI社員詳細（直 URL）と 3D Office の ?agent= 初期選択。
    await page.goto(`/ai-agents/${agent.id}`);
    await expect(page.getByText('稼働状態', { exact: false }).first()).toBeVisible();
    await page.goto(`/ai-office?agent=${agent.id}`);
    await expect(page).toHaveURL(new RegExp(`agent=${agent.id}`));
  });
});
