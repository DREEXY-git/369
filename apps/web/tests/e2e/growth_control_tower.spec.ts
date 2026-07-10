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
