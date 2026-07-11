import { z } from 'zod';

export const ActionItemSchema = z.object({
  title: z.string(),
  assigneeName: z.string().optional().default(''),
  dueInDays: z.number().optional().default(7),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});

export const MeetingMinutesSchema = z.object({
  summary3: z.string(),
  summaryFull: z.string(),
  ceoSummary: z.string(),
  insights: z.string().default(''),
  risks: z.string().default(''),
  nextAgenda: z.string().default(''),
  decisions: z.array(z.string()).default([]),
  actionItems: z.array(ActionItemSchema).default([]),
});
export type MeetingMinutesResult = z.infer<typeof MeetingMinutesSchema>;

export const CustomerInsightSchema = z.object({
  needs: z.string(),
  concerns: z.string(),
  priceReaction: z.string(),
  nextProposal: z.string(),
  ngWords: z.array(z.string()).default([]),
  churnRisk: z.number().min(0).max(100).default(20),
  confidence: z.number().min(0).max(1).default(0.6),
});
export type CustomerInsightResult = z.infer<typeof CustomerInsightSchema>;

export const LeadInsightSchema = z.object({
  strengths: z.array(z.string()).default([]),
  opportunities: z.array(z.string()).default([]),
  angle: z.string(),
  reasoning: z.string().default(''),
  confidence: z.number().min(0).max(1).default(0.6),
});
export type LeadInsightResult = z.infer<typeof LeadInsightSchema>;

export const ReviewAnalysisSchema = z.object({
  praised: z.array(z.string()).default([]),
  complaints: z.array(z.string()).default([]),
  recurring: z.array(z.string()).default([]),
  opportunities: z.array(z.string()).default([]),
  positiveReframe: z.string().default(''),
});
export type ReviewAnalysisResult = z.infer<typeof ReviewAnalysisSchema>;

export const WebsiteFindingSchema = z.object({
  type: z.string(),
  positive: z.boolean().default(false),
  detail: z.string(),
});
export const WebsiteAnalysisSchema = z.object({
  findings: z.array(WebsiteFindingSchema).default([]),
});
export type WebsiteAnalysisResult = z.infer<typeof WebsiteAnalysisSchema>;

export const OutreachDraftSchema = z.object({
  subject: z.string(),
  body: z.string(),
  rationale: z.string().default(''),
  evidence: z.string().default(''),
  cautions: z.string().default(''),
});
export type OutreachDraftResult = z.infer<typeof OutreachDraftSchema>;

export const ReplyClassificationSchema = z.object({
  classification: z.enum([
    'interested',
    'not_now',
    'later',
    'forward',
    'doc',
    'quote',
    'unsubscribe',
    'complaint',
    'auto',
    'unknown',
  ]),
  confidence: z.number().min(0).max(1).default(0.6),
  reason: z.string().default(''),
});
export type ReplyClassificationResult = z.infer<typeof ReplyClassificationSchema>;

export const MorningReportSchema = z.object({
  forCeo: z.string(),
  highlights: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  todayTasks: z.array(z.string()).default([]),
  salesOpportunities: z.array(z.string()).default([]),
  leadmapTodo: z.array(z.string()).default([]),
  confirmations: z.array(z.string()).default([]),
});
export type MorningReportResult = z.infer<typeof MorningReportSchema>;

export const KnowledgeAnswerSchema = z.object({
  answer: z.string(),
  confidence: z.number().min(0).max(1).default(0.6),
  citations: z.array(z.object({ title: z.string(), snippet: z.string() })).default([]),
});
export type KnowledgeAnswerResult = z.infer<typeof KnowledgeAnswerSchema>;

export const ContractRiskSchema = z.object({
  risks: z
    .array(
      z.object({
        description: z.string(),
        severity: z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
        recommendation: z.string().default(''),
        expertNeeded: z.boolean().default(false),
      }),
    )
    .default([]),
});
export type ContractRiskResult = z.infer<typeof ContractRiskSchema>;

/** C19 Ads 改善案下書き（Phase 3.5・read-only 分析＋下書きのみ。外部広告 API・支出は封印中）。 */
export const AdsImprovementSchema = z.object({
  title: z.string(),
  recommendations: z.array(z.string()).min(1),
  /** 根拠（どの指標・どのデータから導いたか）。 */
  rationale: z.array(z.string()).default([]),
  /** データ不足の明示（不足がなければ空配列）。 */
  dataGaps: z.array(z.string()).default([]),
  /** 次に人間が確認すべき事項。 */
  nextHumanChecks: z.array(z.string()).min(1),
  confidence: z.number().min(0).max(1),
});
export type AdsImprovementResult = z.infer<typeof AdsImprovementSchema>;

/** C21 SEO ブリーフ下書き（Phase 3.5・下書きのみ。外部検索・順位取得・公開・CMS 投稿は封印中）。 */
// v5.8 Medium-5 修正: 各フィールドに上限を課す（巨大 AIOutput の保存・描画肥大化を構造で防ぐ。
// 実 LLM 化時も Zod 検証で強制される）。
export const SeoBriefSchema = z.object({
  title: z.string().max(160),
  keyword: z.string().max(160),
  /** 検索意図の推定（情報収集/比較検討/購入行動 など）。 */
  searchIntent: z.string().max(400),
  /** 記事構成（見出し案）。 */
  outline: z.array(z.string().max(200)).min(3).max(12),
  metaTitle: z.string().max(120),
  metaDescription: z.string().max(300),
  rationale: z.array(z.string().max(500)).max(10).default([]),
  dataGaps: z.array(z.string().max(300)).max(10).default([]),
  nextHumanChecks: z.array(z.string().max(400)).min(1).max(10),
  confidence: z.number().min(0).max(1),
});
export type SeoBriefResult = z.infer<typeof SeoBriefSchema>;
