'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeAudit } from '@/lib/db';
import { emitGrowthEvent } from '@/lib/growth';
import { isGrowthEventType, growthCategoryOf } from '@hokko/shared';

export async function createGrowthEventAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'marketing', 'create')) redirect('/growth?denied=1');
  const type = String(formData.get('type') ?? 'management.decision.recorded');
  // WIP-3（roadmap64 追補）: finance カテゴリの行は非財務閲覧者の一覧から遮断されるため、
  // 記録した本人に見えないサイレント消失を防ぐ（UI の選択肢からも除外・読み書きの対称性）。
  if (growthCategoryOf(type) === 'finance' && !hasPermission(user, 'finance', 'read')) {
    redirect('/growth/events?error=type');
  }
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

// WIP-3（roadmap64 追補）: summarizeGrowthEventsAction は削除した。
// 'use server' モジュールの export は権限検査なしで呼べる HTTP エンドポイントになるため、
// 金額込み集計（totalRevenueImpact/totalCostSaving/finance 件数）を requireUser のみで
// 返す未使用の裏口だった。集計はページの RSC（finance:read 分岐）でのみ行う。
