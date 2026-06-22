import {
  classifyBusinessRelevance,
  detectUnsubscribeRequest,
  maskText,
  suggestDynamicPrice,
  type PricingFactors,
} from '@hokko/shared';
import type { LLMProvider } from './providers/types.js';
import { getLLMProvider } from './providers/index.js';
import {
  ContractRiskSchema,
  CustomerInsightSchema,
  KnowledgeAnswerSchema,
  LeadInsightSchema,
  MeetingMinutesSchema,
  MorningReportSchema,
  OutreachDraftSchema,
  ReplyClassificationSchema,
  ReviewAnalysisSchema,
  WebsiteAnalysisSchema,
  type ContractRiskResult,
  type CustomerInsightResult,
  type KnowledgeAnswerResult,
  type LeadInsightResult,
  type MeetingMinutesResult,
  type MorningReportResult,
  type OutreachDraftResult,
  type ReplyClassificationResult,
  type ReviewAnalysisResult,
  type WebsiteAnalysisResult,
} from './schemas.js';

export interface LlmContext {
  llm?: LLMProvider;
  maskPii?: boolean;
}

function extractJson(text: string): string {
  const s = text.indexOf('{');
  const e = text.lastIndexOf('}');
  return s >= 0 && e > s ? text.slice(s, e + 1) : text;
}

async function runStructured<T>(
  ctx: LlmContext,
  opts: {
    task: string;
    system: string;
    user: string;
    // パース後の出力型で T を推論させる（z.infer の Output 型 = 必須フィールド）。
    schema: { parse: (data: unknown) => T };
    fake: () => T;
  },
): Promise<T> {
  const llm = ctx.llm ?? getLLMProvider();
  if (llm.name === 'fake') return opts.fake();
  try {
    const user = ctx.maskPii ? maskText(opts.user) : opts.user;
    const res = await llm.chat(
      [
        { role: 'system', content: opts.system },
        { role: 'user', content: user },
      ],
      { json: true, task: opts.task },
    );
    return opts.schema.parse(JSON.parse(extractJson(res.text)));
  } catch {
    return opts.fake();
  }
}

const SYS =
  'あなたは中小企業向け統合AI経営OS「369」のAIです。日本語で、断定的な法務/税務/労務/財務助言を避け、確認観点と専門家相談候補に留め、指定JSONのみ出力します。';

// ============================ LeadMap: リード分析 =============================

export interface LeadAnalysisInput {
  name: string;
  industry: string;
  city?: string;
  rating?: number | null;
  reviewCount?: number | null;
  hasWebsite?: boolean;
  mobileFriendly?: boolean;
  hasBooking?: boolean;
  hasLine?: boolean;
  hasSocial?: boolean;
  reviewSummary?: string;
  salesType?: string;
}

const ANGLE_BY_SALESTYPE: Record<string, string> = {
  Web制作: 'スマホ予約導線を整えた新規予約率の向上',
  MEO: 'Googleビジネスプロフィール最適化と口コミ運用による集客改善',
  広告: '高評価を活かした広告でのCV最大化（LP導線整備つき）',
  SNS: 'SNSからLINE予約への導線設計',
  採用支援: '採用LPと応募導線の強化',
};

export function fakeLeadAnalysis(input: LeadAnalysisInput): LeadInsightResult {
  const strengths: string[] = [];
  const opportunities: string[] = [];
  const rating = input.rating ?? 0;
  const reviews = input.reviewCount ?? 0;

  if (rating >= 4.3) strengths.push(`Google評価が${rating}と高く、技術・接客への満足度が高い`);
  else if (rating >= 3.8) strengths.push(`Google評価${rating}で一定の支持を得ている`);
  if (reviews >= 50) strengths.push(`口コミ${reviews}件と地域での認知が確立している`);
  if (input.reviewSummary) strengths.push(input.reviewSummary);
  if (strengths.length === 0) strengths.push('地域に根ざした事業基盤がある');

  if (input.hasWebsite === false) opportunities.push('公式Webサイトが見当たらず、受け皿となる導線が弱い');
  else if (input.mobileFriendly === false) opportunities.push('Webサイトのスマホ対応・表示に改善余地がある');
  if (input.hasBooking === false) opportunities.push('オンライン予約導線が弱く、機会損失の可能性');
  if (input.hasLine === false) opportunities.push('LINEなど再来店を促す導線が未整備');
  if (input.hasSocial === false) opportunities.push('SNSの活用・予約への接続に伸びしろがある');
  if (rating > 0 && rating < 4.0) opportunities.push('口コミ評価を一段引き上げる運用改善の余地');
  if (opportunities.length === 0) opportunities.push('既存の高評価を集客・予約に十分に変換できていない可能性');

  const salesType = input.salesType ?? 'Web制作';
  const angleBase = ANGLE_BY_SALESTYPE[salesType] ?? ANGLE_BY_SALESTYPE['Web制作']!;
  const angle = `${strengths[0]}という強みを土台に、${opportunities[0]}を解消する「${angleBase}」を提案できる。`;

  return {
    strengths,
    opportunities,
    angle,
    reasoning:
      '口コミ・Web・SNS・業種特性から、既存の強みを活かしつつ改善余地を前向きな提案に変換しています。',
    confidence: 0.72,
  };
}

export async function analyzeLeadBusiness(
  input: LeadAnalysisInput,
  ctx: LlmContext = {},
): Promise<LeadInsightResult> {
  return runStructured(ctx, {
    task: 'leadmap_lead_analysis',
    system: SYS,
    user: `次の会社を前向きに分析し JSON {strengths[],opportunities[],angle,reasoning,confidence} を出力。\n${JSON.stringify(input)}`,
    schema: LeadInsightSchema,
    fake: () => fakeLeadAnalysis(input),
  });
}

// ============================ LeadMap: レビュー分析 ===========================

const PRAISE_WORDS = ['丁寧', '上手', '技術', '接客', '親切', '雰囲気', '清潔', '美味', '満足', 'また'];
const COMPLAINT_WORDS = ['予約', '待ち', '待た', '高い', '古い', '電話', '繋がら', '対応', '遅い', '駐車'];

export function fakeReviewAnalysis(reviews: { rating?: number; text: string }[]): ReviewAnalysisResult {
  const praised = new Set<string>();
  const complaints = new Set<string>();
  const counts: Record<string, number> = {};
  for (const r of reviews) {
    for (const w of PRAISE_WORDS) if (r.text.includes(w)) praised.add(w);
    for (const w of COMPLAINT_WORDS)
      if (r.text.includes(w)) {
        complaints.add(w);
        counts[w] = (counts[w] ?? 0) + 1;
      }
  }
  const recurring = Object.entries(counts)
    .filter(([, c]) => c >= 2)
    .map(([w]) => w);

  const opp: string[] = [];
  if (complaints.has('予約') || complaints.has('電話') || complaints.has('繋がら'))
    opp.push('予約導線（オンライン予約・LINE予約）の整備');
  if (complaints.has('待ち') || complaints.has('待た')) opp.push('待ち時間・予約管理の改善');
  if (complaints.has('古い')) opp.push('Webサイト・写真など情報の鮮度向上');
  if (opp.length === 0) opp.push('高評価を新規集客・再来店に変換する仕組み化');

  const strengthWord = [...praised][0] ?? '丁寧な対応';
  const reframe = `${strengthWord}への評価が高い一方で、${opp[0]}に取り組むことで、既存の評判をさらに新規獲得へ繋げられる可能性があります。`;

  return {
    praised: [...praised],
    complaints: [...complaints],
    recurring,
    opportunities: opp,
    positiveReframe: reframe,
  };
}

export async function analyzeReviews(
  reviews: { rating?: number; text: string }[],
  ctx: LlmContext = {},
): Promise<ReviewAnalysisResult> {
  return runStructured(ctx, {
    task: 'leadmap_reviews',
    system: SYS,
    user: `口コミを分析し前向きな営業提案に変換。JSON {praised[],complaints[],recurring[],opportunities[],positiveReframe}。\n${JSON.stringify(reviews)}`,
    schema: ReviewAnalysisSchema,
    fake: () => fakeReviewAnalysis(reviews),
  });
}

// ============================ LeadMap: Webサイト解析 =========================

export interface WebsiteScanInput {
  url: string;
  ssl?: boolean;
  mobile?: boolean;
  hasBooking?: boolean;
  hasLine?: boolean;
  hasContactForm?: boolean;
  hasRecruit?: boolean;
  fetchedOk?: boolean;
}

export function fakeWebsiteAnalysis(scan: WebsiteScanInput): WebsiteAnalysisResult {
  const f: WebsiteAnalysisResult['findings'] = [];
  const add = (type: string, positive: boolean, detail: string) => f.push({ type, positive, detail });
  if (scan.fetchedOk === false) add('freshness', false, 'サイトに接続できず、情報が古い/停止の可能性');
  add('seo', !!scan.ssl, scan.ssl ? 'SSL対応済み' : 'SSL未対応で信頼性・SEOに不利');
  add('mobile', !!scan.mobile, scan.mobile ? 'スマホ対応あり' : 'スマホ対応が弱く離脱要因になりうる');
  add('booking', !!scan.hasBooking, scan.hasBooking ? '予約導線あり' : '予約導線がなく機会損失の可能性');
  add('line', !!scan.hasLine, scan.hasLine ? 'LINE導線あり' : 'LINE予約・再来店導線が未整備');
  add('contact', !!scan.hasContactForm, scan.hasContactForm ? '問い合わせフォームあり' : '問い合わせ導線が弱い');
  add('recruit', !!scan.hasRecruit, scan.hasRecruit ? '採用ページあり' : '採用ページが弱く採用導線に伸びしろ');
  return { findings: f };
}

export async function analyzeWebsiteFindings(
  scan: WebsiteScanInput,
  ctx: LlmContext = {},
): Promise<WebsiteAnalysisResult> {
  return runStructured(ctx, {
    task: 'leadmap_website',
    system: SYS,
    user: `Web解析から改善余地を抽出。JSON {findings:[{type,positive,detail}]}。\n${JSON.stringify(scan)}`,
    schema: WebsiteAnalysisSchema,
    fake: () => fakeWebsiteAnalysis(scan),
  });
}

// ============================ LeadMap: 個別営業メール =========================

export interface OutreachInput {
  leadName: string;
  industry: string;
  city?: string;
  salesType?: string;
  senderCompany?: string;
  senderName?: string;
  strengths?: string[];
  opportunities?: string[];
  angle?: string;
}

const PROPOSAL_HOOK: Record<string, string> = {
  Web制作:
    'スマートフォンから予約まで迷わず進めるサイト改善で、いただいているご評価を新規予約に繋げるご提案ができればと考えております。',
  MEO: 'Googleマップ上の写真・情報の最適化と口コミ運用で、検索からの来店を増やすご提案ができればと考えております。',
  広告: '高いご評価を活かし、広告経由の問い合わせ・予約を効率よく増やすご提案ができればと考えております。',
  SNS: 'SNSからLINE予約への導線を整え、フォロワーを来店に変えるご提案ができればと考えております。',
  採用支援: '採用ページと応募導線を整え、採用コストを抑えつつ応募を増やすご提案ができればと考えております。',
};

export function fakeOutreachDraft(input: OutreachInput): OutreachDraftResult {
  const city = input.city ?? '地域';
  const salesType = input.salesType ?? 'Web制作';
  const strength = input.strengths?.[0] ?? '技術・接客への評価が高い点';
  const opportunity = input.opportunities?.[0] ?? '予約導線に改善の余地がある点';
  const hook = PROPOSAL_HOOK[salesType] ?? PROPOSAL_HOOK['Web制作']!;
  const sender = input.senderName ?? '担当';
  const senderCompany = input.senderCompany ?? '弊社';

  const subject = `${input.leadName}様の集客改善に関するご提案（${city}）`;
  const body = [
    `${input.leadName} ご担当者様`,
    '',
    `突然のご連絡失礼いたします。${city}で${salesType}の支援を行っております${senderCompany}の${sender}と申します。`,
    '',
    `${input.leadName}様のGoogleマップの口コミを拝見し、${strength}が高く評価されている一方で、${opportunity}があるように感じました。`,
    '',
    hook,
    '',
    `近い業種での改善事例を15分ほどでご共有できればと思います。ご関心がございましたら、本メールにご返信ください。`,
    '',
    `${senderCompany} ${sender}`,
  ].join('\n');

  return {
    subject,
    body,
    rationale: input.angle ?? `${strength}を土台に、${opportunity}の解消を切り口に設定。`,
    evidence: `口コミ・Web解析より「${strength}」「${opportunity}」を検出。業種: ${input.industry} / 地域: ${city}。`,
    cautions:
      '本文は下書きです。送信前に配信停止リスト・同意状況・送信者情報を確認し、人間の承認を得てから送信してください。誇大表現や断定的な効果保証は避けてください。',
  };
}

export async function generateOutreachDraft(
  input: OutreachInput,
  ctx: LlmContext = {},
): Promise<OutreachDraftResult> {
  return runStructured(ctx, {
    task: 'leadmap_outreach',
    system: SYS,
    user: `この会社に最適化した営業メール下書きを作成。JSON {subject,body,rationale,evidence,cautions}。\n${JSON.stringify(input)}`,
    schema: OutreachDraftSchema,
    fake: () => fakeOutreachDraft(input),
  });
}

// ============================ LeadMap: 返信分類 ==============================

export function fakeClassifyReply(body: string): ReplyClassificationResult {
  if (detectUnsubscribeRequest(body))
    return { classification: 'unsubscribe', confidence: 0.95, reason: '配信停止希望の表現を検出' };
  const map: [RegExp, ReplyClassificationResult['classification'], string][] = [
    [/(興味|ぜひ|詳しく|話を聞|お願いします|前向き)/, 'interested', '前向きな関心を示す表現'],
    [/(見積|お見積|金額|費用感)/, 'quote', '見積依頼の表現'],
    [/(資料|パンフ|事例)/, 'doc', '資料希望の表現'],
    [/(今は|不要|間に合|結構です|見送)/, 'not_now', '今回は不要の表現'],
    [/(後日|また今度|来期|時期が来)/, 'later', '後日連絡希望の表現'],
    [/(担当|部署|転送|別の者)/, 'forward', '担当転送の表現'],
    [/(クレーム|迷惑|二度と|失礼)/, 'complaint', 'クレームの可能性'],
    [/(自動返信|不在|休暇中|auto)/, 'auto', '自動返信の可能性'],
  ];
  for (const [re, cls, reason] of map) {
    if (re.test(body)) return { classification: cls, confidence: 0.78, reason };
  }
  return { classification: 'unknown', confidence: 0.5, reason: '明確な分類根拠なし' };
}

export async function classifyOutreachReply(
  body: string,
  ctx: LlmContext = {},
): Promise<ReplyClassificationResult> {
  return runStructured(ctx, {
    task: 'leadmap_reply_classify',
    system: SYS,
    user: `返信を分類。JSON {classification,confidence,reason}。\n返信: ${body}`,
    schema: ReplyClassificationSchema,
    fake: () => fakeClassifyReply(body),
  });
}

// ============================ 会議: 議事録生成 ===============================

const DECISION_HINTS = ['決定', '決まり', 'することに', 'で進め', '承認', '合意'];
const ACTION_HINTS = ['お願い', '対応', 'までに', '送付', '作成', '確認して', 'タスク', '宿題', '次回まで'];

export function fakeMeetingMinutes(input: {
  title: string;
  transcript: string;
  type?: string;
}): MeetingMinutesResult {
  const lines = input.transcript
    .split('\n')
    .map((l) => l.replace(/^\s*[^:：]{1,12}[:：]\s*/, '').trim())
    .filter(Boolean);
  const sentences = lines.flatMap((l) => l.split(/(?<=[。！？])/)).filter((s) => s.trim().length > 4);

  const decisions = lines.filter((l) => DECISION_HINTS.some((h) => l.includes(h))).slice(0, 6);
  const actionLines = lines.filter((l) => ACTION_HINTS.some((h) => l.includes(h))).slice(0, 8);
  const actionItems = actionLines.map((l, i) => ({
    title: l.slice(0, 60),
    assigneeName: '',
    dueInDays: 7,
    priority: (l.includes('至急') || l.includes('すぐ') ? 'high' : 'medium') as
      | 'low'
      | 'medium'
      | 'high',
  }));

  const head = sentences.slice(0, 3).join(' ');
  const summary3 =
    sentences
      .slice(0, 3)
      .map((s, i) => `${i + 1}. ${s.trim()}`)
      .join('\n') || `1. ${input.title}に関する打ち合わせを実施。`;

  const risks = lines.filter((l) => /(リスク|懸念|遅延|クレーム|未定|問題|不明)/.test(l)).slice(0, 4);

  return {
    summary3,
    summaryFull:
      `「${input.title}」の要約: ` + (head || '主要な論点について議論し、次のアクションを確認しました。'),
    ceoSummary: `【社長向け】${input.title}。決定 ${decisions.length} 件 / 宿題 ${actionItems.length} 件。${
      risks.length ? `要注意: ${risks[0]}` : '大きなリスクは検知されていません。'
    }`,
    insights: sentences.find((s) => /(希望|要望|気になる|予算|比較|検討)/.test(s)) ?? '',
    risks: risks.join(' / '),
    nextAgenda: actionItems[0]?.title
      ? `次回: ${actionItems[0].title} の進捗確認`
      : '次回アジェンダは未確定',
    decisions: decisions.length ? decisions : [],
    actionItems,
  };
}

export async function summarizeMeeting(
  input: { title: string; transcript: string; type?: string },
  ctx: LlmContext = {},
): Promise<MeetingMinutesResult> {
  return runStructured(ctx, {
    task: 'meeting_minutes',
    system: SYS,
    user: `次の会議の議事録を作成。JSON {summary3,summaryFull,ceoSummary,insights,risks,nextAgenda,decisions[],actionItems[{title,assigneeName,dueInDays,priority}]}。\nタイトル:${input.title}\n文字起こし:\n${input.transcript}`,
    schema: MeetingMinutesSchema,
    fake: () => fakeMeetingMinutes(input),
  });
}

export async function extractActionItems(text: string, ctx: LlmContext = {}) {
  const minutes = await summarizeMeeting({ title: 'アクション抽出', transcript: text }, ctx);
  return minutes.actionItems;
}

// ============================ 顧客インサイト =================================

export function fakeCustomerInsights(input: {
  customerName: string;
  history: string;
}): CustomerInsightResult {
  const h = input.history;
  const needs = /(集客|売上|コスト|効率|採用|認知|リピート)/.exec(h)?.[0] ?? '事業成長';
  const churn = /(不満|遅い|高い|検討|他社|見送)/.test(h) ? 55 : 20;
  return {
    needs: `${needs}に関する課題感がうかがえる`,
    concerns: /(予算|価格|高い)/.test(h) ? '価格・費用対効果への懸念' : '導入後の運用負荷への懸念',
    priceReaction: /(高い|予算)/.test(h) ? '価格に敏感。ROIの提示が有効' : '価格より成果を重視',
    nextProposal: `${needs}に直結する小さく始められる施策を提案`,
    ngWords: /(値引き|無料)/.test(h) ? ['安易な値引き提示'] : [],
    churnRisk: churn,
    confidence: 0.66,
  };
}

export async function extractCustomerInsights(
  input: { customerName: string; history: string },
  ctx: LlmContext = {},
): Promise<CustomerInsightResult> {
  return runStructured(ctx, {
    task: 'customer_insight',
    system: SYS,
    user: `顧客履歴からインサイト抽出。JSON {needs,concerns,priceReaction,nextProposal,ngWords[],churnRisk,confidence}。\n顧客:${input.customerName}\n履歴:${input.history}`,
    schema: CustomerInsightSchema,
    fake: () => fakeCustomerInsights(input),
  });
}

// ============================ 朝礼レポート ===================================

export interface MorningReportInput {
  date: string;
  salesActual?: number;
  salesTarget?: number;
  overdueCount?: number;
  unhandledLeads?: number;
  pendingApprovals?: number;
  stalledDeals?: number;
  topTasks?: string[];
  anomalies?: { title: string }[];
}

export function fakeMorningReport(input: MorningReportInput): MorningReportResult {
  const achieve =
    input.salesTarget && input.salesActual !== undefined
      ? Math.round((input.salesActual / input.salesTarget) * 100)
      : null;
  const highlights = [
    achieve !== null ? `売上進捗は目標の${achieve}%。` : '売上データを確認してください。',
    `承認待ち ${input.pendingApprovals ?? 0} 件、停滞案件 ${input.stalledDeals ?? 0} 件。`,
  ];
  const risks = (input.anomalies ?? []).map((a) => a.title);
  if ((input.overdueCount ?? 0) > 0) risks.push(`回収遅延 ${input.overdueCount} 件`);
  const leadmapTodo =
    (input.unhandledLeads ?? 0) > 0
      ? [`高優先度リード ${input.unhandledLeads} 件のAI分析・営業メール承認`]
      : ['新規リードのAI分析を実行'];
  return {
    forCeo: `おはようございます。本日（${input.date}）の要点です。${highlights.join(' ')} ${
      risks.length ? `注意: ${risks.slice(0, 2).join(' / ')}。` : ''
    }`,
    highlights,
    risks,
    todayTasks: input.topTasks ?? ['未対応顧客への返信', '承認待ちの処理'],
    salesOpportunities: ['休眠顧客への再提案', '受注確度の高い案件の前倒し'],
    leadmapTodo,
    confirmations: (input.pendingApprovals ?? 0) > 0 ? ['見積発行・外部送信の承認可否'] : [],
  };
}

export async function generateMorningReport(
  input: MorningReportInput,
  ctx: LlmContext = {},
): Promise<MorningReportResult> {
  return runStructured(ctx, {
    task: 'morning_report',
    system: SYS,
    user: `朝礼レポートを作成。JSON {forCeo,highlights[],risks[],todayTasks[],salesOpportunities[],leadmapTodo[],confirmations[]}。\n${JSON.stringify(input)}`,
    schema: MorningReportSchema,
    fake: () => fakeMorningReport(input),
  });
}

// ============================ ナレッジ Q&A ===================================

export function fakeKnowledgeAnswer(input: {
  question: string;
  contexts: { title: string; text: string }[];
}): KnowledgeAnswerResult {
  if (input.contexts.length === 0) {
    return {
      answer: '社内ナレッジに該当する情報が見つかりませんでした。対象資料の登録をご検討ください。',
      confidence: 0.3,
      citations: [],
    };
  }
  const top = input.contexts.slice(0, 3);
  const answer =
    `ご質問「${input.question}」について、社内ナレッジからの要点は次のとおりです。\n` +
    top.map((c, i) => `(${i + 1}) ${c.title}: ${c.text.slice(0, 90)}…`).join('\n') +
    '\n※ 上記は登録済み資料に基づく要約です。最終判断は原本をご確認ください。';
  return {
    answer,
    confidence: 0.68,
    citations: top.map((c) => ({ title: c.title, snippet: c.text.slice(0, 120) })),
  };
}

export async function answerKnowledgeQuestion(
  input: { question: string; contexts: { title: string; text: string }[] },
  ctx: LlmContext = {},
): Promise<KnowledgeAnswerResult> {
  return runStructured(ctx, {
    task: 'knowledge_qa',
    system: SYS,
    user: `提供文脈のみで回答。JSON {answer,confidence,citations:[{title,snippet}]}。\n質問:${input.question}\n文脈:${JSON.stringify(
      input.contexts,
    )}`,
    schema: KnowledgeAnswerSchema,
    fake: () => fakeKnowledgeAnswer(input),
  });
}

// ============================ 契約リスク =====================================

export function fakeContractRisk(input: { title: string; text: string }): ContractRiskResult {
  const t = input.text;
  const risks: ContractRiskResult['risks'] = [];
  if (/(自動更新|自動的に更新)/.test(t))
    risks.push({
      description: '自動更新条項があり、更新可否の確認漏れに注意。',
      severity: 'MEDIUM',
      recommendation: '更新期限のリマインド設定と、更新可否の社内確認フロー化。',
      expertNeeded: false,
    });
  if (/(損害賠償|賠償責任|無制限)/.test(t))
    risks.push({
      description: '損害賠償の範囲・上限が不明確な可能性。',
      severity: 'HIGH',
      recommendation: '賠償上限・免責範囲の明確化を検討。弁護士確認を推奨。',
      expertNeeded: true,
    });
  if (/(解約|中途解約|違約金)/.test(t))
    risks.push({
      description: '中途解約・違約金条件の確認が必要。',
      severity: 'MEDIUM',
      recommendation: '解約予告期間と違約金の妥当性を確認。',
      expertNeeded: false,
    });
  if (risks.length === 0)
    risks.push({
      description: '重大なリスク表現は検知されませんでしたが、原本での最終確認を推奨します。',
      severity: 'LOW',
      recommendation: '主要条項（期間・金額・責任・解約）の点検。',
      expertNeeded: false,
    });
  return { risks };
}

export async function analyzeContractRisk(
  input: { title: string; text: string },
  ctx: LlmContext = {},
): Promise<ContractRiskResult> {
  return runStructured(ctx, {
    task: 'contract_risk',
    system: SYS,
    user: `契約のリスク確認観点を抽出（断定助言禁止）。JSON {risks:[{description,severity,recommendation,expertNeeded}]}。\n${input.title}\n${input.text}`,
    schema: ContractRiskSchema,
    fake: () => fakeContractRisk(input),
  });
}

// ============================ その他（ルール委譲） ============================

export function classifyRelevance(text: string, signals?: Parameters<typeof classifyBusinessRelevance>[1]) {
  return classifyBusinessRelevance(text, signals);
}

export function generateDynamicPricingSuggestion(basePrice: number, factors: PricingFactors) {
  return suggestDynamicPrice(basePrice, factors);
}

export function generateSubsidyApplicationDraft(input: {
  programName: string;
  company: string;
  purpose: string;
}): string {
  return [
    `【${input.programName} 申請書ドラフト（要・士業確認）】`,
    `申請者: ${input.company}`,
    '',
    '1. 事業の目的',
    `本事業は「${input.purpose}」を目的とし、地域の生産性向上と雇用維持に資するものである。`,
    '',
    '2. 取組内容',
    'デジタル化・設備投資等を通じて業務効率と売上の改善を図る。',
    '',
    '3. 期待される効果',
    '売上・粗利の改善、労働時間の削減、顧客満足度の向上。',
    '',
    '※ 本ドラフトはAIによる下書きです。採択を保証するものではなく、提出前に中小企業診断士・行政書士等の専門家確認を必ず行ってください。',
  ].join('\n');
}
