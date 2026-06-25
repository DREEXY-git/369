// 「今すぐ見るべき案件」の各 attention 理由 → 最適な是正アクション（deep link）を生成する純ロジック。Phase 1-13。
// href 生成・finance 要否はここに集約し、UI（AttentionList）はこの結果を表示するだけにする（保守性）。
// 「見える→気づく→すぐ対処する」の "すぐ対処する" 導線。
import type { AttentionReasonCode, ExecProjectKpi } from './golden-path-dashboard';
import { EXEC_ATTENTION_LABEL } from './golden-path-dashboard';

export interface GoldenPathAction {
  reason: AttentionReasonCode;
  label: string; // 理由ラベル（EXEC_ATTENTION_LABEL）
  actionLabel: string; // ボタン文言
  href: string; // 遷移先（event の #anchor / 請求書 / 承認）
  requiresFinance: boolean; // finance:read 必須（true は STAFF に出さない）
}

export interface GoldenPathActionContext {
  eventId: string;
  invoiceId: string | null;
}

interface ActionDef {
  actionLabel: string;
  requiresFinance: boolean;
  href: (ctx: GoldenPathActionContext) => string;
}

const eventAnchor = (eventId: string, anchor: string) => `/operations/events/${eventId}#${anchor}`;
// 請求書 deep link。invoiceId 不明時は案件の財務サマリーへフォールバック。
const invoiceHref = (ctx: GoldenPathActionContext) =>
  ctx.invoiceId ? `/invoices/${ctx.invoiceId}` : eventAnchor(ctx.eventId, 'finance-summary');

// reason → 是正アクション定義。href テンプレートと finance 要否を一元管理。
// actionLabel は「見るだけ」でなく「その場で対処につながる」実行性のある文言にする（Phase 1-14）。
const ACTION_DEFS: Record<AttentionReasonCode, ActionDef> = {
  overdue_receivable: { actionLabel: '入金を記録', requiresFinance: true, href: invoiceHref },
  unpaid: { actionLabel: '入金を記録', requiresFinance: true, href: invoiceHref },
  unsent_invoice: { actionLabel: '請求書送信を申請', requiresFinance: true, href: invoiceHref },
  low_margin: { actionLabel: '原価・売上を見直す', requiresFinance: true, href: (c) => eventAnchor(c.eventId, 'finance-summary') },
  high_risk: { actionLabel: 'リスクを確認・解消', requiresFinance: false, href: (c) => eventAnchor(c.eventId, 'risks') },
  overdue_logistics: { actionLabel: '物流タスクを確認・完了', requiresFinance: false, href: (c) => eventAnchor(c.eventId, 'logistics') },
  approval_pending: { actionLabel: '承認待ちを処理', requiresFinance: false, href: () => '/approvals' },
  unbridged: { actionLabel: 'Finance Bridgeへ進む', requiresFinance: false, href: (c) => eventAnchor(c.eventId, 'golden-path') },
};

/** 1 つの理由に対する是正アクションを生成（純関数）。 */
export function getGoldenPathActionForReason(reason: AttentionReasonCode, ctx: GoldenPathActionContext): GoldenPathAction {
  const def = ACTION_DEFS[reason];
  return {
    reason,
    label: EXEC_ATTENTION_LABEL[reason],
    actionLabel: def.actionLabel,
    href: def.href(ctx),
    requiresFinance: def.requiresFinance,
  };
}

/** 案件 KPI の attention 理由群 → 是正アクション一覧（優先度順を維持）。 */
export function buildGoldenPathActionLinks(kpi: Pick<ExecProjectKpi, 'id' | 'invoiceId' | 'attentionReasons'>): GoldenPathAction[] {
  return kpi.attentionReasons.map((r) => getGoldenPathActionForReason(r, { eventId: kpi.id, invoiceId: kpi.invoiceId }));
}

/** finance 権限が無い閲覧者には finance 系アクションを出さない（純フィルタ）。 */
export function visibleGoldenPathActions(actions: GoldenPathAction[], canViewFinance: boolean): GoldenPathAction[] {
  return canViewFinance ? actions : actions.filter((a) => !a.requiresFinance);
}
