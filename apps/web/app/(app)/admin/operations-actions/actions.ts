'use server';

import { redirect } from 'next/navigation';
import type { DomainEventType } from '@hokko/shared';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeAudit } from '@/lib/db';
import { executeApprovedAction, requireApprovalForDangerousAction } from '@/lib/approval';
import { emitGrowthEvent } from '@/lib/growth';
import { applyInventoryMovement } from '@/lib/operations';
import { executeApprovedPurchaseOrderIssue } from '@/lib/domains/operations/procurement';
import { isHumanUser } from '@hokko/shared';

function payloadOf(req: { payloadAfter: unknown }): Record<string, unknown> {
  return (req.payloadAfter ?? {}) as Record<string, unknown>;
}

/** 承認済みの在庫数量大幅調整を実行（二重実行防止つき）。 */
export async function executeApprovedInventoryAdjustmentAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'update')) redirect('/admin/operations-actions?denied=1');
  const approvalId = String(formData.get('approvalId') ?? '');
  const req = await prisma.approvalRequest.findFirst({
    where: { id: approvalId, tenantId: user.tenantId, requestedForAction: 'inventory_adjust' },
  });
  if (!req) redirect('/admin/operations-actions?error=notfound');
  const newQuantity = Number(payloadOf(req!).newQuantity);
  if (!Number.isFinite(newQuantity)) redirect('/admin/operations-actions?error=payload');

  const r = await executeApprovedAction(
    approvalId,
    () =>
      applyInventoryMovement({
        tenantId: user.tenantId,
        actorId: user.userId,
        assetId: req!.entityId,
        type: 'adjust',
        setQuantity: newQuantity,
        note: `承認済み数量調整（approval=${approvalId}）`,
      }),
    { executedById: user.userId },
  );
  if (!r.executed) redirect(`/admin/operations-actions?error=${r.reason}`);
  redirect('/admin/operations-actions?executed=adjust');
}

/** 承認済みの予約済み在庫の強制解除を実行（在庫を available に戻し予約をキャンセル）。 */
export async function executeApprovedForceReleaseAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'update')) redirect('/admin/operations-actions?denied=1');
  const approvalId = String(formData.get('approvalId') ?? '');
  const req = await prisma.approvalRequest.findFirst({
    where: { id: approvalId, tenantId: user.tenantId, requestedForAction: 'inventory_force_release' },
  });
  if (!req) redirect('/admin/operations-actions?error=notfound');

  const r = await executeApprovedAction(
    approvalId,
    async () => {
      const reservation = await prisma.leaseReservation.findFirst({
        where: { id: req!.entityId, tenantId: user.tenantId },
        include: { lines: true },
      });
      if (!reservation) throw new Error('reservation not found');
      for (const l of reservation.lines) {
        await applyInventoryMovement({
          tenantId: user.tenantId,
          actorId: user.userId,
          assetId: l.assetId,
          type: 'return',
          quantity: l.quantity,
          reservationId: reservation.id,
          note: `強制解除による在庫返却（approval=${approvalId}）`,
        });
      }
      await prisma.leaseReservation.update({ where: { id: reservation.id }, data: { status: 'cancelled' } });
      await emitGrowthEvent({
        tenantId: user.tenantId,
        type: 'rental.item.returned',
        title: `予約強制解除: ${reservation.eventName}`,
        actorId: user.userId,
        entityType: 'LeaseReservation',
        entityId: reservation.id,
        alsoDomainEvent: { domainType: 'LEASE_ITEM_RETURNED' as DomainEventType, aggregateType: 'LeaseReservation', aggregateId: reservation.id },
      });
      return reservation.id;
    },
    { executedById: user.userId },
  );
  if (!r.executed) redirect(`/admin/operations-actions?error=${r.reason}`);
  redirect('/admin/operations-actions?executed=release');
}

/** 承認済みの破損請求を確定（DamageLossRecord 確定＋GrowthEvent）。請求書自動作成は次Phase。 */
export async function executeApprovedDamageChargeAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'update')) redirect('/admin/operations-actions?denied=1');
  const approvalId = String(formData.get('approvalId') ?? '');
  const req = await prisma.approvalRequest.findFirst({
    where: { id: approvalId, tenantId: user.tenantId, requestedForAction: 'damage_charge_finalize' },
  });
  if (!req) redirect('/admin/operations-actions?error=notfound');
  const p = payloadOf(req!);
  const assetId = String(p.assetId ?? '');
  const cost = Math.max(0, Number(p.cost ?? 0) || 0);

  const r = await executeApprovedAction(
    approvalId,
    async () => {
      const rec = await prisma.damageLossRecord.create({
        data: { tenantId: user.tenantId, assetId: assetId || null, type: 'damage', cost, note: String(p.note ?? '破損請求確定') },
      });
      await writeAudit({
        tenantId: user.tenantId,
        actorId: user.userId,
        action: 'damage_charge_finalize',
        entityType: 'DamageLossRecord',
        entityId: rec.id,
        summary: `破損請求を確定: ${cost}円（approval=${approvalId}）`,
      });
      await emitGrowthEvent({
        tenantId: user.tenantId,
        type: 'rental.damage.charged',
        title: `破損請求確定: ${cost}円`,
        actorId: user.userId,
        entityType: 'DamageLossRecord',
        entityId: rec.id,
        amount: cost,
        alsoDomainEvent: { domainType: 'DAMAGE_CHARGE_FINALIZED' as DomainEventType, aggregateType: 'DamageLossRecord', aggregateId: rec.id },
      });
      return rec.id;
    },
    { executedById: user.userId },
  );
  if (!r.executed) redirect(`/admin/operations-actions?error=${r.reason}`);
  redirect('/admin/operations-actions?executed=damage');
}

/** 承認済みの大幅棚卸差異を在庫へ反映（adjust＋StocktakeLine.reconciled）。 */
export async function executeApprovedStocktakeAdjustmentAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'update')) redirect('/admin/operations-actions?denied=1');
  const approvalId = String(formData.get('approvalId') ?? '');
  const req = await prisma.approvalRequest.findFirst({
    where: { id: approvalId, tenantId: user.tenantId, requestedForAction: 'stocktake_adjust' },
  });
  if (!req) redirect('/admin/operations-actions?error=notfound');
  const p = payloadOf(req!);
  const assetId = String(p.assetId ?? '');
  const lineId = String(p.lineId ?? '');
  const newQuantity = Number(p.newQuantity);
  if (!assetId || !Number.isFinite(newQuantity)) redirect('/admin/operations-actions?error=payload');

  const r = await executeApprovedAction(
    approvalId,
    async () => {
      await applyInventoryMovement({
        tenantId: user.tenantId,
        actorId: user.userId,
        assetId,
        type: 'adjust',
        setQuantity: newQuantity,
        note: `承認済み棚卸差異反映（approval=${approvalId}）`,
      });
      if (lineId) await prisma.stocktakeLine.updateMany({ where: { id: lineId, tenantId: user.tenantId }, data: { reconciled: true } });
      return assetId;
    },
    { executedById: user.userId },
  );
  if (!r.executed) redirect(`/admin/operations-actions?error=${r.reason}`);
  redirect('/admin/operations-actions?executed=stocktake');
}

/** 承認済みの高額発注を確定（PurchaseOrder→ordered）。 */
export async function executeApprovedPurchaseOrderIssueAction(formData: FormData) {
  const user = await requireUser();
  // 承認済み発注の実行も人間専用。role 由来 fail-closed（isHumanUser: AI role 混在・空roles を拒否。
  // isAi boolean は User.isAiAgent 由来で role と整合制約がないため boolean 単独で判定しない・R3 P2-1 / R8）。
  if (!hasPermission(user, 'inventory', 'update') || user.isAi || !isHumanUser({ roles: user.roles })) redirect('/admin/operations-actions?denied=1');
  const approvalId = String(formData.get('approvalId') ?? '');
  const req = await prisma.approvalRequest.findFirst({
    where: { id: approvalId, tenantId: user.tenantId, requestedForAction: 'purchase_order_issue' },
  });
  if (!req) redirect('/admin/operations-actions?error=notfound');
  const poId = String(payloadOf(req!).purchaseOrderId ?? req!.entityId);

  // 実行の CAS/監査/growth はサービス層（procurement）に集約。received/cancelled/別 approval の
  // 差し戻しはサービス側の status+approvalId CAS で構造的に不可（Codex PR#58 R2 #2）。
  const r = await executeApprovedPurchaseOrderIssue({ tenantId: user.tenantId, userId: user.userId, roles: user.roles, sessionIsAi: user.isAi }, approvalId, poId);
  if (!r.executed) redirect(`/admin/operations-actions?error=${r.reason}`);
  redirect('/admin/operations-actions?executed=po');
}

/** 破損請求の確定を申請（常時承認）。承認後に executeApprovedDamageChargeAction で確定。 */
export async function requestDamageChargeApprovalAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'update')) redirect('/admin/operations-actions?denied=1');
  const assetId = String(formData.get('assetId') ?? '');
  const cost = Math.max(0, Number(formData.get('cost') ?? 0) || 0);
  const note = String(formData.get('note') ?? '');
  const asset = await prisma.productAsset.findFirst({ where: { id: assetId, tenantId: user.tenantId } });
  if (!asset) redirect('/admin/operations-actions?error=notfound');
  await requireApprovalForDangerousAction({
    tenantId: user.tenantId,
    action: 'damage_charge_finalize',
    title: `破損請求の確定: ${asset!.name}（${cost}円）`,
    targetType: 'ProductAsset',
    targetId: assetId,
    requestedById: user.userId,
    riskLevel: 'HIGH',
    payloadAfter: { assetId, cost, note },
  });
  redirect('/admin/operations-actions?requested=damage');
}
