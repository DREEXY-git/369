'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeAudit } from '@/lib/db';
import { updateDealStageCore } from '@/lib/domains/deals/deal-stage';

export async function updateDealStageAction(formData: FormData) {
  const user = await requireUser();
  const dealId = String(formData.get('dealId') ?? '');
  const stage = String(formData.get('stage') ?? '');
  if (!hasPermission(user, 'deal', 'update')) redirect(`/deals/${dealId}?denied=1`);

  const result = await updateDealStageCore({ tenantId: user.tenantId, userId: user.userId }, { dealId, stage });
  if (!result.ok && result.reason === 'invalid-stage') redirect(`/deals/${dealId}?error=stage`);
  if (!result.ok && result.reason === 'notfound') redirect('/deals/kanban');
  if (!result.ok && result.reason === 'already') redirect(`/deals/${dealId}?already=1`);
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
