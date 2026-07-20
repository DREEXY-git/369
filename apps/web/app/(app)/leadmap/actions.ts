'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isHumanUser } from '@hokko/shared';
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
import { updateLeadStage } from '@/lib/domains/crm/lead-stage';
import { convertLeadToCustomer, repairLeadLinks } from '@/lib/domains/crm/lead-convert';

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
  // 承認後に内容を差し替えて「承認内容≠送信内容」を作れないよう、人間かつ leadmap:update のみ編集可。
  if (!isHumanUser({ roles: user.roles }) || !hasPermission(user, 'leadmap', 'update')) {
    redirect(`/leadmap/leads/${leadId}/outreach?denied=1`);
  }
  const draft = await prisma.outreachDraft.findFirst({ where: { id: draftId, tenantId: user.tenantId } });
  if (!draft) redirect(`/leadmap/leads/${leadId}/outreach`);
  if (draft.status !== 'SENT') {
    // 編集＝DRAFT へ戻す。PENDING_APPROVAL だった場合は、承認済み内容と送信内容の乖離を防ぐため
    // 紐づく PENDING の OutreachApproval / ApprovalRequest を無効化し再申請を必須化する（単一 $transaction）。
    const wasPending = draft.status === 'PENDING_APPROVAL';
    await prisma.$transaction(async (tx) => {
      await tx.outreachDraft.update({ where: { id: draftId }, data: { subject, body, status: 'DRAFT' } });
      if (wasPending) {
        await tx.outreachApproval.updateMany({
          where: { draftId, tenantId: user.tenantId, status: 'PENDING' },
          data: { status: 'REJECTED', note: '下書き編集により無効化（再申請が必要）' },
        });
        await tx.approvalRequest.updateMany({
          where: { tenantId: user.tenantId, type: 'outreach_send', entityType: 'OutreachDraft', entityId: draftId, status: 'PENDING' },
          data: { status: 'REJECTED' },
        });
      }
      await tx.auditLog.create({
        data: { tenantId: user.tenantId, actorId: user.userId ?? null, actorType: 'user', action: 'update', entityType: 'OutreachDraft', entityId: draftId, summary: `営業メール下書きを人手で編集${wasPending ? '（承認申請を無効化・再申請要）' : ''}` },
      });
    });
  }
  revalidatePath(`/leadmap/leads/${leadId}/outreach`);
  redirect(`/leadmap/leads/${leadId}/outreach`);
}

export async function requestOutreachApprovalAction(formData: FormData) {
  const user = await requireUser();
  const draftId = String(formData.get('draftId') ?? '');
  const leadId = String(formData.get('leadId') ?? '');
  // 外部送信パイプラインの起点（draft→PENDING・lead stage 変更）。人間かつ leadmap:update 保持者のみ。
  // AI主体/権限なし者が送信承認フローを駆動・lead stage を変更するのを DB 接触前に遮断（role 由来判定）。
  if (!isHumanUser({ roles: user.roles }) || !hasPermission(user, 'leadmap', 'update')) {
    redirect(`/leadmap/leads/${leadId}?denied=1`);
  }
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

  // draft→PENDING・OutreachApproval・ApprovalRequest・lead stage・監査を単一 $transaction で all-or-nothing。
  // 途中失敗で「承認記録なしに stage だけ進む」「draft だけ PENDING」等の片欠けを防ぐ。
  await prisma.$transaction(async (tx) => {
    await tx.outreachDraft.update({ where: { id: draftId }, data: { status: 'PENDING_APPROVAL' } });
    await tx.outreachApproval.create({ data: { tenantId: user.tenantId, draftId, status: 'PENDING' } });
    await tx.approvalRequest.create({
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
    await tx.localBusinessLead.update({
      where: { id: draft.leadId },
      data: { stage: 'PENDING_APPROVAL' },
    });
    await tx.auditLog.create({
      data: { tenantId: user.tenantId, actorId: user.userId ?? null, actorType: 'user', action: 'create', entityType: 'ApprovalRequest', entityId: draftId, summary: `営業メール送信の承認を申請: ${draft.lead.name}` },
    });
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
    // 抑止リスト登録＋ステージ更新を単一 $transaction で確定。upsert で冪等化し（全エラー握り潰しを廃止）、
    // 抑止の記録に失敗したら stage も UNSUBSCRIBED にしない＝送信ゲート isSuppressed をすり抜けさせない（fail-closed）。
    await prisma.$transaction(async (tx) => {
      await tx.suppressionList.upsert({
        where: { tenantId_channel_value: { tenantId: user.tenantId, channel: 'email', value: target } },
        create: { tenantId: user.tenantId, channel: 'email', value: target, reason: '返信で配信停止希望' },
        update: {},
      });
      await tx.localBusinessLead.update({ where: { id: draft.leadId }, data: { stage: 'UNSUBSCRIBED' } });
    });
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

/** リードの手動ステージ変更。業務ロジックは lib/domains/crm/lead-stage.ts（V90 P3-CRM STAGE_MUTATION:
 *  対象取得前の leadmap:update ＋ role 由来 human-only（sessionIsAi===false 厳密）fail-closed、
 *  leadId/stage/expectedStage の runtime 検証＋許容遷移の明示、Lead CAS＋StageHistory＋Audit の単一 transaction。
 *  R4: 画面表示時の開始 stage（expectedStage）を貫通し、表示後に他の変更が確定していたら stale-conflict）。 */
export async function updateLeadStageAction(formData: FormData) {
  const user = await requireUser();
  const leadId = String(formData.get('leadId') ?? '');
  const stage = String(formData.get('stage') ?? '');
  const expectedStage = String(formData.get('expectedStage') ?? '');
  const back = leadId && leadId.length <= 64 ? `/leadmap/leads/${encodeURIComponent(leadId)}` : '/leadmap/pipeline';
  // Action 層でも DB 接触前に fail-closed（domain と二重防御）。
  if (user.isAi !== false || !hasPermission(user, 'leadmap', 'update')) redirect(`${back}?denied=1`);

  const result = await updateLeadStage(
    { tenantId: user.tenantId, userId: user.userId, roles: user.roles, sessionIsAi: user.isAi },
    { leadId, stage, expectedStage },
  );
  if (!result.ok) {
    if (result.reason === 'forbidden') redirect(`${back}?denied=1`);
    if (result.reason === 'notfound') redirect('/leadmap/pipeline?error=notfound');
    if (result.reason === 'already') redirect(`${back}?already=1`);
    if (result.reason === 'stale-conflict') redirect(`${back}?error=stage-stale`);
    if (result.reason === 'invalid-transition' || result.reason === 'conflict') redirect(`${back}?error=stage-transition`);
    redirect(`${back}?error=stage-input`);
  }
  revalidatePath('/leadmap/pipeline');
  revalidatePath(`/leadmap/leads/${leadId}`);
  redirect(`${back}?staged=1`);
}

/** リードを商談化し、CRM（顧客）・案件に連携する（LeadMap→本体CRMへの接続）。 */
export async function convertLeadToCustomerAction(formData: FormData) {
  const user = await requireUser();
  const leadId = String(formData.get('leadId') ?? '');
  // High（Codex PR#49 R1 / PR#60 R2 addendum）: 顧客・案件の実確定は人間専用。
  // 判定は **role 由来の isHumanUser**（AI_AGENT/AI_ASSISTANT を1つでも含めば混在も拒否）で fail-closed する。
  // session の isAi は User.isAiAgent 由来の独立 boolean で role と不一致になり得るため、これ単独では判定しない。
  const nonHuman = !isHumanUser({ roles: user.roles });
  if (nonHuman) redirect(`/leadmap/leads/${leadId}?denied=1`);
  if (!hasPermission(user, 'customer', 'create') || !hasPermission(user, 'deal', 'create')) {
    redirect(`/leadmap/leads/${leadId}?denied=1`);
  }

  // 二重商談化の防止・6書き込みの原子化・既存 link の整合検証はサービス層（crm/lead-convert）に集約。
  // domain へは自己申告 boolean ではなく **roles（必須）** を渡し、domain 内でも isHumanUser で fail-closed
  // 判定する（Codex PR#60 R3 High: optional boolean の fail-open を排除）。
  const outcome = await convertLeadToCustomer({ tenantId: user.tenantId, userId: user.userId, roles: user.roles }, leadId);

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

/** 不整合 link を持つリードの修復（人間限定・Codex PR#60 R3 P2）。
 *  再検証→不正 link 切離し→正規の顧客/案件への収束＋修復監査 を単一 tx で行う（domain に集約）。 */
export async function repairLeadLinkAction(formData: FormData) {
  const user = await requireUser();
  const leadId = String(formData.get('leadId') ?? '');
  // 実確定を伴う修復は人間専用（role 由来 fail-closed・混在も拒否）。
  if (!isHumanUser({ roles: user.roles })) redirect(`/leadmap/leads/${leadId}?denied=1`);
  if (!hasPermission(user, 'customer', 'create') || !hasPermission(user, 'deal', 'create')) {
    redirect(`/leadmap/leads/${leadId}?denied=1`);
  }

  const outcome = await repairLeadLinks({ tenantId: user.tenantId, userId: user.userId, roles: user.roles }, leadId);
  if (outcome.kind === 'forbidden') redirect(`/leadmap/leads/${leadId}?denied=1`);
  if (outcome.kind === 'not-found') redirect('/leadmap/leads');
  if (outcome.kind === 'not-linked') redirect(`/leadmap/leads/${leadId}?error=not-linked`);
  revalidatePath(`/leadmap/leads/${leadId}`);
  if (outcome.kind === 'repaired') {
    revalidatePath('/customers');
    revalidatePath('/deals');
    redirect(`/leadmap/leads/${leadId}?repaired=1`);
  }
  // already（整合済み・冪等収束）は正常表示へ戻す。
  redirect(`/leadmap/leads/${leadId}`);
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
