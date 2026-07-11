// Growth Event Ledger ヘルパ（web）。Phase 1-4。
// emitGrowthEvent: 成長イベントを台帳に記録。重要なものは既存 DomainEvent も発火（Outbox/worker 連動）。
import { prisma } from './db';
import { toNumber } from './utils';
import { growthCategoryOf, summarizeGrowth, type DomainEventType } from '@hokko/shared';
import { emitDomainEvent } from './events';

export interface EmitGrowthInput {
  tenantId: string;
  type: string; // GrowthEventType（marketing.campaign.created 等）
  title: string;
  description?: string;
  actorId?: string | null;
  actorType?: string;
  entityType?: string;
  entityId?: string | null;
  amount?: number;
  revenueImpact?: number;
  costSaving?: number;
  timeSavingMinutes?: number;
  metric?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  /** 併せて DomainEvent を発火し、Outbox/Webhook に流す。 */
  alsoDomainEvent?: { domainType: DomainEventType; aggregateType: string; aggregateId: string };
}

export async function emitGrowthEvent(
  input: EmitGrowthInput,
): Promise<{ growthEventId: string; domainEventId?: string }> {
  let domainEventId: string | undefined;
  if (input.alsoDomainEvent) {
    const r = await emitDomainEvent({
      tenantId: input.tenantId,
      eventType: input.alsoDomainEvent.domainType,
      aggregateType: input.alsoDomainEvent.aggregateType,
      aggregateId: input.alsoDomainEvent.aggregateId,
      actorId: input.actorId,
      actorType: input.actorType,
      payload: { growthType: input.type, ...(input.payload ?? {}) },
    });
    domainEventId = r.eventId;
  }
  const ge = await prisma.growthEvent.create({
    data: {
      tenantId: input.tenantId,
      type: input.type,
      category: growthCategoryOf(input.type),
      title: input.title,
      description: input.description ?? '',
      actorId: input.actorId ?? null,
      actorType: input.actorType ?? 'user',
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      amount: input.amount ?? null,
      revenueImpact: input.revenueImpact ?? null,
      costSaving: input.costSaving ?? null,
      timeSavingMinutes: input.timeSavingMinutes ?? null,
      metric: (input.metric ?? undefined) as any,
      payload: (input.payload ?? undefined) as any,
      domainEventId: domainEventId ?? null,
    },
  });
  return { growthEventId: ge.id, domainEventId };
}

/** 直近 sinceDays の成長イベントを集計（ダッシュボード用）。 */
export async function summarizeGrowthEvents(tenantId: string, sinceDays = 30) {
  const since = new Date(Date.now() - sinceDays * 86_400_000);
  const events = await prisma.growthEvent.findMany({
    where: { tenantId, occurredAt: { gte: since } },
    select: { type: true, revenueImpact: true, costSaving: true, timeSavingMinutes: true },
  });
  return summarizeGrowth(
    events.map((e) => ({
      type: e.type,
      revenueImpact: toNumber(e.revenueImpact),
      costSaving: toNumber(e.costSaving),
      timeSavingMinutes: e.timeSavingMinutes ?? 0,
    })),
  );
}

/**
 * 金額列（revenueImpact/costSaving/amount）を DB クエリ段階から一切取得しない件数・時間集計
 * （財務閲覧権限のない閲覧者向け・WIP-3/roadmap64）。
 * 返り値の金額系合計は常に 0（呼び出し側で表示しないこと）。timeSavingMinutes は金額ではないため含む。
 */
export async function summarizeGrowthEventCounts(tenantId: string, sinceDays = 30) {
  const since = new Date(Date.now() - sinceDays * 86_400_000);
  const events = await prisma.growthEvent.findMany({
    where: { tenantId, occurredAt: { gte: since } },
    select: { type: true, timeSavingMinutes: true },
  });
  return summarizeGrowth(
    events.map((e) => ({
      type: e.type,
      revenueImpact: 0,
      costSaving: 0,
      timeSavingMinutes: e.timeSavingMinutes ?? 0,
    })),
  );
}
