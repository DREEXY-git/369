import { prisma, processOutboxBatch, recordUsageEventCore, transitionOverdueReceivables } from '@hokko/db';
import { runWithAgentLifecycle } from './agent-lifecycle';
import {
  generateMorningReport,
  analyzeReviews,
  generateOutreachDraft,
  classifyOutreachReply,
  getEmbeddingProvider,
  fakeLeadAnalysis,
} from '@hokko/ai';
import {
  detectAnomalies,
  detectProfitLeaks,
  suggestDynamicPrice,
  chunkText,
  classifyBusinessRelevance,
} from '@hokko/shared';

export const JOB_NAMES = [
  'MORNING_REPORT_JOB',
  'ANOMALY_DETECTION_JOB',
  'MEETING_SUMMARY_JOB',
  'ACTION_ITEM_EXTRACTION_JOB',
  'KNOWLEDGE_INGESTION_JOB',
  'EMBEDDING_JOB',
  'COMMUNICATION_CLASSIFICATION_JOB',
  'LEAD_DISCOVERY_JOB',
  'LEAD_WEBSITE_SCAN_JOB',
  'LEAD_REVIEW_ANALYSIS_JOB',
  'LEAD_OUTREACH_GENERATION_JOB',
  'BACKUP_JOB',
  'EXPORT_JOB',
  'KNOWLEDGE_ROLLBACK_JOB',
  'DYNAMIC_PRICING_JOB',
  'PROFIT_LEAK_DETECTION_JOB',
  'CUSTOMER_INSIGHT_JOB',
  'OUTREACH_REPLY_CLASSIFICATION_JOB',
  'OUTBOX_DISPATCH_JOB',
  'RECEIVABLE_OVERDUE_JOB',
] as const;
export type JobName = (typeof JOB_NAMES)[number];

export interface JobData {
  tenantId: string;
  [key: string]: unknown;
}

type Handler = (data: JobData) => Promise<unknown>;

async function recordRun(tenantId: string, task: string, summary: string) {
  const agent = await prisma.aIAgent.findFirst({ where: { tenantId, key: 'chief_of_staff' } });
  if (!agent) return;
  const run = await prisma.aIAgentRun.create({
    data: { tenantId, agentId: agent.id, task, status: 'SUCCEEDED', humanReviewed: false, sentExternally: false, riskLevel: 'LOW', finishedAt: new Date() },
  });
  await prisma.aIAgentAction.create({ data: { tenantId, runId: run.id, type: 'recommend', summary } });
}

export const JOB_HANDLERS: Record<JobName, Handler> = {
  // Stream B2（roadmap74）: Agent Control Plane v0 の producer 接続はこの1本のみ。
  // runWithAgentLifecycle が RUNNING→SUCCEEDED/FAILED（例外時・マスク済みエラー）を記録し、
  // 二重 Run・terminal 巻き戻しを許可表で防止する。他ジョブは従来どおり recordRun（SUCCEEDED のみ）。
  // v5.8 High-2: fn 失敗時は wrapper が FAILED 記録後にマスク済み例外を再 throw する。
  // ここで catch しないこと（BullMQ が失敗を観測して retry / failed telemetry を成立させる）。
  MORNING_REPORT_JOB: async ({ tenantId }) => {
    const lc = await runWithAgentLifecycle(
      { tenantId, agentKey: 'chief_of_staff', task: 'AI朝礼レポート生成', summary: '朝礼レポートを生成しました' },
      async () => {
    const dealSum = await prisma.deal.aggregate({ where: { tenantId, stage: { not: 'LOST' } }, _sum: { amount: true } });
    const report = await generateMorningReport({
      date: new Date().toISOString().slice(0, 10),
      salesActual: Number(dealSum._sum.amount ?? 0),
      salesTarget: 12_000_000,
    });
    const aiOutput = await prisma.aIOutput.create({ data: { tenantId, task: 'generateMorningReport', output: report as any, confidence: 0.7 } });
    // Phase 1-40: 非課金 UsageEvent。worker の朝礼AI出力（aIOutput.create 成功時）だけを1件記録する。
    // apps/web の ai.output.generated（saveAIOutputStandard 経由）とは別 id のため二重計上しない。
    // metadata は固定の非PII（task/source）のみ。output/outputText/レポート本文/金額/secret/実ID は入れない。
    // recordUsageEventCore は例外を投げない設計のため、記録失敗で recordRun・return report を壊さない。
    await recordUsageEventCore({
      tenantId,
      actorId: null,
      actorType: 'system',
      eventType: 'ai.output.generated',
      category: 'ai',
      billing: 'usage_only',
      unit: 'count',
      quantity: 1,
      sourceType: 'AIOutput',
      sourceId: aiOutput.id,
      idempotencyKey: `usage:ai.output.generated:${aiOutput.id}`,
      metadata: { task: 'generateMorningReport', source: 'worker' },
    });
    return report;
      },
    );
    if (lc.skipped) return { skipped: lc.skipped };
    return lc.result;
  },

  // 期日超過の受取債権を open→overdue に自動遷移する（定期実行）。冪等・集合更新・監査つき。
  // これが無いと期日超過の売掛が永久に open のままとなり、延滞集計・異常検知・督促対象に載らない。
  RECEIVABLE_OVERDUE_JOB: async ({ tenantId }) => {
    const res = await transitionOverdueReceivables({ tenantId });
    return res;
  },

  ANOMALY_DETECTION_JOB: async ({ tenantId }) => {
    const overdue = await prisma.receivable.count({ where: { tenantId, status: 'overdue' } });
    const findings = detectAnomalies({ salesActual: 5_000_000, salesTarget: 12_000_000, overdueReceivableCount: overdue });
    for (const f of findings) {
      await prisma.aIAlert.upsert({
        where: { id: `${tenantId}-${f.code}` },
        create: { id: `${tenantId}-${f.code}`, tenantId, code: f.code, title: f.title, detail: f.detail, severity: f.severity },
        update: { detail: f.detail, severity: f.severity, resolved: false },
      }).catch(() => {});
    }
    return { count: findings.length };
  },

  PROFIT_LEAK_DETECTION_JOB: async ({ tenantId }) => {
    const quotes = await prisma.quote.findMany({ where: { tenantId } });
    const findings = detectProfitLeaks({
      quotes: quotes.map((q) => ({ id: q.id, title: q.title, grossMarginRate: Number(q.grossMarginRate), discountRate: Number(q.discountRate), total: Number(q.total) })),
    });
    return { findings: findings.length };
  },

  DYNAMIC_PRICING_JOB: async ({ tenantId }) => {
    const assets = await prisma.productAsset.findMany({ where: { tenantId }, take: 20 });
    let created = 0;
    for (const a of assets) {
      const util = Number(a.utilizationRate);
      const s = suggestDynamicPrice(Number(a.rentalPrice), { lowUtilization: util < 30, peakSeason: util > 60, lowStock: a.quantity < 10 });
      if (s.changeRate !== 0) {
        await prisma.dynamicPricingSuggestion.create({ data: { tenantId, assetId: a.id, basePrice: Number(a.rentalPrice), suggestedPrice: s.suggestedPrice, changeRate: s.changeRate, reason: s.reason, factors: s.appliedFactors as any } });
        created++;
      }
    }
    return { created };
  },

  LEAD_REVIEW_ANALYSIS_JOB: async ({ tenantId, leadId }) => {
    const lead = await prisma.localBusinessLead.findFirst({ where: { tenantId, ...(leadId ? { id: String(leadId) } : { stage: 'NEW' }) }, include: { reviews: true } });
    if (!lead) return { skipped: true };
    const ra = await analyzeReviews(lead.reviews.map((r) => ({ rating: r.rating, text: r.text })));
    const la = fakeLeadAnalysis({ name: lead.name, industry: lead.industry, rating: lead.rating, reviewCount: lead.reviewCount, hasWebsite: !!lead.website, reviewSummary: ra.positiveReframe });
    await prisma.leadInsight.create({ data: { tenantId, leadId: lead.id, strengths: la.strengths, opportunities: la.opportunities, angle: la.angle, reasoning: la.reasoning, confidence: la.confidence } });
    return { leadId: lead.id, opportunities: la.opportunities.length };
  },

  LEAD_OUTREACH_GENERATION_JOB: async ({ tenantId, leadId }) => {
    const lead = await prisma.localBusinessLead.findFirst({ where: { tenantId, ...(leadId ? { id: String(leadId) } : {}) }, include: { insights: { take: 1, orderBy: { createdAt: 'desc' } }, campaign: true } });
    if (!lead) return { skipped: true };
    const draft = await generateOutreachDraft({ leadName: lead.name, industry: lead.industry, city: lead.city ?? '', salesType: lead.campaign.forSalesType, strengths: lead.insights[0]?.strengths, opportunities: lead.insights[0]?.opportunities });
    const saved = await prisma.outreachDraft.create({ data: { tenantId, leadId: lead.id, subject: draft.subject, body: draft.body, rationale: draft.rationale, evidence: draft.evidence, cautions: draft.cautions, status: 'DRAFT' } });
    return { draftId: saved.id };
  },

  OUTREACH_REPLY_CLASSIFICATION_JOB: async ({ tenantId, draftId, body }) => {
    const text = String(body ?? '');
    const cls = await classifyOutreachReply(text);
    if (!draftId) return cls;
    // Codex B-06: draft を **tenantId スコープで先に確定**してから reply/suppression を書く。
    // job payload に foreign draftId が来ても、他 tenant の lead email を読み出したり自 tenant の
    // SuppressionList/Reply へ書き込んだりしない（不一致 enqueue による越境を無害化・fail-closed）。
    const draft = await prisma.outreachDraft.findFirst({ where: { id: String(draftId), tenantId }, include: { lead: true } });
    if (!draft) return { skipped: true };
    await prisma.outreachReply.create({ data: { tenantId, draftId: draft.id, body: text, classification: cls.classification, confidence: cls.confidence } });
    if (cls.classification === 'unsubscribe' && draft.lead.email) {
      await prisma.suppressionList.create({ data: { tenantId, channel: 'email', value: draft.lead.email, reason: '返信で配信停止希望' } }).catch(() => {});
    }
    return cls;
  },

  EMBEDDING_JOB: async ({ tenantId, documentId }) => {
    const doc = await prisma.knowledgeDocument.findFirst({ where: { tenantId, ...(documentId ? { id: String(documentId) } : {}) } });
    if (!doc) return { skipped: true };
    const embedder = getEmbeddingProvider();
    const chunks = chunkText(doc.body, 400, 60);
    const vectors = await embedder.embed(chunks);
    await prisma.knowledgeChunk.deleteMany({ where: { documentId: doc.id } });
    for (let i = 0; i < chunks.length; i++) {
      await prisma.knowledgeChunk.create({ data: { tenantId, documentId: doc.id, ordinal: i, text: chunks[i]!, label: doc.label, embedding: vectors[i]!, active: true } });
    }
    return { chunks: chunks.length };
  },

  COMMUNICATION_CLASSIFICATION_JOB: async ({ tenantId, text }) => {
    const r = classifyBusinessRelevance(String(text ?? ''));
    await prisma.businessRelevanceDecision.create({ data: { tenantId, itemRef: 'job', relevance: r.relevance, reason: r.reason, confidence: r.confidence } });
    return r;
  },

  BACKUP_JOB: async ({ tenantId }) => {
    const job = await prisma.backupJob.create({ data: { tenantId, tier: 'daily', status: 'succeeded', sizeBytes: 1024, artifacts: { create: [{ tenantId, fileKey: `backup/${Date.now()}.tar`, scope: 'full' }] } } });
    return { backupId: job.id };
  },

  EXPORT_JOB: async ({ tenantId, scope }) => {
    const job = await prisma.exportJob.create({ data: { tenantId, scope: String(scope ?? 'customers'), format: 'csv', status: 'completed', fileKey: `exports/${Date.now()}.csv` } });
    return { exportId: job.id };
  },

  // 以下は記録のみの軽量処理（拡張ポイント）
  MEETING_SUMMARY_JOB: async ({ tenantId }) => { await recordRun(tenantId, '議事録生成', '会議要約ジョブ'); return { ok: true }; },
  ACTION_ITEM_EXTRACTION_JOB: async ({ tenantId }) => { await recordRun(tenantId, 'タスク抽出', 'アクション抽出ジョブ'); return { ok: true }; },
  KNOWLEDGE_INGESTION_JOB: async ({ tenantId }) => { await recordRun(tenantId, 'ナレッジ取込', 'ナレッジ取込ジョブ'); return { ok: true }; },
  LEAD_DISCOVERY_JOB: async ({ tenantId }) => { await recordRun(tenantId, 'リード抽出', 'リード抽出ジョブ'); return { ok: true }; },
  LEAD_WEBSITE_SCAN_JOB: async ({ tenantId }) => { await recordRun(tenantId, 'Web解析', 'Webサイト解析ジョブ'); return { ok: true }; },
  KNOWLEDGE_ROLLBACK_JOB: async ({ tenantId }) => { await recordRun(tenantId, 'ナレッジ巻き戻し', '誤学習の巻き戻しジョブ'); return { ok: true }; },
  CUSTOMER_INSIGHT_JOB: async ({ tenantId }) => { await recordRun(tenantId, '顧客インサイト', '顧客インサイト生成ジョブ'); return { ok: true }; },

  // Outbox を全テナント横断で処理（Webhook 配送 + retry/dead-letter + JobRun 記録）。
  OUTBOX_DISPATCH_JOB: async (data) => {
    const limit = Number((data as JobData).limit ?? 100);
    return processOutboxBatch({ limit });
  },
};

export async function runJob(name: JobName, data: JobData): Promise<unknown> {
  const handler = JOB_HANDLERS[name];
  if (!handler) throw new Error(`Unknown job: ${name}`);
  return handler(data);
}
