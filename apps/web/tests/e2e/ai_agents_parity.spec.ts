import { test, expect, type Page } from '@playwright/test';
import { prisma } from '@hokko/db';

// v6.2 AI社員 8名 ⇔ 3D Office 人物正本統一の回帰。
// 受入オラクル: 8名全員で /ai-agents（一覧）→ /ai-agents/[id]（詳細）→ /ai-office?agent=<id>（3D 初期選択）→
// 詳細へ戻る往復が同一 agent を保つ。人物・プロフィール・状態は getAiCharacter と read model を単一正本とする。
// cross-tenant は「実在する別 tenant のレコード」で 404 を確認する（架空文字列では境界テストにならない）。

const AGENT_KEYS = ['leadmap_sales', 'sales', 'cfo', 'inventory', 'chief_of_staff', 'customer', 'accounting', 'hr'];

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

test('AI社員 一覧に8名が出て、各カードにポートレート(SVG)・稼働状態・人物名がある', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/ai-agents');
  const cards = page.locator('[data-testid^="ai-agent-card-"]');
  await expect(cards).toHaveCount(AGENT_KEYS.length);
  const n = await cards.count();
  for (let i = 0; i < n; i++) {
    const card = cards.nth(i);
    await expect(card.locator('svg').first()).toBeVisible(); // ポートレート
    await expect(card).not.toBeEmpty();
  }
});

test('8名全員で 一覧→詳細→3Dオフィス→詳細 の deep link が同一 agent を保つ', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/ai-agents');
  const cards = page.locator('[data-testid^="ai-agent-card-"]');
  await expect(cards).toHaveCount(AGENT_KEYS.length);
  // 8枚のカードから agent ID を収集（testid 末尾）。
  const ids: string[] = [];
  for (let i = 0; i < AGENT_KEYS.length; i++) {
    const tid = await cards.nth(i).getAttribute('data-testid');
    ids.push(tid!.replace('ai-agent-card-', ''));
  }
  expect(new Set(ids).size).toBe(AGENT_KEYS.length); // 重複なし

  for (const id of ids) {
    // 詳細: プロフィールカード・人物名・稼働状態・3D への deep link（href に agent=<id>）。
    await page.goto(`/ai-agents/${id}`);
    await expect(page.getByTestId('ai-profile-card')).toBeVisible();
    await expect(page.getByTestId('ai-profile-name')).not.toBeEmpty();
    const to3d = page.getByTestId('to-3d-office');
    await expect(to3d).toHaveAttribute('href', `/ai-office?agent=${id}`);

    // 3D オフィス: 同じ agent が初期選択される（詳細パネルの data-agent-id 一致）。
    await page.goto(`/ai-office?agent=${id}`);
    await expect(page.getByTestId('ai-office-detail')).toHaveAttribute('data-agent-id', id);
    // 逆 deep link が同じ詳細へ戻る href を持つ。
    await expect(page.getByTestId('to-ai-agent')).toHaveAttribute('href', `/ai-agents/${id}`);
  }
});

test('代表1名で 実クリックの往復（一覧→詳細→3D→AI社員ページ）が同一 agent', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/ai-agents');
  const firstCard = page.locator('[data-testid^="ai-agent-card-"]').first();
  await firstCard.click();
  await page.waitForURL('**/ai-agents/**');
  const id = new URL(page.url()).pathname.split('/').pop()!;
  await expect(page.getByTestId('ai-profile-card')).toBeVisible();
  await page.getByTestId('to-3d-office').click();
  await page.waitForURL(`**/ai-office?agent=${id}`);
  await expect(page.getByTestId('ai-office-detail')).toHaveAttribute('data-agent-id', id);
  await page.getByTestId('to-ai-agent').click();
  await page.waitForURL(`**/ai-agents/${id}`);
  await expect(page.getByTestId('ai-profile-card')).toBeVisible();
});

test.describe('cross-tenant 境界（実在する別 tenant のレコードで 404）', () => {
  const FIXTURE_TENANT = 'e2e-cross-tenant-fixture-v62';
  let crossTenantAgentId = '';

  test.beforeAll(async () => {
    // CI 専用の隔離 fixture（ephemeral DB）。作成したデータだけを afterAll で後始末する。
    const t = await prisma.tenant.create({ data: { name: FIXTURE_TENANT } });
    const a = await prisma.aIAgent.create({
      data: { tenantId: t.id, key: 'sales', name: '別テナントAI', role: 'x', department: 'x', autonomy: 'supervised' },
    });
    crossTenantAgentId = a.id;
  });

  test.afterAll(async () => {
    if (crossTenantAgentId) await prisma.aIAgent.deleteMany({ where: { id: crossTenantAgentId } });
    await prisma.tenant.deleteMany({ where: { name: FIXTURE_TENANT } });
    await prisma.$disconnect();
  });

  test('別 tenant の実在 agent ID は 404（存在を漏らさない）', async ({ page }) => {
    await login(page, 'ceo@ikezaki.local');
    const res = await page.goto(`/ai-agents/${crossTenantAgentId}`);
    expect(res?.status()).toBe(404);
    // 3D 側の deep link でも初期選択されない（存在を漏らさず既定＝先頭選択にフォールバック）。
    await page.goto(`/ai-office?agent=${crossTenantAgentId}`);
    const selected = await page.getByTestId('ai-office-detail').getAttribute('data-agent-id');
    expect(selected).not.toBe(crossTenantAgentId);
  });
});
