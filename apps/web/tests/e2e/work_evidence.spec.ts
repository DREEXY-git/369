import { test, expect, type Page } from '@playwright/test';

// AI Work Evidence Cockpit（Phase 4 Stream C1・roadmap75）。
// /ai-office のタブ（3Dオフィス / 人間の作業インボックス / 成果台帳）。
// - 成果は証拠区分付きのみ・人間の削減時間は baseline なしのため「計測なし」（推定値を出さない）。
// - 財務行は finance:read 保持者のみ。承認案件は approval:approve 保持者のみ（/approvals ゲートと同一）。
// - Inbox は deep link のみで、承認・再実行・削除の実行ボタンを持たない。

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

test('社長の成果台帳: 証拠区分付きの実測値・削減時間は計測なし・財務行あり・実行ボタンなし', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/ai-office?tab=outcomes');
  const ledger = page.getByTestId('outcome-ledger');
  await expect(ledger).toBeVisible();
  // 実測行（AI 生成物）: 証拠区分「実測」と証拠元が表示される。
  const outputs = page.getByTestId('outcome-ai_outputs');
  await expect(outputs.getByText('実測')).toBeVisible();
  await expect(outputs.getByText(/UsageEvent/)).toBeVisible();
  // 人間の削減時間: baseline 未計測 → 値は出さず「計測なし」（AI 実行時間からの推定をしない）。
  const timeSaved = page.getByTestId('outcome-human_time_saved');
  await expect(timeSaved.getByText('計測なし')).toBeVisible();
  await expect(timeSaved.getByText('—')).toBeVisible();
  await expect(timeSaved.getByText(/推定しない/)).toBeVisible();
  // 財務行: OWNER は finance:read 保持 → 行はあるが金額根拠未接続のため値は出さない。
  const finance = page.getByTestId('outcome-financial_impact');
  await expect(finance.getByText('計測なし')).toBeVisible();
  // read-only: 実行系ボタンが存在しない。
  await expect(ledger.getByRole('button')).toHaveCount(0);
});

test('社長のインボックス: 承認待ち項目が deep link 付きで表示され、実行ボタンはない', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/ai-office?tab=inbox');
  const inbox = page.getByTestId('human-work-inbox');
  await expect(inbox).toBeVisible();
  // 承認案件（approval:approve 保持者のみ）: /approvals への deep link のみ。
  const approvalItem = page.getByTestId('inbox-item-approvals_pending');
  await expect(approvalItem).toBeVisible();
  await expect(approvalItem.getByRole('link', { name: /承認待ち一覧で判断する/ })).toHaveAttribute('href', '/approvals');
  // AI 承認ゲート項目（dashboard:read 範囲）も構造として表示される。
  await expect(page.getByTestId('inbox-item-ai_gates_pending')).toBeVisible();
  // Inbox 上に承認・却下・再実行・削除の実行ボタンは存在しない（deep link のみ）。
  await expect(inbox.getByRole('button', { name: /承認|却下|再実行|削除|送信/ })).toHaveCount(0);
});

test('担当者: 承認案件はインボックスに出ない・成果台帳に財務行が出ない（権限境界）', async ({ page }) => {
  await login(page, 'sales@ikezaki.local');
  await page.goto('/ai-office?tab=inbox');
  await expect(page.getByTestId('human-work-inbox')).toBeVisible();
  // STAFF は approval:approve なし → 承認案件は取得段階から遮断（項目ごと非表示）。
  await expect(page.getByTestId('inbox-item-approvals_pending')).toHaveCount(0);
  await expect(page.getByTestId('inbox-item-ai_gates_pending')).toBeVisible();
  // 成果台帳: finance:read なし → 財務行は返らない。実測行（AI 生成物）は見える。
  await page.goto('/ai-office?tab=outcomes');
  await expect(page.getByTestId('outcome-ai_outputs')).toBeVisible();
  await expect(page.getByTestId('outcome-financial_impact')).toHaveCount(0);
});
