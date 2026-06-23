'use server';

import { revalidatePath } from 'next/cache';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { retryFailedEvent, dispatchDomainEvent } from '@/lib/events';
import '@/lib/event-handlers';

export async function retryEventAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'admin', 'update')) return;
  const eventId = String(formData.get('eventId') ?? '');
  // テナント越境防止: 自テナントのイベントのみ
  const ev = await prisma.domainEvent.findFirst({ where: { id: eventId, tenantId: user.tenantId } });
  if (!ev) return;
  await retryFailedEvent(eventId);
  await dispatchDomainEvent(eventId);
  revalidatePath('/admin/events');
}
