import { test, expect, type Page } from '@playwright/test';

// v7.0 Lane R1（Codex P2 comment 4950700665・ARTIFACT_ONLY / NOT_REPRODUCED_IN_HUMAN_PREVIEW）:
// mobile topbar の必須 control（hamburger・Bell・avatar・logout・build badge）が 320/360/390/430px の
// すべてで viewport 内・visible・操作可能・accessible name 付きであることを boundingBox 実測で検証する。
// <sm で topbar から外した control の代替導線を実 assert する（v7.0 R2・Codex P2 comment 4951029653）:
// - 承認待ち = drawer の「承認待ち」link
// - テーマ切替 = drawer 内「表示設定 > テーマ切替」（drawer-theme-toggle・実クリック/永続化は専用テスト）
// - role text = avatar の aria-label
// desktop（≥sm）は従来表示の非退行を確認する。

const MOBILE_WIDTHS = [320, 360, 390, 430];

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

async function expectFullyInViewport(page: Page, testId: string, width: number) {
  const el = page.getByTestId(testId);
  await expect(el, `${testId}@${width}px`).toBeVisible();
  const box = await el.boundingBox();
  expect(box, `${testId}@${width}px boundingBox`).not.toBeNull();
  expect(box!.width, `${testId}@${width}px width>0`).toBeGreaterThan(0);
  expect(box!.height, `${testId}@${width}px height>0`).toBeGreaterThan(0);
  expect(box!.x, `${testId}@${width}px 左端が viewport 外`).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width, `${testId}@${width}px 右端が viewport 外（部分切れ）`).toBeLessThanOrEqual(width + 1);
}

test('mobile topbar: 320/360/390/430px で Bell・avatar・logout・build badge が viewport 内・部分切れ 0', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 'ceo@ikezaki.local');

  for (const width of MOBILE_WIDTHS) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/dashboard');

    // header 内部の横 overflow 0（document 全体ではなく header 自身の clip を検査する）。
    const header = page.getByTestId('topbar');
    await expect(header).toBeVisible();
    const clipped = await header.evaluate((h) => h.scrollWidth - h.clientWidth);
    expect(clipped, `topbar 内部 overflow@${width}px`).toBeLessThanOrEqual(1);

    // 必須 control: boundingBox が viewport 内（部分切れ 0）・visible。
    for (const id of ['topbar-bell', 'topbar-avatar', 'topbar-logout', 'build-info']) {
      await expectFullyInViewport(page, id, width);
    }
    // hamburger（accessible name あり）も viewport 内。
    const hamburger = page.getByRole('button', { name: 'メニューを開く' });
    await expect(hamburger).toBeVisible();
    const hb = await hamburger.boundingBox();
    expect(hb!.x).toBeGreaterThanOrEqual(-1);
    expect(hb!.x + hb!.width).toBeLessThanOrEqual(width + 1);

    // accessible name（accname 実測・title/aria-label 由来）。
    await expect(page.getByRole('link', { name: '通知' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ログアウト' })).toBeVisible();
    await expect(page.getByRole('img', { name: /北郷 誠一（社長）/ })).toBeVisible(); // avatar = 氏名＋role を集約

    // <sm で隠した承認待ち/テーマの代替導線: drawer に「承認待ち」link とテーマ切替の実操作が存在し、
    // どちらも viewport 内（部分切れ 0）である。
    await hamburger.click();
    const drawer = page.getByTestId('mobile-nav-drawer');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole('link', { name: '承認待ち' })).toHaveCount(1);
    const themeInDrawer = page.getByTestId('drawer-theme-toggle');
    await expect(themeInDrawer, `drawer theme@${width}px`).toBeVisible();
    const tb = await themeInDrawer.boundingBox();
    expect(tb!.x, `drawer theme 左端@${width}px`).toBeGreaterThanOrEqual(-1);
    expect(tb!.x + tb!.width, `drawer theme 右端@${width}px`).toBeLessThanOrEqual(width + 1);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('mobile-nav-drawer')).toHaveCount(0);

    // clean evidence screenshot（header 領域のみ・幅別）。
    const hbox = await header.boundingBox();
    await page.screenshot({
      path: `test-results/topbar-mobile-${width}.png`,
      clip: { x: 0, y: 0, width, height: Math.ceil(hbox!.height) + 4 },
    });
  }

  // clickability の実測（代表幅 390px・Bell 実クリックで /notifications へ遷移する）。
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dashboard');
  await page.getByTestId('topbar-bell').click();
  await page.waitForURL('**/notifications');
});

test('mobile theme: 320px で drawer のテーマ切替が実クリックで light↔dark・永続化・keyboard 操作可能', async ({ page }) => {
  // v7.0 R2（Codex P2 comment 4951029653）: <sm で theme を隠したことによる「機能消失」の是正証拠。
  // 実クリックで html.dark が切り替わり、reload 後も localStorage 経由で復元されることを実測する。
  await page.setViewportSize({ width: 320, height: 844 });
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/dashboard');

  const isDark = () => page.evaluate(() => document.documentElement.classList.contains('dark'));
  const before = await isDark();

  // 実クリック 1回目: light↔dark が反転する。
  await page.getByRole('button', { name: 'メニューを開く' }).click();
  const toggle = page.getByTestId('drawer-theme-toggle');
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAccessibleName('テーマ切替');
  await toggle.click();
  expect(await isDark()).toBe(!before);

  // 永続化: reload 後も選択が復元される（layout の theme init script + localStorage）。
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  expect(await isDark()).toBe(!before);

  // keyboard 操作: drawer を開き直し、フォーカスして Enter で元へ戻る。
  await page.getByRole('button', { name: 'メニューを開く' }).click();
  await page.getByTestId('drawer-theme-toggle').focus();
  await page.keyboard.press('Enter');
  expect(await isDark()).toBe(before);
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  expect(await isDark()).toBe(before);

  // テーマ操作後も必須 control は viewport 内のまま（レイアウト非破壊）。
  for (const id of ['topbar-bell', 'topbar-avatar', 'topbar-logout', 'build-info']) {
    await expectFullyInViewport(page, id, 320);
  }
});

test('desktop topbar: ≥sm は theme/approvals/role/氏名を含め従来表示（非退行）', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/dashboard');
  await expect(page.getByTestId('topbar-approvals')).toBeVisible();
  await expect(page.getByRole('button', { name: 'テーマ切替' })).toBeVisible();
  await expect(page.getByTestId('topbar-bell')).toBeVisible();
  await expect(page.getByTestId('topbar-avatar')).toBeVisible();
  await expect(page.getByTestId('topbar-logout')).toBeVisible();
  await expect(page.getByText('社長', { exact: true })).toBeVisible(); // role Badge
  await expect(page.getByText('ceo@ikezaki.local')).toBeVisible(); // 氏名/メール block
  const header = page.getByTestId('topbar');
  const clipped = await header.evaluate((h) => h.scrollWidth - h.clientWidth);
  expect(clipped).toBeLessThanOrEqual(1);
  await page.screenshot({ path: 'test-results/topbar-desktop-1280.png', clip: { x: 0, y: 0, width: 1280, height: 68 } });
});
