'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  canTransitionLogistics,
  growthTypeOfLogisticsCompletion,
  isLogisticsTaskType,
  LOGISTICS_TASK_LABEL,
  type LogisticsStatus,
  type LogisticsTaskType,
  type DomainEventType,
} from '@hokko/shared';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeAudit } from '@/lib/db';
import { emitGrowthEvent } from '@/lib/growth';

const STANDARD_FLOW: LogisticsTaskType[] = ['delivery', 'setup', 'teardown', 'pickup'];

/** イベント案件から配送/設営/撤去/回収の標準タスクを一括作成。 */
export async function createEventLogisticsTasksAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'create')) redirect('/operations/logistics?denied=1');
  const eventId = String(formData.get('eventId') ?? '');
  const event = await prisma.eventProject.findFirst({ where: { id: eventId, tenantId: user.tenantId } });
  if (!event) redirect('/operations/logistics');
  for (const type of STANDARD_FLOW) {
    await prisma.logisticsTask.create({
      data: {
        tenantId: user.tenantId,
        eventId,
        type,
        title: `${LOGISTICS_TASK_LABEL[type]}: ${event!.name}`,
        status: 'todo',
        scheduledAt: event!.eventDate,
      },
    });
  }
  await emitGrowthEvent({
    tenantId: user.tenantId,
    type: 'logistics.task.created',
    title: `物流タスク作成: ${event!.name}`,
    actorId: user.userId,
    entityType: 'EventProject',
    entityId: eventId,
    alsoDomainEvent: { domainType: 'LOGISTICS_TASK_CREATED' as DomainEventType, aggregateType: 'EventProject', aggregateId: eventId },
  });
  revalidatePath(`/operations/events/${eventId}`);
  revalidatePath('/operations/logistics');
  redirect(`/operations/events/${eventId}?logistics=1`);
}

export async function createLogisticsTaskAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'create')) redirect('/operations/logistics?denied=1');
  const type = String(formData.get('type') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const eventId = String(formData.get('eventId') ?? '') || null;
  if (!isLogisticsTaskType(type) || !title) redirect('/operations/logistics?error=input');
  const task = await prisma.logisticsTask.create({
    data: {
      tenantId: user.tenantId,
      eventId,
      type,
      title,
      status: 'todo',
      scheduledAt: formData.get('scheduledAt') ? new Date(String(formData.get('scheduledAt'))) : null,
      assigneeId: String(formData.get('assigneeId') ?? '') || null,
      vehicle: String(formData.get('vehicle') ?? '') || null,
    },
  });
  await emitGrowthEvent({
    tenantId: user.tenantId,
    type: 'logistics.task.created',
    title: `物流タスク: ${title}`,
    actorId: user.userId,
    entityType: 'LogisticsTask',
    entityId: task.id,
    alsoDomainEvent: { domainType: 'LOGISTICS_TASK_CREATED' as DomainEventType, aggregateType: 'LogisticsTask', aggregateId: task.id },
  });
  redirect('/operations/logistics?created=1');
}

/** 物流タスクの状態を更新。done で完了イベント（種別別 GrowthEvent + DomainEvent）。 */
export async function updateLogisticsTaskStatusAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'update')) redirect('/operations/logistics?denied=1');
  const taskId = String(formData.get('taskId') ?? '');
  const to = String(formData.get('status') ?? '') as LogisticsStatus;
  const task = await prisma.logisticsTask.findFirst({ where: { id: taskId, tenantId: user.tenantId } });
  if (!task) redirect('/operations/logistics');
  const from = task!.status as LogisticsStatus;
  if (!canTransitionLogistics(from, to)) redirect('/operations/logistics?error=transition');

  const done = to === 'done';
  await prisma.logisticsTask.update({
    where: { id: taskId },
    data: { status: to, completedAt: done ? new Date() : null },
  });
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: 'update',
    entityType: 'LogisticsTask',
    entityId: taskId,
    summary: `物流タスク「${task!.title}」: ${from} → ${to}`,
  });
  if (done && isLogisticsTaskType(task!.type)) {
    await emitGrowthEvent({
      tenantId: user.tenantId,
      type: growthTypeOfLogisticsCompletion(task!.type),
      title: `物流完了: ${task!.title}`,
      actorId: user.userId,
      entityType: 'LogisticsTask',
      entityId: taskId,
      alsoDomainEvent: { domainType: 'LOGISTICS_TASK_COMPLETED' as DomainEventType, aggregateType: 'LogisticsTask', aggregateId: taskId },
    });
  }
  revalidatePath('/operations/logistics');
  if (task!.eventId) revalidatePath(`/operations/events/${task!.eventId}`);
  // event detail から実行した場合は案件詳細へ戻す（Phase 1-14）。URL は DB の task.eventId で構築＝open-redirect 回避。
  // returnToEvent 未指定の既存（/operations/logistics）フローは従来どおり。
  if (String(formData.get('returnToEvent') ?? '') === '1' && task!.eventId) {
    redirect(`/operations/events/${task!.eventId}#logistics`);
  }
  redirect('/operations/logistics?updated=1');
}
