// イベント案件の業務ロジック（原価/売上/粗利/完了/人員/リスク）。Phase 1-10 保守リファクタ。
// operations/actions.ts から切り出し。設計: docs/audit/12_maintenance_architecture.md。
import { prisma, writeAudit } from '@/lib/db';
import { emitGrowthEvent } from '@/lib/growth';
import { recordEventProfitabilitySnapshot } from '@/lib/operations';
import type { DomainEventType } from '@hokko/shared';

export interface Actor {
  tenantId: string;
  userId?: string | null;
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
  await prisma.eventProject.update({ where: { id: eventId }, data: { status: 'completed', loadOutAt: new Date() } });
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

export async function assignEventStaff(actor: Actor, eventId: string, name: string, role: string, cost: number): Promise<boolean> {
  const event = await findEvent(actor.tenantId, eventId);
  if (!event) return false;
  const assignment = await prisma.eventStaffAssignment.create({
    data: { tenantId: actor.tenantId, eventId, name, role, cost, costRecorded: cost > 0 },
  });
  // 人件費を原価へ反映（粗利に直結）。
  if (cost > 0) {
    await prisma.eventCost.create({ data: { tenantId: actor.tenantId, eventId, category: `人件費(${role})`, amount: cost } });
  }
  await writeAudit({ tenantId: actor.tenantId, actorId: actor.userId, action: 'create', entityType: 'EventStaffAssignment', entityId: assignment.id, summary: `人員配置: ${name}（${role}・${cost}円）→ ${event.name}` });
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
