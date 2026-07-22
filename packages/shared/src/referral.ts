// C22 Growth Channels — 紹介・リファラルの read-only 分析（v7.2 Lane B・roadmap76/83 §4・schema-free）。
// 既存 Customer/Deal の射影データから「紹介元候補」を決定論的に導出する純ロジック。
// **候補の算出まで**であり、確定・報酬・外部送信・公開は一切行わない（人間 Gate・封印中）。
// PII 最小化: 本モジュールは顧客名・連絡先を受け取らず、参照 id と非 PII の実測値だけで判定する。
// 下書き（Fake）はプレースホルダ差し込み方式で、本文へ実名を複製しない。

/** 紹介系4チャネル。外部運用（配布・招待・報酬支払）はすべて封印中（人間 Gate）。 */
export const REFERRAL_CHANNELS = [
  {
    key: 'referral',
    label: '顧客紹介',
    description: '既存顧客からの紹介。候補分析と下書きまで（依頼送信は既存 outreach 承認経路のみ）。',
    dataSource: 'internal' as const, // 既存 Customer/Deal から候補を導出できる
  },
  {
    key: 'affiliate',
    label: 'アフィリエイト',
    description: '成果報酬型の外部パートナー。外部連携が封印中のため対象データなし。',
    dataSource: 'external' as const, // 外部データが必要＝現時点で候補 0 が正しい表示
  },
  {
    key: 'creator',
    label: 'クリエイター協業',
    description: 'インフルエンサー/制作者との協業。外部連携が封印中のため対象データなし。',
    dataSource: 'external' as const,
  },
  {
    key: 'business_network',
    label: 'ビジネスネットワーク',
    description: '取引実績の厚い顧客との相互紹介網。候補分析まで（合意・契約は人間）。',
    dataSource: 'internal' as const,
  },
] as const;

export type ReferralChannelKey = (typeof REFERRAL_CHANNELS)[number]['key'];

/** 紹介元候補判定の入力（PII を含まない射影のみ・名前や連絡先は渡さない）。 */
export interface ReferralSourceInput {
  /** Customer.id（参照のみ）。 */
  customerId: string;
  rank: string; // A/B/C/D
  status: string; // active など
  satisfaction: number | null; // 0-100・null は未計測
  churnRisk: number | null; // 0-100・null は未計測
  /** WON stage の Deal 件数（実測）。 */
  wonDeals: number;
  lastContactAt: Date | null;
}

export interface ReferralCandidate {
  customerId: string;
  eligible: boolean;
  /** 0-100 の決定論スコア（同一入力→同一出力）。 */
  score: number;
  /** 候補根拠（実測由来のみ・推測 ROI や架空成果を含まない）。 */
  reasons: string[];
  /** 人間が慎重判断すべきフラグ（自動 BAN・自動除外はしない）。 */
  cautionFlags: string[];
  /** 推奨チャネル（internal データで判定できる referral / business_network のみ）。 */
  suggestedChannel: Extract<ReferralChannelKey, 'referral' | 'business_network'>;
}

const RECENT_CONTACT_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * 紹介元候補の決定論判定。
 * - 取引実績（WON deal）が 1 件以上あることが前提（実績のない顧客へ紹介依頼はしない）。
 * - satisfaction/churnRisk が未計測（null）の場合は加点も減点もせず「未計測」を明示する
 *   （計測なしを 0 や高評価と混同しない・outcome-evidence と同じ規律）。
 */
export function classifyReferralSource(input: ReferralSourceInput, now: Date): ReferralCandidate {
  const reasons: string[] = [];
  const cautionFlags: string[] = [];
  let score = 0;

  if (input.wonDeals >= 1) {
    score += 40;
    reasons.push(`成約実績 ${input.wonDeals} 件（実測）`);
  }
  if (input.rank === 'A') {
    score += 25;
    reasons.push('顧客ランク A');
  } else if (input.rank === 'B') {
    score += 15;
    reasons.push('顧客ランク B');
  }
  if (input.satisfaction == null) {
    cautionFlags.push('満足度は未計測（実測なし・推測しない）');
  } else if (input.satisfaction >= 70) {
    score += 20;
    reasons.push(`満足度 ${input.satisfaction}（実測）`);
  }
  if (input.churnRisk != null && input.churnRisk >= 70) {
    cautionFlags.push(`解約リスク ${input.churnRisk}（紹介依頼は慎重に・人間判断）`);
  }
  if (input.lastContactAt && now.getTime() - input.lastContactAt.getTime() <= RECENT_CONTACT_MS) {
    score += 15;
    reasons.push('直近90日以内に接触あり');
  } else {
    cautionFlags.push('最終接触が90日以上前または記録なし');
  }
  if (input.status !== 'active') {
    cautionFlags.push(`顧客ステータスが ${input.status}（active ではない）`);
  }

  const eligible = input.status === 'active' && input.wonDeals >= 1 && score >= 40;
  // 実績が厚い（成約2件以上かつランクA）場合のみ相互紹介網の候補・それ以外は通常の顧客紹介。
  const suggestedChannel = input.wonDeals >= 2 && input.rank === 'A' ? 'business_network' : 'referral';
  return { customerId: input.customerId, eligible, score: Math.min(100, score), reasons, cautionFlags, suggestedChannel };
}

/** ステマ防止の関係性明示（PR 表記）。下書きから削除できない固定文言（roadmap76 §3）。 */
export const REFERRAL_PR_DISCLOSURE =
  '【PR・関係性の明示】本紹介により紹介者へ特典が発生する場合があります。';

/** 報酬に関する注記（AI は税務を断定助言しない・roadmap76 §3）。 */
export const REFERRAL_REWARD_TAX_NOTE =
  '報酬・特典は候補の算出までです。確定は人間の承認が必要で、税務上の取扱いは専門家への確認が必要です。';

/** 下書き内の差し込みプレースホルダ（本文へ実名・連絡先を複製しない）。 */
export const REFERRAL_NAME_PLACEHOLDER = '{お客様名}';
export const REFERRAL_COMPANY_PLACEHOLDER = '{自社名}';

export interface ReferralDraft {
  subject: string;
  body: string;
}

/**
 * 紹介依頼文の決定論的 Fake 下書き（内部プレビュー専用・外部送信不可）。
 * - 実名・連絡先は受け取らず、プレースホルダのみで組み立てる（PII 非複製）。
 * - PR 表記（REFERRAL_PR_DISCLOSURE）は入力に関わらず必ず末尾に付与され、削除経路がない。
 * - channel により文面を切り替えるが、外部作用（送信・公開・報酬）は一切発生しない。
 */
export function buildReferralDraft(channel: Extract<ReferralChannelKey, 'referral' | 'business_network'>): ReferralDraft {
  const subject =
    channel === 'business_network'
      ? `${REFERRAL_NAME_PLACEHOLDER}さま｜相互のお取引先ご紹介のご相談`
      : `${REFERRAL_NAME_PLACEHOLDER}さま｜お知り合いのご紹介のお願い`;
  const intro =
    channel === 'business_network'
      ? `いつも${REFERRAL_COMPANY_PLACEHOLDER}をお引き立ていただきありがとうございます。\n貴社とのお取引実績を踏まえ、相互にお取引先をご紹介し合える関係づくりについてご相談させてください。`
      : `いつも${REFERRAL_COMPANY_PLACEHOLDER}をご利用いただきありがとうございます。\nもし当社のサービスがお役に立てそうなお知り合いがいらっしゃいましたら、ご紹介いただけますと幸いです。`;
  const body = [
    intro,
    'ご紹介にあたって、被紹介者さまへの事前の同意確認をお願いしております（同意のない連絡先へは当社から連絡いたしません）。',
    REFERRAL_REWARD_TAX_NOTE,
    REFERRAL_PR_DISCLOSURE,
  ].join('\n\n');
  return { subject, body };
}

// ============================================================================
// Phase 3.5: 紹介記録（CustomerReferral）の状態機械・集計 — DB 非依存の純ロジック。
// 「紹介元候補の分析（上記）」に対し、こちらは「実際に受けた紹介を成約まで追跡」する側。
// ============================================================================

export const REFERRAL_RECORD_STATUSES = ['received', 'in_progress', 'won', 'lost'] as const;
export type ReferralRecordStatus = (typeof REFERRAL_RECORD_STATUSES)[number];

export const REFERRAL_RECORD_STATUS_LABEL: Record<ReferralRecordStatus, string> = {
  received: '受領',
  in_progress: '商談中',
  won: '成約',
  lost: '不成立',
};

export function isReferralRecordStatus(s: string): s is ReferralRecordStatus {
  return (REFERRAL_RECORD_STATUSES as readonly string[]).includes(s);
}

// 許可する状態遷移。received→(商談中/成約/不成立)、商談中→(成約/不成立)、不成立→商談中（再挑戦）。成約は終端。
const REFERRAL_RECORD_TRANSITIONS: Record<ReferralRecordStatus, ReferralRecordStatus[]> = {
  received: ['in_progress', 'won', 'lost'],
  in_progress: ['won', 'lost'],
  won: [],
  lost: ['in_progress'],
};

/** 紹介記録の状態遷移可否（不正・同一・終端からの遷移は false＝fail-closed）。 */
export function canTransitionReferralRecord(from: string, to: string): boolean {
  if (!isReferralRecordStatus(from) || !isReferralRecordStatus(to) || from === to) return false;
  return REFERRAL_RECORD_TRANSITIONS[from].includes(to);
}

export interface ReferralRecordSummaryInput {
  status: string;
  estimatedValue: number | null;
}

export interface ReferralRecordSummary {
  total: number;
  received: number;
  inProgress: number;
  won: number;
  lost: number;
  /** 成約率 = 成約 /（成約＋不成立）・0-100（未決着は分母に含めない）。 */
  winRate: number;
  /** 進行中（受領＋商談中）の見込み金額合計。 */
  pipelineValue: number;
  /** 成約の見込み金額合計。 */
  wonValue: number;
}

/** 状況別カウント・金額（DB groupBy でも array 集計でも作れる中間形）。 */
export interface ReferralRecordCounts {
  received: number;
  inProgress: number;
  won: number;
  lost: number;
  pipelineValue: number; // 受領＋商談中の見込み金額合計
  wonValue: number; // 成約の見込み金額合計
}

/** カウント・金額から集計（件数・成約率）を導出。DB aggregate 経路と array 経路の共通ロジック（Codex R4-07）。 */
export function deriveReferralSummary(c: ReferralRecordCounts): ReferralRecordSummary {
  const decided = c.won + c.lost;
  const winRate = decided > 0 ? Math.round((c.won / decided) * 1000) / 10 : 0;
  return {
    total: c.received + c.inProgress + c.won + c.lost,
    received: c.received,
    inProgress: c.inProgress,
    won: c.won,
    lost: c.lost,
    winRate,
    pipelineValue: c.pipelineValue,
    wonValue: c.wonValue,
  };
}

/** 紹介記録の配列を状況別に集計（件数・成約率・見込み金額）。DB 非依存。 */
export function summarizeReferralRecords(records: ReferralRecordSummaryInput[]): ReferralRecordSummary {
  const c: ReferralRecordCounts = { received: 0, inProgress: 0, won: 0, lost: 0, pipelineValue: 0, wonValue: 0 };
  for (const r of records) {
    const v = Math.max(0, r.estimatedValue ?? 0);
    if (r.status === 'received') { c.received++; c.pipelineValue += v; }
    else if (r.status === 'in_progress') { c.inProgress++; c.pipelineValue += v; }
    else if (r.status === 'won') { c.won++; c.wonValue += v; }
    else if (r.status === 'lost') { c.lost++; }
  }
  return deriveReferralSummary(c);
}

// ---- 紹介元ランキング（誰が実際に紹介してくれたか・成約に繋がったか） ----
// 「紹介元候補（誰に頼むか）」の予測分析に対し、こちらは CustomerReferral の実績を紹介者ごとに集計する。
// DB の groupBy(['referrerName','status']) 1本の結果を渡す想定の純ロジック（PII は名前のみ・件数/金額の実測）。

/** groupBy(['referrerName','status']) の1行に対応（count と 成約金額の合計）。 */
export interface ReferrerGroupRow {
  referrerName: string;
  status: string;
  count: number;
  /** この (referrerName,status) の estimatedValue 合計（成約金額として使うのは status==='won' の行のみ）。 */
  wonValue: number;
}

export interface ReferrerLeaderRow {
  referrerName: string;
  total: number;
  won: number;
  lost: number;
  /** 成約率 = 成約 /（成約＋不成立）・0-100（未決着は分母に含めない）。 */
  winRate: number;
  /** 成約（won）の見込み金額合計。 */
  wonValue: number;
}

/**
 * 紹介者ごとの実績集計（紹介数・成約・成約率・成約金額）。DB 非依存の純関数。
 * 並びは「成約金額の多い順 → 成約数 → 紹介総数 → 名前昇順」の決定論ソート（同一入力→同一出力）。
 * 成約率は決着（成約＋不成立）が 0 なら 0（0除算しない）。金額は won の行の合計のみ計上（負値は 0 に丸めず入力側で検証済み前提だが安全に max(0)）。
 */
export function summarizeReferrersByName(rows: ReferrerGroupRow[]): ReferrerLeaderRow[] {
  const byName = new Map<string, { total: number; won: number; lost: number; wonValue: number }>();
  for (const r of rows) {
    const acc = byName.get(r.referrerName) ?? { total: 0, won: 0, lost: 0, wonValue: 0 };
    const count = Math.max(0, r.count);
    acc.total += count;
    if (r.status === 'won') {
      acc.won += count;
      acc.wonValue += Math.max(0, r.wonValue);
    } else if (r.status === 'lost') {
      acc.lost += count;
    }
    byName.set(r.referrerName, acc);
  }
  const out: ReferrerLeaderRow[] = [];
  for (const [referrerName, a] of byName) {
    const decided = a.won + a.lost;
    const winRate = decided > 0 ? Math.round((a.won / decided) * 1000) / 10 : 0;
    out.push({ referrerName, total: a.total, won: a.won, lost: a.lost, winRate, wonValue: a.wonValue });
  }
  out.sort(
    (x, y) =>
      y.wonValue - x.wonValue ||
      y.won - x.won ||
      y.total - x.total ||
      x.referrerName.localeCompare(y.referrerName, 'ja') ||
      // Codex D-REF-02: localeCompare('ja') は別文字列でも 0 を返す組があるため、最終 fallback に
      // code-point 全順序を加えて一意に決定（groupBy は入力順不定なので stable sort だけでは揺れる）。
      (x.referrerName < y.referrerName ? -1 : x.referrerName > y.referrerName ? 1 : 0),
  );
  return out;
}

// ---- 紹介の「要フォロー」検知（放置された紹介を取りこぼさない） ----
// 未決着（受領・商談中）のまま一定日数 動きが無い紹介を炙り出す。updatedAt は状況更新で前進するため
// 「最後に進捗してから N 日」の代理指標になる。won/lost（終端）はフォロー不要＝対象外。DB 非依存の純関数。

/** 要フォロー判定のしきい値（日）。受領/商談中のまま この日数 動きが無ければ「放置」とみなす。 */
export const REFERRAL_STALE_DAYS = 14;

/** 未決着（受領/商談中）＝まだ追える紹介の状況。 */
const REFERRAL_OPEN_STATUSES: readonly string[] = ['received', 'in_progress'];

/**
 * 紹介が「要フォロー（放置）」か判定する純関数。
 * - 対象は未決着（受領/商談中）のみ。won/lost（終端）は常に false（フォロー不要）。
 * - updatedAt が (now - thresholdDays) より前なら true。しきい値ちょうどは放置に含めない（境界は安全側）。
 */
export function isReferralStale(status: string, updatedAt: Date, now: Date, thresholdDays: number = REFERRAL_STALE_DAYS): boolean {
  if (!REFERRAL_OPEN_STATUSES.includes(status)) return false;
  const ageMs = now.getTime() - updatedAt.getTime();
  return ageMs > thresholdDays * 24 * 60 * 60 * 1000;
}

/** 放置とみなす基準日時（now - thresholdDays）。DB クエリの updatedAt: { lt } に渡す用途。 */
export function referralStaleBefore(now: Date, thresholdDays: number = REFERRAL_STALE_DAYS): Date {
  return new Date(now.getTime() - thresholdDays * 24 * 60 * 60 * 1000);
}

/** 紹介記録の作成入力（検証済み）。 */
export interface ReferralRecordDraftInput {
  referrerName: string;
  referredName: string;
  referredContact: string | null;
  note: string | null;
  estimatedValue: number | null;
}

// DECIMAL(14,2) の整数部上限（12桁）。
const REFERRAL_MAX_ESTIMATED_VALUE = 999_999_999_999.99;

/**
 * 紹介記録の作成入力を server 側で検証（HTML 制約に依存しない・Codex R4-04/08）。DB 非依存の純関数。
 * 氏名 1..100 / 連絡先 0..120 / note 0..500、金額は 10進・0以上・DECIMAL(14,2) 範囲。範囲外は丸めず null（＝入力エラー）。
 */
export function validateReferralRecordInput(raw: {
  referrerName?: string | null;
  referredName?: string | null;
  referredContact?: string | null;
  note?: string | null;
  estimatedValue?: string | null;
}): ReferralRecordDraftInput | null {
  const referrerName = String(raw.referrerName ?? '').trim();
  const referredName = String(raw.referredName ?? '').trim();
  const referredContact = String(raw.referredContact ?? '').trim();
  const note = String(raw.note ?? '').trim();
  const estRaw = String(raw.estimatedValue ?? '').trim();
  if (referrerName.length < 1 || referrerName.length > 100) return null;
  if (referredName.length < 1 || referredName.length > 100) return null;
  if (referredContact.length > 120) return null;
  if (note.length > 500) return null;
  let estimatedValue: number | null = null;
  if (estRaw) {
    if (!/^\d{1,12}(\.\d{1,2})?$/.test(estRaw)) return null; // 指数表記・記号・桁溢れを弾く
    const v = Number(estRaw);
    if (!Number.isFinite(v) || v < 0 || v > REFERRAL_MAX_ESTIMATED_VALUE) return null;
    estimatedValue = v;
  }
  return { referrerName, referredName, referredContact: referredContact || null, note: note || null, estimatedValue };
}
