'use server';

import { redirect } from 'next/navigation';
import { stocktakeDifference, type DomainEventType } from '@hokko/shared';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeAudit } from '@/lib/db';
import { emitGrowthEvent } from '@/lib/growth';
import { reconcileStocktakeLine } from '@/lib/domains/operations/stocktake';

/** 棚卸を作成。対象ロケーション（または全在庫）の各商品にライン（帳簿数）を自動生成。 */
export async function createStocktakeAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'create')) redirect('/operations/stocktakes?denied=1');
  const title = String(formData.get('title') ?? '').trim() || `棚卸 ${new Date().toLocaleDateString('ja-JP')}`;
  const locationId = String(formData.get('locationId') ?? '') || null;
  const assets = await prisma.productAsset.findMany({
    where: { tenantId: user.tenantId, ...(locationId ? { locationId } : {}) },
    select: { id: true, quantity: true },
  });
  const st = await prisma.stocktake.create({
    data: {
      tenantId: user.tenantId,
      title,
      locationId,
      status: 'draft',
      createdById: user.userId,
      lines: { create: assets.map((a) => ({ tenantId: user.tenantId, assetId: a.id, expectedQuantity: a.quantity })) },
    },
  });
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: 'create',
    entityType: 'Stocktake',
    entityId: st.id,
    summary: `棚卸を作成: ${title}（${assets.length}品目）`,
  });
  await emitGrowthEvent({
    tenantId: user.tenantId,
    type: 'inventory.stocktake.created',
    title: `棚卸作成: ${title}`,
    actorId: user.userId,
    entityType: 'Stocktake',
    entityId: st.id,
    alsoDomainEvent: { domainType: 'STOCKTAKE_CREATED' as DomainEventType, aggregateType: 'Stocktake', aggregateId: st.id },
  });
  redirect(`/operations/stocktakes/${st.id}`);
}

/** 実地カウントを記録し差異を自動計算。 */
export async function recordStocktakeCountAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'update')) redirect('/operations/stocktakes?denied=1');
  const lineId = String(formData.get('lineId') ?? '');
  const counted = Math.max(0, Number(formData.get('countedQuantity') ?? 0) || 0);
  const line = await prisma.stocktakeLine.findFirst({ where: { id: lineId, tenantId: user.tenantId } });
  if (!line) redirect('/operations/stocktakes');
  const diff = stocktakeDifference(line!.expectedQuantity, counted);
  await prisma.stocktakeLine.update({ where: { id: lineId }, data: { countedQuantity: counted, difference: diff } });
  await prisma.stocktake.update({ where: { id: line!.stocktakeId }, data: { status: 'counted' } });
  redirect(`/operations/stocktakes/${line!.stocktakeId}`);
}

/** 差異を在庫へ反映。業務ロジックは lib/domains/operations/stocktake.ts。 */
export async function reconcileStocktakeLineAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'update')) redirect('/operations/stocktakes?denied=1');
  const lineId = String(formData.get('lineId') ?? '');
  const res = await reconcileStocktakeLine({ tenantId: user.tenantId, userId: user.userId }, lineId);
  if (res.status === 'skip') redirect('/operations/stocktakes');
  redirect(`/operations/stocktakes/${res.stocktakeId}?${res.status === 'pending_approval' ? 'pending=adjust' : 'reconciled=1'}`);
}

/** 棚卸を完了（reconciled）。 */
export async function completeStocktakeAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'update')) redirect('/operations/stocktakes?denied=1');
  const stocktakeId = String(formData.get('stocktakeId') ?? '');
  const st = await prisma.stocktake.findFirst({ where: { id: stocktakeId, tenantId: user.tenantId } });
  if (!st) redirect('/operations/stocktakes');
  await prisma.stocktake.update({ where: { id: stocktakeId }, data: { status: 'reconciled', completedAt: new Date() } });
  await emitGrowthEvent({
    tenantId: user.tenantId,
    type: 'inventory.stocktake.reconciled',
    title: `棚卸完了: ${st!.title}`,
    actorId: user.userId,
    entityType: 'Stocktake',
    entityId: stocktakeId,
    alsoDomainEvent: { domainType: 'STOCKTAKE_RECONCILED' as DomainEventType, aggregateType: 'Stocktake', aggregateId: stocktakeId },
  });
  redirect(`/operations/stocktakes/${stocktakeId}?completed=1`);
}
