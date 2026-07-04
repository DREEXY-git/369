'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isHumanUser } from '@hokko/shared';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeAudit } from '@/lib/db';

// Company Brain（商品カタログ）Phase 2-A-3b-2: create / update / archive の3操作のみ。
// 物理削除は実装しない（archivedAt によるソフトアーカイブのみ）。
// externalAiAllowed はこの画面からは変更できない（create は false 固定・update では触らない）。
// 商品カタログの変更（作成含む）は人間のみ: AIロール（AI_AGENT/AI_ASSISTANT）は権限にかかわらず
// ここで一律拒否する（rbac.ts は無変更）。label は NORMAL / INTERNAL のみ扱う。
// priceNote は営業説明用のテキストであり、価格計算・請求・課金・見積・会計には接続しない。
// productAssetId は今回 UI で扱わない（在庫・請求・見積連携なし）。

const ALLOWED_STATUSES = ['active', 'draft'] as const;
const ALLOWED_LABELS = ['NORMAL', 'INTERNAL'] as const;

// isHumanUser は @hokko/shared の共通判定（Phase X-05-2 で共通化・単体テストあり・挙動不変）。

type CatalogInput = {
  name: string;
  description: string;
  category: string;
  status: (typeof ALLOWED_STATUSES)[number];
  label: (typeof ALLOWED_LABELS)[number];
  targetPain: string | null;
  strengths: string | null;
  priceNote: string | null;
  tags: string[];
};

function parseCatalogForm(formData: FormData): { ok: true; value: CatalogInput } | { ok: false; error: string } {
  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const category = String(formData.get('category') ?? '').trim();
  const status = String(formData.get('status') ?? '');
  const label = String(formData.get('label') ?? '');
  const targetPain = String(formData.get('targetPain') ?? '').trim();
  const strengths = String(formData.get('strengths') ?? '').trim();
  const priceNote = String(formData.get('priceNote') ?? '').trim();
  const tagsRaw = String(formData.get('tags') ?? '');

  if (!name || name.length > 120) return { ok: false, error: 'name' };
  if (!description || description.length > 5000) return { ok: false, error: 'description' };
  if (!category || category.length > 80) return { ok: false, error: 'category' };
  if (!(ALLOWED_STATUSES as readonly string[]).includes(status)) return { ok: false, error: 'status' };
  if (!(ALLOWED_LABELS as readonly string[]).includes(label)) return { ok: false, error: 'label' };
  if (targetPain.length > 1000) return { ok: false, error: 'targetPain' };
  if (strengths.length > 1000) return { ok: false, error: 'strengths' };
  if (priceNote.length > 1000) return { ok: false, error: 'priceNote' };

  const tags = tagsRaw
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  if (tags.length > 10 || tags.some((t) => t.length > 20)) return { ok: false, error: 'tags' };

  return {
    ok: true,
    value: {
      name,
      description,
      category,
      status: status as CatalogInput['status'],
      label: label as CatalogInput['label'],
      targetPain: targetPain || null,
      strengths: strengths || null,
      priceNote: priceNote || null,
      tags,
    },
  };
}

export async function createProductCatalogItemAction(formData: FormData) {
  const user = await requireUser();
  if (!isHumanUser(user)) redirect('/brain/catalog?denied=1');
  if (!hasPermission(user, 'knowledge', 'create')) redirect('/brain/catalog?denied=1');

  const parsed = parseCatalogForm(formData);
  if (!parsed.ok) redirect(`/brain/catalog/new?error=${parsed.error}`);

  const created = await prisma.productCatalogItem.create({
    data: {
      tenantId: user.tenantId,
      name: parsed.value.name,
      description: parsed.value.description,
      category: parsed.value.category,
      status: parsed.value.status,
      label: parsed.value.label,
      targetPain: parsed.value.targetPain,
      strengths: parsed.value.strengths,
      priceNote: parsed.value.priceNote,
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
    entityType: 'ProductCatalogItem',
    entityId: created.id,
    summary: `商品カタログ「${created.name}」を作成`,
  });
  revalidatePath('/brain/catalog');
  redirect('/brain/catalog');
}

export async function updateProductCatalogItemAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get('id') ?? '');
  if (!isHumanUser(user)) redirect('/brain/catalog?denied=1');
  if (!hasPermission(user, 'knowledge', 'update')) redirect('/brain/catalog?denied=1');

  const existing = await prisma.productCatalogItem.findFirst({
    where: { id, tenantId: user.tenantId, archivedAt: null },
  });
  if (!existing) redirect('/brain/catalog');

  const parsed = parseCatalogForm(formData);
  if (!parsed.ok) redirect(`/brain/catalog/${id}/edit?error=${parsed.error}`);

  await prisma.productCatalogItem.update({
    where: { id: existing.id },
    data: {
      name: parsed.value.name,
      description: parsed.value.description,
      category: parsed.value.category,
      status: parsed.value.status,
      label: parsed.value.label,
      targetPain: parsed.value.targetPain,
      strengths: parsed.value.strengths,
      priceNote: parsed.value.priceNote,
      tags: parsed.value.tags,
      updatedById: user.userId,
    },
  });
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: 'update',
    entityType: 'ProductCatalogItem',
    entityId: existing.id,
    summary: `商品カタログ「${parsed.value.name}」を編集`,
  });
  revalidatePath('/brain/catalog');
  redirect('/brain/catalog');
}

export async function archiveProductCatalogItemAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get('id') ?? '');
  if (!isHumanUser(user)) redirect('/brain/catalog?denied=1');
  if (!hasPermission(user, 'knowledge', 'update')) redirect('/brain/catalog?denied=1');

  const existing = await prisma.productCatalogItem.findFirst({
    where: { id, tenantId: user.tenantId, archivedAt: null },
  });
  if (!existing) redirect('/brain/catalog');

  await prisma.productCatalogItem.update({
    where: { id: existing.id },
    data: { archivedAt: new Date(), updatedById: user.userId },
  });
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: 'update',
    entityType: 'ProductCatalogItem',
    entityId: existing.id,
    summary: `商品カタログ「${existing.name}」をアーカイブ`,
  });
  revalidatePath('/brain/catalog');
  redirect('/brain/catalog');
}
