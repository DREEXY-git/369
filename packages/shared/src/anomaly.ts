import type { AlertSeverity } from './types.js';

export interface AnomalyInput {
  salesActual?: number;
  salesTarget?: number;
  grossMarginRate?: number;
  prevGrossMarginRate?: number;
  laborCostRate?: number; // 人件費 / 売上
  overdueReceivableCount?: number;
  overdueReceivableAmount?: number;
  idleAssetCount?: number;
  highPriorityUnhandledLeads?: number;
  stalledDeals?: number; // 一定期間動いていない案件
  unrepliedCustomers?: number;
  complaintsThisPeriod?: number;
  complaintsPrevPeriod?: number;
  pendingApprovals?: number;
  unbilledCount?: number;
  contractsExpiringSoon?: number;
}

export interface AnomalyFinding {
  code: string;
  category: string;
  title: string;
  severity: AlertSeverity;
  detail: string;
  recommendation: string;
}

const sev = (s: AlertSeverity) => s;

/** ルールベース経営異常検知。AI が detail/recommendation を自然文に拡張する想定。 */
export function detectAnomalies(input: AnomalyInput): AnomalyFinding[] {
  const f: AnomalyFinding[] = [];

  if (input.salesTarget && input.salesActual !== undefined) {
    const ratio = input.salesTarget > 0 ? input.salesActual / input.salesTarget : 1;
    if (ratio < 0.8) {
      f.push({
        code: 'SALES_BELOW_TARGET',
        category: '売上',
        title: '売上未達リスク',
        severity: ratio < 0.6 ? sev('CRITICAL') : sev('HIGH'),
        detail: `売上が目標の ${Math.round(ratio * 100)}% に留まっています。`,
        recommendation: '受注確度の高い案件の前倒しと、休眠顧客への再提案を検討。',
      });
    }
  }

  if (
    input.grossMarginRate !== undefined &&
    input.prevGrossMarginRate !== undefined &&
    input.prevGrossMarginRate - input.grossMarginRate >= 5
  ) {
    f.push({
      code: 'MARGIN_DROP',
      category: '利益',
      title: '粗利率の低下',
      severity: sev('MEDIUM'),
      detail: `粗利率が ${input.prevGrossMarginRate}% → ${input.grossMarginRate}% に低下。`,
      recommendation: '値引き運用と原価率の点検、低粗利案件の見直し。',
    });
  }

  if (input.laborCostRate !== undefined && input.laborCostRate > 0.4) {
    f.push({
      code: 'LABOR_COST_HIGH',
      category: '人件費',
      title: '人件費過多の兆候',
      severity: sev('MEDIUM'),
      detail: `人件費率が ${Math.round(input.laborCostRate * 100)}%。`,
      recommendation: '稼働配分の見直し、繁閑に応じたシフト最適化。',
    });
  }

  if ((input.overdueReceivableCount ?? 0) > 0) {
    f.push({
      code: 'OVERDUE_RECEIVABLE',
      category: '回収',
      title: '回収遅延の発生',
      severity: sev('HIGH'),
      detail: `期日超過の売掛 ${input.overdueReceivableCount} 件 / 約 ${(input.overdueReceivableAmount ?? 0).toLocaleString()} 円。`,
      recommendation: '督促文ドラフト作成と入金予定の再確認。',
    });
  }

  if ((input.unbilledCount ?? 0) > 0) {
    f.push({
      code: 'UNBILLED',
      category: '請求',
      title: '請求漏れ候補',
      severity: sev('HIGH'),
      detail: `納品/受注済みで未請求が ${input.unbilledCount} 件。`,
      recommendation: '請求書を作成し送付承認へ回す。',
    });
  }

  if ((input.idleAssetCount ?? 0) > 0) {
    f.push({
      code: 'IDLE_ASSET',
      category: '在庫',
      title: '眠っているリース商品',
      severity: sev('LOW'),
      detail: `稼働率が低い商品が ${input.idleAssetCount} 件。`,
      recommendation: 'セット提案・値下げ・他案件転用で稼働率改善。',
    });
  }

  if ((input.highPriorityUnhandledLeads ?? 0) > 0) {
    f.push({
      code: 'LEAD_UNHANDLED',
      category: 'LeadMap',
      title: '高優先度リードの未対応',
      severity: sev('MEDIUM'),
      detail: `営業優先度が高いのに未対応のリードが ${input.highPriorityUnhandledLeads} 件。`,
      recommendation: 'AI分析と営業メール下書きを確認し、承認・送信へ。',
    });
  }

  if ((input.stalledDeals ?? 0) > 0) {
    f.push({
      code: 'DEAL_STALLED',
      category: '営業',
      title: '案件の停滞',
      severity: sev('MEDIUM'),
      detail: `一定期間動いていない案件が ${input.stalledDeals} 件。`,
      recommendation: '次アクションの設定と、失注しそうな案件の優先対応。',
    });
  }

  if ((input.unrepliedCustomers ?? 0) > 0) {
    f.push({
      code: 'UNREPLIED',
      category: '顧客対応',
      title: '返信漏れの可能性',
      severity: sev('MEDIUM'),
      detail: `未返信の顧客が ${input.unrepliedCustomers} 件。`,
      recommendation: 'AIアシスタントの下書きを使って当日中に返信。',
    });
  }

  if (
    input.complaintsThisPeriod !== undefined &&
    input.complaintsPrevPeriod !== undefined &&
    input.complaintsThisPeriod > input.complaintsPrevPeriod
  ) {
    f.push({
      code: 'COMPLAINTS_UP',
      category: '顧客対応',
      title: 'クレーム増加',
      severity: sev('MEDIUM'),
      detail: `クレームが ${input.complaintsPrevPeriod} → ${input.complaintsThisPeriod} 件に増加。`,
      recommendation: '予兆分析を確認し、離反リスク顧客へ優先対応。',
    });
  }

  if ((input.contractsExpiringSoon ?? 0) > 0) {
    f.push({
      code: 'CONTRACT_EXPIRING',
      category: '契約',
      title: '契約更新期限が接近',
      severity: sev('MEDIUM'),
      detail: `まもなく更新期限を迎える契約が ${input.contractsExpiringSoon} 件。`,
      recommendation: '更新可否の確認と、継続提案の準備。',
    });
  }

  if ((input.pendingApprovals ?? 0) >= 5) {
    f.push({
      code: 'APPROVAL_BACKLOG',
      category: '承認',
      title: '承認待ちの滞留',
      severity: sev('LOW'),
      detail: `承認待ちが ${input.pendingApprovals} 件。`,
      recommendation: '見積発行・外部送信などの承認を処理。',
    });
  }

  const order: AlertSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
  return f.sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));
}
