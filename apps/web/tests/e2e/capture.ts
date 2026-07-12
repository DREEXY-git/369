import { expect, type Locator, type Page } from '@playwright/test';

// v6.9 WIP-3: 「切れなし」を機械検証できる証拠 screenshot ヘルパ。
// - stitching（viewport 超の要素を分割撮影して結合）中に sticky header が重なって上端/中間が欠ける問題を、
//   撮影中のみ viewport を要素全高＋余白へ拡大（単一フレーム撮影）＋ header 不可視化で回避する。
// - 撮影後に PNG 実寸（IHDR）と要素 boundingBox を比較し、上下左右の切れを assert で検出する
//   （目視ではなく DOM/バイナリ実測で「切れていない」を証明する）。

/** PNG バイナリの IHDR から width/height を読む（依存なし・offset 16/20 に big-endian）。 */
export function pngSize(buf: Buffer): { width: number; height: number } {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/**
 * 要素全体を切れなしで path へ保存する。撮影中のみ viewport 高さを要素に合わせて拡大し、
 * header を不可視化（撮影後に復元）。PNG 実寸 >= 要素 boundingBox を assert する。
 */
export async function captureFullElement(page: Page, el: Locator, path: string): Promise<void> {
  const original = page.viewportSize();
  expect(original, 'viewportSize must be set').not.toBeNull();
  await el.scrollIntoViewIfNeeded();
  const pre = await el.boundingBox();
  expect(pre, `boundingBox unavailable for ${path}`).not.toBeNull();
  // 要素全高＋余白の viewport（単一フレームで撮影＝stitching なし）。上限は保険（暴走防止）。
  const targetH = Math.max(Math.min(Math.ceil(pre!.height) + 160, 8000), original!.height);
  await page.setViewportSize({ width: original!.width, height: targetH });
  await page.evaluate(() => document.querySelector('header')?.style.setProperty('visibility', 'hidden'));
  try {
    await el.scrollIntoViewIfNeeded();
    const box = await el.boundingBox();
    expect(box, `boundingBox unavailable after resize for ${path}`).not.toBeNull();
    const buf = await el.screenshot({ path });
    const size = pngSize(buf);
    // 切れなしの機械検証: PNG が要素の実寸を覆っている（±2px は丸め誤差）。
    expect(size.height, `${path}: PNG 高さ ${size.height} < 要素 ${box!.height}（上下切れ）`).toBeGreaterThanOrEqual(
      Math.floor(box!.height) - 2,
    );
    expect(size.width, `${path}: PNG 幅 ${size.width} < 要素 ${box!.width}（左右切れ）`).toBeGreaterThanOrEqual(
      Math.floor(box!.width) - 2,
    );
  } finally {
    await page.evaluate(() => document.querySelector('header')?.style.removeProperty('visibility'));
    await page.setViewportSize(original!);
  }
}

/**
 * NAV（内部 overflow-y-auto の nav を含む要素）を「内部 scroll で何も隠れていない」状態で保存する。
 * viewport を nav の scrollHeight に合わせて拡大 → scrollHeight ≒ clientHeight（隠れゼロ）を assert してから
 * 全体を1枚で撮影する（top/middle/bottom 分割よりも強い「全導線が1枚に写っている」証明）。
 */
export async function captureFullNav(page: Page, container: Locator, nav: Locator, path: string): Promise<void> {
  const original = page.viewportSize();
  expect(original, 'viewportSize must be set').not.toBeNull();
  const navScrollH = await nav.evaluate((n) => n.scrollHeight);
  const chromeH = await container.evaluate((c, args) => {
    // nav 以外（ロゴ/ヘッダ行など）の高さ = container 全高 - nav の可視高。
    const navEl = c.querySelector('nav');
    return c.getBoundingClientRect().height - (navEl?.getBoundingClientRect().height ?? 0) + args.pad;
  }, { pad: 48 });
  const targetH = Math.min(navScrollH + Math.ceil(chromeH) + 80, 8000);
  await page.setViewportSize({ width: original!.width, height: Math.max(targetH, original!.height) });
  try {
    const hidden = await nav.evaluate((n) => n.scrollHeight - n.clientHeight);
    expect(hidden, `${path}: NAV が内部 scroll で ${hidden}px 隠れている`).toBeLessThanOrEqual(1);
    const buf = await container.screenshot({ path });
    const box = await container.boundingBox();
    const size = pngSize(buf);
    expect(size.height, `${path}: PNG 高さが container より小さい`).toBeGreaterThanOrEqual(Math.floor(box!.height) - 2);
  } finally {
    await page.setViewportSize(original!);
  }
}
