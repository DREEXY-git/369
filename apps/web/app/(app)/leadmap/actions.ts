'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { LeadStage } from '@hokko/shared';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeAudit } from '@/lib/db';
import { analyzeLead, discoverLeads, generateOutreachForLead } from '@/lib/leadmap';

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
  await analyzeLead(user.tenantId, leadId, salesType);
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
  if (hasInsight === 0) await analyzeLead(user.tenantId, leadId, salesType || undefined);
  const draft = await generateOutreachForLead(user.tenantId, leadId, {
    salesType: salesType || undefined,
    senderCompany: 'dreexy',
    senderName: user.name,
    createdById: user.userId,
  });
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
