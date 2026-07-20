'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { DEAL_STAGES, type DealStage } from '@hokko/shared';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeAudit } from '@/lib/db';

export async function updateDealStageAction(formData: FormData) {
  const user = await requireUser();
  const dealId = String(formData.get('dealId') ?? '');
  const stage = String(formData.get('stage') ?? '');
  if (!hasPermission(user, 'deal', 'update')) redirect(`/deals/${dealId}?denied=1`);
  // 入力ステージを enum で実行時検証（任意文字列の書き込みを排除。lead-stage と同型）。
  if (!(DEAL_STAGES as readonly string[]).includes(stage)) redirect(`/deals/${dealId}?error=stage`);

  const deal = await prisma.deal.findFirst({ where: { id: dealId, tenantId: user.tenantId } });
  if (!deal) redirect('/deals/kanban');

  // ステージ変更・履歴・監査を単一 $transaction で確定。現ステージ CAS（fromStage 一致時のみ）で
  // 並行変更を1本に収束し履歴/監査の欠落を防ぐ（count≠1 は rollback して no-op）。
  const changed = await prisma.$transaction(async (tx) => {
    const claim = await tx.deal.updateMany({
      where: { id: dealId, tenantId: user.tenantId, stage: deal.stage },
      data: { stage: stage as DealStage },
    });
    if (claim.count !== 1) return false;
    await tx.dealStageHistory.create({
      data: { tenantId: user.tenantId, dealId, fromStage: deal.stage, toStage: stage as DealStage, changedById: user.userId },
    });
    await tx.auditLog.create({
      data: { tenantId: user.tenantId, actorId: user.userId ?? null, actorType: 'user', action: 'update', entityType: 'Deal', entityId: dealId, summary: `案件「${deal.title}」のステージを ${stage} に変更` },
    });
    return true;
  });
  if (!changed) redirect(`/deals/${dealId}?already=1`);
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
