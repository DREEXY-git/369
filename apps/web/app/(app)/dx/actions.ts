'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeAudit } from '@/lib/db';
import { emitGrowthEvent } from '@/lib/growth';
import { dxPriorityScore, type Difficulty } from '@hokko/shared';

function num(v: FormDataEntryValue | null, d = 0): number {
  const n = Number(v ?? d);
  return Number.isFinite(n) ? n : d;
}

export async function createDXAssessmentAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'marketing', 'create')) redirect('/dx?denied=1');
  const title = String(formData.get('title') ?? '').trim();
  if (!title) redirect('/dx/assessments/new?error=title');
  const findingsRaw = String(formData.get('findings') ?? '');
  const findings = findingsRaw
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  const a = await prisma.dXAssessment.create({
    data: {
      tenantId: user.tenantId,
      title,
      department: String(formData.get('department') ?? ''),
      summary: String(formData.get('summary') ?? ''),
      findings,
      createdById: user.userId,
    },
  });
  await writeAudit({ tenantId: user.tenantId, actorId: user.userId, action: 'create', entityType: 'DXAssessment', entityId: a.id, summary: `DX診断「${title}」を作成` });
  await emitGrowthEvent({
    tenantId: user.tenantId,
    type: 'dx.assessment.created',
    title: `DX診断作成: ${title}`,
    actorId: user.userId,
    entityType: 'DXAssessment',
    entityId: a.id,
  });
  revalidatePath('/dx/assessments');
  redirect('/dx/assessments');
}

export async function createDXOpportunityAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'marketing', 'create')) redirect('/dx?denied=1');
  const title = String(formData.get('title') ?? '').trim();
  if (!title) redirect('/dx/opportunities?error=title');
  const time = num(formData.get('estimatedTimeSavingMinutes'));
  const cost = num(formData.get('estimatedCostSaving'));
  const rev = num(formData.get('estimatedRevenueImpact'));
  const difficulty = (String(formData.get('difficulty') ?? 'medium') as Difficulty);
  const priority = dxPriorityScore({ estimatedTimeSavingMinutes: time, estimatedCostSaving: cost, estimatedRevenueImpact: rev, difficulty });
  const o = await prisma.dXOpportunity.create({
    data: {
      tenantId: user.tenantId,
      assessmentId: String(formData.get('assessmentId') ?? '') || null,
      title,
      problem: String(formData.get('problem') ?? ''),
      solution: String(formData.get('solution') ?? ''),
      estimatedTimeSavingMinutes: time,
      estimatedCostSaving: cost,
      estimatedRevenueImpact: rev,
      difficulty,
      priority,
      createdById: user.userId,
    },
  });
  await writeAudit({ tenantId: user.tenantId, actorId: user.userId, action: 'create', entityType: 'DXOpportunity', entityId: o.id, summary: `DX改善機会「${title}」を作成` });
  await emitGrowthEvent({
    tenantId: user.tenantId,
    type: 'dx.opportunity.detected',
    title: `DX改善機会: ${title}`,
    description: `推定削減 ${time}分/月・${cost}円/月`,
    actorId: user.userId,
    entityType: 'DXOpportunity',
    entityId: o.id,
    payload: { priority, difficulty },
    alsoDomainEvent: { domainType: 'DX_OPPORTUNITY_DETECTED', aggregateType: 'DXOpportunity', aggregateId: o.id },
  });
  revalidatePath('/dx/opportunities');
  redirect(`/dx/opportunities/${o.id}`);
}

export async function updateDXOpportunityStatusAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'marketing', 'update')) redirect('/dx/opportunities?denied=1');
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? 'planned');
  const o = await prisma.dXOpportunity.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!o) redirect('/dx/opportunities?error=notfound');
  await prisma.dXOpportunity.update({ where: { id }, data: { status } });
  await writeAudit({ tenantId: user.tenantId, actorId: user.userId, action: 'update', entityType: 'DXOpportunity', entityId: id, summary: `DX改善機会のステータスを ${status} に更新` });
  revalidatePath(`/dx/opportunities/${id}`);
  redirect(`/dx/opportunities/${id}`);
}

export async function recordDXImpactAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'marketing', 'update')) redirect('/dx/opportunities?denied=1');
  const id = String(formData.get('id') ?? '');
  const o = await prisma.dXOpportunity.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!o) redirect('/dx/opportunities?error=notfound');
  await prisma.dXOpportunity.update({ where: { id }, data: { status: 'done' } });
  // DX 効果を成長台帳に記録（削減時間・削減コスト・売上インパクト）→ Outbox/worker にも連動
  await emitGrowthEvent({
    tenantId: user.tenantId,
    type: 'dx.automation.completed',
    title: `DX施策の効果記録: ${o.title}`,
    description: `削減 ${o.estimatedTimeSavingMinutes}分/月・${Number(o.estimatedCostSaving)}円/月`,
    actorId: user.userId,
    entityType: 'DXOpportunity',
    entityId: o.id,
    costSaving: Number(o.estimatedCostSaving),
    revenueImpact: Number(o.estimatedRevenueImpact),
    timeSavingMinutes: o.estimatedTimeSavingMinutes,
    alsoDomainEvent: { domainType: 'DX_AUTOMATION_COMPLETED', aggregateType: 'DXOpportunity', aggregateId: o.id },
  });
  await writeAudit({ tenantId: user.tenantId, actorId: user.userId, action: 'update', entityType: 'DXOpportunity', entityId: id, summary: 'DX効果を記録' });
  revalidatePath(`/dx/opportunities/${id}`);
  redirect(`/dx/opportunities/${id}?impact=1`);
}
