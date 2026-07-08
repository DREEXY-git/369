// AI Growth Opportunity Control Tower v0 — 純ロジック（DB非依存）。
// 既存データから算出した「成長機会シグナル（件数）」を、優先度つきの表示カードへ整形する。
// ここでは DB アクセス・状態永続化・外部送信・実LLM を一切行わない（read-only 集約の表示整形のみ）。
// finance 系カードは canViewFinance=false のとき redacted=true・count=null とし、実値を渡さない。

/** 財務権限がない閲覧者に金額系カードで出す redaction 文言（app 既存文言と一致させる）。 */
export const CONTROL_TOWER_REDACTION_NOTICE = '原価・粗利は財務閲覧権限が必要です（機密情報）。';

export type ControlTowerCardKey =
  | 'uncontacted_leads'
  | 'high_opportunity_leads'
  | 'stalled_deals'
  | 'company_brain_gaps'
  | 'low_margin_projects'
  | 'unpaid_risk'
  | 'next_contact_due'
  | 'existing_customer_upsell'
  | 'ceo_attention';

export type ControlTowerPriority = 'high' | 'medium' | 'low';

/** 既存データから集計した成長機会シグナル（すべて件数）。finance 系は権限が無ければ null。 */
export interface ControlTowerSignals {
  uncontactedLeads: number;
  highOpportunityLeads: number;
  stalledDeals: number;
  companyBrainGaps: number;
  lowMarginProjects: number | null;
  unpaidRisk: number | null;
  nextContactDue: number;
  existingCustomerUpsell: number;
  ceoAttention: number;
}

export interface ControlTowerBuildOptions {
  canViewFinance: boolean;
}

/** 表示用カード。状態（既読/スヌーズ等）は持たない。href は既存導線への deep link。 */
export interface ControlTowerCard {
  key: ControlTowerCardKey;
  title: string;
  description: string;
  reason: string;
  count: number | null;
  priority: ControlTowerPriority;
  score: number;
  href: string;
  source: string;
  financeGated: boolean;
  redacted: boolean;
  empty: boolean;
}

interface CardSpec {
  key: ControlTowerCardKey;
  title: string;
  description: string;
  href: string;
  source: string;
  financeGated: boolean;
  /** 基礎重み（機会の重要度）。0-100。 */
  baseWeight: number;
  /** signals からこのカードの件数を取り出す。 */
  pick: (s: ControlTowerSignals) => number | null;
  /** 件数から表示理由文を作る（deterministic）。 */
  reason: (count: number) => string;
}

const CARD_SPECS: readonly CardSpec[] = [
  {
    key: 'ceo_attention',
    title: '社長が見るべき成長機会',
    description: '経営が今すぐ確認すべき案件（Golden Path の優先度上位）を集約します。',
    href: '/planning-hokko',
    source: 'Golden Path',
    financeGated: false,
    baseWeight: 90,
    pick: (s) => s.ceoAttention,
    reason: (c) => `優先度の高い案件が ${c} 件あります。`,
  },
  {
    key: 'unpaid_risk',
    title: '未回収リスク',
    description: '請求済みで未回収・延滞の案件を、資金繰りリスクとして把握します。',
    href: '/planning-hokko',
    source: 'Finance Bridge',
    financeGated: true,
    baseWeight: 85,
    pick: (s) => s.unpaidRisk,
    reason: (c) => `未回収・延滞の案件が ${c} 件あります。`,
  },
  {
    key: 'stalled_deals',
    title: '停滞商談',
    description: '一定期間更新のない進行中商談を、取りこぼし防止のため洗い出します。',
    href: '/deals',
    source: 'Deal',
    financeGated: false,
    baseWeight: 80,
    pick: (s) => s.stalledDeals,
    reason: (c) => `更新が滞っている商談が ${c} 件あります。`,
  },
  {
    key: 'low_margin_projects',
    title: '低粗利改善候補',
    description: '粗利率の低い案件を、原価・売上見直しの候補として抽出します。',
    href: '/planning-hokko',
    source: 'Golden Path / Finance',
    financeGated: true,
    baseWeight: 75,
    pick: (s) => s.lowMarginProjects,
    reason: (c) => `粗利率の低い案件が ${c} 件あります。`,
  },
  {
    key: 'uncontacted_leads',
    title: '未追客リード',
    description: 'まだ一度も接触していない新規開拓リードを、追客漏れ防止のため表示します。',
    href: '/leadmap',
    source: 'LeadMap',
    financeGated: false,
    baseWeight: 70,
    pick: (s) => s.uncontactedLeads,
    reason: (c) => `未追客のリードが ${c} 件あります。`,
  },
  {
    key: 'high_opportunity_leads',
    title: '高機会リード',
    description: '営業優先度の高いリードを、次に狙うべき候補として並べます。',
    href: '/leadmap',
    source: 'LeadMap',
    financeGated: false,
    baseWeight: 65,
    pick: (s) => s.highOpportunityLeads,
    reason: (c) => `優先度の高いリードが ${c} 件あります。`,
  },
  {
    key: 'next_contact_due',
    title: '次回接触推奨',
    description: '前回接触から時間が空いたリードを、フォローアップ候補として提示します（送信は人間承認）。',
    href: '/leadmap',
    source: 'LeadMap',
    financeGated: false,
    baseWeight: 60,
    pick: (s) => s.nextContactDue,
    reason: (c) => `接触から時間が空いたリードが ${c} 件あります。`,
  },
  {
    key: 'company_brain_gaps',
    title: 'Company Brain 改善候補',
    description: '説明が不足している商品カタログ等を、会社の頭脳の補充候補として示します（下書き扱い）。',
    href: '/brain/catalog',
    source: 'Company Brain',
    financeGated: false,
    baseWeight: 45,
    pick: (s) => s.companyBrainGaps,
    reason: (c) => `補充候補が ${c} 件あります。`,
  },
  {
    key: 'existing_customer_upsell',
    title: '既存顧客追加提案候補',
    description: '既存顧客への追加提案の母集団を、件数（匿名指標）として把握します。個人情報は表示しません。',
    href: '/customers',
    source: 'CRM（件数のみ）',
    financeGated: false,
    baseWeight: 40,
    pick: (s) => s.existingCustomerUpsell,
    reason: (c) => `追加提案の候補が ${c} 件あります。`,
  },
] as const;

function priorityLabel(score: number): ControlTowerPriority {
  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

/**
 * シグナル（件数）から表示カードを優先度降順で構築する。
 * - finance 系カードで canViewFinance=false のときは count を出さず redacted=true にする。
 * - 空（count=0）のカードも empty=true として残す（成長機会ゼロも情報）。
 * スコアは deterministic（乱数・時刻に依存しない）。
 */
export function buildControlTowerCards(
  signals: ControlTowerSignals,
  opts: ControlTowerBuildOptions,
): ControlTowerCard[] {
  const cards: ControlTowerCard[] = CARD_SPECS.map((spec) => {
    const raw = spec.pick(signals);
    const redacted = spec.financeGated && !opts.canViewFinance;
    const count = redacted ? null : raw ?? 0;
    const empty = !redacted && count === 0;

    // スコア: redacted は「存在するが値は非表示」として基礎重みの 6 割で中位に置く。
    // 通常は基礎重み + 件数ボーナス（件数は 20 で頭打ち・過剰に釣り上げない）。
    let score: number;
    if (redacted) {
      score = Math.round(spec.baseWeight * 0.6);
    } else if (count && count > 0) {
      score = spec.baseWeight + Math.min(count, 20);
    } else {
      score = 0;
    }

    const reason = redacted
      ? CONTROL_TOWER_REDACTION_NOTICE
      : count && count > 0
        ? spec.reason(count)
        : '該当する成長機会は今のところありません。';

    return {
      key: spec.key,
      title: spec.title,
      description: spec.description,
      reason,
      count,
      priority: priorityLabel(score),
      score,
      href: spec.href,
      source: spec.source,
      financeGated: spec.financeGated,
      redacted,
      empty,
    };
  });

  // スコア降順 → 同点は基礎重み降順で安定ソート（乱数なし）。
  const weightByKey = new Map(CARD_SPECS.map((s) => [s.key, s.baseWeight]));
  return cards.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (weightByKey.get(b.key) ?? 0) - (weightByKey.get(a.key) ?? 0);
  });
}

/** 表示中カードのうち、実際に成長機会がある（redacted か count>0）件数。サマリー用。 */
export function countActionableCards(cards: ControlTowerCard[]): number {
  return cards.filter((c) => c.redacted || (c.count != null && c.count > 0)).length;
}
