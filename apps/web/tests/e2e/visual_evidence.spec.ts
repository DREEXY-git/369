import { test, expect, type Page } from '@playwright/test';
import { captureFullNav } from './capture';

// v6.2 WIP-6 視覚証拠。CI artifact に明示名の PNG を保存し、画像だけでなく DOM 実測（横 overflow・
// canvas 非blank・build badge の role 別表示・選択 agent 一致）も残す。対象は seed の DEMO データのみ。
const DESKTOP = { width: 1280, height: 720 };
const MOBILE = { width: 390, height: 844 };

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'horizontal overflow(px)').toBeLessThanOrEqual(1);
}

test('OWNER desktop: NAV 全体・AI社員一覧/詳細・3D選択の証拠＋build badge 表示', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await login(page, 'ceo@ikezaki.local');

  // NAV 全体（サイドバー）。68 導線。build badge は OWNER に表示。
  await page.goto('/dashboard');
  await expect(page.getByTestId('build-info')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  // v6.9 WIP-3: 内部 overflow scroll に隠れた導線が写らない問題を、viewport 拡大＋隠れゼロ assert で解消。
  // 68 導線すべてが1枚の artifact に写る（DOM 件数と内部 scroll 残ゼロを機械検証してから撮影）。
  const aside = page.locator('aside');
  await expect(aside.getByRole('link')).toHaveCount(68);
  await captureFullNav(page, aside, aside.locator('nav'), 'test-results/nav-owner-desktop-full.png');

  // AI社員 一覧。
  await page.goto('/ai-agents');
  await expect(page.locator('[data-testid^="ai-agent-card-"]')).toHaveCount(8);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: 'test-results/ai-agents-list-desktop.png', fullPage: false });

  // AI社員 詳細（プロフィール全項目が読める）。
  const firstCard = page.locator('[data-testid^="ai-agent-card-"]').first();
  const id = (await firstCard.getAttribute('data-testid'))!.replace('ai-agent-card-', '');
  await page.goto(`/ai-agents/${id}`);
  await expect(page.getByTestId('ai-profile-card')).toBeVisible();
  await expect(page.getByTestId('ai-profile-name')).not.toBeEmpty();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: 'test-results/ai-agent-detail-desktop.png', fullPage: false });

  // 3D オフィスで同じ社員が選択済み・canvas 非blank。
  await page.goto(`/ai-office?agent=${id}`);
  const canvas = page.getByTestId('ai-office-canvas');
  await expect(canvas).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const c = document.querySelector('canvas[data-testid="ai-office-canvas"]') as HTMLCanvasElement & {
          __nameplateProbe?: (i: number) => unknown;
        };
        return typeof c?.__nameplateProbe === 'function';
      }),
    )
    .toBe(true);
  await expect(page.getByTestId('ai-office-detail')).toHaveAttribute('data-agent-id', id);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: 'test-results/ai-office-selected-desktop.png', fullPage: false });
});

test('OWNER mobile: NAV ドロワー・AI社員一覧/詳細・3D選択の証拠＋build badge', async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await login(page, 'ceo@ikezaki.local');

  await page.goto('/dashboard');
  await expect(page.getByTestId('build-info')).toBeVisible(); // mobile でも OWNER に表示
  await page.getByRole('button', { name: 'メニューを開く' }).click();
  const drawer = page.getByTestId('mobile-nav-drawer');
  await expect(drawer).toBeVisible();
  await expectNoHorizontalOverflow(page);
  // v6.9 WIP-3: drawer も 68 導線を内部 scroll 隠れゼロで1枚に撮影（機械検証付き）。
  await expect(drawer.getByRole('link')).toHaveCount(68);
  await captureFullNav(page, drawer, drawer.locator('nav'), 'test-results/nav-owner-mobile-full.png');
  await page.keyboard.press('Escape');

  await page.goto('/ai-agents');
  await expect(page.locator('[data-testid^="ai-agent-card-"]').first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: 'test-results/ai-agents-list-mobile.png', fullPage: false });

  const firstCard = page.locator('[data-testid^="ai-agent-card-"]').first();
  const id = (await firstCard.getAttribute('data-testid'))!.replace('ai-agent-card-', '');
  await page.goto(`/ai-agents/${id}`);
  await expect(page.getByTestId('ai-profile-card')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.getByTestId('ai-profile-card').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/ai-agent-detail-mobile.png', fullPage: false });

  await page.goto(`/ai-office?agent=${id}`);
  await expect(page.getByTestId('ai-office-detail')).toHaveAttribute('data-agent-id', id);
  await expectNoHorizontalOverflow(page);
  await page.getByTestId('ai-office-detail').screenshot({ path: 'test-results/ai-office-selected-mobile.png' });
});

test('build badge は OWNER/ADMIN 以外（STAFF）には表示されない（サーバー未送出）', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await login(page, 'sales@ikezaki.local'); // STAFF
  await page.goto('/dashboard');
  await expect(page.getByTestId('build-info')).toHaveCount(0);
});

test('build badge は ADMIN には表示される（肯定・role 本体）', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await login(page, 'admin@ikezaki.local'); // ADMIN
  await page.goto('/dashboard');
  await expect(page.getByTestId('build-info')).toBeVisible();
});
