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

test('8名全員で 一覧・詳細・3D Office の canonical key/fullName/state が値一致する（人物正本統一）', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/ai-agents');
  const cards = page.locator('[data-testid^="ai-agent-card-"]');
  await expect(cards).toHaveCount(AGENT_KEYS.length);

  // 一覧から 8 枚の id/key/name/state を収集。
  type Row = { id: string; key: string; name: string; state: string };
  const rows: Row[] = [];
  for (let i = 0; i < AGENT_KEYS.length; i++) {
    const c = cards.nth(i);
    const tid = (await c.getAttribute('data-testid'))!;
    rows.push({
      id: tid.replace('ai-agent-card-', ''),
      key: (await c.getAttribute('data-agent-key'))!,
      name: (await c.getAttribute('data-agent-name'))!,
      state: (await c.getAttribute('data-agent-state'))!,
    });
  }
  expect(new Set(rows.map((r) => r.id)).size).toBe(AGENT_KEYS.length); // id 重複なし
  expect(new Set(rows.map((r) => r.key)).size).toBe(AGENT_KEYS.length); // key 重複なし
  expect(rows.map((r) => r.key).sort()).toEqual([...AGENT_KEYS].sort()); // 8 canonical key 一致

  for (const r of rows) {
    // 詳細画面: key/name/state が一覧と値一致・プロフィールカードあり。
    await page.goto(`/ai-agents/${r.id}`);
    const detail = page.getByTestId('ai-agent-detail-root');
    await expect(detail).toHaveAttribute('data-agent-key', r.key);
    await expect(detail).toHaveAttribute('data-agent-name', r.name);
    await expect(detail).toHaveAttribute('data-agent-state', r.state);
    await expect(page.getByTestId('ai-profile-card')).toBeVisible();
    await expect(page.getByTestId('ai-profile-name')).toHaveText(r.name);
    await expect(page.getByTestId('to-3d-office')).toHaveAttribute('href', `/ai-office?agent=${r.id}`);

    // 3D Office: 同一 agent が初期選択され、key/name/state が値一致。
    await page.goto(`/ai-office?agent=${r.id}`);
    const office = page.getByTestId('ai-office-detail');
    await expect(office).toHaveAttribute('data-agent-id', r.id);
    await expect(office).toHaveAttribute('data-agent-key', r.key);
    await expect(office).toHaveAttribute('data-agent-name', r.name);
    await expect(office).toHaveAttribute('data-agent-state', r.state);
    await expect(page.getByTestId('to-ai-agent')).toHaveAttribute('href', `/ai-agents/${r.id}`);
  }
});

test('AI社員カードは desktop/mobile で横 overflow しない（長い permission 説明の折返し）', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  for (const vp of [{ width: 1280, height: 720 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(vp);
    await page.goto('/ai-agents');
    const cards = page.locator('[data-testid^="ai-agent-card-"]');
    await expect(cards.first()).toBeVisible();
    const n = await cards.count();
    for (let i = 0; i < n; i++) {
      const over = await cards.nth(i).evaluate((el) => el.scrollWidth - el.clientWidth);
      expect(over, `card ${i} overflow @${vp.width}`).toBeLessThanOrEqual(1);
    }
    // ページ全体も横 overflow しない。
    const pageOver = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(pageOver, `page overflow @${vp.width}`).toBeLessThanOrEqual(1);
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
