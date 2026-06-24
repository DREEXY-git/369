'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeAudit } from '@/lib/db';
import { emitGrowthEvent, summarizeGrowthEvents } from '@/lib/growth';
import { isGrowthEventType } from '@hokko/shared';

export async function createGrowthEventAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'marketing', 'create')) redirect('/growth?denied=1');
  const type = String(formData.get('type') ?? 'management.decision.recorded');
  const title = String(formData.get('title') ?? '').trim();
  if (!title) redirect('/growth/events?error=title');
  await emitGrowthEvent({
    tenantId: user.tenantId,
    type: isGrowthEventType(type) ? type : 'management.decision.recorded',
    title,
    description: String(formData.get('description') ?? ''),
    actorId: user.userId,
  });
  await writeAudit({ tenantId: user.tenantId, actorId: user.userId, action: 'create', entityType: 'GrowthEvent', entityId: title, summary: `成長イベント記録: ${title}` });
  revalidatePath('/growth/events');
  redirect('/growth/events');
}

/** 既存 DomainEvent から成長イベントを派生記録する（管理者導線）。 */
export async function emitGrowthEventFromDomainAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'marketing', 'create')) redirect('/growth?denied=1');
  const domainEventId = String(formData.get('domainEventId') ?? '');
  const ev = await prisma.domainEvent.findFirst({ where: { id: domainEventId, tenantId: user.tenantId } });
  if (!ev) redirect('/growth/events?error=notfound');

  const MAP: Record<string, string> = {
    CUSTOMER_CREATED: 'customer.reactivated',
    QUOTE_APPROVED: 'sales.proposal.sent',
    CONTRACT_SIGNED: 'sales.deal.won',
    PAYMENT_RECEIVED: 'finance.invoice.paid',
    MEETING_MINUTES_CREATED: 'management.decision.recorded',
    AI_AGENT_RUN_COMPLETED: 'ai.employee.action.completed',
  };
  const type = MAP[ev.eventType] ?? 'management.decision.recorded';
  await emitGrowthEvent({
    tenantId: user.tenantId,
    type,
    title: `${ev.eventType} に基づく成長イベント`,
    actorId: user.userId,
    entityType: ev.aggregateType,
    entityId: ev.aggregateId,
    payload: { fromDomainEvent: ev.id },
  });
  revalidatePath('/growth/events');
  redirect('/growth/events');
}

/** 成長イベントの集計を返す（呼び出し可能なアクション）。 */
export async function summarizeGrowthEventsAction(sinceDays = 30) {
  const user = await requireUser();
  return summarizeGrowthEvents(user.tenantId, sinceDays);
}
