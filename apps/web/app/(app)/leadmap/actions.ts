'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { LeadStage } from '@hokko/shared';
import { classifyOutreachReply } from '@hokko/ai';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeAudit } from '@/lib/db';
import {
  analyzeLead,
  discoverLeads,
  generateOutreachForLead,
  OutreachGenerationBlockedError,
} from '@/lib/leadmap';
import { safeAiInput, saveAIOutputStandard } from '@/lib/ai-safety-server';
import { prepareExternalPayload } from '@/lib/safe-external-send';
import { convertLeadToCustomer } from '@/lib/domains/crm/lead-convert';

const ADVANCE_ON: Record<string, true> = { interested: true, quote: true, doc: true, later: true, forward: true, appointment: true };

export async function createCampaignAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'leadmap', 'create')) redirect('/leadmap/campaigns?denied=1');

  const region = String(formData.get('region') ?? '札幌市').trim();
  const industry = String(formData.get('industry') ?? '').trim();
  const salesType = String(formData.get('salesType') ?? 'Web制作');
  const limit = Math.min(Number(formData.get('limit') ?? 20) || 20, 30);
  const minReviews = formData.get('minReviews') ? Number(formData.get('minReviews')) : undefined;
  const hasWebsiteRaw = String(formData.get('hasWebsite') ?? '');
  const hasWebsite = hasWebsiteRaw === 'yes' ? true : hasWebsiteRaw === 'no' ? false : undefined;
  if (!industry) redirect('/leadmap/campaigns/new?error=industry');

  const campaign = await prisma.leadSearchCampaign.create({
    data: {
      tenantId: user.tenantId,
      name: `${region} ${industry} 開拓`,
      region,
      industry,
      status: 'active',
      source: 'DEMO',
      ownerId: user.userId,
      forSalesType: salesType,
      conditions: { create: [{ tenantId: user.tenantId, keyword: industry, minReviews, hasWebsite }] },
    },
  });

  const count = await discoverLeads({
    tenantId: user.tenantId,
    campaignId: campaign.id,
    region,
    industry,
    ownerId: user.userId,
    limit,
    minReviews,
    hasWebsite,
  });

  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: 'create',
    entityType: 'LeadSearchCampaign',
    entityId: campaign.id,
    summary: `キャンペーン「${campaign.name}」を作成（リード${count}件抽出）`,
  });

  redirect(`/leadmap/campaigns/${campaign.id}`);
}

export async function analyzeLeadAction(formData: FormData) {
  const user = await requireUser();
  const leadId = String(formData.get('leadId') ?? '');
  const salesType = String(formData.get('salesType') ?? 'Web制作');
  if (!hasPermission(user, 'leadmap', 'ai_read')) redirect(`/leadmap/leads/${leadId}?denied=1`);
  await analyzeLead(user.tenantId, leadId, salesType, { userId: user.userId, actorType: 'ai_agent' });
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    actorType: 'ai_agent',
    action: 'ai_run',
    entityType: 'LocalBusinessLead',
    entityId: leadId,
    summary: 'AIがリードを分析（強み・改善余地・営業切り口）',
  });
  revalidatePath(`/leadmap/leads/${leadId}/analysis`);
  revalidatePath(`/leadmap/leads/${leadId}`);
  redirect(`/leadmap/leads/${leadId}/analysis`);
}

export async function generateOutreachAction(formData: FormData) {
  const user = await requireUser();
  const leadId = String(formData.get('leadId') ?? '');
  const salesType = String(formData.get('salesType') ?? '');
  if (!hasPermission(user, 'leadmap', 'create')) redirect(`/leadmap/leads/${leadId}?denied=1`);
  // 分析が無ければ先に分析してから生成
  const hasInsight = await prisma.leadInsight.count({ where: { tenantId: user.tenantId, leadId } });
  if (hasInsight === 0) {
    await analyzeLead(user.tenantId, leadId, salesType || undefined, { userId: user.userId, actorType: 'ai_agent' });
  }
  let draft;
  try {
    draft = await generateOutreachForLead(user.tenantId, leadId, {
      salesType: salesType || undefined,
      senderCompany: 'dreexy',
      senderName: user.name,
      createdById: user.userId,
      actorType: 'ai_agent',
    });
  } catch (e) {
    if (e instanceof OutreachGenerationBlockedError) redirect(`/leadmap/leads/${leadId}?blocked=injection`);
    throw e;
  }
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    actorType: 'ai_agent',
    action: 'ai_run',
    entityType: 'OutreachDraft',
    entityId: draft.id,
    summary: 'AIが個別営業メール下書きを生成（外部送信は人間承認後）',
  });
  revalidatePath(`/leadmap/leads/${leadId}/outreach`);
  redirect(`/leadmap/leads/${leadId}/outreach`);
}

export async function updateOutreachDraftAction(formData: FormData) {
  const user = await requireUser();
  const draftId = String(formData.get('draftId') ?? '');
  const leadId = String(formData.get('leadId') ?? '');
  const subject = String(formData.get('subject') ?? '');
  const body = String(formData.get('body') ?? '');
  const draft = await prisma.outreachDraft.findFirst({ where: { id: draftId, tenantId: user.tenantId } });
  if (!draft) redirect(`/leadmap/leads/${leadId}/outreach`);
  if (draft.status !== 'SENT') {
    await prisma.outreachDraft.update({ where: { id: draftId }, data: { subject, body, status: 'DRAFT' } });
    await writeAudit({
      tenantId: user.tenantId,
      actorId: user.userId,
      action: 'update',
      entityType: 'OutreachDraft',
      entityId: draftId,
      summary: '営業メール下書きを人手で編集',
    });
  }
  revalidatePath(`/leadmap/leads/${leadId}/outreach`);
  redirect(`/leadmap/leads/${leadId}/outreach`);
}

export async function requestOutreachApprovalAction(formData: FormData) {
  const user = await requireUser();
  const draftId = String(formData.get('draftId') ?? '');
  const leadId = String(formData.get('leadId') ?? '');
  const draft = await prisma.outreachDraft.findFirst({
    where: { id: draftId, tenantId: user.tenantId },
    include: { lead: true },
  });
  if (!draft) redirect(`/leadmap/leads/${leadId}`);

  // 外部送信前: PII マスク済プレビューを作成し AISafetyLog(pii_mask) に記録（実送信は承認後のみ）。
  await prepareExternalPayload({
    tenantId: user.tenantId,
    actorId: user.userId,
    channel: draft.channel,
    subject: draft.subject,
    body: draft.body,
    recipient: draft.lead.email ?? undefined,
    entityType: 'OutreachDraft',
    entityId: draftId,
    purpose: 'leadmap_outreach_send',
  });

  await prisma.outreachDraft.update({ where: { id: draftId }, data: { status: 'PENDING_APPROVAL' } });
  await prisma.outreachApproval.create({ data: { tenantId: user.tenantId, draftId, status: 'PENDING' } });
  await prisma.approvalRequest.create({
    data: {
      tenantId: user.tenantId,
      type: 'outreach_send',
      title: `営業メール送信承認: ${draft.lead.name}`,
      summary: draft.subject,
      entityType: 'OutreachDraft',
      entityId: draftId,
      requestedById: user.userId,
      assigneeRole: 'DEPARTMENT_MANAGER',
      riskLevel: 'MEDIUM',
      status: 'PENDING',
    },
  });
  await prisma.localBusinessLead.update({
    where: { id: draft.leadId },
    data: { stage: 'PENDING_APPROVAL' },
  });
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: 'create',
    entityType: 'ApprovalRequest',
    entityId: draftId,
    summary: `営業メール送信の承認を申請: ${draft.lead.name}`,
  });
  revalidatePath('/approvals');
  redirect(`/leadmap/leads/${draft.leadId}/outreach`);
}

/** 営業メールへの返信を取り込み、AIで分類。配信停止希望は抑止リストへ自動追加。 */
export async function classifyReplyAction(formData: FormData) {
  const user = await requireUser();
  const draftId = String(formData.get('draftId') ?? '');
  const leadId = String(formData.get('leadId') ?? '');
  const body = String(formData.get('body') ?? '').trim();
  if (!hasPermission(user, 'leadmap', 'ai_read')) redirect(`/leadmap/leads/${leadId}/outreach?denied=1`);
  if (!body) redirect(`/leadmap/leads/${leadId}/outreach?error=empty`);

  const draft = await prisma.outreachDraft.findFirst({
    where: { id: draftId, tenantId: user.tenantId },
    include: { lead: true },
  });
  if (!draft) redirect(`/leadmap/leads/${leadId}/outreach`);

  // 外部からの返信本文は間接注入の主要面。検出して記録するが分類は継続（FakeLLMは決定論で安全）。
  const guard = await safeAiInput({
    tenantId: user.tenantId,
    actorId: user.userId,
    actorType: 'ai_agent',
    purpose: 'leadmap_reply_classification',
    text: body,
    entityType: 'OutreachReply',
    entityId: draftId,
    detail: 'classifyReply',
  });

  const cls = await classifyOutreachReply(body);
  const reply = await prisma.outreachReply.create({
    data: { tenantId: user.tenantId, draftId, body, classification: cls.classification, confidence: cls.confidence },
  });
  await saveAIOutputStandard({
    tenantId: user.tenantId,
    userId: user.userId,
    actorType: 'ai_agent',
    task: 'classifyOutreachReply',
    purpose: cls.classification,
    entityType: 'OutreachReply',
    entityId: reply.id,
    input: { draftId, body },
    output: cls,
    outputText: cls.classification,
    confidence: cls.confidence,
    safetyFlags: guard.flags,
  });

  let stageNote = '';
  if (cls.classification === 'unsubscribe') {
    const target = draft.lead.email ?? `info@${draft.lead.placeId}.example.jp`;
    await prisma.suppressionList
      .create({ data: { tenantId: user.tenantId, channel: 'email', value: target, reason: '返信で配信停止希望' } })
      .catch(() => {});
    await prisma.localBusinessLead.update({ where: { id: draft.leadId }, data: { stage: 'UNSUBSCRIBED' } });
    stageNote = '配信停止リストに追加し、ステージを配信停止に更新しました。';
  } else if (cls.classification === 'complaint') {
    await prisma.localBusinessLead.update({ where: { id: draft.leadId }, data: { stage: 'EXCLUDED' } });
    stageNote = 'クレームのため対象外に更新しました。';
  } else if (ADVANCE_ON[cls.classification] && ['SENT'].includes(draft.status)) {
    await prisma.localBusinessLead.update({ where: { id: draft.leadId }, data: { stage: 'REPLIED' } });
    await prisma.leadPipelineStageHistory.create({
      data: { tenantId: user.tenantId, leadId: draft.leadId, toStage: 'REPLIED', note: `返信(${cls.classification})`, changedById: user.userId },
    });
  }

  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    actorType: 'ai_agent',
    action: 'ai_run',
    entityType: 'OutreachReply',
    entityId: draftId,
    summary: `返信をAI分類: ${cls.classification}${stageNote ? '（' + stageNote + '）' : ''}`,
  });

  revalidatePath(`/leadmap/leads/${draft.leadId}/outreach`);
  redirect(`/leadmap/leads/${draft.leadId}/outreach?classified=${cls.classification}`);
}

export async function updateLeadStageAction(formData: FormData) {
  const user = await requireUser();
  const leadId = String(formData.get('leadId') ?? '');
  const stage = String(formData.get('stage') ?? '') as LeadStage;
  const lead = await prisma.localBusinessLead.findFirst({ where: { id: leadId, tenantId: user.tenantId } });
  if (!lead) redirect('/leadmap/pipeline');
  await prisma.localBusinessLead.update({ where: { id: leadId }, data: { stage } });
  await prisma.leadPipelineStageHistory.create({
    data: { tenantId: user.tenantId, leadId, fromStage: lead.stage, toStage: stage, changedById: user.userId },
  });
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: 'update',
    entityType: 'LocalBusinessLead',
    entityId: leadId,
    summary: `リードのステージを ${stage} に変更`,
  });
  revalidatePath('/leadmap/pipeline');
  revalidatePath(`/leadmap/leads/${leadId}`);
}

/** リードを商談化し、CRM（顧客）・案件に連携する（LeadMap→本体CRMへの接続）。 */
export async function convertLeadToCustomerAction(formData: FormData) {
  const user = await requireUser();
  const leadId = String(formData.get('leadId') ?? '');
  // High（Codex PR#49 R1）: 顧客・案件の実確定は人間専用。AI は UI 非表示に加え、ここでも DB 接触前に
  // 拒否する（監査を actorType:'user' として偽装記録させない二重防御）。
  if (user.isAi) redirect(`/leadmap/leads/${leadId}?denied=1`);
  if (!hasPermission(user, 'customer', 'create') || !hasPermission(user, 'deal', 'create')) {
    redirect(`/leadmap/leads/${leadId}?denied=1`);
  }

  // 二重商談化の防止・6書き込みの原子化・既存 link の tenant 整合検証はサービス層（crm/lead-convert）に集約。
  const outcome = await convertLeadToCustomer({ tenantId: user.tenantId, userId: user.userId, actorIsAi: user.isAi }, leadId);

  if (outcome.kind === 'forbidden') redirect(`/leadmap/leads/${leadId}?denied=1`);
  if (outcome.kind === 'not-found') redirect('/leadmap/leads');
  // 既存 link が別 tenant / dangling / 片側欠落: foreign ID へ redirect せず、修復導線へ fail-closed。
  if (outcome.kind === 'inconsistent') redirect(`/leadmap/leads/${leadId}?error=link-inconsistent`);
  if (outcome.kind === 'created') {
    revalidatePath(`/leadmap/leads/${leadId}`);
    revalidatePath('/customers');
    revalidatePath('/deals');
  }
  redirect(`/customers/${outcome.customerId}`);
}

/** キャンペーン内の未分析リードを一括でAI分析（LeadMapの半自動化の中核）。 */
export async function bulkAnalyzeCampaignAction(formData: FormData) {
  const user = await requireUser();
  const campaignId = String(formData.get('campaignId') ?? '');
  if (!hasPermission(user, 'leadmap', 'ai_read')) redirect(`/leadmap/campaigns/${campaignId}?denied=1`);

  const campaign = await prisma.leadSearchCampaign.findFirst({
    where: { id: campaignId, tenantId: user.tenantId },
    include: { leads: { where: { insights: { none: {} } }, select: { id: true }, take: 50 } },
  });
  if (!campaign) redirect('/leadmap/campaigns');

  let analyzed = 0;
  for (const lead of campaign.leads) {
    try {
      await analyzeLead(user.tenantId, lead.id, campaign.forSalesType, { userId: user.userId, actorType: 'ai_agent' });
      analyzed++;
    } catch {
      /* 個別失敗はスキップして継続 */
    }
  }
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    actorType: 'ai_agent',
    action: 'ai_run',
    entityType: 'LeadSearchCampaign',
    entityId: campaignId,
    summary: `一括AI分析: ${analyzed}件のリードを分析`,
  });
  revalidatePath(`/leadmap/campaigns/${campaignId}`);
  revalidatePath('/leadmap/leads');
  redirect(`/leadmap/campaigns/${campaignId}?analyzed=${analyzed}`);
}

/** キャンペーン内の分析済みリードに営業メール下書きを一括生成（必ず下書き）。 */
export async function bulkGenerateOutreachAction(formData: FormData) {
  const user = await requireUser();
  const campaignId = String(formData.get('campaignId') ?? '');
  if (!hasPermission(user, 'leadmap', 'create')) redirect(`/leadmap/campaigns/${campaignId}?denied=1`);

  const campaign = await prisma.leadSearchCampaign.findFirst({
    where: { id: campaignId, tenantId: user.tenantId },
    include: {
      leads: {
        where: { insights: { some: {} }, outreachDrafts: { none: {} } },
        select: { id: true },
        take: 50,
      },
    },
  });
  if (!campaign) redirect('/leadmap/campaigns');

  let generated = 0;
  for (const lead of campaign.leads) {
    try {
      await generateOutreachForLead(user.tenantId, lead.id, {
        salesType: campaign.forSalesType,
        senderCompany: 'dreexy',
        senderName: user.name,
        createdById: user.userId,
        actorType: 'ai_agent',
      });
      generated++;
    } catch {
      /* スキップ（注入ブロック含む）して継続 */
    }
  }
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    actorType: 'ai_agent',
    action: 'ai_run',
    entityType: 'LeadSearchCampaign',
    entityId: campaignId,
    summary: `一括営業メール生成: ${generated}件の下書きを作成（送信は人間承認後）`,
  });
  revalidatePath(`/leadmap/campaigns/${campaignId}`);
  redirect(`/leadmap/campaigns/${campaignId}?generated=${generated}`);
}
