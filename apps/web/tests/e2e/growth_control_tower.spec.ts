import { test, expect, type Page } from '@playwright/test';

// AI Growth Opportunity Control Tower v0（P3-CT-1）e2e。read-only smoke ＋ redaction。
// 前提: pnpm db:seed 済み + pnpm start。CI（stage3_e2e）で実行される。
// 目的:
//  - 社長（財務権限あり）は /growth/control-tower の成長機会カードを閲覧できる。
//  - 担当者（財務権限なし）には finance 系カードの金額実値が出ず redaction/件数中心になる。

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

test('社長は Control Tower で成長機会カードを閲覧できる', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/growth/control-tower');
  await expect(page.getByRole('heading', { name: 'AI Growth Opportunity Control Tower' })).toBeVisible();
  // 主要カード見出しが表示される（read-only 集約）。
  await expect(page.getByRole('heading', { name: '社長が見るべき成長機会' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '未追客リード' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '未回収リスク' })).toBeVisible();
  // 財務権限があるので redaction は出ず、「財務表示: 表示可」。
  await expect(page.getByText('原価・粗利は財務閲覧権限が必要です', { exact: false })).toHaveCount(0);
  await expect(page.getByText('表示可', { exact: false }).first()).toBeVisible();
});

test('担当者（財務権限なし）は Control Tower で finance 系の実値を見られない', async ({ page }) => {
  await login(page, 'sales@ikezaki.local');
  await page.goto('/growth/control-tower');
  // ページ自体は閲覧できる（read-only）。
  await expect(page.getByRole('heading', { name: 'AI Growth Opportunity Control Tower' })).toBeVisible();
  // finance 系カード（未回収リスク）は redaction 表示になり、原価・粗利の実値が出ない。
  await expect(page.getByRole('heading', { name: '未回収リスク' })).toBeVisible();
  // finance-gated カードは「未回収リスク」「低粗利改善候補」の2枚 → redaction は2件出る。
  // strict-mode 違反（複数一致）を避けるため toHaveCount(2) で明示し、first() で可視性を確認する。
  const redactionMessages = page.getByText('原価・粗利は財務閲覧権限が必要です', { exact: false });
  await expect(redactionMessages).toHaveCount(2);
  await expect(redactionMessages.first()).toBeVisible();
  // 財務表示は「非表示」（canViewFinance=false）。
  await expect(page.getByText('非表示', { exact: false }).first()).toBeVisible();
  // 非 finance カードは通常どおり見える。
  await expect(page.getByRole('heading', { name: '未追客リード' })).toBeVisible();
});

// P3-CT-4: FakeLLM「次の一手ドラフト」生成（人間起点・下書きのみ・送信/承認/削除なし）。
test('社長は Control Tower で AI 下書きメモを生成できる（下書きのみ・送信なし）', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/growth/control-tower');
  // 財務権限があるので finance カード（未回収リスク）にも生成ボタンが見える。
  await expect(page.getByTestId('ct-generate-unpaid_risk')).toBeVisible();
  // 常設カード（社長が見るべき成長機会）から下書きメモを生成する（FakeLLM・下書きのみ）。
  await page.getByTestId('ct-generate-ceo_attention').click();
  // Server Action 完了後に同一 URL へ戻り、下書きメモが read-only 表示される。
  await expect(page.getByRole('heading', { name: 'AI 下書きメモ（最新・下書きのみ）' })).toBeVisible();
  await expect(page.getByTestId('ct-memo-item').first()).toBeVisible();
  await expect(page.getByTestId('ct-memo-item').first()).toContainText('次の一手ドラフト');
  // finance カード（未回収リスク）からも生成できる（社長は財務権限あり）。次テストの redaction 検証の前提を作る。
  await page.getByTestId('ct-generate-unpaid_risk').click();
  await expect(page.getByText('【次の一手ドラフト（下書き）】未回収リスク', { exact: false }).first()).toBeVisible();
});

test('担当者は redacted な finance カードから AI 下書きを生成できない', async ({ page }) => {
  await login(page, 'sales@ikezaki.local');
  await page.goto('/growth/control-tower');
  // finance-gated 2枚（未回収リスク・低粗利改善候補）は redacted のため生成ボタンが出ない（二重防御の UI 側）。
  await expect(page.getByTestId('ct-generate-unpaid_risk')).toHaveCount(0);
  await expect(page.getByTestId('ct-generate-low_margin_projects')).toHaveCount(0);
  // 非 finance カードには生成ボタンが出る（サーバー側でも権限・redaction を再判定する）。
  await expect(page.getByTestId('ct-generate-uncontacted_leads')).toBeVisible();
});

// 表示経路の redaction: finance カード由来のメモ（件数を含み得る）は、財務権限のない閲覧者に表示されない。
// 前提: 同一ファイル内で直前の社長テストが未回収リスクの下書きメモを生成済み（Playwright は同一ファイルを同一ワーカーで直列実行）。
test('担当者には finance 由来の AI 下書きメモが表示されない（redaction 維持）', async ({ page }) => {
  await login(page, 'sales@ikezaki.local');
  await page.goto('/growth/control-tower');
  // finance 由来メモ（未回収リスク）は担当者には出ない（表示クエリ側の redaction フィルタ）。
  await expect(page.getByText('【次の一手ドラフト（下書き）】未回収リスク', { exact: false })).toHaveCount(0);
  // 非 finance 由来メモ（社長が見るべき成長機会）は担当者にも表示されてよい（フィルタは finance 由来のみを除外）。
  await expect(page.getByText('【次の一手ドラフト（下書き）】社長が見るべき成長機会', { exact: false }).first()).toBeVisible();
});

// P3-CT-5: 承認導線 deep link（リンクのみ・実行ボタンなし）。
test('社長には承認導線の deep link が表示され、実行ボタンは存在しない', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/growth/control-tower');
  // 承認権限（approval:approve）があるので承認待ちへの入口が見える。
  // ナビにも /approvals リンクがあるため、本セクションの deep link は testid でスコープして検証する。
  await expect(page.getByTestId('ct-link-approvals')).toBeVisible();
  await expect(
    page.locator('a[href="/approvals"]').filter({ has: page.getByTestId('ct-link-approvals') }),
  ).toHaveCount(1);
  // 営業メール下書き一覧への入口も見える（leadmap:read）。
  await expect(page.getByTestId('ct-link-outreach')).toBeVisible();
  await expect(
    page.locator('a[href="/leadmap/leads"]').filter({ has: page.getByTestId('ct-link-outreach') }),
  ).toHaveCount(1);
  // Control Tower 上に承認・却下の実行ボタンは存在しない（実行は /approvals のみ）。
  await expect(page.getByRole('button', { name: '承認', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '却下', exact: true })).toHaveCount(0);
});

test('担当者には承認待ちの deep link が表示されない（承認権限なし）', async ({ page }) => {
  await login(page, 'sales@ikezaki.local');
  await page.goto('/growth/control-tower');
  // STAFF は approval:approve を持たないため、承認待ちの件数・入口ごと非表示
  // （ナビの /approvals リンクは対象外なので testid で本セクションのみ検証する）。
  await expect(page.getByTestId('ct-link-approvals')).toHaveCount(0);
  // leadmap:read はあるので下書き一覧への入口は見える。
  await expect(page.getByTestId('ct-link-outreach')).toBeVisible();
});

test('承認導線セクションは「実行しない」宣言を常時表示する', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/growth/control-tower');
  await expect(page.getByRole('heading', { name: '人間の判断待ち（承認導線）' })).toBeVisible();
  await expect(
    page.getByText('送信・承認・実行はこの画面からは行いません', { exact: false }),
  ).toBeVisible();
});

// WIP2（roadmap62）: Growth Event Ledger 成果可視化（read-only・件数非依存）。
test('社長には成果と削減時間のセクションと台帳リンクが表示される', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/growth/control-tower');
  await expect(page.getByRole('heading', { name: '成果と削減時間（Growth Event Ledger）' })).toBeVisible();
  await expect(page.getByText('集計期間: 直近7日 / 直近30日', { exact: false })).toBeVisible();
  await expect(page.getByTestId('ct-growth-counts')).toBeVisible();
  // 社長（財務権限あり）には金額行が表示される（値または「未計測」— CI の実行順・件数に依存しない）。
  await expect(page.getByTestId('ct-growth-money')).toBeVisible();
  await expect(page.getByTestId('ct-link-growth-events')).toBeVisible();
});

test('担当者には成果金額が表示されず権限案内になる（redaction 維持）', async ({ page }) => {
  await login(page, 'sales@ikezaki.local');
  await page.goto('/growth/control-tower');
  await expect(page.getByRole('heading', { name: '成果と削減時間（Growth Event Ledger）' })).toBeVisible();
  // 金額行そのものが描画されない（testid 不在）＋権限案内が表示される。
  await expect(page.getByTestId('ct-growth-money')).toHaveCount(0);
  await expect(page.getByText('金額の集計は財務閲覧権限のある人にのみ表示されます。')).toBeVisible();
  // 件数・削減時間は金額ではないため表示される。
  await expect(page.getByTestId('ct-growth-counts')).toBeVisible();
});
