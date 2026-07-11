import { test, expect, type Page } from '@playwright/test';
import { prisma } from '@hokko/db';
import { getAiCharacter } from '@hokko/shared';

// portrait の決定論 fingerprint（components/ai-office/portrait.tsx と同一定義）。
function expectedPortraitFp(key: string): string {
  const p = getAiCharacter(key);
  const a = p.appearance;
  return [p.key, a.genderStyle, a.hairStyle, a.hairColor, a.hairShadow, a.skinTone, a.eyeColor, a.suitColor, a.accentColor, a.glasses ? 'glasses' : 'no-glasses'].join('|');
}
const normText = (s: string) => s.replace(/\s+/g, ' ').trim();

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

  // v6.6: 全プロフィール項目を「画面上の実値」で 詳細⇔3D 間で比較する（fingerprint は補助）。
  // 正本は getAiCharacter(key) の1つで、両画面が同じ人物の値を描画していることを field 単位で証明する。
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
  type Profile = { name: string; epithet: string; personality: string; skills: string; traits: string; mistakes: string; evalNote: string };
  async function readProfile(prefix: string): Promise<Profile> {
    const textOf = async (id: string) => {
      const loc = page.getByTestId(id);
      return (await loc.count()) > 0 ? norm(await loc.first().innerText()) : '';
    };
    const skillsLoc = page.getByTestId(`${prefix}-skills`);
    const skills =
      (await skillsLoc.count()) > 0
        ? (await skillsLoc.locator('[data-skill]').evaluateAll((els) => els.map((e) => (e as HTMLElement).getAttribute('data-skill')).join('|')))
        : '';
    return {
      name: await textOf(`${prefix}-name`),
      epithet: await textOf(`${prefix}-epithet`),
      personality: await textOf(`${prefix}-personality`),
      skills,
      traits: await textOf(`${prefix}-traits`),
      mistakes: await textOf(`${prefix}-mistakes`),
      evalNote: await textOf(`${prefix}-eval`),
    };
  }

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
    await expect(page.getByTestId('ai-profile-card').locator('svg').first()).toBeVisible(); // portrait(SVG)
    const detailProfile = await readProfile('ai-profile');
    const detailFp = await page.getByTestId('ai-profile-card').getByTestId('ai-portrait').getAttribute('data-portrait-fp');
    // v6.7: 画面上の実値を getAiCharacter(key) の期待値へ**直接照合**（詳細⇔3D 相互一致だけで合格にしない）。
    const exp = getAiCharacter(r.key);
    expect(detailProfile.name, `fullName ${r.key}`).toBe(exp.fullName);
    expect(detailProfile.personality, `personality ${r.key}`).toBe(normText(exp.personality));
    expect(detailProfile.skills, `skills ${r.key}`).toBe(exp.skills.map((s) => `${s.name}:${s.level}`).join('|'));
    expect(detailProfile.epithet, `epithet ${r.key}`).toContain(exp.epithet);
    for (const t of exp.traits) expect(detailProfile.traits, `trait "${t}" ${r.key}`).toContain(normText(t));
    for (const m of exp.commonMistakes) expect(detailProfile.mistakes, `mistake "${m}" ${r.key}`).toContain(normText(m));
    expect(detailProfile.evalNote, `eval ${r.key}`).toBe(normText(exp.evaluationNote));
    // portrait identity: SVG 存在だけでなく決定論 fingerprint を期待 appearance 値へ照合。
    expect(detailFp, `portrait fp ${r.key}`).toBe(expectedPortraitFp(r.key));
    // 全項目が非空（設定済み8名は空プロフィールでない）。
    expect(detailProfile.personality.length, `personality empty ${r.key}`).toBeGreaterThan(0);
    expect(detailProfile.skills.length, `skills empty ${r.key}`).toBeGreaterThan(0);

    // 3D Office: 同一 agent が初期選択され、key/name/state が値一致。
    await page.goto(`/ai-office?agent=${r.id}`);
    const office = page.getByTestId('ai-office-detail');
    await expect(office).toHaveAttribute('data-agent-id', r.id);
    await expect(office).toHaveAttribute('data-agent-key', r.key);
    await expect(office).toHaveAttribute('data-agent-name', r.name);
    await expect(office).toHaveAttribute('data-agent-state', r.state);
    await expect(page.getByTestId('to-ai-agent')).toHaveAttribute('href', `/ai-agents/${r.id}`);
    await expect(page.getByTestId('ai-office-profile').locator('svg').first()).toBeVisible(); // portrait(SVG)
    const officeProfile = await readProfile('ai-office-profile');
    const officeFp = await page.getByTestId('ai-office-profile').getByTestId('ai-portrait').getAttribute('data-portrait-fp');
    // 3D 側 portrait fingerprint も期待値へ一致（詳細と同一 identity）。
    expect(officeFp, `office portrait fp ${r.key}`).toBe(expectedPortraitFp(r.key));

    // 全プロフィール項目を field 単位で実値比較（同一正本＝完全一致）。
    expect(officeProfile.name, `name mismatch ${r.key}`).toBe(detailProfile.name);
    expect(officeProfile.name).toBe(r.name);
    expect(officeProfile.epithet, `epithet mismatch ${r.key}`).toBe(detailProfile.epithet);
    expect(officeProfile.personality, `personality mismatch ${r.key}`).toBe(detailProfile.personality);
    expect(officeProfile.skills, `skills mismatch ${r.key}`).toBe(detailProfile.skills);
    expect(officeProfile.traits, `traits mismatch ${r.key}`).toBe(detailProfile.traits);
    expect(officeProfile.mistakes, `mistakes mismatch ${r.key}`).toBe(detailProfile.mistakes);
    expect(officeProfile.evalNote, `evaluationNote mismatch ${r.key}`).toBe(detailProfile.evalNote);
    // 補助: 全項目連結の fingerprint 一致。
    expect(JSON.stringify(officeProfile), `fingerprint mismatch ${r.key}`).toBe(JSON.stringify(detailProfile));
  }
});

// v6.7 P3: 真の client navigation。`page.goto`（フルロード）ではなく、**画面上の社員選択**で `?agent=` を
// router.push（同一 AiOffice を保持したまま query 変更）し、back/forward・query 無し手動選択・無効/別 tenant ID を検証する。
test('3D Office は 画面上の社員選択（真の client nav）で ?agent= を変え、back/forward で同期する', async ({ page }) => {
  test.setTimeout(120_000);
  await login(page, 'ceo@ikezaki.local');
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

  // 真の client nav: 2D 一覧の B を**クリック選択** → router.push で ?agent=B（フルロードなし）。
  await page.getByTestId(`ai-office-select-${idB}`).click();
  await expect(office).toHaveAttribute('data-agent-id', idB);
  await expect(page).toHaveURL(new RegExp(`agent=${idB}`));

  // ブラウザ back → A（popstate soft nav・コンポーネント継続）。forward → B。
  await page.goBack();
  await expect(office).toHaveAttribute('data-agent-id', idA);
  await page.goForward();
  await expect(office).toHaveAttribute('data-agent-id', idB);

  // query 無しで開くと手動選択（先頭自動選択）を上書きしない＝以後の手動クリックが維持される。
  await page.goto('/ai-office');
  await page.getByTestId(`ai-office-select-${idB}`).click();
  await expect(office).toHaveAttribute('data-agent-id', idB);

  // 無効 ID・別 tenant 実在 ID は初期選択されない（存在を漏らさず既定＝先頭にフォールバック）。
  await page.goto('/ai-office?agent=__invalid__');
  const sel = await office.getAttribute('data-agent-id');
  expect(sel).not.toBe('__invalid__');
  expect(AGENT_KEYS.length).toBeGreaterThan(0);
});

// v6.7 P3: プロフィール要素全体（上端・評価コメント・下端）を切れない element screenshot として artifact 化。
test('AI社員プロフィール要素の証拠 screenshot（desktop/mobile・切れなし）', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/ai-agents');
  const firstCard = page.locator('[data-testid^="ai-agent-card-"]').first();
  const id = (await firstCard.getAttribute('data-testid'))!.replace('ai-agent-card-', '');

  for (const vp of [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    // 詳細のプロフィールカード要素全体（評価コメントまで）。
    await page.goto(`/ai-agents/${id}`);
    const card = page.getByTestId('ai-profile-card');
    await expect(card).toBeVisible();
    await expect(card.getByTestId('ai-profile-eval')).toBeVisible();
    const detShot = await card.screenshot();
    await testInfo.attach(`ai-profile-detail-${vp.name}.png`, { body: detShot, contentType: 'image/png' });
    // 3D 側プロフィール要素全体。
    await page.goto(`/ai-office?agent=${id}`);
    const officeProfile = page.getByTestId('ai-office-profile');
    await expect(officeProfile).toBeVisible();
    await expect(officeProfile.getByTestId('ai-office-profile-eval')).toBeVisible();
    const offShot = await officeProfile.screenshot();
    await testInfo.attach(`ai-profile-office-${vp.name}.png`, { body: offShot, contentType: 'image/png' });
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

// v6.4 High（nested child tenant isolation）の回帰: 現テナントの agent に対し、agentId は一致するが
// tenantId が別テナントの子（run/action/memory）を注入しても、詳細画面に一切表示されないことを確認する。
// 旧実装（子を親 relation の agentId だけでスコープ）ではこの子が漏れていた。各子クエリの tenantId 明示で塞ぐ。
test.describe('cross-tenant child isolation（agentId 一致・tenantId 別の子は非表示）', () => {
  const FOREIGN_TENANT = 'e2e-cross-tenant-child-v65';
  const LEAK = 'CROSS_TENANT_CHILD_LEAK_V65';
  // v6.7 追加: 「自 tenant の run が別 tenant agent を参照する」逆方向の越境。
  const FOREIGN_AGENT_NAME = 'FOREIGN_AGENT_NAME_V67';
  const OWN_RUN_FOREIGN_AGENT = 'OWNRUN_FOREIGNAGENT_LEAK_V67';
  let ownAgentId = '';
  let ownTenantId = '';
  let foreignTenantId = '';
  let foreignAgentId = '';
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
    ownTenantId = ceo.tenantId;
    const foreign = await prisma.tenant.create({ data: { name: FOREIGN_TENANT } });
    foreignTenantId = foreign.id;
    // ① agentId は自テナント agent を指すが、tenantId は別テナントの「越境した子」。
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
    // ② 逆方向（v6.7）: 別テナントの実在 agent と、それを参照する「自テナントの run」。
    const foreignAgent = await prisma.aIAgent.create({
      data: { tenantId: foreignTenantId, key: 'sales', name: FOREIGN_AGENT_NAME, role: 'x', department: 'x', autonomy: 'supervised' },
    });
    foreignAgentId = foreignAgent.id;
    const ownRunForeignAgent = await prisma.aIAgentRun.create({
      data: { tenantId: ownTenantId, agentId: foreignAgentId, task: OWN_RUN_FOREIGN_AGENT, status: 'SUCCEEDED' },
    });
    createdRunIds.push(ownRunForeignAgent.id);
  });

  test.afterAll(async () => {
    if (createdActionIds.length) await prisma.aIAgentAction.deleteMany({ where: { id: { in: createdActionIds } } });
    if (createdRunIds.length) await prisma.aIAgentRun.deleteMany({ where: { id: { in: createdRunIds } } });
    if (createdMemoryIds.length) await prisma.aIAgentMemory.deleteMany({ where: { id: { in: createdMemoryIds } } });
    if (foreignAgentId) await prisma.aIAgent.deleteMany({ where: { id: foreignAgentId } });
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

  test('v6.7: 自テナントの run でも参照先が別テナント agent なら一覧に出ない（agent 名も漏れない）', async ({ page }) => {
    test.skip(!foreignAgentId || !ownTenantId, 'seed 未整備のためスキップ');
    await login(page, 'ceo@ikezaki.local');
    await page.goto('/ai-agents');
    await expect(page.locator('[data-testid^="ai-agent-card-"]').first()).toBeVisible();
    const listBody = await page.locator('body').innerText();
    // own-tenant run だが agentId が別テナント → own-tenant agent 集合で締め出され一覧に出ない。
    expect(listBody).not.toContain(OWN_RUN_FOREIGN_AGENT);
    // 別テナント agent の名前も relation 経由で漏れない（表示名は tenant スコープの read model 由来）。
    expect(listBody).not.toContain(FOREIGN_AGENT_NAME);
    // 別テナント agent 詳細は 404。
    const res = await page.goto(`/ai-agents/${foreignAgentId}`);
    expect(res?.status()).toBe(404);
  });
});
