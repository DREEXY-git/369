// イベント案件の業務ロジック（原価/売上/粗利/完了/人員/リスク）。Phase 1-10 保守リファクタ。
// operations/actions.ts から切り出し。設計: docs/audit/12_maintenance_architecture.md。
import { prisma, writeAudit } from '@/lib/db';
import { emitGrowthEvent } from '@/lib/growth';
import { applyInventoryMovementTx, recordEventProfitabilitySnapshot } from '@/lib/operations';
import type { DomainEventType } from '@hokko/shared';

export interface Actor {
  tenantId: string;
  userId?: string | null;
}

/**
 * M1-b 証拠用の test-only fault 注入フック（`LeaseTestHooks` と同型・本番未指定時は無作用）。
 * production 経路は opts を渡さないため挙動不変。spec は tx 途中/commit 後に fault を注入し、
 * all-or-nothing rollback と post-commit Growth の非クリティカル性・冪等 retry を実 DB で実証する。
 */
export interface OperationsTestHooks {
  /** tx 内で1つ目の write 後・2つ目の write 前に throw させ、全 rollback（all-or-nothing）を実証する。 */
  __faultBetweenWritesForTest?: () => void;
  /** core commit 後・post-commit Growth 発火前に throw させ、core 永続化＋Growth 未発火を実証する。 */
  __faultAfterCommitForTest?: () => void;
}

async function findEvent(tenantId: string, eventId: string) {
  return prisma.eventProject.findFirst({ where: { id: eventId, tenantId } });
}

export async function recordEventCost(actor: Actor, eventId: string, category: string, amount: number): Promise<boolean> {
  const event = await findEvent(actor.tenantId, eventId);
  if (!event) return false;
  await prisma.eventCost.create({ data: { tenantId: actor.tenantId, eventId, category, amount } });
  await writeAudit({ tenantId: actor.tenantId, actorId: actor.userId, action: 'create', entityType: 'EventCost', entityId: eventId, summary: `イベント原価を記録: ${event.name} / ${category} ${amount}円` });
  return true;
}

export async function recordEventRevenue(actor: Actor, eventId: string, revenue: number): Promise<boolean> {
  const event = await findEvent(actor.tenantId, eventId);
  if (!event) return false;
  await prisma.eventProject.update({ where: { id: eventId }, data: { revenue } });
  await writeAudit({ tenantId: actor.tenantId, actorId: actor.userId, action: 'update', entityType: 'EventProject', entityId: eventId, summary: `イベント売上を記録: ${event.name} ${revenue}円` });
  return true;
}

export async function calculateEventProfitability(actor: Actor, eventId: string): Promise<boolean> {
  const event = await findEvent(actor.tenantId, eventId);
  if (!event) return false;
  await recordEventProfitabilitySnapshot({ tenantId: actor.tenantId, eventId, actorId: actor.userId });
  return true;
}

export async function completeEventProject(actor: Actor, eventId: string): Promise<boolean> {
  const event = await findEvent(actor.tenantId, eventId);
  if (!event) return false;
  // completedAt=経営上の完了日時（KPIの「今月完了」基準）。loadOutAt=撤去/物流時刻は従来どおり維持。Phase 1-13。
  const now = new Date();
  await prisma.eventProject.update({ where: { id: eventId }, data: { status: 'completed', loadOutAt: now, completedAt: now } });
  await emitGrowthEvent({
    tenantId: actor.tenantId,
    type: 'event.completed',
    title: `イベント完了: ${event.name}`,
    actorId: actor.userId,
    entityType: 'EventProject',
    entityId: eventId,
    alsoDomainEvent: { domainType: 'EVENT_PROJECT_COMPLETED' as DomainEventType, aggregateType: 'EventProject', aggregateId: eventId },
  });
  return true;
}

export async function assignEventStaff(actor: Actor, eventId: string, name: string, role: string, cost: number, opts: OperationsTestHooks = {}): Promise<boolean> {
  const event = await findEvent(actor.tenantId, eventId);
  if (!event) return false;
  // 配置・人件費原価・監査を単一 $transaction で確定。costRecorded=cost>0 の主張と EventCost 行を同時にコミット
  // し、cost 行だけ失敗して「原価済みフラグだけ立つ（粗利過大）」不整合を防ぐ。growth は commit 後（非クリティカル）。
  await prisma.$transaction(async (tx) => {
    const a = await tx.eventStaffAssignment.create({
      data: { tenantId: actor.tenantId, eventId, name, role, cost, costRecorded: cost > 0 },
    });
    if (opts.__faultBetweenWritesForTest) opts.__faultBetweenWritesForTest();
    if (cost > 0) {
      await tx.eventCost.create({ data: { tenantId: actor.tenantId, eventId, category: `人件費(${role})`, amount: cost } });
    }
    await tx.auditLog.create({
      data: { tenantId: actor.tenantId, actorId: actor.userId ?? null, actorType: 'user', action: 'create', entityType: 'EventStaffAssignment', entityId: a.id, summary: `人員配置: ${name}（${role}・${cost}円）→ ${event.name}` },
    });
  });
  if (opts.__faultAfterCommitForTest) opts.__faultAfterCommitForTest();
  await emitGrowthEvent({
    tenantId: actor.tenantId,
    type: 'event.staff.assigned',
    title: `人員配置: ${name} → ${event.name}`,
    actorId: actor.userId,
    entityType: 'EventProject',
    entityId: eventId,
    metric: { cost, role },
    alsoDomainEvent: { domainType: 'EVENT_STAFF_ASSIGNED' as DomainEventType, aggregateType: 'EventProject', aggregateId: eventId },
  });
  return true;
}

/**
 * イベントへの備品割当（EventProductUsage ＋ reserve Movement を単一 $transaction で all-or-nothing）。
 * operations/actions.ts の Server Action から切り出した testable core（fault 注入で証拠化するため）。
 * Movement 失敗（tx 途中 fault）で Usage も rollback（孤児 usage を作らない）。growth は commit 後の
 * 非クリティカル発火で、DomainEvent は identity（EVENT_EQUIPMENT_ASSIGNED × eventId）冪等のため growth-only
 * の retry で重複しない（core 業務行は単一 commit で確定済みのため retry でも usage/reserve が増えない）。
 */
export async function assignAssetToEvent(
  actor: Actor,
  input: { eventId: string; assetId: string; quantity: number },
  opts: OperationsTestHooks = {},
): Promise<{ ok: true; eventId: string } | { ok: false; reason: 'notfound' }> {
  const quantity = Math.max(1, Math.floor(input.quantity) || 1);
  const [event, asset] = await Promise.all([
    prisma.eventProject.findFirst({ where: { id: input.eventId, tenantId: actor.tenantId } }),
    prisma.productAsset.findFirst({ where: { id: input.assetId, tenantId: actor.tenantId } }),
  ]);
  if (!event || !asset) return { ok: false, reason: 'notfound' };

  await prisma.$transaction(async (tx) => {
    await tx.eventProductUsage.create({
      data: { tenantId: actor.tenantId, eventId: input.eventId, assetId: input.assetId, assetName: asset.name, quantity },
    });
    if (opts.__faultBetweenWritesForTest) opts.__faultBetweenWritesForTest();
    await applyInventoryMovementTx(tx, {
      tenantId: actor.tenantId,
      actorId: actor.userId,
      assetId: input.assetId,
      type: 'reserve',
      quantity,
      eventId: input.eventId,
      note: `イベント割当: ${event.name}`,
    });
  });
  if (opts.__faultAfterCommitForTest) opts.__faultAfterCommitForTest();
  await emitGrowthEvent({
    tenantId: actor.tenantId,
    type: 'event.equipment.assigned',
    title: `備品割当: ${asset.name} → ${event.name}`,
    actorId: actor.userId,
    entityType: 'EventProject',
    entityId: input.eventId,
    alsoDomainEvent: {
      domainType: 'EVENT_EQUIPMENT_ASSIGNED' as DomainEventType,
      aggregateType: 'EventProject',
      aggregateId: input.eventId,
    },
  });
  return { ok: true, eventId: input.eventId };
}

/**
 * リース破損記録（DamageLossRecord ＋ damage Movement を単一 $transaction で all-or-nothing）。
 * operations/actions.ts の Server Action から切り出した testable core。damage Movement は
 * asset status→maintenance / condition→broken を伴うため、記録だけ／status だけの片欠けを防ぐ。
 * post-commit Growth は無い（applyInventoryMovementTx は growth を発火しない）。
 */
export async function recordLeaseDamage(
  actor: Actor,
  input: { assetId: string; cost: number; note: string },
  opts: OperationsTestHooks = {},
): Promise<{ ok: true } | { ok: false; reason: 'notfound' }> {
  const asset = await prisma.productAsset.findFirst({ where: { id: input.assetId, tenantId: actor.tenantId } });
  if (!asset) return { ok: false, reason: 'notfound' };
  await prisma.$transaction(async (tx) => {
    await tx.damageLossRecord.create({ data: { tenantId: actor.tenantId, assetId: input.assetId, type: 'damage', cost: input.cost, note: input.note } });
    if (opts.__faultBetweenWritesForTest) opts.__faultBetweenWritesForTest();
    await applyInventoryMovementTx(tx, {
      tenantId: actor.tenantId,
      actorId: actor.userId,
      assetId: input.assetId,
      type: 'damage',
      note: input.note || '破損記録',
    });
  });
  return { ok: true };
}

export async function createEventRisk(actor: Actor, input: { eventId: string; type: string; severity: string; description: string; mitigation: string }): Promise<boolean> {
  const event = await findEvent(actor.tenantId, input.eventId);
  if (!event) return false;
  const risk = await prisma.eventRisk.create({
    data: { tenantId: actor.tenantId, eventId: input.eventId, type: input.type, severity: input.severity, description: input.description, mitigation: input.mitigation, status: 'open' },
  });
  await writeAudit({ tenantId: actor.tenantId, actorId: actor.userId, action: 'create', entityType: 'EventRisk', entityId: risk.id, summary: `リスク登録: ${input.type}/${input.severity} — ${input.description.slice(0, 40)}` });
  await emitGrowthEvent({
    tenantId: actor.tenantId,
    type: 'event.risk.created',
    title: `リスク登録(${input.severity}): ${event.name}`,
    actorId: actor.userId,
    entityType: 'EventRisk',
    entityId: risk.id,
    alsoDomainEvent: { domainType: 'EVENT_RISK_CREATED' as DomainEventType, aggregateType: 'EventProject', aggregateId: input.eventId },
  });
  return true;
}

export async function updateEventRiskStatus(actor: Actor, riskId: string, status: string): Promise<string | null> {
  const risk = await prisma.eventRisk.findFirst({ where: { id: riskId, tenantId: actor.tenantId } });
  if (!risk) return null;
  await prisma.eventRisk.update({ where: { id: riskId }, data: { status } });
  if (status === 'resolved') {
    await emitGrowthEvent({
      tenantId: actor.tenantId,
      type: 'event.risk.resolved',
      title: `リスク解消: ${risk.type}`,
      actorId: actor.userId,
      entityType: 'EventRisk',
      entityId: riskId,
      alsoDomainEvent: { domainType: 'EVENT_RISK_RESOLVED' as DomainEventType, aggregateType: 'EventProject', aggregateId: risk.eventId },
    });
  }
  return risk.eventId;
}
