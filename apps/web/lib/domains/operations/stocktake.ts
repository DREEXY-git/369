// 棚卸差異反映の業務ロジック。Phase 1-9 保守リファクタ（action から切り出し）。
// 設計ルール: docs/audit/12_maintenance_architecture.md。
import { prisma } from '@/lib/db';
import { requireApprovalForDangerousAction } from '@/lib/approval';
import { applyInventoryMovement } from '@/lib/operations';
import { isLargeStocktakeDifference } from '@hokko/shared';

export interface Actor {
  tenantId: string;
  userId?: string | null;
}

export interface ReconcileResult {
  status: 'reconciled' | 'pending_approval' | 'skip';
  stocktakeId?: string;
}

/** 差異を在庫へ反映。大幅差異(|Δ|≥閾値)は承認申請（直接反映しない）。小差異は即 adjust。 */
export async function reconcileStocktakeLine(actor: Actor, lineId: string): Promise<ReconcileResult> {
  const line = await prisma.stocktakeLine.findFirst({ where: { id: lineId, tenantId: actor.tenantId }, include: { asset: true } });
  if (!line || line.countedQuantity == null || line.reconciled) return { status: 'skip', stocktakeId: line?.stocktakeId };
  const counted = line.countedQuantity;
  const diff = line.difference;

  if (isLargeStocktakeDifference(diff)) {
    await requireApprovalForDangerousAction({
      tenantId: actor.tenantId,
      action: 'stocktake_adjust',
      title: `大幅棚卸差異の反映: ${line.asset.name}（差異 ${diff >= 0 ? '+' : ''}${diff}）`,
      targetType: 'StocktakeLine',
      targetId: lineId,
      requestedById: actor.userId,
      riskLevel: 'HIGH',
      amount: diff,
      payloadAfter: { assetId: line.assetId, newQuantity: counted, lineId },
    });
    return { status: 'pending_approval', stocktakeId: line.stocktakeId };
  }

  await applyInventoryMovement({
    tenantId: actor.tenantId,
    actorId: actor.userId,
    assetId: line.assetId,
    type: 'adjust',
    setQuantity: counted,
    note: `棚卸差異反映（${diff >= 0 ? '+' : ''}${diff}）`,
  });
  await prisma.stocktakeLine.update({ where: { id: lineId }, data: { reconciled: true } });
  return { status: 'reconciled', stocktakeId: line.stocktakeId };
}
