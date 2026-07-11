import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// v6.1 NAV 静的契約テスト（Codex 回帰監査・多機能消失申告への恒久ガード）。
// 目的: 「利用者が見る導線数」を静的に固定し、欠落4機能を含む 67 導線が
//   ①重複なく ②各 href に page 実体があり ③main(63) から追加4件が保持される
// ことを保証する。ページを消すと即 red になる（deployment lineage とは別の、コード側の契約）。
const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, '..');
const navSrc = readFileSync(resolve(webRoot, 'components/shell/nav.ts'), 'utf8');

// NAV 項目だけを抽出（型定義 `href: string` は quoted `/...` でないため掛からない）。
function extractHrefs(src: string): string[] {
  const hrefs: string[] = [];
  const re = /\bhref:\s*'(\/[^']*)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) hrefs.push(m[1]!);
  return hrefs;
}

// v6.1 で main(63) から追加された「復旧4導線」。これらが欠けると red。
const RECOVERED_HREFS = ['/growth/control-tower', '/marketing/ads', '/marketing/content', '/ai-office'];
const EXPECTED_NAV_COUNT = 67;
const MAIN_BASELINE_COUNT = 63;

describe('NAV 静的契約（v6.1 多機能復旧の恒久ガード）', () => {
  const hrefs = extractHrefs(navSrc);

  it(`NAV 項目は ${EXPECTED_NAV_COUNT} 件（main ${MAIN_BASELINE_COUNT} + 復旧4）`, () => {
    expect(hrefs.length).toBe(EXPECTED_NAV_COUNT);
    expect(hrefs.length - RECOVERED_HREFS.length).toBe(MAIN_BASELINE_COUNT);
  });

  it('href の重複は 0 件', () => {
    const dup = hrefs.filter((h, i) => hrefs.indexOf(h) !== i);
    expect(dup).toEqual([]);
  });

  it('復旧4導線がすべて存在する', () => {
    for (const h of RECOVERED_HREFS) expect(hrefs).toContain(h);
  });

  it('全 href に page 実体がある（削除すると red）', () => {
    const missing = hrefs.filter((h) => {
      // NAV は動的セグメントを含まない静的ルート。(app) ルートグループ配下に page.tsx がある想定。
      const p = resolve(webRoot, `app/(app)${h}/page.tsx`);
      return !existsSync(p);
    });
    expect(missing).toEqual([]);
  });
});
