'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeAudit } from '@/lib/db';
import { emitGrowthEvent } from '@/lib/growth';
import { generateMarketingAsset, type MarketingAssetKind } from '@/lib/ai-generate';
import { requireApprovalForDangerousAction } from '@/lib/approval';
import { checkToolPermission, summarizeAdsMetrics } from '@hokko/shared';
import { generateAdsImprovementDraft } from '@/lib/ads-insight';
import { generateSeoBriefDraft } from '@/lib/seo-brief';
import { toNumber } from '@/lib/utils';

function num(v: FormDataEntryValue | null, d = 0): number {
  const n = Number(v ?? d);
  return Number.isFinite(n) ? n : d;
}

export async function createMarketingCampaignAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'marketing', 'create')) redirect('/marketing?denied=1');
  const name = String(formData.get('name') ?? '').trim();
  if (!name) redirect('/marketing/campaigns/new?error=name');
  const leadsTarget = num(formData.get('leadsTarget'));
  const cvTarget = num(formData.get('cvTarget'));
  const campaign = await prisma.marketingCampaign.create({
    data: {
      tenantId: user.tenantId,
      name,
      channel: String(formData.get('channel') ?? 'sns'),
      purpose: String(formData.get('purpose') ?? ''),
      target: String(formData.get('target') ?? ''),
      budget: num(formData.get('budget')),
      kpiPlan: { leads: leadsTarget, conversions: cvTarget },
      createdById: user.userId,
    },
  });
  await writeAudit({ tenantId: user.tenantId, actorId: user.userId, action: 'create', entityType: 'MarketingCampaign', entityId: campaign.id, summary: `キャンペーン「${name}」を作成` });
  await emitGrowthEvent({
    tenantId: user.tenantId,
    type: 'marketing.campaign.created',
    title: `キャンペーン作成: ${name}`,
    description: `チャネル ${campaign.channel} / 目的 ${campaign.purpose}`,
    actorId: user.userId,
    entityType: 'MarketingCampaign',
    entityId: campaign.id,
    payload: { channel: campaign.channel },
    alsoDomainEvent: { domainType: 'MARKETING_CAMPAIGN_CREATED', aggregateType: 'MarketingCampaign', aggregateId: campaign.id },
  });
  revalidatePath('/marketing/campaigns');
  redirect(`/marketing/campaigns/${campaign.id}`);
}

export async function generateMarketingAssetDraftAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'marketing', 'create')) redirect('/marketing?denied=1');
  // AI ツール権限: 生成は許可（外部送信は別途承認）。AIアクターは forbidden tool 不可。
  const tool = checkToolPermission(user.isAi ? 'ai_agent' : 'user', 'generate');
  if (!tool.allowed) redirect('/marketing/assets?error=tool');

  const campaignId = String(formData.get('campaignId') ?? '') || null;
  const kind = String(formData.get('kind') ?? 'sns') as MarketingAssetKind;
  const result = await generateMarketingAsset({
    tenantId: user.tenantId,
    userId: user.userId,
    kind,
    campaignName: String(formData.get('campaignName') ?? 'キャンペーン'),
    audience: String(formData.get('audience') ?? ''),
    instruction: String(formData.get('instruction') ?? ''),
  });

  if (result.blocked) {
    redirect(`/marketing/assets?blocked=${encodeURIComponent(result.reason ?? 'unsafe')}`);
  }

  const asset = await prisma.contentAsset.create({
    data: {
      tenantId: user.tenantId,
      campaignId,
      type: kind,
      title: result.title,
      body: result.body,
      status: 'draft',
      approvalStatus: 'none',
      generatedByAi: true,
      aiOutputId: result.aiOutputId ?? null,
      safetyFlag: result.safetyFlags.length > 0,
      createdById: user.userId,
    },
  });
  await writeAudit({ tenantId: user.tenantId, actorId: user.userId, action: 'ai_run', entityType: 'MarketingAsset', entityId: asset.id, summary: `AIマーケ資産を生成（${kind}）` });
  await emitGrowthEvent({
    tenantId: user.tenantId,
    type: 'marketing.asset.generated',
    title: `AIマーケ資産生成: ${result.title}`,
    actorId: user.userId,
    entityType: 'MarketingAsset',
    entityId: asset.id,
    payload: { kind, safetyFlags: result.safetyFlags },
  });
  revalidatePath('/marketing/assets');
  redirect(`/marketing/assets?generated=${asset.id}`);
}

export async function requestMarketingAssetApprovalAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'marketing', 'update')) redirect('/marketing/assets?denied=1');
  const assetId = String(formData.get('assetId') ?? '');
  const asset = await prisma.contentAsset.findFirst({ where: { id: assetId, tenantId: user.tenantId } });
  if (!asset) redirect('/marketing/assets?error=notfound');

  // 外部公開・送信は直接行わず、必ず承認申請を作る（直接送信しない）。
  const gate = await requireApprovalForDangerousAction({
    tenantId: user.tenantId,
    action: 'customer_email_send',
    title: `マーケ資産の外部公開: ${asset.title}`,
    targetType: 'MarketingAsset',
    targetId: asset.id,
    requestedById: user.userId,
    riskLevel: 'HIGH',
    reason: 'マーケティング資産を外部公開/配信するため',
    payloadAfter: { type: asset.type },
    external: true,
  });
  await prisma.contentAsset.update({
    where: { id: asset.id },
    data: { approvalStatus: 'pending', status: 'pending_approval' },
  });
  await writeAudit({ tenantId: user.tenantId, actorId: user.userId, action: 'approval_request', entityType: 'MarketingAsset', entityId: asset.id, summary: '資産の外部公開を承認申請' });
  redirect(`/marketing/assets?requested=${gate.approvalId ?? ''}`);
}

export async function updateMarketingAssetAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'marketing', 'update')) redirect('/marketing/assets?denied=1');
  const assetId = String(formData.get('assetId') ?? '');
  const asset = await prisma.contentAsset.findFirst({ where: { id: assetId, tenantId: user.tenantId } });
  if (!asset) redirect('/marketing/assets?error=notfound');
  await prisma.contentAsset.update({
    where: { id: asset.id },
    data: { title: String(formData.get('title') ?? asset.title), body: String(formData.get('body') ?? asset.body) },
  });
  revalidatePath('/marketing/assets');
  redirect('/marketing/assets?updated=1');
}

export async function recordMarketingCampaignResultAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'marketing', 'update')) redirect('/marketing?denied=1');
  const campaignId = String(formData.get('campaignId') ?? '');
  const campaign = await prisma.marketingCampaign.findFirst({ where: { id: campaignId, tenantId: user.tenantId } });
  if (!campaign) redirect('/marketing/campaigns?error=notfound');
  const conversions = num(formData.get('conversions'));
  const cost = num(formData.get('cost'));
  const revenue = num(formData.get('revenue'));
  await prisma.campaignMetric.create({
    data: {
      tenantId: user.tenantId,
      campaignId,
      date: new Date(),
      impressions: num(formData.get('impressions')),
      clicks: num(formData.get('clicks')),
      conversions,
      cost,
    },
  });
  await prisma.marketingCampaign.update({
    where: { id: campaignId },
    data: { kpiActual: { conversions, revenue }, spent: { increment: cost } as any },
  });
  if (conversions > 0 || revenue > 0) {
    await emitGrowthEvent({
      tenantId: user.tenantId,
      type: 'marketing.lead.converted',
      title: `キャンペーン成果: ${campaign.name}`,
      description: `CV ${conversions}件 / 売上 ${revenue}円`,
      actorId: user.userId,
      entityType: 'MarketingCampaign',
      entityId: campaignId,
      revenueImpact: revenue,
      amount: revenue,
      metric: { conversions, cost },
    });
  }
  await writeAudit({ tenantId: user.tenantId, actorId: user.userId, action: 'update', entityType: 'MarketingCampaign', entityId: campaignId, summary: '実績KPIを記録' });
  revalidatePath(`/marketing/campaigns/${campaignId}`);
  redirect(`/marketing/campaigns/${campaignId}`);
}

/** C19 Ads: 広告改善案の下書きを生成する（Phase 3.5 Stream A・roadmap70）。
 *  read-only 分析＋下書きのみ。出稿変更・費用増減・外部媒体反映・外部送信は行わない（封印中）。
 *  生成は人間のみ（AI ロールの再帰生成を作らない・P3-CT-4 と同方針）。 */
export async function generateAdsImprovementDraftAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'marketing', 'create')) redirect('/marketing/ads?denied=1');
  if (user.isAi) redirect('/marketing/ads?denied=1');
  const tool = checkToolPermission('user', 'generate');
  if (!tool.allowed) redirect('/marketing/ads?error=tool');

  const campaignId = String(formData.get('campaignId') ?? '');
  const campaign = await prisma.marketingCampaign.findFirst({
    where: { id: campaignId, tenantId: user.tenantId },
    include: { metrics: true },
  });
  if (!campaign) redirect('/marketing/ads?error=notfound');

  const summary = summarizeAdsMetrics(
    campaign!.metrics.map((m) => ({
      impressions: m.impressions,
      clicks: m.clicks,
      conversions: m.conversions,
      cost: toNumber(m.cost),
    })),
  );
  const result = await generateAdsImprovementDraft({
    tenantId: user.tenantId,
    userId: user.userId,
    campaignId: campaign!.id,
    input: {
      campaignName: campaign!.name,
      channel: campaign!.channel,
      budget: toNumber(campaign!.budget),
      spent: toNumber(campaign!.spent),
      impressions: summary.impressions,
      clicks: summary.clicks,
      conversions: summary.conversions,
      cost: summary.cost,
      ctr: summary.ctr,
      cvr: summary.cvr,
      cpa: summary.cpa,
    },
  });
  if (result.blocked) redirect('/marketing/ads?blocked=1');
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: 'ai_run',
    entityType: 'MarketingCampaign',
    entityId: campaign!.id,
    summary: `広告改善案の下書きを生成: ${campaign!.name}（実行なし・封印中）`,
  });
  revalidatePath('/marketing/ads');
  redirect('/marketing/ads?generated=1');
}

/** C21 SEO/Content: SEO ブリーフの下書きを生成する（Phase 3.5 Stream A2・roadmap73）。
 *  下書きのみ。公開・CMS 投稿・外部検索・PR 配信は行わない（封印中）。生成は人間のみ。 */
export async function generateSeoBriefDraftAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'marketing', 'create')) redirect('/marketing/content?denied=1');
  if (user.isAi) redirect('/marketing/content?denied=1');
  const tool = checkToolPermission('user', 'generate');
  if (!tool.allowed) redirect('/marketing/content?error=tool');

  // v5.8 Medium-5 修正: 自由入力に上限を課す（巨大入力による AIOutput/DataAccessLog/描画の肥大化防止）。
  // 超過は黙って切り詰めず、エラーとして返す（入力の意図しない改変をしない）。
  const SEO_INPUT_MAX = { keyword: 120, audience: 200, theme: 300 } as const;
  const keyword = String(formData.get('keyword') ?? '').trim();
  if (!keyword) redirect('/marketing/content?error=keyword');
  const audience = String(formData.get('audience') ?? '').trim();
  const theme = String(formData.get('theme') ?? '').trim();
  if (keyword.length > SEO_INPUT_MAX.keyword || audience.length > SEO_INPUT_MAX.audience || theme.length > SEO_INPUT_MAX.theme) {
    redirect('/marketing/content?error=too_long');
  }
  // 既存記事タイトルのみ渡す（顧客 PII・CUSTOMER_CONFIDENTIAL は取得も送出もしない）。
  // v5.8 Low 修正: orderBy を固定して重複診断の入力集合を決定論化（100件超でも集合が不定にならない）。
  // タイトル自体も1件あたり上限で切る（AI入力の肥大化防止・表示は別途 DB 値が正）。
  const existing = await prisma.contentAsset.findMany({
    where: { tenantId: user.tenantId, type: { in: ['article', 'lp'] } },
    select: { title: true },
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    take: 100,
  });
  const result = await generateSeoBriefDraft({
    tenantId: user.tenantId,
    userId: user.userId,
    input: {
      keyword,
      audience,
      theme,
      existingTitles: existing.map((e) => e.title.slice(0, 200)),
    },
  });
  if (result.blocked) redirect('/marketing/content?blocked=1');
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: 'ai_run',
    entityType: 'ContentAsset',
    entityId: result.aiOutputId ?? 'seo-brief',
    summary: `SEOブリーフ下書きを生成: ${keyword.slice(0, 40)}（公開なし・封印中）`,
  });
  revalidatePath('/marketing/content');
  redirect('/marketing/content?generated=1');
}
