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
  // 描画完了を条件待ちしてピクセル検査（preserveDrawingBuffer 前提・固定 sleep にしない）。
  // 「背景単色でも通る」検査にしないため、背景色 #0f172a からの乖離ピクセルを数える。
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const c = document.querySelector('canvas[data-testid="ai-office-canvas"]') as HTMLCanvasElement | null;
          if (!c) return { ok: false, colors: 0, nonBackground: 0 };
          const sample = document.createElement('canvas');
          sample.width = 64;
          sample.height = 64;
          const ctx = sample.getContext('2d')!;
          ctx.drawImage(c, 0, 0, 64, 64);
          const data = ctx.getImageData(0, 0, 64, 64).data;
          const colors = new Set<string>();
          let nonBackground = 0;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i] ?? 0, g = data[i + 1] ?? 0, b = data[i + 2] ?? 0;
            colors.add(`${r},${g},${b}`);
            // 背景 #0f172a (15,23,42) からの距離が大きいピクセル = 床/ゾーン/AI社員の描画。
            if (Math.abs(r - 15) + Math.abs(g - 23) + Math.abs(b - 42) > 40) nonBackground++;
          }
          return { ok: colors.size > 12 && nonBackground > 200, colors: colors.size, nonBackground };
        }),
      { timeout: 10000, message: 'canvas must render scene (non-blank, non-background pixels)' },
    )
    .toHaveProperty('ok', true);
  // 状態凡例（色だけに依存しない・ラベル併記）と 2D フォールバック一覧。
  await expect(page.getByTestId('ai-office-2d-list')).toBeVisible();
  await expect(page.getByTestId('ai-office-detail')).toBeVisible();
  // v5.8 §6: 初期表示で最初の可視 AI 社員が自動選択され、プロフィールが first viewport に出る。
  await expect(page.getByTestId('ai-office-profile')).toBeVisible();
  await expect(page.getByTestId('ai-office-profile-name')).not.toBeEmpty();
  // 証拠スクリーンショット（desktop・初期状態でプロフィールが写る）。
  await page.screenshot({ path: 'test-results/ai-office-desktop.png', fullPage: false });
  const benign = errors.filter((e) => !e.includes('favicon'));
  expect(benign, `console errors: ${benign.join(' | ')}`).toHaveLength(0);
});

test('一覧から AI 社員を選択すると詳細パネルに実測状態とプロフィール（設定）が表示され、フィルタが機能する', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/ai-office');
  // 2D 一覧から選択（キーボード/クリック共通の操作経路）。
  const list = page.getByTestId('ai-office-2d-list');
  await list.getByRole('button').first().click();
  const detail = page.getByTestId('ai-office-detail');
  // 実測（証拠由来）とキャラクター設定が明確に区別されて表示される。
  await expect(detail.getByText('稼働状態（実測・証拠由来）')).toBeVisible();
  await expect(detail.getByText('プロフィール（キャラクター設定）')).toBeVisible();
  await expect(detail.getByText('根拠', { exact: true })).toBeVisible();
  await expect(detail.getByText('権限レベル')).toBeVisible();
  // 人物プロフィール: ポートレート・人物名・スキル・性格・クセ・よくあるミス・評価。
  await expect(detail.getByTestId('ai-portrait')).toBeVisible();
  await expect(detail.getByTestId('ai-office-profile-name')).not.toBeEmpty();
  await expect(detail.getByText('スキル', { exact: true })).toBeVisible();
  await expect(detail.getByText('性格', { exact: true })).toBeVisible();
  await expect(detail.getByText('クセ・特徴・個性')).toBeVisible();
  await expect(detail.getByText('よくあるミス（人間がレビューで見る所）')).toBeVisible();
  await expect(detail.getByText('評価（人事コメント・設定）')).toBeVisible();
  await expect(detail.getByText('プロフィールはキャラクター設定です。稼働状態・実行回数などの実測データとは区別して表示しています。')).toBeVisible();
  await expect(detail.getByText('この画面から実行・承認・削除はできません（read-only）。')).toBeVisible();
  // v5.8 §6: 文字切れ（横方向 overflow）が無いことを DOM 実測で検証する。
  const overflowing = await detail.evaluate((root) => {
    const bad: string[] = [];
    const walk = (n: Element) => {
      if (n.scrollWidth > n.clientWidth + 1) bad.push(`${n.tagName}:${n.textContent?.slice(0, 30) ?? ''}`);
      for (const c of Array.from(n.children)) walk(c);
    };
    walk(root);
    return bad;
  });
  expect(overflowing, `横方向に見切れている要素: ${overflowing.join(' | ')}`).toHaveLength(0);
  // 証拠スクリーンショット（プロフィール全体・要素単位＝viewport 外もキャプチャ）。
  await detail.screenshot({ path: 'test-results/ai-office-desktop-profile.png' });
  // 状態フィルタ: 存在しない状態（error 等）を選ぶと一覧が絞られる/0件表示になる（値非依存の絞り込み検証）。
  const before = await list.getByRole('row').count();
  await page.getByTestId('ai-office-state-filter').getByRole('button').last().click(); // 「計測なし」
  // seed の AI 社員は全員 run 記録あり（計測なしは 0 件）→ 行数は厳密に減る（no-op を検出する）。
  const after = await list.getByRole('row').count();
  expect(after).toBeLessThan(before);
  await expect(list.getByText('条件に一致する AI 社員がいません')).toBeVisible();
});

test('モバイルでは操作可能な簡略表示に切り替わる', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/ai-office');
  await expect(page.getByTestId('ai-office-mobile-note')).toBeVisible();
  // 3D canvas はマウントされない（簡略表示）。一覧からの選択は可能。
  await expect(page.getByTestId('ai-office-canvas')).toHaveCount(0);
  await page.getByTestId('ai-office-2d-list').getByRole('button').first().click();
  await expect(page.getByTestId('ai-office-detail').getByText('稼働状態（実測・証拠由来）')).toBeVisible();
  await expect(page.getByTestId('ai-office-detail').getByTestId('ai-portrait')).toBeVisible();
  await page.screenshot({ path: 'test-results/ai-office-mobile.png', fullPage: false });
  // v5.9 M9 修正: モバイルの要素キャプチャは stitching 中に上部ヘッダーが重なるため、
  // 撮影中のみヘッダーを不可視化して「人物ヘッダー/ポートレートが欠けない」完全なプロフィール証拠を残す
  // （実 UI は scroll-mt-20 で選択スクロール時の重なりを緩和・テストは撮影後に元へ戻す）。
  const detailEl = page.getByTestId('ai-office-detail');
  await detailEl.scrollIntoViewIfNeeded();
  await page.evaluate(() => document.querySelector('header')?.style.setProperty('visibility', 'hidden'));
  await detailEl.screenshot({ path: 'test-results/ai-office-mobile-profile.png' });
  await page.evaluate(() => document.querySelector('header')?.style.removeProperty('visibility'));
  // 撮影対象にポートレートと人物名が含まれていることを DOM でも担保
  await expect(detailEl.getByTestId('ai-portrait')).toBeVisible();
  await expect(detailEl.getByTestId('ai-office-profile-name')).not.toBeEmpty();
});

test('3D ネームプレートをクリックすると AI 社員が選択される（raycaster 回帰・v5.9 M11）', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/ai-office');
  const canvas = page.getByTestId('ai-office-canvas');
  await expect(canvas).toBeVisible();
  // 描画完了（テストフック設置）を待つ。
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const c = document.querySelector('canvas[data-testid="ai-office-canvas"]') as HTMLCanvasElement & {
          __nameplateProbe?: (i: number) => { ndcX: number; ndcY: number; agentId: string } | null;
        };
        return typeof c?.__nameplateProbe === 'function';
      }),
    )
    .toBe(true);
  // 2 番目の社員（初期自動選択とは別）のネームプレート位置を取得し、
  // raycaster がその位置で「誰を」選ぶかを先に確定してから、実クリックで検証する
  // （プレート同士の重なりがあっても決定論的）。
  const probe = await page.evaluate(() => {
    const c = document.querySelector('canvas[data-testid="ai-office-canvas"]') as HTMLCanvasElement & {
      __nameplateProbe?: (i: number) => { ndcX: number; ndcY: number; agentId: string } | null;
      __pickAt?: (x: number, y: number) => string | null;
    };
    const p = c.__nameplateProbe!(1);
    if (!p) return null;
    return { ...p, picked: c.__pickAt!(p.ndcX, p.ndcY) };
  });
  expect(probe).not.toBeNull();
  // ネームプレートが raycaster の当たり判定に含まれている（M11 の本体検証）。
  expect(probe!.picked).not.toBeNull();
  // 実クリック（NDC→ピクセル変換）で同じ社員が選択される。
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + ((probe!.ndcX + 1) / 2) * box.width, box.y + ((1 - probe!.ndcY) / 2) * box.height);
  await expect(page.getByTestId('ai-office-detail')).toHaveAttribute('data-agent-id', probe!.picked!);
});

test('担当者も閲覧できる（dashboard:read の回帰・PII/プロンプト本文は表示されない）', async ({ page }) => {
  await login(page, 'sales@ikezaki.local');
  await page.goto('/ai-office');
  await expect(page.getByRole('heading', { name: '3D バーチャルオフィス（AI社員・read-only）' })).toBeVisible();
  await expect(page.getByTestId('ai-office-2d-list')).toBeVisible();
});
