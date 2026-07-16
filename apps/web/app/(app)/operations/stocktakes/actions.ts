'use server';

import { redirect } from 'next/navigation';
import { isHumanUser, type DomainEventType } from '@hokko/shared';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeAudit } from '@/lib/db';
import { emitGrowthEvent } from '@/lib/growth';
import {
  recordStocktakeCount,
  reconcileStocktakeLine,
  completeStocktake,
} from '@/lib/domains/operations/stocktake';

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

/** 棚卸の記録/反映/確定は人間専用（P3-INV CR #4990223932 #5）。session boolean と roles の両方を必要条件にする。 */
function isHumanOperator(user: { isAi: boolean; roles: string[] }): boolean {
  return user.isAi === false && isHumanUser({ roles: user.roles as never });
}

/** 実地カウントを記録し差異を自動計算。業務ロジックは lib/domains/operations/stocktake.ts
 *  （親lock→非終端確認→Line lock→更新→親CAS→Audit を単一transaction・完了済みへのreplayはfail-closed）。 */
export async function recordStocktakeCountAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'update') || !isHumanOperator(user)) redirect('/operations/stocktakes?denied=1');
  const lineId = String(formData.get('lineId') ?? '');
  const counted = Math.max(0, Number(formData.get('countedQuantity') ?? 0) || 0);
  const res = await recordStocktakeCount(
    { tenantId: user.tenantId, userId: user.userId, roles: user.roles as never, sessionIsAi: user.isAi },
    lineId,
    counted,
  );
  if (!res.ok) {
    if (res.reason === 'forbidden') redirect('/operations/stocktakes?denied=1');
    if (res.reason === 'notfound') redirect('/operations/stocktakes');
    redirect(res.stocktakeId ? `/operations/stocktakes/${res.stocktakeId}?error=state` : '/operations/stocktakes?error=state');
  }
  redirect(`/operations/stocktakes/${res.stocktakeId}`);
}

/** 差異を在庫へ反映。業務ロジックは lib/domains/operations/stocktake.ts（単一transaction・完了済みはskip）。 */
export async function reconcileStocktakeLineAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'update') || !isHumanOperator(user)) redirect('/operations/stocktakes?denied=1');
  const lineId = String(formData.get('lineId') ?? '');
  const res = await reconcileStocktakeLine(
    { tenantId: user.tenantId, userId: user.userId, roles: user.roles as never, sessionIsAi: user.isAi },
    lineId,
  );
  if (res.status === 'forbidden') redirect('/operations/stocktakes?denied=1');
  if (res.status === 'skip') redirect(res.stocktakeId ? `/operations/stocktakes/${res.stocktakeId}?error=state` : '/operations/stocktakes');
  redirect(`/operations/stocktakes/${res.stocktakeId}?${res.status === 'pending_approval' ? 'pending=adjust' : 'reconciled=1'}`);
}

/** 棚卸を完了（reconciled）。業務ロジックは lib/domains/operations/stocktake.ts
 *  （counted からのみ・全Lineカウント済み・非ゼロ差異反映済み・PENDING承認0 を tx 内再検証・
 *   CAS＋Audit＋完了 DomainEvent/Outbox/Growth を all-or-nothing）。 */
export async function completeStocktakeAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'update') || !isHumanOperator(user)) redirect('/operations/stocktakes?denied=1');
  const stocktakeId = String(formData.get('stocktakeId') ?? '');
  const res = await completeStocktake(
    { tenantId: user.tenantId, userId: user.userId, roles: user.roles as never, sessionIsAi: user.isAi },
    stocktakeId,
  );
  if (!res.ok && res.reason === 'forbidden') redirect('/operations/stocktakes?denied=1');
  if (!res.ok && res.reason === 'notfound') redirect('/operations/stocktakes');
  if (!res.ok) redirect(`/operations/stocktakes/${stocktakeId}?error=${res.reason}`);
  redirect(`/operations/stocktakes/${stocktakeId}?completed=1`);
}
