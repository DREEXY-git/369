// ナビ権限フィルタ（Phase 4 Stream B2・roadmap74 §9）。
// href → そのページ先頭の「データ取得前の全ページ拒否ゲート」と同一の [resource, action]。
// ここに載せるのは、ページ側で `if (!hasPermission(...)) return <AccessDenied/>`（またはそれと
// 等価な取得前全面拒否）を確認済みの href のみ。部分表示ゲートしか無いページは載せない（表示のまま）。
// これは行き止まり導線（開けないページへのリンク）を消す UX 整理であり、境界そのものではない。
// 境界は各ページ / Server Action 側のゲートが正（ナビから消しても直接 URL では従来どおり拒否される）。
import type { Action } from '@hokko/shared';

export const NAV_PAGE_GATES: Record<string, readonly [resource: string, action: Action]> = {
  '/dashboard/ceo': ['dashboard', 'read'],
  '/reports/morning': ['dashboard', 'read'],
  '/approvals': ['approval', 'approve'],
  '/growth': ['dashboard', 'read'],
  '/growth/control-tower': ['dashboard', 'read'],
  '/growth/events': ['dashboard', 'read'],
  '/dx': ['marketing', 'read'],
  // Marketing OS / 広告・チャネル分析 / SEO・コンテンツ: いずれもページ先頭で
  // marketing:read を取得前に全面拒否（AccessDenied 返却）＝行き止まり導線化を防ぐため
  // ナビゲートを marketing:read 保持者に限定する（v6.1・境界そのものは各ページ側が正）。
  '/marketing': ['marketing', 'read'],
  '/marketing/ads': ['marketing', 'read'],
  '/marketing/content': ['marketing', 'read'],
  '/customers': ['customer', 'read'],
  '/deals': ['deal', 'read'],
  '/deals/kanban': ['deal', 'read'],
  '/quotes': ['quote', 'read'],
  '/finance': ['finance', 'read'],
  '/finance/bridge': ['finance', 'read'],
  '/finance/journal-candidates': ['finance', 'read'],
  '/finance/invoice-candidates': ['finance', 'read'],
  '/finance/cashflow': ['finance', 'read'],
  '/finance/profit-leaks': ['finance', 'read'],
  '/ai-agents': ['dashboard', 'read'],
  '/ai-office': ['dashboard', 'read'],
  '/admin/users': ['admin', 'read'],
  '/admin/ai-outputs': ['audit', 'read'],
};

/**
 * ナビに出してよい href を返す。マップに無い href は常に許可（保守的 = 隠しすぎない）。
 * can はサーバー側の hasPermission を渡す（このモジュール自体は権限判定を持たない純データ＋フィルタ）。
 */
export function filterAllowedHrefs(hrefs: string[], can: (resource: string, action: Action) => boolean): string[] {
  return hrefs.filter((href) => {
    const gate = NAV_PAGE_GATES[href];
    return !gate || can(gate[0], gate[1]);
  });
}
