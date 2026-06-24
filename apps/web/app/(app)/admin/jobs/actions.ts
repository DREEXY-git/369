'use server';

import { revalidatePath } from 'next/cache';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { processOutboxBatch } from '@hokko/db';

/** Outbox を即時処理（Web から手動トリガ。Redis 不要でインライン実行）。 */
export async function runOutboxNowAction() {
  const user = await requireUser();
  if (!hasPermission(user, 'admin', 'update')) return;
  await processOutboxBatch({ limit: 100, actorId: user.userId });
  revalidatePath('/admin/jobs');
}
