// AI Growth Opportunity Control Tower v0 — データ整形層（read-only）。
// 既存モデルを tenantId スコープで read-only 集約し、finance redact を適用して
// @hokko/shared の純ロジック（buildControlTowerCards）に渡す。
// 新規 schema/テーブルは追加しない。業務データの mutation はしない。
// finance（原価・粗利・未回収）は canViewFinance=false のとき実値を集計・表示しない。
import { prisma, writeDataAccess } from '@/lib/db';
import { getGoldenPathExecutiveDashboardData } from '@/lib/domains/operations/golden-path-dashboard';
import {
  buildControlTowerCards,
  countActionableCards,
  type ControlTowerCard,
  type ControlTowerSignals,
} from '@hokko/shared';

// v0 のしきい値（仮置き・状態永続化なし）。実運用値は後続段で調整する。
const STALLED_DEAL_DAYS = 14;
const NEXT_CONTACT_DUE_DAYS = 30;
const HIGH_OPPORTUNITY_LEAD_PRIORITY = 70;

export interface ControlTowerViewData {
  cards: ControlTowerCard[];
  canViewFinance: boolean;
  actionableCount: number;
}

/**
 * Control Tower v0 の表示データを read-only で集約する。
 * @param tenantId テナントスコープ（必須）
 * @param canViewFinance finance 実値を集計・表示してよいか（hasPermission(user,'finance','read')）
 * @param actorId 監査記録用の閲覧者 ID（finance に触れた場合のみ confidential_view を1件記録）
 */
export async function getControlTowerData(
  tenantId: string,
  canViewFinance: boolean,
  actorId: string | null,
): Promise<ControlTowerViewData> {
  const now = new Date();
  const stalledCutoff = new Date(now.getTime() - STALLED_DEAL_DAYS * 24 * 60 * 60 * 1000);
  const nextContactCutoff = new Date(now.getTime() - NEXT_CONTACT_DUE_DAYS * 24 * 60 * 60 * 1000);

  // 非 finance の件数はすべて tenantId スコープの count（PII・金額は取得しない）。
  const [
    uncontactedLeads,
    highOpportunityLeads,
    nextContactDue,
    stalledDeals,
    companyBrainGaps,
    existingCustomerUpsell,
    dashboard,
  ] = await Promise.all([
    prisma.localBusinessLead.count({ where: { tenantId, lastContactAt: null } }),
    prisma.localBusinessLead.count({ where: { tenantId, priority: { gte: HIGH_OPPORTUNITY_LEAD_PRIORITY } } }),
    prisma.localBusinessLead.count({ where: { tenantId, lastContactAt: { not: null, lt: nextContactCutoff } } }),
    // 停滞商談: 一定期間更新なし かつ 失注していない（v0 ヒューリスティック）。
    prisma.deal.count({ where: { tenantId, lostReason: null, updatedAt: { lt: stalledCutoff } } }),
    // 説明（対象課題）が欠けている稼働中カタログ＝補充候補。
    prisma.productCatalogItem.count({ where: { tenantId, status: 'active', targetPain: null } }),
    // 追加提案の母集団は件数のみ（PII を取得・表示しない）。
    prisma.customer.count({ where: { tenantId } }),
    // ceo_attention と finance 系件数は既存の redact 済み経営ダッシュボードから取得。
    getGoldenPathExecutiveDashboardData(tenantId, canViewFinance),
  ]);

  // finance 系（低粗利・未回収）は canViewFinance のときだけ件数を出す。false は null（redaction）。
  const lowMarginProjects = canViewFinance ? dashboard.overall.lowMarginCount : null;
  const unpaidRisk = canViewFinance
    ? dashboard.projects.filter((p) => p.receivableOverdue || (p.unpaidAmount ?? 0) > 0).length
    : null;
  const ceoAttention = dashboard.overall.attentionCount;

  const signals: ControlTowerSignals = {
    uncontactedLeads,
    highOpportunityLeads,
    stalledDeals,
    companyBrainGaps,
    lowMarginProjects,
    unpaidRisk,
    nextContactDue,
    existingCustomerUpsell,
    ceoAttention,
  };

  const cards = buildControlTowerCards(signals, { canViewFinance });

  // finance 機密（原価・粗利・未回収）に触れた閲覧のみ、confidential_view を最小1件記録。
  // 金額・PII は metadata に入れない（件数系のみ／raw なし）。
  if (canViewFinance) {
    await writeDataAccess({
      tenantId,
      actorId,
      entityType: 'GrowthControlTower',
      action: 'confidential_view',
      label: 'INTERNAL',
      purpose: 'growth_control_tower_view',
    });
  }

  return { cards, canViewFinance, actionableCount: countActionableCards(cards) };
}
