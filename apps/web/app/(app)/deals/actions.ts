'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { DealStage } from '@hokko/shared';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeAudit } from '@/lib/db';

export async function updateDealStageAction(formData: FormData) {
  const user = await requireUser();
  const dealId = String(formData.get('dealId') ?? '');
  const stage = String(formData.get('stage') ?? '') as DealStage;
  if (!hasPermission(user, 'deal', 'update')) redirect(`/deals/${dealId}?denied=1`);

  const deal = await prisma.deal.findFirst({ where: { id: dealId, tenantId: user.tenantId } });
  if (!deal) redirect('/deals/kanban');

  await prisma.deal.update({ where: { id: dealId }, data: { stage } });
  await prisma.dealStageHistory.create({
    data: { tenantId: user.tenantId, dealId, fromStage: deal.stage, toStage: stage, changedById: user.userId },
  });
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: 'update',
    entityType: 'Deal',
    entityId: dealId,
    summary: `案件「${deal.title}」のステージを ${stage} に変更`,
  });
  revalidatePath('/deals/kanban');
  revalidatePath(`/deals/${dealId}`);
}

export async function updateDealAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get('id') ?? '');
  if (!hasPermission(user, 'deal', 'update')) redirect(`/deals/${id}?denied=1`);

  const existing = await prisma.deal.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!existing) redirect('/deals');

  const amount = Math.max(0, Number(formData.get('amount') ?? 0) || 0);
  const cost = Math.max(0, Number(formData.get('cost') ?? 0) || 0);
  const probability = Math.max(0, Math.min(100, Number(formData.get('probability') ?? 0) || 0));
  const nextActionAtRaw = String(formData.get('nextActionAt') ?? '');

  await prisma.deal.update({
    where: { id },
    data: {
      title: String(formData.get('title') ?? '').trim() || existing.title,
      amount,
      cost,
      probability,
      nextAction: String(formData.get('nextAction') ?? ''),
      nextActionAt: nextActionAtRaw ? new Date(nextActionAtRaw) : null,
      competitor: String(formData.get('competitor') ?? '') || null,
    },
  });
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: 'update',
    entityType: 'Deal',
    entityId: id,
    summary: `案件「${existing.title}」を編集（金額 ${amount.toLocaleString()}円）`,
  });
  revalidatePath(`/deals/${id}`);
  redirect(`/deals/${id}`);
}
