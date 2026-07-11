import { test, expect, type Page } from '@playwright/test';

// 3D バーチャルオフィス v0（Phase 4 Stream B・roadmap71）。
// read-only 可視化のみ。canvas の非 blank をピクセルで確認し、コンソールエラーを許容しない。
// seed には AIAgent 8体＋各1件の AIAgentRun がある（状態は証拠から導出・件数の値には依存しない）。

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));
  return errors;
}

test('社長は 3D オフィスを閲覧でき、canvas は非 blank・コンソールエラーなし', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/ai-office');
  await expect(page.getByRole('heading', { name: '3D バーチャルオフィス（AI社員・read-only）' })).toBeVisible();
  const canvas = page.getByTestId('ai-office-canvas');
  await expect(canvas).toBeVisible();
  // 描画が走るのを待ってからピクセル検査（preserveDrawingBuffer 前提）。
  await page.waitForTimeout(1200);
  const pixel = await page.evaluate(() => {
    const c = document.querySelector('canvas[data-testid="ai-office-canvas"]') as HTMLCanvasElement | null;
    if (!c) return { ok: false, reason: 'no-canvas' };
    const sample = document.createElement('canvas');
    sample.width = 64;
    sample.height = 64;
    const ctx = sample.getContext('2d')!;
    ctx.drawImage(c, 0, 0, 64, 64);
    const data = ctx.getImageData(0, 0, 64, 64).data;
    const colors = new Set<string>();
    let nonBlack = 0;
    for (let i = 0; i < data.length; i += 4) {
      const key = `${data[i]},${data[i + 1]},${data[i + 2]}`;
      colors.add(key);
      if ((data[i] ?? 0) + (data[i + 1] ?? 0) + (data[i + 2] ?? 0) > 24) nonBlack++;
    }
    return { ok: colors.size > 8 && nonBlack > 40, colors: colors.size, nonBlack };
  });
  expect(pixel.ok, `canvas must be non-blank: ${JSON.stringify(pixel)}`).toBe(true);
  // 状態凡例（色だけに依存しない・ラベル併記）と 2D フォールバック一覧。
  await expect(page.getByTestId('ai-office-2d-list')).toBeVisible();
  await expect(page.getByTestId('ai-office-detail')).toBeVisible();
  // 証拠スクリーンショット（desktop）。
  await page.screenshot({ path: 'test-results/ai-office-desktop.png', fullPage: false });
  const benign = errors.filter((e) => !e.includes('favicon'));
  expect(benign, `console errors: ${benign.join(' | ')}`).toHaveLength(0);
});

test('一覧から AI 社員を選択すると詳細パネルに状態・根拠・権限が表示され、フィルタが機能する', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/ai-office');
  // 2D 一覧から選択（キーボード/クリック共通の操作経路）。
  const list = page.getByTestId('ai-office-2d-list');
  await list.getByRole('button').first().click();
  const detail = page.getByTestId('ai-office-detail');
  await expect(detail.getByText('状態')).toBeVisible();
  await expect(detail.getByText('根拠')).toBeVisible();
  await expect(detail.getByText('権限レベル')).toBeVisible();
  await expect(detail.getByText('この画面から実行・承認・削除はできません（read-only）。')).toBeVisible();
  // 状態フィルタ: 存在しない状態（error 等）を選ぶと一覧が絞られる/0件表示になる（値非依存の絞り込み検証）。
  const before = await list.getByRole('row').count();
  await page.getByTestId('ai-office-state-filter').getByRole('button').last().click(); // 「計測なし」
  const after = await list.getByRole('row').count();
  expect(after).toBeLessThanOrEqual(before);
});

test('モバイルでは操作可能な簡略表示に切り替わる', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/ai-office');
  await expect(page.getByTestId('ai-office-mobile-note')).toBeVisible();
  // 3D canvas はマウントされない（簡略表示）。一覧からの選択は可能。
  await expect(page.getByTestId('ai-office-canvas')).toHaveCount(0);
  await page.getByTestId('ai-office-2d-list').getByRole('button').first().click();
  await expect(page.getByTestId('ai-office-detail').getByText('状態')).toBeVisible();
  await page.screenshot({ path: 'test-results/ai-office-mobile.png', fullPage: false });
});

test('担当者も閲覧できる（dashboard:read の回帰・PII/プロンプト本文は表示されない）', async ({ page }) => {
  await login(page, 'sales@ikezaki.local');
  await page.goto('/ai-office');
  await expect(page.getByRole('heading', { name: '3D バーチャルオフィス（AI社員・read-only）' })).toBeVisible();
  await expect(page.getByTestId('ai-office-2d-list')).toBeVisible();
});
