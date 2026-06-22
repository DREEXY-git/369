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
