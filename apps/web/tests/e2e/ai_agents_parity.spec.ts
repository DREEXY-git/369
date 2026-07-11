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
  // 8名 × (詳細 + 3D Office) = 16 ページ遷移（force-dynamic＋Three.js）で既定 30s を超えるため延長。
  test.setTimeout(120_000);
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
    // v6.4 P2: 人物正本の「値」まで一致を確認する（key/name/state だけでなく portrait/profile 本文）。
    await expect(page.getByTestId('ai-profile-card').locator('svg').first()).toBeVisible(); // portrait(SVG)
    const detailPersonality = (await page.getByTestId('ai-profile-personality').innerText()).trim();
    expect(detailPersonality.length).toBeGreaterThan(0);

    // 3D Office: 同一 agent が初期選択され、key/name/state が値一致。
    await page.goto(`/ai-office?agent=${r.id}`);
    const office = page.getByTestId('ai-office-detail');
    await expect(office).toHaveAttribute('data-agent-id', r.id);
    await expect(office).toHaveAttribute('data-agent-key', r.key);
    await expect(office).toHaveAttribute('data-agent-name', r.name);
    await expect(office).toHaveAttribute('data-agent-state', r.state);
    await expect(page.getByTestId('to-ai-agent')).toHaveAttribute('href', `/ai-agents/${r.id}`);
    // 3D 側でも人物名・ポートレート・性格が詳細画面と同一正本（getAiCharacter）で一致する。
    await expect(page.getByTestId('ai-office-profile-name')).toHaveText(r.name);
    await expect(page.getByTestId('ai-office-profile').locator('svg').first()).toBeVisible();
    const officePersonality = (await page.getByTestId('ai-office-profile-personality').innerText()).trim();
    expect(officePersonality, `personality mismatch for ${r.key}`).toBe(detailPersonality);
  }
});

// v6.4 P2（AiOffice URL 同期）: client-nav（?agent=A→B）とブラウザ back/forward で選択が追従すること。
test('3D Office は ?agent= の client-nav と back/forward で選択が同期する', async ({ page }) => {
  test.setTimeout(120_000);
  await login(page, 'ceo@ikezaki.local');
  // 一覧から 2 名の id を取得。
  await page.goto('/ai-agents');
  const cards = page.locator('[data-testid^="ai-agent-card-"]');
  await expect(cards).toHaveCount(AGENT_KEYS.length);
  const idA = (await cards.nth(0).getAttribute('data-testid'))!.replace('ai-agent-card-', '');
  const idB = (await cards.nth(1).getAttribute('data-testid'))!.replace('ai-agent-card-', '');
  expect(idA).not.toBe(idB);

  const office = page.getByTestId('ai-office-detail');
  // 初期: ?agent=A で A が選択される。
  await page.goto(`/ai-office?agent=${idA}`);
  await expect(office).toHaveAttribute('data-agent-id', idA);
  // ?agent=B へ遷移 → B に同期（deep link が両 agent で機能）。
  await page.goto(`/ai-office?agent=${idB}`);
  await expect(office).toHaveAttribute('data-agent-id', idB);
  // ブラウザ back → A に戻る（App Router は popstate を soft nav で処理＝コンポーネント継続。
  // useSearchParams の反応 effect が無いと選択が B のまま stale になる。この effect の回帰）。
  await page.goBack();
  await expect(office).toHaveAttribute('data-agent-id', idA);
  // forward → B に進む。
  await page.goForward();
  await expect(office).toHaveAttribute('data-agent-id', idB);
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

// v6.4 High（nested child tenant isolation）の回帰: 現テナントの agent に対し、agentId は一致するが
// tenantId が別テナントの子（run/action/memory）を注入しても、詳細画面に一切表示されないことを確認する。
// 旧実装（子を親 relation の agentId だけでスコープ）ではこの子が漏れていた。各子クエリの tenantId 明示で塞ぐ。
test.describe('cross-tenant child isolation（agentId 一致・tenantId 別の子は非表示）', () => {
  const FOREIGN_TENANT = 'e2e-cross-tenant-child-v65';
  const LEAK = 'CROSS_TENANT_CHILD_LEAK_V65';
  let ownAgentId = '';
  let foreignTenantId = '';
  const createdRunIds: string[] = [];
  const createdMemoryIds: string[] = [];
  const createdActionIds: string[] = [];

  test.beforeAll(async () => {
    // CEO の所属テナントと、その配下の実在 agent を 1 体特定する（seed 由来）。
    const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { tenantId: true } });
    const own = ceo
      ? await prisma.aIAgent.findFirst({ where: { tenantId: ceo.tenantId }, select: { id: true } })
      : null;
    if (!ceo || !own) return; // seed 未整備環境ではスキップ（下の test 内で明示 skip）
    ownAgentId = own.id;
    const foreign = await prisma.tenant.create({ data: { name: FOREIGN_TENANT } });
    foreignTenantId = foreign.id;
    // agentId は自テナント agent を指すが、tenantId は別テナントの「越境した子」。
    const run = await prisma.aIAgentRun.create({
      data: { tenantId: foreignTenantId, agentId: ownAgentId, task: `${LEAK}_RUN`, status: 'SUCCEEDED' },
    });
    createdRunIds.push(run.id);
    const action = await prisma.aIAgentAction.create({
      data: { tenantId: foreignTenantId, runId: run.id, type: 'read', summary: `${LEAK}_ACTION` },
    });
    createdActionIds.push(action.id);
    const mem = await prisma.aIAgentMemory.create({
      data: { tenantId: foreignTenantId, agentId: ownAgentId, key: 'leak', value: `${LEAK}_MEMORY` },
    });
    createdMemoryIds.push(mem.id);
  });

  test.afterAll(async () => {
    if (createdActionIds.length) await prisma.aIAgentAction.deleteMany({ where: { id: { in: createdActionIds } } });
    if (createdRunIds.length) await prisma.aIAgentRun.deleteMany({ where: { id: { in: createdRunIds } } });
    if (createdMemoryIds.length) await prisma.aIAgentMemory.deleteMany({ where: { id: { in: createdMemoryIds } } });
    if (foreignTenantId) await prisma.tenant.deleteMany({ where: { id: foreignTenantId } });
    await prisma.$disconnect();
  });

  test('別テナントの run/action/memory は自テナント agent 詳細に漏れない', async ({ page }) => {
    test.skip(!ownAgentId || !foreignTenantId, 'seed 未整備のためスキップ');
    await login(page, 'ceo@ikezaki.local');
    const res = await page.goto(`/ai-agents/${ownAgentId}`);
    expect(res?.status()).toBe(200);
    await expect(page.getByTestId('ai-agent-detail-root')).toBeVisible();
    const body = await page.locator('body').innerText();
    expect(body).not.toContain(`${LEAK}_RUN`);
    expect(body).not.toContain(`${LEAK}_ACTION`);
    expect(body).not.toContain(`${LEAK}_MEMORY`);
    // 一覧の活動ログにも漏れない。
    await page.goto('/ai-agents');
    const listBody = await page.locator('body').innerText();
    expect(listBody).not.toContain(`${LEAK}_RUN`);
    expect(listBody).not.toContain(`${LEAK}_ACTION`);
  });
});
