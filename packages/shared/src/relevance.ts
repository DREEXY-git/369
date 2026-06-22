// 業務関連性の判定（ヒューリスティック）。FakeLLM のフォールバックにも使用。

export type Relevance = 'relevant' | 'review' | 'private' | 'irrelevant';

const BUSINESS_KEYWORDS = [
  '見積',
  '契約',
  '請求',
  '納品',
  'クレーム',
  '相談',
  '依頼',
  '催促',
  'トラブル',
  '日程',
  '打ち合わせ',
  '商談',
  '発注',
  '支払',
  '案件',
  '提案',
  '会議',
];

const PRIVATE_KEYWORDS = ['家族', 'プライベート', '私用', '個人的', '飲み会', '休暇の相談'];

export interface RelevanceResult {
  relevance: Relevance;
  confidence: number;
  reason: string;
  matched: string[];
}

export function classifyBusinessRelevance(
  text: string,
  signals: { customerName?: string; dealName?: string; knownDomain?: boolean } = {},
): RelevanceResult {
  const matched = BUSINESS_KEYWORDS.filter((k) => text.includes(k));
  const privateMatched = PRIVATE_KEYWORDS.filter((k) => text.includes(k));
  let score = matched.length * 0.18;
  if (signals.customerName && text.includes(signals.customerName)) score += 0.3;
  if (signals.dealName && text.includes(signals.dealName)) score += 0.2;
  if (signals.knownDomain) score += 0.2;
  const privatePenalty = privateMatched.length * 0.25;
  score -= privatePenalty;

  let relevance: Relevance;
  if (privateMatched.length > 0 && privateMatched.length >= matched.length) relevance = 'private';
  else if (score >= 0.5) relevance = 'relevant';
  else if (score >= 0.2) relevance = 'review';
  else relevance = 'irrelevant';

  const confidence = Math.max(0.5, Math.min(0.95, 0.5 + Math.abs(score) * 0.4));
  const reason =
    relevance === 'private'
      ? '私的内容の可能性が高いため保存しません。'
      : relevance === 'relevant'
        ? `業務キーワード(${matched.slice(0, 3).join('・') || '関係者一致'})を検出。`
        : relevance === 'review'
          ? '業務関連の可能性があるため確認待ちにします。'
          : '業務関連性が低いと判定しました。';

  return { relevance, confidence: Math.round(confidence * 100) / 100, reason, matched };
}
