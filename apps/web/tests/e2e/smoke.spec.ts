import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill('ceo@ikezaki.local');
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

test('CEO ログインしてダッシュボードが表示される', async ({ page }) => {
  await login(page);
  await expect(page.getByText('ようこそ')).toBeVisible();
  await page.goto('/dashboard/ceo');
  await expect(page.getByRole('heading', { name: '社長コックピット' })).toBeVisible();
});

test('顧客一覧が表示される', async ({ page }) => {
  await login(page);
  await page.goto('/customers');
  await expect(page.getByRole('heading', { name: '顧客管理 CRM' })).toBeVisible();
  await expect(page.getByText('株式会社', { exact: false }).first()).toBeVisible();
});

test('案件カンバンが表示される', async ({ page }) => {
  await login(page);
  await page.goto('/deals/kanban');
  await expect(page.getByText('営業パイプライン（カンバン）')).toBeVisible();
});

test('在庫ページが表示される', async ({ page }) => {
  await login(page);
  await page.goto('/inventory');
  await expect(page.getByRole('heading', { name: '在庫・商品管理' })).toBeVisible();
});

test('LeadMap リード一覧と地図が表示される', async ({ page }) => {
  await login(page);
  await page.goto('/leadmap/leads');
  await expect(page.getByRole('heading', { name: 'リード一覧' })).toBeVisible();
  await page.goto('/leadmap/map');
  await expect(page.getByRole('heading', { name: '地図CRM' })).toBeVisible();
});

test('LeadMap キャンペーン作成フロー', async ({ page }) => {
  await login(page);
  await page.goto('/leadmap/campaigns/new');
  await page.getByRole('button', { name: /営業先を抽出/ }).click();
  await page.waitForURL('**/leadmap/campaigns/**');
  await expect(page.getByText('リード数')).toBeVisible();
});

test('リードのAI分析と営業メール生成が表示される', async ({ page }) => {
  await login(page);
  await page.goto('/leadmap/leads');
  await page.getByRole('link', { name: /.+/ }).filter({ hasText: /店|院|サロン|salon|hair|Lien|CALM|feliz/ }).first().click();
  await page.waitForURL('**/leadmap/leads/**');
  await expect(page.getByText('営業先情報')).toBeVisible();
});

test('議事録の取込→AI議事録生成', async ({ page }) => {
  await login(page);
  await page.goto('/meetings/upload');
  await page.getByRole('button', { name: 'AI議事録を生成' }).click();
  await page.waitForURL('**/meetings/**');
  await expect(page.getByText('AI議事録')).toBeVisible();
});

test('承認待ちが表示される', async ({ page }) => {
  await login(page);
  await page.goto('/approvals');
  await expect(page.getByRole('heading', { name: '承認待ち' })).toBeVisible();
});

test('監査ログが表示される', async ({ page }) => {
  await login(page);
  await page.goto('/admin/audit');
  await expect(page.getByRole('heading', { name: '監査ログ' })).toBeVisible();
});

test('ナレッジ検索でAI回答が出る', async ({ page }) => {
  await login(page);
  await page.goto('/knowledge/search?q=' + encodeURIComponent('美容室の営業切り口'));
  await expect(page.getByText('AIの回答', { exact: false })).toBeVisible();
});

test('Company Brain の会社方針一覧が表示される', async ({ page }) => {
  await login(page);
  await page.goto('/brain/policies');
  await expect(page.getByRole('heading', { name: '会社の頭脳（会社方針）' })).toBeVisible();
  await expect(page.getByText('AIと人間の役割分担ポリシー')).toBeVisible();
});

test('Company Brain の会社方針を作成すると一覧に表示される', async ({ page }) => {
  await login(page);
  await page.goto('/brain/policies/new');
  const uniqueTitle = `E2E会社方針-${Date.now()}`;
  await page.getByLabel('タイトル（必須・120文字まで）').fill(uniqueTitle);
  await page.getByLabel('本文（必須・5000文字まで）').fill('E2E テスト用の会社方針本文です。架空の内容で、PII や secret を含みません。');
  await page.getByLabel('分類（必須・80文字まで）').fill('品質方針');
  await page.getByLabel('状態').selectOption('active');
  await page.getByLabel('機密ラベル').selectOption('INTERNAL');
  await page.getByRole('button', { name: '作成する' }).click();
  await page.waitForURL('**/brain/policies');
  await expect(page.getByText(uniqueTitle)).toBeVisible();
});

test('Company Brain の商品カタログを作成すると一覧に表示される', async ({ page }) => {
  await login(page);
  await page.goto('/brain/catalog/new');
  const uniqueName = `E2E商品-${Date.now()}`;
  await page.getByLabel('商品・サービス名（必須・120文字まで）').fill(uniqueName);
  await page.getByLabel('説明（必須・5000文字まで）').fill('E2E テスト用の商品説明です。架空の内容で、PII や secret や実価格を含みません。');
  await page.getByLabel('分類（必須・80文字まで）').fill('Web支援');
  await page.getByLabel('状態').selectOption('active');
  await page.getByLabel('機密ラベル').selectOption('INTERNAL');
  await page.getByRole('button', { name: '作成する' }).click();
  await page.waitForURL('**/brain/catalog');
  await expect(page.getByText(uniqueName)).toBeVisible();
});

test('ナレッジ検索で会社の頭脳の参照元が表示される', async ({ page }) => {
  await login(page);
  await page.goto('/knowledge/search?q=' + encodeURIComponent('値引き承認ルール'));
  await expect(page.getByText('AIの回答', { exact: false })).toBeVisible();
  await expect(page.getByText('参照した会社の頭脳', { exact: false })).toBeVisible();
  await expect(page.getByText('値引き承認ルール').first()).toBeVisible();
});

test('営業プレイブックの一覧がナビ経由で表示される', async ({ page }) => {
  // Phase 2-B-4 で read-only 段階の期待値（作成リンク0件）を仕様変更に合わせて更新（doc57）。
  // ナビHOLD（doc55→doc56）の教訓として、URL直打ちではなくナビリンク経由で確認する。
  await login(page);
  await page.getByRole('link', { name: '営業プレイブック' }).click();
  await page.waitForURL('**/brain/playbooks');
  await expect(page.getByRole('heading', { name: '会社の頭脳（営業プレイブック）' })).toBeVisible();
  await expect(page.getByText('美容室向け・予約導線の切り口')).toBeVisible();
  await expect(page.getByText('AIは書き換えできません。', { exact: false })).toBeVisible();
});

test('営業プレイブックを作成すると一覧に表示される', async ({ page }) => {
  await login(page);
  await page.goto('/brain/playbooks');
  await page.getByRole('link', { name: '新規作成' }).click();
  await page.waitForURL('**/brain/playbooks/new');
  const uniqueTitle = `E2Eプレイブック-${Date.now()}`;
  await page.getByLabel('タイトル（必須・120文字まで）').fill(uniqueTitle);
  await page.getByLabel('本文（必須・5000文字まで）').fill('E2E テスト用の売り方の型です。架空の内容で、顧客名・会社名・成果数値・口コミ・顧客の声・実価格・PII・secret を含みません。');
  await page.getByLabel('分類（必須・80文字まで）').fill('切り口');
  await page.getByLabel('型の種類').selectOption('approach');
  await page.getByLabel('機密ラベル').selectOption('INTERNAL');
  await page.getByRole('button', { name: '作成する' }).click();
  await page.waitForURL('**/brain/playbooks');
  await expect(page.getByText(uniqueTitle)).toBeVisible();
});

test('ナレッジ検索で営業プレイブックの参照元が表示される', async ({ page }) => {
  // Phase 2-B-5: AI が営業プレイブック（売り方の型）を read-only 参照し、参照元として表示されることを確認。
  await login(page);
  await page.goto('/knowledge/search?q=' + encodeURIComponent('美容室 予約 導線 切り口'));
  await expect(page.getByText('AIの回答', { exact: false })).toBeVisible();
  await expect(page.getByText('参照した会社の頭脳', { exact: false })).toBeVisible();
  await expect(page.getByText('美容室向け・予約導線の切り口').first()).toBeVisible();
});

test('ナレッジ検索で顧客事例の参照元が表示される', async ({ page }) => {
  // Phase 2-C-5: AI が顧客事例（匿名化済みのみ・doc78）を read-only 参照し、参照元として表示されることを確認。
  await login(page);
  await page.goto('/knowledge/search?q=' + encodeURIComponent('（架空）美容室の予約導線改善'));
  await expect(page.getByText('AIの回答', { exact: false })).toBeVisible();
  await expect(page.getByText('参照した会社の頭脳', { exact: false })).toBeVisible();
  await expect(page.getByText('（架空）美容室の予約導線改善').first()).toBeVisible();
});

test('顧客事例（Case Study）の一覧がナビ経由で表示される', async ({ page }) => {
  // Phase 2-C-3 で read-only 段階の期待値（作成/編集/アーカイブ UI 0件）だったものを、
  // Phase 2-C-4 の書き込み解禁に合わせて意図的に更新（doc57 の test16 更新と同じ扱い・doc76）。
  await login(page);
  await page.getByRole('link', { name: '顧客事例' }).click();
  await page.waitForURL('**/brain/case-studies');
  await expect(page.getByRole('heading', { name: '会社の頭脳（顧客事例）' })).toBeVisible();
  await expect(page.getByText('（架空）美容室の予約導線改善')).toBeVisible();
  await expect(page.getByText('AIは書き換えできません。', { exact: false })).toBeVisible();
  await expect(page.getByText('許諾なしに扱わない', { exact: false })).toBeVisible();
});

test('顧客事例を作成・編集・アーカイブできる（人間・許諾なしは匿名のまま）', async ({ page }) => {
  // Phase 2-C-4: 人間の書き込み1周。consentStatus=none・anonymized=true（既定）のまま作成する。
  await login(page);
  await page.goto('/brain/case-studies');
  await page.getByRole('link', { name: '新規作成' }).click();
  await page.waitForURL('**/brain/case-studies/new');
  const uniqueTitle = `E2E顧客事例-${Date.now()}`;
  await page.getByLabel('タイトル（必須・120文字まで）').fill(uniqueTitle);
  await page.getByLabel('本文（必須・5000文字まで）').fill('E2Eテスト用の架空・匿名の社内事例です。実在顧客名・成果数値・顧客の声・PII・secretを含みません。');
  await page.getByLabel('機密ラベル').selectOption('INTERNAL');
  await page.getByRole('button', { name: '作成する' }).click();
  await page.waitForURL('**/brain/case-studies');
  await expect(page.getByText(uniqueTitle)).toBeVisible();

  // 編集: タイトルを変更して保存
  const row = page.locator('tr', { hasText: uniqueTitle });
  await row.getByRole('link', { name: '編集' }).click();
  await page.waitForURL('**/edit');
  const editedTitle = `${uniqueTitle}-編集済`;
  await page.getByLabel('タイトル（必須・120文字まで）').fill(editedTitle);
  await page.getByRole('button', { name: '保存する' }).click();
  await page.waitForURL('**/brain/case-studies');
  await expect(page.getByText(editedTitle)).toBeVisible();

  // アーカイブ: 一覧から消える（物理削除ではない）
  const editedRow = page.locator('tr', { hasText: editedTitle });
  await editedRow.getByRole('button', { name: 'アーカイブ' }).click();
  await page.waitForURL('**/brain/case-studies');
  await expect(page.getByText(editedTitle)).toHaveCount(0);
});
