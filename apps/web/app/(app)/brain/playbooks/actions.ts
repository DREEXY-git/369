'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isAiRole } from '@hokko/shared';
import { requireUser, hasPermission, type CurrentUser } from '@/lib/auth/current-user';
import { prisma, writeAudit } from '@/lib/db';

// Company Brain（営業プレイブック）Phase 2-B-4: create / update / archive の3操作のみ。
// 物理削除は実装しない（archivedAt によるソフトアーカイブのみ）。
// externalAiAllowed はこの画面からは変更できない（create は false 固定・update では触らない）。
// 営業プレイブックの変更（作成含む）は人間のみ: AIロール（AI_AGENT/AI_ASSISTANT）は権限にかかわらず
// ここで一律拒否する（rbac.ts は無変更・2-A-3b-1 安全補正と同じ型）。
// label は NORMAL / INTERNAL のみ扱う。高機密ラベルは扱わない。
// relatedPolicyIds / relatedProductCatalogItemIds の参照選択 UI は今回未実装（将来拡張候補・doc57）。
// 入力ガイド（運用）: 顧客名・会社名・個人名・成果数値・口コミ・顧客の声・実価格は本文に書かない。
// 機械的な禁止ワード検査は誤判定が多いため行わず、UI のガイド表示と運用で担保する（doc51 §4-3）。

const ALLOWED_LABELS = ['NORMAL', 'INTERNAL'] as const;
const ALLOWED_PLAYBOOK_TYPES = ['approach', 'objection', 'preparation', 'talk_track'] as const;

function isHumanUser(user: CurrentUser): boolean {
  return user.roles.length > 0 && !user.roles.some((r) => isAiRole(r));
}

type PlaybookInput = {
  title: string;
  body: string;
  category: string;
  playbookType: (typeof ALLOWED_PLAYBOOK_TYPES)[number];
  targetIndustry: string | null;
  targetSituation: string | null;
  objection: string | null;
  recommendedTalkTrack: string | null;
  doNotSay: string | null;
  sourceNote: string | null;
  label: (typeof ALLOWED_LABELS)[number];
  tags: string[];
};

function optionalText(formData: FormData, key: string, maxLength: number): { ok: boolean; value: string | null } {
  const raw = String(formData.get(key) ?? '').trim();
  if (!raw) return { ok: true, value: null };
  if (raw.length > maxLength) return { ok: false, value: null };
  return { ok: true, value: raw };
}

function parsePlaybookForm(formData: FormData): { ok: true; value: PlaybookInput } | { ok: false; error: string } {
  const title = String(formData.get('title') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const category = String(formData.get('category') ?? '').trim();
  const playbookType = String(formData.get('playbookType') ?? '');
  const label = String(formData.get('label') ?? '');
  const tagsRaw = String(formData.get('tags') ?? '');

  if (!title || title.length > 120) return { ok: false, error: 'title' };
  if (!body || body.length > 5000) return { ok: false, error: 'body' };
  if (!category || category.length > 80) return { ok: false, error: 'category' };
  if (!(ALLOWED_PLAYBOOK_TYPES as readonly string[]).includes(playbookType)) return { ok: false, error: 'playbookType' };
  if (!(ALLOWED_LABELS as readonly string[]).includes(label)) return { ok: false, error: 'label' };

  const targetIndustry = optionalText(formData, 'targetIndustry', 80);
  if (!targetIndustry.ok) return { ok: false, error: 'targetIndustry' };
  const targetSituation = optionalText(formData, 'targetSituation', 120);
  if (!targetSituation.ok) return { ok: false, error: 'targetSituation' };
  const objection = optionalText(formData, 'objection', 500);
  if (!objection.ok) return { ok: false, error: 'objection' };
  const recommendedTalkTrack = optionalText(formData, 'recommendedTalkTrack', 500);
  if (!recommendedTalkTrack.ok) return { ok: false, error: 'recommendedTalkTrack' };
  const doNotSay = optionalText(formData, 'doNotSay', 500);
  if (!doNotSay.ok) return { ok: false, error: 'doNotSay' };
  const sourceNote = optionalText(formData, 'sourceNote', 200);
  if (!sourceNote.ok) return { ok: false, error: 'sourceNote' };

  const tags = tagsRaw
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  if (tags.length > 10 || tags.some((t) => t.length > 20)) return { ok: false, error: 'tags' };

  return {
    ok: true,
    value: {
      title,
      body,
      category,
      playbookType: playbookType as PlaybookInput['playbookType'],
      targetIndustry: targetIndustry.value,
      targetSituation: targetSituation.value,
      objection: objection.value,
      recommendedTalkTrack: recommendedTalkTrack.value,
      doNotSay: doNotSay.value,
      sourceNote: sourceNote.value,
      label: label as PlaybookInput['label'],
      tags,
    },
  };
}

export async function createSalesPlaybookEntryAction(formData: FormData) {
  const user = await requireUser();
  if (!isHumanUser(user)) redirect('/brain/playbooks?denied=1');
  if (!hasPermission(user, 'knowledge', 'create')) redirect('/brain/playbooks?denied=1');

  const parsed = parsePlaybookForm(formData);
  if (!parsed.ok) redirect(`/brain/playbooks/new?error=${parsed.error}`);

  const created = await prisma.salesPlaybookEntry.create({
    data: {
      tenantId: user.tenantId,
      title: parsed.value.title,
      body: parsed.value.body,
      category: parsed.value.category,
      playbookType: parsed.value.playbookType,
      targetIndustry: parsed.value.targetIndustry,
      targetSituation: parsed.value.targetSituation,
      objection: parsed.value.objection,
      recommendedTalkTrack: parsed.value.recommendedTalkTrack,
      doNotSay: parsed.value.doNotSay,
      tags: parsed.value.tags,
      label: parsed.value.label,
      externalAiAllowed: false,
      sourceType: 'manual',
      sourceNote: parsed.value.sourceNote,
      createdById: user.userId,
      updatedById: user.userId,
    },
  });
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: 'create',
    entityType: 'SalesPlaybookEntry',
    entityId: created.id,
    summary: `営業プレイブック「${created.title}」を作成`,
  });
  revalidatePath('/brain/playbooks');
  redirect('/brain/playbooks');
}

export async function updateSalesPlaybookEntryAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get('id') ?? '');
  if (!isHumanUser(user)) redirect('/brain/playbooks?denied=1');
  if (!hasPermission(user, 'knowledge', 'update')) redirect('/brain/playbooks?denied=1');

  const existing = await prisma.salesPlaybookEntry.findFirst({
    where: { id, tenantId: user.tenantId, archivedAt: null },
  });
  if (!existing) redirect('/brain/playbooks');

  const parsed = parsePlaybookForm(formData);
  if (!parsed.ok) redirect(`/brain/playbooks/${id}/edit?error=${parsed.error}`);

  await prisma.salesPlaybookEntry.update({
    where: { id: existing.id },
    data: {
      title: parsed.value.title,
      body: parsed.value.body,
      category: parsed.value.category,
      playbookType: parsed.value.playbookType,
      targetIndustry: parsed.value.targetIndustry,
      targetSituation: parsed.value.targetSituation,
      objection: parsed.value.objection,
      recommendedTalkTrack: parsed.value.recommendedTalkTrack,
      doNotSay: parsed.value.doNotSay,
      tags: parsed.value.tags,
      label: parsed.value.label,
      sourceNote: parsed.value.sourceNote,
      updatedById: user.userId,
    },
  });
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: 'update',
    entityType: 'SalesPlaybookEntry',
    entityId: existing.id,
    summary: `営業プレイブック「${parsed.value.title}」を編集`,
  });
  revalidatePath('/brain/playbooks');
  redirect('/brain/playbooks');
}

export async function archiveSalesPlaybookEntryAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get('id') ?? '');
  if (!isHumanUser(user)) redirect('/brain/playbooks?denied=1');
  if (!hasPermission(user, 'knowledge', 'update')) redirect('/brain/playbooks?denied=1');

  const existing = await prisma.salesPlaybookEntry.findFirst({
    where: { id, tenantId: user.tenantId, archivedAt: null },
  });
  if (!existing) redirect('/brain/playbooks');

  await prisma.salesPlaybookEntry.update({
    where: { id: existing.id },
    data: { archivedAt: new Date(), updatedById: user.userId },
  });
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: 'update',
    entityType: 'SalesPlaybookEntry',
    entityId: existing.id,
    summary: `営業プレイブック「${existing.title}」をアーカイブ`,
  });
  revalidatePath('/brain/playbooks');
  redirect('/brain/playbooks');
}
