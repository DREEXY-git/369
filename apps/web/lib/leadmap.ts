import {
  analyzeLeadBusiness,
  analyzeReviews,
  analyzeWebsiteFindings,
  generateOutreachDraft,
} from '@hokko/ai';
import { computeLeadScore } from '@hokko/shared';
import { getMapsProvider } from '@hokko/integrations';
import { prisma } from './db';
import { safeAiInput, saveAIOutputStandard, type AiActorType } from './ai-safety-server';

/** 営業メール生成が高リスク注入で中止されたことを表す。bulk ループはスキップ、単発は blocked 表示。 */
export class OutreachGenerationBlockedError extends Error {
  constructor() {
    super('outreach-generation-blocked:injection');
    this.name = 'OutreachGenerationBlockedError';
  }
}

export interface LeadmapAiActor {
  userId?: string | null;
  actorType?: AiActorType;
}

/** キャンペーン条件で営業先を抽出し、リードとして保存する（Demo/Google）。 */
export async function discoverLeads(opts: {
  tenantId: string;
  campaignId: string;
  region: string;
  industry: string;
  ownerId?: string | null;
  limit?: number;
  minRating?: number;
  maxRating?: number;
  minReviews?: number;
  hasWebsite?: boolean;
}): Promise<number> {
  const provider = getMapsProvider();
  const places = await provider.search({
    region: opts.region,
    industry: opts.industry,
    limit: opts.limit ?? 20,
    minRating: opts.minRating,
    maxRating: opts.maxRating,
    minReviews: opts.minReviews,
    hasWebsite: opts.hasWebsite,
  });

  let created = 0;
  for (const p of places) {
    const wh = p.website_hints;
    const { score, breakdown } = computeLeadScore({
      rating: p.rating,
      reviewCount: p.reviewCount,
      hasWebsite: wh.hasWebsite,
      mobileFriendly: wh.mobile,
      hasBooking: wh.hasBooking,
      hasLine: wh.hasLine,
      hasSocial: !!p.social.instagram,
    });
    await prisma.localBusinessLead.create({
      data: {
        tenantId: opts.tenantId,
        campaignId: opts.campaignId,
        name: p.name,
        industry: opts.industry,
        address: p.address,
        prefecture: p.prefecture,
        city: p.city,
        phone: p.phone,
        website: p.website,
        email: p.email,
        contactForm: p.contactForm,
        rating: p.rating,
        reviewCount: p.reviewCount ?? 0,
        openingHours: p.openingHours,
        lat: p.lat,
        lng: p.lng,
        googleMapsUrl: p.googleMapsUrl,
        placeId: p.placeId,
        source: p.source,
        attributionRequired: p.attributionRequired,
        fetchedAt: new Date(p.fetchedAt),
        expiresAt: p.expiresAt ? new Date(p.expiresAt) : null,
        cachePolicy: p.cachePolicy,
        priority: score,
        stage: 'NEW',
        ownerId: opts.ownerId ?? null,
        placeSnapshots: {
          create: [
            {
              tenantId: opts.tenantId,
              source: p.source,
              placeId: p.placeId,
              payload: p as any,
              attributionRequired: p.attributionRequired,
              expiresAt: p.expiresAt ? new Date(p.expiresAt) : null,
              cachePolicy: p.cachePolicy,
            },
          ],
        },
        reviews: {
          create: p.reviews.map((r) => ({
            tenantId: opts.tenantId,
            author: r.author,
            rating: r.rating,
            text: r.text,
            source: p.source,
          })),
        },
        socialProfiles: {
          create: p.social.instagram
            ? [{ tenantId: opts.tenantId, platform: 'instagram', url: p.social.instagram }]
            : [],
        },
        scores: { create: [{ tenantId: opts.tenantId, score, breakdown }] },
      },
    });
    created++;
  }
  return created;
}

/** リードのWeb解析・レビュー分析・営業切り口生成を実行し保存。 */
export async function analyzeLead(
  tenantId: string,
  leadId: string,
  salesType = 'Web制作',
  actor: LeadmapAiActor = {},
) {
  const lead = await prisma.localBusinessLead.findFirst({
    where: { id: leadId, tenantId },
    include: { reviews: true, websiteScans: true, socialProfiles: true },
  });
  if (!lead) throw new Error('lead not found');

  // 外部由来テキスト（口コミ等）に注入の兆候が無いか検査して記録（分析は継続＝FakeLLMは決定論）。
  const externalText = [lead.name, ...lead.reviews.map((r) => r.text)].join('\n');
  const guard = await safeAiInput({
    tenantId,
    actorId: actor.userId ?? null,
    actorType: actor.actorType ?? 'ai_agent',
    purpose: 'leadmap_lead_analysis',
    text: externalText,
    entityType: 'LocalBusinessLead',
    entityId: leadId,
    detail: 'analyzeLead',
  });

  const wa = await analyzeWebsiteFindings({
    url: lead.website ?? '',
    ssl: !!lead.website,
    mobile: false,
    hasBooking: false,
    hasLine: lead.socialProfiles.some((s) => s.platform === 'line'),
    hasContactForm: !!lead.contactForm,
    hasRecruit: false,
    fetchedOk: !!lead.website,
  });
  if (lead.websiteScans.length === 0) {
    await prisma.websiteScan.create({
      data: {
        tenantId,
        leadId,
        url: lead.website ?? '(なし)',
        fetchedOk: !!lead.website,
        ssl: !!lead.website,
        title: lead.name,
        findings: {
          create: wa.findings.map((f) => ({ tenantId, type: f.type, positive: f.positive, detail: f.detail })),
        },
      },
    });
  }

  const ra = await analyzeReviews(lead.reviews.map((r) => ({ rating: r.rating, text: r.text })));
  const la = await analyzeLeadBusiness({
    name: lead.name,
    industry: lead.industry,
    city: lead.city ?? '',
    rating: lead.rating,
    reviewCount: lead.reviewCount,
    hasWebsite: !!lead.website,
    hasSocial: lead.socialProfiles.length > 0,
    reviewSummary: ra.positiveReframe,
    salesType,
  });
  const insight = await prisma.leadInsight.create({
    data: {
      tenantId,
      leadId,
      strengths: la.strengths,
      opportunities: la.opportunities,
      angle: la.angle,
      reasoning: la.reasoning,
      confidence: la.confidence,
      generatedBy: 'FakeLLM',
    },
  });

  // AIOutput を標準保存（根拠/信頼度/安全フラグ）。外部口コミの注入フラグも引き継ぐ。
  await saveAIOutputStandard({
    tenantId,
    userId: actor.userId ?? null,
    actorType: actor.actorType ?? 'ai_agent',
    task: 'analyzeLead',
    purpose: salesType,
    entityType: 'LeadInsight',
    entityId: insight.id,
    input: { leadId, salesType, externalText },
    output: la,
    outputText: `${la.angle}\n${la.reasoning}`,
    confidence: la.confidence,
    safetyFlags: guard.flags,
  });

  if (lead.stage === 'NEW') {
    await prisma.localBusinessLead.update({ where: { id: leadId }, data: { stage: 'ANALYZED' } });
    await prisma.leadPipelineStageHistory.create({
      data: { tenantId, leadId, fromStage: 'NEW', toStage: 'ANALYZED', note: 'AI分析を実行' },
    });
  }
  return { reviewAnalysis: ra, leadInsight: la };
}

/** 個別営業メール下書きを生成し保存（必ず下書き／送信は人間承認後）。 */
export async function generateOutreachForLead(
  tenantId: string,
  leadId: string,
  opts: {
    salesType?: string;
    senderCompany?: string;
    senderName?: string;
    createdById?: string;
    actorType?: AiActorType;
  },
) {
  const lead = await prisma.localBusinessLead.findFirst({
    where: { id: leadId, tenantId },
    include: { insights: { orderBy: { createdAt: 'desc' }, take: 1 }, campaign: true },
  });
  if (!lead) throw new Error('lead not found');
  const insight = lead.insights[0];

  // 生成は外向き文面のため、入力（リード名・切り口）に高リスク注入があれば中止する。
  const guard = await safeAiInput({
    tenantId,
    actorId: opts.createdById ?? null,
    actorType: opts.actorType ?? 'ai_agent',
    purpose: 'leadmap_outreach_generation',
    text: [lead.name, insight?.angle ?? '', insight?.opportunities?.join(' ') ?? ''].join('\n'),
    entityType: 'LocalBusinessLead',
    entityId: leadId,
    detail: 'generateOutreachForLead',
  });
  if (guard.blocked) throw new OutreachGenerationBlockedError();

  const draft = await generateOutreachDraft({
    leadName: lead.name,
    industry: lead.industry,
    city: lead.city ?? '',
    salesType: opts.salesType ?? lead.campaign.forSalesType,
    senderCompany: opts.senderCompany ?? '弊社',
    senderName: opts.senderName ?? '営業担当',
    strengths: insight?.strengths,
    opportunities: insight?.opportunities,
    angle: insight?.angle,
  });

  const saved = await prisma.outreachDraft.create({
    data: {
      tenantId,
      leadId,
      channel: 'email',
      subject: draft.subject,
      body: draft.body,
      rationale: draft.rationale,
      evidence: draft.evidence,
      cautions: draft.cautions,
      status: 'DRAFT',
      generatedBy: 'FakeLLM',
      createdById: opts.createdById ?? null,
    },
  });

  // AIOutput を標準保存（外部送信前のため PII フラグ検出は保存時に自動付与）。
  await saveAIOutputStandard({
    tenantId,
    userId: opts.createdById ?? null,
    actorType: opts.actorType ?? 'ai_agent',
    task: 'generateOutreachDraft',
    purpose: opts.salesType ?? lead.campaign.forSalesType,
    entityType: 'OutreachDraft',
    entityId: saved.id,
    input: { leadId, salesType: opts.salesType },
    output: draft,
    outputText: `${draft.subject}\n${draft.body}`,
    safetyFlags: guard.flags,
  });

  if (['NEW', 'ANALYZED'].includes(lead.stage)) {
    await prisma.localBusinessLead.update({ where: { id: leadId }, data: { stage: 'DRAFTED' } });
  }
  return saved;
}
