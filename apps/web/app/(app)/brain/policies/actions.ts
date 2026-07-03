'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isAiRole } from '@hokko/shared';
import { requireUser, hasPermission, type CurrentUser } from '@/lib/auth/current-user';
import { prisma, writeAudit } from '@/lib/db';

// Company Brain（会社方針）Phase 2-A-3b-1（安全補正済み）: create / update / archive の3操作のみ。
// 物理削除は実装しない（archivedAt によるソフトアーカイブのみ）。
// externalAiAllowed はこの画面からは変更できない（create は false 固定・update では触らない）。
// 会社方針の変更（作成含む）は人間のみ: AIロール（AI_AGENT/AI_ASSISTANT）は権限にかかわらず
// ここで一律拒否する（rbac.ts は無変更。AI_AGENT の knowledge:create 下書き権限は他機能向けに維持）。
// label は NORMAL / INTERNAL のみ扱う。高機密ラベルは writeDataAccess（機密参照ログ）実装時まで保留。

const ALLOWED_STATUSES = ['active', 'draft'] as const;
const ALLOWED_LABELS = ['NORMAL', 'INTERNAL'] as const;

function isHumanUser(user: CurrentUser): boolean {
  return user.roles.length > 0 && !user.roles.some((r) => isAiRole(r));
}

type PolicyInput = {
  title: string;
  body: string;
  category: string;
  status: (typeof ALLOWED_STATUSES)[number];
  label: (typeof ALLOWED_LABELS)[number];
  tags: string[];
};

function parsePolicyForm(formData: FormData): { ok: true; value: PolicyInput } | { ok: false; error: string } {
  const title = String(formData.get('title') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const category = String(formData.get('category') ?? '').trim();
  const status = String(formData.get('status') ?? '');
  const label = String(formData.get('label') ?? '');
  const tagsRaw = String(formData.get('tags') ?? '');

  if (!title || title.length > 120) return { ok: false, error: 'title' };
  if (!body || body.length > 5000) return { ok: false, error: 'body' };
  if (!category || category.length > 80) return { ok: false, error: 'category' };
  if (!(ALLOWED_STATUSES as readonly string[]).includes(status)) return { ok: false, error: 'status' };
  if (!(ALLOWED_LABELS as readonly string[]).includes(label)) return { ok: false, error: 'label' };

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
      status: status as PolicyInput['status'],
      label: label as PolicyInput['label'],
      tags,
    },
  };
}

export async function createCompanyPolicyAction(formData: FormData) {
  const user = await requireUser();
  if (!isHumanUser(user)) redirect('/brain/policies?denied=1');
  if (!hasPermission(user, 'knowledge', 'create')) redirect('/brain/policies?denied=1');

  const parsed = parsePolicyForm(formData);
  if (!parsed.ok) redirect(`/brain/policies/new?error=${parsed.error}`);

  const created = await prisma.companyPolicy.create({
    data: {
      tenantId: user.tenantId,
      title: parsed.value.title,
      body: parsed.value.body,
      category: parsed.value.category,
      status: parsed.value.status,
      label: parsed.value.label,
      tags: parsed.value.tags,
      externalAiAllowed: false,
      sourceType: 'manual',
      createdById: user.userId,
      updatedById: user.userId,
    },
  });
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: 'create',
    entityType: 'CompanyPolicy',
    entityId: created.id,
    summary: `会社方針「${created.title}」を作成`,
  });
  revalidatePath('/brain/policies');
  redirect('/brain/policies');
}

export async function updateCompanyPolicyAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get('id') ?? '');
  if (!isHumanUser(user)) redirect('/brain/policies?denied=1');
  if (!hasPermission(user, 'knowledge', 'update')) redirect('/brain/policies?denied=1');

  const existing = await prisma.companyPolicy.findFirst({
    where: { id, tenantId: user.tenantId, archivedAt: null },
  });
  if (!existing) redirect('/brain/policies');

  const parsed = parsePolicyForm(formData);
  if (!parsed.ok) redirect(`/brain/policies/${id}/edit?error=${parsed.error}`);

  await prisma.companyPolicy.update({
    where: { id: existing.id },
    data: {
      title: parsed.value.title,
      body: parsed.value.body,
      category: parsed.value.category,
      status: parsed.value.status,
      label: parsed.value.label,
      tags: parsed.value.tags,
      updatedById: user.userId,
    },
  });
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: 'update',
    entityType: 'CompanyPolicy',
    entityId: existing.id,
    summary: `会社方針「${parsed.value.title}」を編集`,
  });
  revalidatePath('/brain/policies');
  redirect('/brain/policies');
}

export async function archiveCompanyPolicyAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get('id') ?? '');
  if (!isHumanUser(user)) redirect('/brain/policies?denied=1');
  if (!hasPermission(user, 'knowledge', 'update')) redirect('/brain/policies?denied=1');

  const existing = await prisma.companyPolicy.findFirst({
    where: { id, tenantId: user.tenantId, archivedAt: null },
  });
  if (!existing) redirect('/brain/policies');

  await prisma.companyPolicy.update({
    where: { id: existing.id },
    data: { archivedAt: new Date(), updatedById: user.userId },
  });
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: 'update',
    entityType: 'CompanyPolicy',
    entityId: existing.id,
    summary: `会社方針「${existing.title}」をアーカイブ`,
  });
  revalidatePath('/brain/policies');
  redirect('/brain/policies');
}
