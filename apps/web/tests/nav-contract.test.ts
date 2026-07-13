import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { filterAllowedHrefs } from '../lib/nav-permissions';

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
const EXPECTED_NAV_COUNT = 68; // P3-Q2C-B: 売掛エイジング（/finance/receivables）を追加
const MAIN_BASELINE_COUNT = 64; // 63 + 売掛エイジング（恒久導線として baseline に編入）

// v6.2 WIP-5: OWNER が見る href の**明示契約**（順序込み）。1件を別 route へ置換すると件数が同じでも red になる。
const EXPECTED_HREFS: readonly string[] = [
  '/dashboard', '/dashboard/ceo', '/reports/morning', '/alerts', '/approvals',
  '/growth', '/growth/control-tower', '/growth/events',
  '/marketing', '/marketing/ads', '/marketing/content', '/dx',
  '/customers', '/deals', '/deals/kanban',
  '/leadmap/campaigns', '/leadmap/leads', '/leadmap/map', '/leadmap/pipeline', '/leadmap/routes',
  '/quotes', '/contracts', '/invoices',
  '/finance', '/finance/bridge', '/finance/journal-candidates', '/finance/invoice-candidates',
  '/finance/cashflow', '/finance/receivables', '/finance/profit-leaks',
  '/operations', '/operations/events', '/operations/inventory-movements', '/operations/stocktakes',
  '/operations/purchase-orders', '/operations/reorder', '/operations/logistics',
  '/inventory', '/inventory/lease', '/inventory/profitability',
  '/meetings', '/meetings/upload', '/tasks', '/knowledge/search',
  '/brain/policies', '/brain/playbooks', '/brain/case-studies',
  '/ai-agents', '/ai-office',
  '/communications/inbox', '/horenso', '/experts', '/subsidies', '/planning-hokko',
  '/admin', '/admin/users', '/admin/audit', '/admin/data-access-logs', '/admin/ai-safety',
  '/admin/ai-outputs', '/admin/policy-decisions', '/admin/events', '/admin/compliance/consents',
  '/admin/danger-actions', '/admin/jobs', '/admin/location-access',
  '/admin/operations-readiness', '/admin/operations-actions',
];

// 誤認防止用の主要カテゴリ見出し（NAV group.title・12 グループ）。これらが揃っていることも契約に含める。
const EXPECTED_GROUP_TITLES = [
  '経営', 'Growth・DX OS', '営業・顧客', 'リードマップAI（地図営業）', '見積・契約・請求',
  '会計・財務', 'Operations OS', '在庫・リース', '会議・ナレッジ', 'AI・組織', '専門家・支援', '管理',
];

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

  // v6.2: 件数一致だけでは 1 件を別 route へ置換した回帰を捕らえられない。href 集合・順序を明示契約にする。
  it('OWNER が見る href 集合・順序が期待契約と完全一致（置換で red）', () => {
    expect(hrefs).toEqual(EXPECTED_HREFS);
  });

  it('主要カテゴリ見出し（12 グループ）が揃っている', () => {
    const titles: string[] = [];
    const re = /title:\s*'([^']*)'/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(navSrc)) !== null) titles.push(m[1]!);
    for (const t of EXPECTED_GROUP_TITLES) expect(titles).toContain(t);
    expect(titles.length).toBe(EXPECTED_GROUP_TITLES.length);
  });

  it('AI社員導線（/ai-agents・/ai-office）が両方存在する', () => {
    expect(hrefs).toContain('/ai-agents');
    expect(hrefs).toContain('/ai-office');
  });
});

// v6.2: role 非表示が「機能消失」と誤認されないための RBAC 契約（filterAllowedHrefs は隠すが集合は壊さない）。
describe('NAV RBAC フィルタ契約（非表示≠消失）', () => {
  const all = extractHrefs(navSrc);

  it('全権限（can=常に true）なら 67 件すべて許可＝フィルタが集合を壊さない', () => {
    const allowed = filterAllowedHrefs(all, () => true);
    expect(allowed).toEqual(all);
  });

  it('marketing:read を持たない role では /marketing 系だけが落ち、他は残る（消失ではなく権限）', () => {
    const allowed = filterAllowedHrefs(all, (res: string) => res !== 'marketing');
    expect(allowed).not.toContain('/marketing');
    expect(allowed).not.toContain('/marketing/ads');
    expect(allowed).not.toContain('/marketing/content');
    // 復旧導線のうち権限外でないものは残る（機能消失ではない）。
    expect(allowed).toContain('/growth/control-tower');
    expect(allowed).toContain('/ai-office');
    // gate に無い href（保守的に常に許可）は残る。
    expect(allowed).toContain('/customers');
  });
});
