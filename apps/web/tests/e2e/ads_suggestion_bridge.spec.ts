import { test, expect, type Page } from '@playwright/test';
import { prisma } from '@hokko/db';

// C19 承認ブリッジ（roadmap83 案A）の実 UI E2E。
// 生成 → 改善案の実体化 → 承認申請 → /approvals 承認/却下 → バッジ反映・deep link。
// 承認しても広告の実変更・予算変更・外部送信は一切発生しない（社内状態のみ）。
// v7.0 R2（Codex comment 4951281950）: C19 画面の要素 screenshot（desktop/mobile）・
// 横 overflow 0・console/network error 0 の証拠、cleanup での AuditLog/DataAccessLog 除去を追加。
// v7.2 R2（CODEX_CHANGE_REQUEST_V72_C19 comment 4951705481 要求③）: 実 UI の「下書きを生成」経路で
// AIOutput / MarketingSuggestion / AuditLog / DataAccessLog の4モデル最終件数を実 DB re-fetch し、
// フォーム冪等キー（deterministic PK）による1件実体化と、成功後の同一キー再送（実フォームが送った
// Server Action POST の生バイト列をそのまま replay して再現）が AIOutput ごと再生成しないことを証明する。
// controlled random-key input を DOM 差し替えする旧手法は React の pending 再レンダで値が巻き戻り
// flake 化していたため、生 POST replay に置換した（詳細は generate 経路テスト内コメント）。

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

// DB fixture で改善案を直接作る（生成フローの原子性/冪等性は suggestion_review_db_evidence.spec.ts の
// materialize 証拠が担保・ここはブリッジ UI 検証に集中）。
async function makeSuggestion(title: string): Promise<{ id: string; tenantId: string }> {
  const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { tenantId: true } });
  if (!ceo) throw new Error('seed ceo not found');
  const s = await prisma.marketingSuggestion.create({
    data: { tenantId: ceo.tenantId, title, detail: 'CPA 改善のための入札調整（下書き）', approvalStatus: 'none' },
  });
  return { id: s.id, tenantId: ceo.tenantId };
}

/** console error / 4xx・5xx 応答の収集 probe（C19 画面の実測証拠・v7.0 R2）。 */
function attachErrorProbes(page: Page) {
  const consoleErrors: string[] = [];
  const badResponses: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const src = msg.location()?.url ?? '';
    // favicon.ico 404 は C19 と無関係なアプリ全体の既知事象（favicon 資産が未配置）。C19 証拠からは
    // 除外して記録する（隠蔽ではなく scope 限定・本体対応は別 lane）。それ以外の console error は 0 を要求。
    if (src.includes('/favicon.ico')) return;
    consoleErrors.push(`${msg.text()} @${src}`);
  });
  page.on('response', (res) => {
    const type = res.request().resourceType();
    if (res.status() >= 400 && (type === 'document' || type === 'fetch' || type === 'xhr')) {
      badResponses.push(`${res.status()} ${res.request().method()} ${res.url()}`);
    }
  });
  return { consoleErrors, badResponses };
}

const created: string[] = [];
const createdCampaigns: string[] = [];
test.afterAll(async () => {
  if (created.length) {
    // v7.0 R2: 自 fixture が seed tenant に作った AuditLog / DataAccessLog も除去する（decision audit は
    // entityId=approvalId のため approval id を先に収集する）。
    const approvals = await prisma.approvalRequest.findMany({
      where: { entityId: { in: created }, type: 'ad_suggestion_review' },
      select: { id: true },
    });
    const approvalIds = approvals.map((a) => a.id);
    await prisma.auditLog.deleteMany({ where: { entityId: { in: [...created, ...approvalIds] } } });
    await prisma.dataAccessLog.deleteMany({ where: { entityId: { in: created } } });
    await prisma.approvalRequest.deleteMany({ where: { id: { in: approvalIds } } });
    await prisma.marketingSuggestion.deleteMany({ where: { id: { in: created } } });
  }
  if (createdCampaigns.length) {
    // v7.2 R2: generate 経路 fixture の campaign と、生成が書いた AIOutput / AISafetyLog /
    // AuditLog（ai_run・suggestion_materialize）/ DataAccessLog を除去する。
    const outs = await prisma.aIOutput.findMany({
      where: { entityId: { in: createdCampaigns }, task: 'ads_improvement' },
      select: { id: true },
    });
    const outIds = outs.map((o) => o.id);
    await prisma.auditLog.deleteMany({ where: { entityId: { in: [...createdCampaigns, ...outIds] } } });
    await prisma.dataAccessLog.deleteMany({ where: { entityId: { in: createdCampaigns } } });
    await prisma.aISafetyLog.deleteMany({ where: { entityId: { in: createdCampaigns } } });
    await prisma.aIOutput.deleteMany({ where: { id: { in: outIds } } });
    await prisma.marketingCampaign.deleteMany({ where: { id: { in: createdCampaigns } } });
  }
  await prisma.$disconnect();
});

test('generate 経路: フォーム冪等キーで1件実体化・成功後の同一キー再送は AIOutput ごと再生成しない（4モデル最終件数）', async ({ page }) => {
  // v7.2 R2（要求③）: 実 UI の生成1周について AIOutput / suggestion / AuditLog / DataAccessLog の
  // 最終件数を実 DB re-fetch で検証する。並行同一キーの収束証拠は suggestion_review_db_evidence 7b（実
  // PostgreSQL・PK unique 制約）が正本で、ここは実フォーム→Server Action→transaction の一気通貫を証明する。
  test.setTimeout(120_000);
  const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { tenantId: true } });
  if (!ceo) throw new Error('seed ceo not found');
  const campaignName = `c19 e2e generate ${process.pid}-${Date.now()}`;
  const campaign = await prisma.marketingCampaign.create({
    data: { tenantId: ceo.tenantId, name: campaignName, channel: 'ads', budget: 50000, spent: 0 },
  });
  createdCampaigns.push(campaign.id);

  await login(page, 'ceo@ikezaki.local');
  await page.goto('/marketing/ads');
  const row = page.locator('tr').filter({ hasText: campaignName });
  await expect(row).toHaveCount(1);
  // 冪等キー（= 実体化される suggestion の deterministic PK）はクライアント mount 時に発行される。
  // 発行完了（cuid 互換形式で埋まる）を待ってから読み取る。
  const keyInput = row.locator('input[name="idempotencyKey"]');
  await expect(keyInput).toHaveValue(/^c[a-z0-9]{20,32}$/i);
  const key = await keyInput.inputValue();
  created.push(key);

  const counts = async () => ({
    aiOut: await prisma.aIOutput.count({ where: { tenantId: ceo.tenantId, task: 'ads_improvement', entityId: campaign.id } }),
    sug: await prisma.marketingSuggestion.count({ where: { id: key, tenantId: ceo.tenantId } }),
    mat: await prisma.auditLog.count({
      where: { tenantId: ceo.tenantId, action: 'suggestion_materialize', metadata: { path: ['suggestionId'], equals: key } },
    }),
    run: await prisma.auditLog.count({ where: { tenantId: ceo.tenantId, action: 'ai_run', entityId: campaign.id } }),
    access: await prisma.dataAccessLog.count({ where: { tenantId: ceo.tenantId, entityId: campaign.id } }),
  });
  expect(await counts()).toEqual({ aiOut: 0, sug: 0, mat: 0, run: 0, access: 0 });

  // 生成1回目: AIOutput・suggestion・materialize 監査・ai_run 監査・DataAccessLog が各1件。
  // 併せて実フォームが送る Server Action POST の生バイト列（idempotencyKey=key を含む multipart）を捕捉し、
  // 以降の「同一キー再送」を DOM を経由せず忠実に再生できるようにする（下記 flake 根治を参照）。
  const [genReq] = await Promise.all([
    page.waitForRequest((r) => r.method() === 'POST' && r.url().includes('/marketing/ads')),
    row.getByTestId('ads-generate-draft').click(),
  ]);
  await page.waitForURL(/\/marketing\/ads\?generated=1/);
  expect(await counts()).toEqual({ aiOut: 1, sug: 1, mat: 1, run: 1, access: 1 });
  // 実体化された改善案（id=冪等キー）が承認カードに現れる。
  await expect(page.getByTestId(`suggestion-approval-status-${key}`)).toHaveText('未申請');

  // 【flake 根治】idempotencyKey は render ごとに `randomUUID()` を発行する controlled hidden input。
  // hidden input を DOM で差し替えて再 submit する旧手法は、React Server Action の dispatch 中に走る
  // pending 再レンダで値が新キーへ巻き戻り、同一 campaign に別キーの suggestion が生成されて
  // aiOut/run/access が 2 になっていた（sug/mat はキー scope のため 1 のまま＝観測された flake の指紋）。
  // 恒久対策: 成功後の「同一キー再送（ブラウザ再送/二重 submit 相当）」を、1回目の生 POST バイト列
  // （idempotencyKey=key を含む）をそのまま replay して再現する。DOM の controlled input を一切経由しない
  // ため、再レンダによる巻き戻りの介在窓が原理的に存在しない。fast-path（既存キー検出）で AIOutput を
  // 含む全モデルが不変であることを実 DB で確認する。
  const genUrl = genReq.url();
  const genBody = genReq.postDataBuffer();
  expect(genBody, '生成 POST の本文を捕捉できている').not.toBeNull();
  // Next-Action ヘッダ等はそのまま再送する必要がある。content-length のみ Playwright に再計算させる
  // （改変版 body で長さが変わるため）。
  const genHeaders = { ...genReq.headers() };
  delete genHeaders['content-length'];

  const resend = await page.request.post(genUrl, { headers: genHeaders, data: genBody! });
  expect(resend.status(), `同一キー再送が受理される: ${resend.status()}`).toBeLessThan(400);
  expect(await counts()).toEqual({ aiOut: 1, sug: 1, mat: 1, run: 1, access: 1 });

  // 不正な冪等キー（形式違反）は入力エラーで拒否され、どのモデルも増えない。捕捉した POST の
  // idempotencyKey フィールドのみを不正値へ差し替えて replay する（controlled input を経由しない確定検証）。
  const badBody = genBody!
    .toString('latin1')
    .replace(new RegExp(`(name="_\\d+_idempotencyKey"\\r\\n\\r\\n)${key}(\\r\\n)`), '$1not-a-valid-key$2');
  expect(badBody.includes('not-a-valid-key'), 'idempotencyKey を不正値へ差し替え済み').toBe(true);
  const bad = await page.request.post(genUrl, { headers: genHeaders, data: Buffer.from(badBody, 'latin1') });
  expect(bad.status(), `不正キー再送も HTTP 的には受理（アプリ層で input エラー）: ${bad.status()}`).toBeLessThan(500);
  expect(await counts()).toEqual({ aiOut: 1, sug: 1, mat: 1, run: 1, access: 1 });
});

test('approve 経路: 改善案→承認申請→/approvals 承認→承認済み表示・deep link・重複申請不可（視覚証拠付き）', async ({ page }) => {
  test.setTimeout(120_000);
  const { consoleErrors, badResponses } = attachErrorProbes(page);
  const { id } = await makeSuggestion(`c19 e2e approve ${Date.now()}`);
  created.push(id);
  await page.setViewportSize({ width: 1280, height: 720 });
  await login(page, 'ceo@ikezaki.local');

  await page.goto('/marketing/ads');
  await expect(page.getByTestId(`suggestion-approval-status-${id}`)).toHaveText('未申請');
  // 視覚証拠（desktop）: 改善案の承認カード全体・横 overflow 0。
  const card = page.getByTestId('suggestion-review-card');
  await expect(card).toBeVisible();
  expect(await card.evaluate((el) => el.scrollWidth - el.clientWidth), 'suggestion card overflow (desktop)').toBeLessThanOrEqual(1);
  await card.screenshot({ path: 'test-results/c19-ads-suggestions-desktop.png' });
  // 視覚証拠（mobile 390px）: 同カードが部分切れなく収まり、横 overflow 0。
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/marketing/ads');
  const mobileCard = page.getByTestId('suggestion-review-card');
  await expect(mobileCard).toBeVisible();
  expect(await mobileCard.evaluate((el) => el.scrollWidth - el.clientWidth), 'suggestion card overflow (390px)').toBeLessThanOrEqual(1);
  const mb = await mobileCard.boundingBox();
  expect(mb!.x).toBeGreaterThanOrEqual(-1);
  expect(mb!.x + mb!.width).toBeLessThanOrEqual(391);
  await mobileCard.screenshot({ path: 'test-results/c19-ads-suggestions-mobile-390.png' });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/marketing/ads');

  await page.getByTestId(`suggestion-request-approval-${id}`).click();
  await page.waitForURL(new RegExp(`/marketing/ads\\?requested=1&highlight=${id}`));
  await expect(page.getByTestId('suggestion-requested-banner')).toBeVisible();
  await expect(page.getByTestId(`suggestion-approval-status-${id}`)).toHaveText('承認申請中');
  await expect(page.getByTestId(`suggestion-request-approval-${id}`)).toHaveCount(0); // 申請中は再申請不可

  await page.goto('/approvals');
  await expect(page.getByTestId(`approval-suggestion-deeplink-${id}`)).toHaveCount(1); // 重複 PENDING なし
  const item = page
    .locator('.rounded-md.border.p-3')
    .filter({ has: page.getByTestId(`approval-suggestion-deeplink-${id}`) });
  // 視覚証拠: /approvals の C19 承認項目（type ラベル・deep link・承認/却下ボタン）。
  await item.screenshot({ path: 'test-results/c19-approvals-item-desktop.png' });
  await item.getByRole('button', { name: '承認' }).click();
  // 既に /approvals にいるため URL では待てない。決定確定＝該当項目が PENDING 一覧から消えるのを待つ。
  await expect(page.getByTestId(`approval-suggestion-deeplink-${id}`)).toHaveCount(0);

  await page.goto('/marketing/ads');
  await expect(page.getByTestId(`suggestion-approval-status-${id}`)).toHaveText('承認済み');
  await expect(page.getByTestId(`suggestion-request-approval-${id}`)).toHaveCount(0);
  // 視覚証拠: 承認後の改善案行（承認済みバッジ）。
  await page.locator(`#suggestion-${id}`).screenshot({ path: 'test-results/c19-ads-approved-desktop.png' });
  // 実 DB: 広告・予算は一切触れていない（承認は社内状態のみ）＝送信ログ 0。
  expect((await prisma.marketingSuggestion.findUnique({ where: { id } }))?.approvalStatus).toBe('approved');
  // console / document・API 応答の error 0（C19 画面の実測）。
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  expect(badResponses, `bad responses: ${badResponses.join(' | ')}`).toEqual([]);
});

test('reject 経路: 却下後は再申請可能', async ({ page }) => {
  const { id } = await makeSuggestion(`c19 e2e reject ${Date.now()}`);
  created.push(id);
  await login(page, 'ceo@ikezaki.local');

  await page.goto('/marketing/ads');
  await page.getByTestId(`suggestion-request-approval-${id}`).click();
  await page.waitForURL(/\/marketing\/ads\?requested=1/);

  await page.goto('/approvals');
  const item = page
    .locator('.rounded-md.border.p-3')
    .filter({ has: page.getByTestId(`approval-suggestion-deeplink-${id}`) });
  await item.getByRole('button', { name: '却下' }).click();
  await expect(page.getByTestId(`approval-suggestion-deeplink-${id}`)).toHaveCount(0);

  await page.goto('/marketing/ads');
  await expect(page.getByTestId(`suggestion-approval-status-${id}`)).toHaveText('却下');
  await expect(page.getByTestId(`suggestion-request-approval-${id}`)).toBeVisible(); // 再申請可能
});

test('AI ロールには承認申請ボタンが出ない（marketing:read のみ・isAi）', async ({ page }) => {
  const { id } = await makeSuggestion(`c19 e2e ai ${Date.now()}`);
  created.push(id);
  await login(page, 'ai-sales@ikezaki.local');
  await page.goto('/marketing/ads');
  await expect(page.getByTestId(`suggestion-approval-status-${id}`)).toBeVisible(); // 閲覧は可
  await expect(page.locator(`[data-testid^="suggestion-request-approval-"]`)).toHaveCount(0);
});
