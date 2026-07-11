import { test, expect, type Page } from '@playwright/test';

// v6.1 AI社員 ⇔ 3D Office 人物正本統一の回帰。
// /ai-agents（一覧）→ /ai-agents/[id]（詳細）→ /ai-office?agent=<id>（3D で同一人物を初期選択）→
// 詳細へ戻る往復で「同じ agent」が保たれることを検証する。人物・プロフィール・状態は getAiCharacter と
// read model（deriveAgentState）を単一正本とするため、DB 生 status への依存はない。

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

test('AI社員 一覧→詳細→3Dオフィス→詳細で同一 agent が保たれる（人物正本統一）', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');

  // 一覧: ポートレート（SVG）と状態バッジが出ている（生 emoji ロボットではない）。
  await page.goto('/ai-agents');
  const firstCard = page.locator('[data-testid^="ai-agent-card-"]').first();
  await expect(firstCard).toBeVisible();
  await expect(firstCard.locator('svg').first()).toBeVisible();

  // 詳細へ遷移し、id を取得。
  await firstCard.click();
  await page.waitForURL('**/ai-agents/**');
  const detailUrl = new URL(page.url());
  const agentId = detailUrl.pathname.split('/').pop()!;
  expect(agentId).toBeTruthy();

  // 詳細: キャラクター設定（プロフィールカード）と稼働状態が表示される。
  await expect(page.getByTestId('ai-profile-card')).toBeVisible();
  await expect(page.getByTestId('ai-profile-name')).not.toBeEmpty();

  // 3D オフィスへの deep link → 同じ agent が初期選択される。
  await page.getByTestId('to-3d-office').click();
  await page.waitForURL(`**/ai-office?agent=${agentId}`);
  await expect(page.getByTestId('ai-office-detail')).toHaveAttribute('data-agent-id', agentId);

  // 3D → AI社員ページへの逆 deep link → 同じ詳細へ戻る。
  await page.getByTestId('to-ai-agent').click();
  await page.waitForURL(`**/ai-agents/${agentId}`);
  await expect(page.getByTestId('ai-profile-card')).toBeVisible();
});

test('存在しない/別テナントの agent id は存在を漏らさず 404 になる', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  const res = await page.goto('/ai-agents/nonexistent-cross-tenant-id');
  expect(res?.status()).toBe(404);
});
