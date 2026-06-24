'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  availableQuantity,
  hasReservationConflict,
  isInventoryMovementType,
  isLargeInventoryAdjustment,
  type ReservationWindow,
  type DomainEventType,
} from '@hokko/shared';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeAudit } from '@/lib/db';
import { emitGrowthEvent } from '@/lib/growth';
import { requireApprovalForDangerousAction } from '@/lib/approval';
import { safeAiInput, saveAIOutputStandard } from '@/lib/ai-safety-server';
import {
  recordEventCost,
  recordEventRevenue,
  calculateEventProfitability,
  completeEventProject,
  assignEventStaff,
  createEventRisk,
  updateEventRiskStatus,
} from '@/lib/domains/operations/events';
import { bridgeEventProjectToFinance } from '@/lib/domains/finance/finance-bridge';
import { applyInventoryMovement } from '@/lib/operations';

// ============================ 在庫移動 ============================

/** 在庫移動を記録（入庫/移動/予約/出庫/返却/破損/メンテ開始・完了）。adjust は専用アクションへ。 */
export async function createInventoryMovementAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'update')) redirect('/operations/inventory-movements?denied=1');
  const assetId = String(formData.get('assetId') ?? '');
  const type = String(formData.get('type') ?? '');
  const quantity = Number(formData.get('quantity') ?? 1) || 1;
  const toLocationId = String(formData.get('toLocationId') ?? '') || null;
  const note = String(formData.get('note') ?? '');
  if (!assetId || !isInventoryMovementType(type) || type === 'adjust') {
    redirect('/operations/inventory-movements/new?error=input');
  }
  await applyInventoryMovement({
    tenantId: user.tenantId,
    actorId: user.userId,
    assetId,
    type,
    quantity,
    toLocationId,
    note,
  });
  revalidatePath('/operations/inventory-movements');
  revalidatePath('/operations');
  redirect('/operations/inventory-movements?moved=1');
}

/** 在庫数量の調整。大幅調整（|Δ|≥閾値）は承認必須（直接適用しない）。 */
export async function adjustInventoryQuantityAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'update')) redirect('/operations/inventory-movements?denied=1');
  const assetId = String(formData.get('assetId') ?? '');
  const newQuantity = Math.max(0, Number(formData.get('newQuantity') ?? 0) || 0);
  const note = String(formData.get('note') ?? '');
  const asset = await prisma.productAsset.findFirst({ where: { id: assetId, tenantId: user.tenantId } });
  if (!asset) redirect('/operations/inventory-movements/new?error=notfound');
  const delta = newQuantity - asset!.quantity;

  if (isLargeInventoryAdjustment(delta)) {
    const { requiresApproval } = await requireApprovalForDangerousAction({
      tenantId: user.tenantId,
      action: 'inventory_adjust',
      title: `在庫数量の大幅調整: ${asset!.name}`,
      summary: `${asset!.quantity} → ${newQuantity}（Δ${delta}）`,
      targetType: 'ProductAsset',
      targetId: assetId,
      requestedById: user.userId,
      riskLevel: 'HIGH',
      amount: delta,
      payloadAfter: { newQuantity, note },
    });
    if (requiresApproval) redirect('/operations/inventory-movements?pending=adjust');
  }

  await applyInventoryMovement({
    tenantId: user.tenantId,
    actorId: user.userId,
    assetId,
    type: 'adjust',
    setQuantity: newQuantity,
    note: note || `数量調整 ${asset!.quantity}→${newQuantity}`,
  });
  revalidatePath('/operations/inventory-movements');
  redirect('/operations/inventory-movements?adjusted=1');
}

// ============================ リース予約 ============================

export async function createLeaseReservationAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'create')) redirect('/inventory/lease?denied=1');
  const eventName = String(formData.get('eventName') ?? '').trim();
  const venue = String(formData.get('venue') ?? '').trim() || null;
  const startAt = new Date(String(formData.get('startAt') ?? '') || Date.now());
  const endAt = new Date(String(formData.get('endAt') ?? '') || Date.now());
  if (!eventName) redirect('/inventory/lease?error=name');

  const reservation = await prisma.leaseReservation.create({
    data: { tenantId: user.tenantId, eventName, venue, status: 'reserved', startAt, endAt },
  });
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: 'create',
    entityType: 'LeaseReservation',
    entityId: reservation.id,
    summary: `リース予約を作成: ${eventName}`,
  });
  await emitGrowthEvent({
    tenantId: user.tenantId,
    type: 'rental.reservation.created',
    title: `リース予約: ${eventName}`,
    actorId: user.userId,
    entityType: 'LeaseReservation',
    entityId: reservation.id,
    alsoDomainEvent: {
      domainType: 'LEASE_RESERVATION_CREATED' as DomainEventType,
      aggregateType: 'LeaseReservation',
      aggregateId: reservation.id,
    },
  });
  revalidatePath('/inventory/lease');
  redirect('/inventory/lease?created=1');
}

/** 予約に商品を追加。在庫可用性をチェックし、重複（在庫超過）は拒否。OKなら在庫を予約状態に。 */
export async function addAssetToLeaseReservationAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'update')) redirect('/inventory/lease?denied=1');
  const reservationId = String(formData.get('reservationId') ?? '');
  const assetId = String(formData.get('assetId') ?? '');
  const quantity = Math.max(1, Number(formData.get('quantity') ?? 1) || 1);

  const [reservation, asset] = await Promise.all([
    prisma.leaseReservation.findFirst({ where: { id: reservationId, tenantId: user.tenantId } }),
    prisma.productAsset.findFirst({ where: { id: assetId, tenantId: user.tenantId } }),
  ]);
  if (!reservation || !asset) redirect('/inventory/lease?error=notfound');

  // 既存の同一資産の予約ウィンドウを集めて重複（在庫超過）を判定
  const existingLines = await prisma.leaseReservationLine.findMany({
    where: { tenantId: user.tenantId, assetId },
    include: { reservation: true },
  });
  const existing: ReservationWindow[] = existingLines.map((l) => ({
    assetId,
    quantity: l.quantity,
    startAt: l.reservation.startAt,
    endAt: l.reservation.endAt,
  }));
  const conflict = hasReservationConflict(
    { assetId, quantity, startAt: reservation!.startAt, endAt: reservation!.endAt },
    existing,
    asset!.quantity,
  );
  const avail = availableQuantity(assetId, asset!.quantity, { startAt: reservation!.startAt, endAt: reservation!.endAt }, existing);

  await emitGrowthEvent({
    tenantId: user.tenantId,
    type: 'inventory.availability.checked',
    title: `在庫可用性チェック: ${asset!.name}（残${avail}）`,
    actorId: user.userId,
    entityType: 'ProductAsset',
    entityId: assetId,
    metric: { available: avail, requested: quantity, conflict },
  });

  if (conflict) redirect(`/inventory/lease?error=conflict&asset=${encodeURIComponent(asset!.name)}`);

  await prisma.leaseReservationLine.create({
    data: { tenantId: user.tenantId, reservationId, assetId, quantity },
  });
  // 在庫を予約状態へ（単一の真実源 InventoryMovement 経由）
  await applyInventoryMovement({
    tenantId: user.tenantId,
    actorId: user.userId,
    assetId,
    type: 'reserve',
    quantity,
    reservationId,
    note: `リース予約 ${reservation!.eventName} に割当`,
  });
  revalidatePath('/inventory/lease');
  redirect('/inventory/lease?added=1');
}

export async function confirmLeaseReservationAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'update')) redirect('/inventory/lease?denied=1');
  const reservationId = String(formData.get('reservationId') ?? '');
  const reservation = await prisma.leaseReservation.findFirst({ where: { id: reservationId, tenantId: user.tenantId } });
  if (!reservation) redirect('/inventory/lease');
  await prisma.leaseReservation.update({ where: { id: reservationId }, data: { status: 'confirmed' } });
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: 'update',
    entityType: 'LeaseReservation',
    entityId: reservationId,
    summary: `リース予約を確定: ${reservation!.eventName}`,
  });
  await emitGrowthEvent({
    tenantId: user.tenantId,
    type: 'rental.reservation.confirmed',
    title: `リース予約確定: ${reservation!.eventName}`,
    actorId: user.userId,
    entityType: 'LeaseReservation',
    entityId: reservationId,
    alsoDomainEvent: {
      domainType: 'LEASE_RESERVATION_CONFIRMED' as DomainEventType,
      aggregateType: 'LeaseReservation',
      aggregateId: reservationId,
    },
  });
  revalidatePath('/inventory/lease');
  redirect('/inventory/lease?confirmed=1');
}

export async function dispatchLeaseReservationAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'update')) redirect('/inventory/lease?denied=1');
  const reservationId = String(formData.get('reservationId') ?? '');
  const reservation = await prisma.leaseReservation.findFirst({
    where: { id: reservationId, tenantId: user.tenantId },
    include: { lines: true },
  });
  if (!reservation) redirect('/inventory/lease');
  for (const l of reservation!.lines) {
    await applyInventoryMovement({
      tenantId: user.tenantId,
      actorId: user.userId,
      assetId: l.assetId,
      type: 'dispatch',
      quantity: l.quantity,
      reservationId,
      note: `出庫: ${reservation!.eventName}`,
    });
  }
  await prisma.leaseReservation.update({ where: { id: reservationId }, data: { status: 'dispatched', deliveryAt: new Date() } });
  await emitGrowthEvent({
    tenantId: user.tenantId,
    type: 'rental.item.dispatched',
    title: `リース出庫: ${reservation!.eventName}`,
    actorId: user.userId,
    entityType: 'LeaseReservation',
    entityId: reservationId,
    alsoDomainEvent: {
      domainType: 'LEASE_ITEM_DISPATCHED' as DomainEventType,
      aggregateType: 'LeaseReservation',
      aggregateId: reservationId,
    },
  });
  revalidatePath('/inventory/lease');
  redirect('/inventory/lease?dispatched=1');
}

export async function returnLeaseReservationAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'update')) redirect('/inventory/lease?denied=1');
  const reservationId = String(formData.get('reservationId') ?? '');
  const reservation = await prisma.leaseReservation.findFirst({
    where: { id: reservationId, tenantId: user.tenantId },
    include: { lines: true },
  });
  if (!reservation) redirect('/inventory/lease');
  for (const l of reservation!.lines) {
    await applyInventoryMovement({
      tenantId: user.tenantId,
      actorId: user.userId,
      assetId: l.assetId,
      type: 'return',
      quantity: l.quantity,
      reservationId,
      note: `返却: ${reservation!.eventName}`,
    });
  }
  await prisma.leaseReservation.update({ where: { id: reservationId }, data: { status: 'returned', returnAt: new Date() } });
  await emitGrowthEvent({
    tenantId: user.tenantId,
    type: 'rental.item.returned',
    title: `リース返却: ${reservation!.eventName}`,
    actorId: user.userId,
    entityType: 'LeaseReservation',
    entityId: reservationId,
    alsoDomainEvent: {
      domainType: 'LEASE_ITEM_RETURNED' as DomainEventType,
      aggregateType: 'LeaseReservation',
      aggregateId: reservationId,
    },
  });
  revalidatePath('/inventory/lease');
  redirect('/inventory/lease?returned=1');
}

export async function recordLeaseDamageAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'update')) redirect('/inventory/lease?denied=1');
  const assetId = String(formData.get('assetId') ?? '');
  const cost = Math.max(0, Number(formData.get('cost') ?? 0) || 0);
  const note = String(formData.get('note') ?? '');
  const asset = await prisma.productAsset.findFirst({ where: { id: assetId, tenantId: user.tenantId } });
  if (!asset) redirect('/inventory/lease');
  await prisma.damageLossRecord.create({ data: { tenantId: user.tenantId, assetId, type: 'damage', cost, note } });
  await applyInventoryMovement({
    tenantId: user.tenantId,
    actorId: user.userId,
    assetId,
    type: 'damage',
    note: note || '破損記録',
  });
  revalidatePath('/inventory/lease');
  redirect('/inventory/lease?damaged=1');
}

/** 予約済み在庫の強制解除（危険操作・常時承認）。承認申請のみ作成し直接解除しない。 */
export async function forceReleaseReservationAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'update')) redirect('/inventory/lease?denied=1');
  const reservationId = String(formData.get('reservationId') ?? '');
  const reservation = await prisma.leaseReservation.findFirst({ where: { id: reservationId, tenantId: user.tenantId } });
  if (!reservation) redirect('/inventory/lease');
  const { requiresApproval } = await requireApprovalForDangerousAction({
    tenantId: user.tenantId,
    action: 'inventory_force_release',
    title: `予約済み在庫の強制解除: ${reservation!.eventName}`,
    targetType: 'LeaseReservation',
    targetId: reservationId,
    requestedById: user.userId,
    riskLevel: 'HIGH',
  });
  // 常時承認必須。直接解除はしない（承認後に解除）。
  redirect(requiresApproval ? '/inventory/lease?pending=release' : '/inventory/lease');
}

/** リース予約をイベント案件に連携（営業→在庫予約→案件の橋渡し）。 */
export async function convertLeaseReservationToEventProjectAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'create')) redirect('/inventory/lease?denied=1');
  const reservationId = String(formData.get('reservationId') ?? '');
  const reservation = await prisma.leaseReservation.findFirst({
    where: { id: reservationId, tenantId: user.tenantId },
    include: { lines: { include: { asset: true } } },
  });
  if (!reservation) redirect('/inventory/lease');

  const event = await prisma.eventProject.create({
    data: {
      tenantId: user.tenantId,
      name: reservation!.eventName,
      customerId: reservation!.customerId,
      venue: reservation!.venue,
      eventDate: reservation!.startAt,
      status: 'planned',
      productUsages: {
        create: reservation!.lines.map((l) => ({
          tenantId: user.tenantId,
          assetId: l.assetId,
          assetName: l.asset.name,
          quantity: l.quantity,
        })),
      },
    },
  });
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: 'create',
    entityType: 'EventProject',
    entityId: event.id,
    summary: `リース予約「${reservation!.eventName}」をイベント案件に連携`,
  });
  await emitGrowthEvent({
    tenantId: user.tenantId,
    type: 'event.project.created',
    title: `イベント案件化: ${reservation!.eventName}`,
    actorId: user.userId,
    entityType: 'EventProject',
    entityId: event.id,
    alsoDomainEvent: {
      domainType: 'EVENT_PROJECT_CREATED' as DomainEventType,
      aggregateType: 'EventProject',
      aggregateId: event.id,
    },
  });
  redirect(`/operations/events/${event.id}`);
}

// ============================ イベント案件 ============================

export async function createEventProjectAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'create')) redirect('/operations/events?denied=1');
  const name = String(formData.get('name') ?? '').trim();
  const venue = String(formData.get('venue') ?? '').trim() || null;
  const customerId = String(formData.get('customerId') ?? '') || null;
  const eventDate = formData.get('eventDate') ? new Date(String(formData.get('eventDate'))) : null;
  const revenue = Math.max(0, Number(formData.get('revenue') ?? 0) || 0);
  if (!name) redirect('/operations/events/new?error=name');

  const event = await prisma.eventProject.create({
    data: { tenantId: user.tenantId, name, venue, customerId, eventDate, revenue, status: 'planned' },
  });
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: 'create',
    entityType: 'EventProject',
    entityId: event.id,
    summary: `イベント案件を作成: ${name}`,
  });
  await emitGrowthEvent({
    tenantId: user.tenantId,
    type: 'event.project.created',
    title: `イベント案件: ${name}`,
    actorId: user.userId,
    entityType: 'EventProject',
    entityId: event.id,
    amount: revenue,
    alsoDomainEvent: {
      domainType: 'EVENT_PROJECT_CREATED' as DomainEventType,
      aggregateType: 'EventProject',
      aggregateId: event.id,
    },
  });
  redirect(`/operations/events/${event.id}`);
}

export async function assignAssetToEventAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'update')) redirect('/operations/events?denied=1');
  const eventId = String(formData.get('eventId') ?? '');
  const assetId = String(formData.get('assetId') ?? '');
  const quantity = Math.max(1, Number(formData.get('quantity') ?? 1) || 1);
  const [event, asset] = await Promise.all([
    prisma.eventProject.findFirst({ where: { id: eventId, tenantId: user.tenantId } }),
    prisma.productAsset.findFirst({ where: { id: assetId, tenantId: user.tenantId } }),
  ]);
  if (!event || !asset) redirect(`/operations/events/${eventId}?error=notfound`);

  await prisma.eventProductUsage.create({
    data: { tenantId: user.tenantId, eventId, assetId, assetName: asset!.name, quantity },
  });
  // 案件用に在庫を予約状態へ
  await applyInventoryMovement({
    tenantId: user.tenantId,
    actorId: user.userId,
    assetId,
    type: 'reserve',
    quantity,
    eventId,
    note: `イベント割当: ${event!.name}`,
  });
  await emitGrowthEvent({
    tenantId: user.tenantId,
    type: 'event.equipment.assigned',
    title: `備品割当: ${asset!.name} → ${event!.name}`,
    actorId: user.userId,
    entityType: 'EventProject',
    entityId: eventId,
    alsoDomainEvent: {
      domainType: 'EVENT_EQUIPMENT_ASSIGNED' as DomainEventType,
      aggregateType: 'EventProject',
      aggregateId: eventId,
    },
  });
  revalidatePath(`/operations/events/${eventId}`);
  redirect(`/operations/events/${eventId}?assigned=1`);
}

export async function recordEventCostAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'update')) redirect('/operations/events?denied=1');
  const eventId = String(formData.get('eventId') ?? '');
  const category = String(formData.get('category') ?? '').trim() || 'その他';
  const amount = Math.max(0, Number(formData.get('amount') ?? 0) || 0);
  await recordEventCost({ tenantId: user.tenantId, userId: user.userId }, eventId, category, amount);
  revalidatePath(`/operations/events/${eventId}`);
  redirect(`/operations/events/${eventId}?cost=1`);
}

export async function recordEventRevenueAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'update')) redirect('/operations/events?denied=1');
  const eventId = String(formData.get('eventId') ?? '');
  const revenue = Math.max(0, Number(formData.get('revenue') ?? 0) || 0);
  await recordEventRevenue({ tenantId: user.tenantId, userId: user.userId }, eventId, revenue);
  revalidatePath(`/operations/events/${eventId}`);
  redirect(`/operations/events/${eventId}?revenue=1`);
}

export async function calculateEventProfitabilityAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'update')) redirect('/operations/events?denied=1');
  const eventId = String(formData.get('eventId') ?? '');
  await calculateEventProfitability({ tenantId: user.tenantId, userId: user.userId }, eventId);
  revalidatePath(`/operations/events/${eventId}`);
  redirect(`/operations/events/${eventId}?profit=1`);
}

export async function completeEventProjectAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'update')) redirect('/operations/events?denied=1');
  const eventId = String(formData.get('eventId') ?? '');
  await completeEventProject({ tenantId: user.tenantId, userId: user.userId }, eventId);
  revalidatePath(`/operations/events/${eventId}`);
  redirect(`/operations/events/${eventId}?completed=1`);
}

/** イベント案件を Finance へブリッジ（売上/原価/請求候補/仕訳候補/入金予定を生成）。冪等。
 *  業務ロジックは lib/domains/finance/finance-bridge.ts。Golden Path: 現場→会計の橋渡し。 */
export async function bridgeEventToFinanceAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'finance', 'create')) redirect('/operations/events?denied=1');
  const eventId = String(formData.get('eventId') ?? '');
  if (!eventId) redirect('/operations/events?error=input');
  const res = await bridgeEventProjectToFinance({ tenantId: user.tenantId, userId: user.userId }, eventId);
  revalidatePath(`/operations/events/${eventId}`);
  revalidatePath('/finance/bridge');
  redirect(`/operations/events/${eventId}?bridged=${res.alreadyBridged ? 'already' : '1'}`);
}

// 決定論の次回提案生成（FakeLLM 相当。外部送信なし・必ず下書き）。
function fakeNextProposal(event: { name: string; venue: string | null }): string {
  const v = event.venue ?? '会場';
  return [
    `【次回提案: ${event.name}】`,
    `・${v}での実績を踏まえ、同時期の定期開催を提案。`,
    `・好評だった機材構成を標準パッケージ化し見積を簡素化。`,
    `・搬入出の動線を改善し、設営時間と人件費を削減。`,
    `・リピート特典（早期予約割引）でリピート率向上を狙う。`,
  ].join('\n');
}

/** イベント終了後の次回提案を AI 生成（安全処理付き・下書き保存）。 */
export async function createEventNextProposalAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'create')) redirect('/operations/events?denied=1');
  const eventId = String(formData.get('eventId') ?? '');
  const event = await prisma.eventProject.findFirst({ where: { id: eventId, tenantId: user.tenantId } });
  if (!event) redirect('/operations/events');

  // 入力（案件名・会場・メモ）の命令注入を検査（high は生成中止）。
  const guard = await safeAiInput({
    tenantId: user.tenantId,
    actorId: user.userId,
    actorType: 'ai_agent',
    purpose: 'event_next_proposal',
    text: `${event!.name}\n${event!.venue ?? ''}\n${event!.notes}`,
    entityType: 'EventProject',
    entityId: eventId,
    detail: 'createEventNextProposal',
  });
  if (guard.blocked) redirect(`/operations/events/${eventId}?blocked=injection`);

  const proposal = fakeNextProposal({ name: event!.name, venue: event!.venue });
  const saved = await prisma.eventNextProposal.create({
    data: { tenantId: user.tenantId, eventId, proposal },
  });
  await saveAIOutputStandard({
    tenantId: user.tenantId,
    userId: user.userId,
    actorType: 'ai_agent',
    task: 'eventNextProposal',
    purpose: 'event',
    entityType: 'EventNextProposal',
    entityId: saved.id,
    input: { eventId, name: event!.name },
    output: { proposal },
    outputText: proposal,
    confidence: 0.7,
    safetyFlags: guard.flags,
  });
  await emitGrowthEvent({
    tenantId: user.tenantId,
    type: 'event.proposal.created',
    title: `次回提案を生成: ${event!.name}`,
    actorId: user.userId,
    actorType: 'ai_agent',
    entityType: 'EventNextProposal',
    entityId: saved.id,
  });
  revalidatePath(`/operations/events/${eventId}`);
  redirect(`/operations/events/${eventId}?proposal=1`);
}

// ============================ イベント人員配置 ============================

/** イベントに人員を割り当て、人件費を EventCost に反映。 */
export async function assignEventStaffAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'update')) redirect('/operations/events?denied=1');
  const eventId = String(formData.get('eventId') ?? '');
  const name = String(formData.get('name') ?? '').trim() || '担当者';
  const role = String(formData.get('role') ?? 'staff');
  const cost = Math.max(0, Number(formData.get('cost') ?? 0) || 0);
  await assignEventStaff({ tenantId: user.tenantId, userId: user.userId }, eventId, name, role, cost);
  revalidatePath(`/operations/events/${eventId}`);
  redirect(`/operations/events/${eventId}?staff=1`);
}

// ============================ イベントリスク ============================

export async function createEventRiskAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'update')) redirect('/operations/events?denied=1');
  const eventId = String(formData.get('eventId') ?? '');
  await createEventRisk(
    { tenantId: user.tenantId, userId: user.userId },
    {
      eventId,
      type: String(formData.get('type') ?? 'other'),
      severity: String(formData.get('severity') ?? 'medium'),
      description: String(formData.get('description') ?? '').trim(),
      mitigation: String(formData.get('mitigation') ?? '').trim(),
    },
  );
  revalidatePath(`/operations/events/${eventId}`);
  redirect(`/operations/events/${eventId}?risk=1`);
}

export async function updateEventRiskStatusAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'update')) redirect('/operations/events?denied=1');
  const riskId = String(formData.get('riskId') ?? '');
  const status = String(formData.get('status') ?? 'open');
  const eventId = await updateEventRiskStatus({ tenantId: user.tenantId, userId: user.userId }, riskId, status);
  if (!eventId) redirect('/operations/events');
  revalidatePath(`/operations/events/${eventId}`);
  redirect(`/operations/events/${eventId}?risk=updated`);
}
