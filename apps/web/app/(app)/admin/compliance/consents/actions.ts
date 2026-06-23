'use server';

import { revalidatePath } from 'next/cache';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeAudit } from '@/lib/db';
import { PURPOSES_REQUIRING_CONSENT } from '@hokko/shared';

const VALID_PURPOSES = new Set<string>([
  ...PURPOSES_REQUIRING_CONSENT,
  'ai_reference',
]);

export async function grantConsentAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'admin', 'update')) redirectDenied();
  const purpose = String(formData.get('purpose') ?? '');
  const subjectType = String(formData.get('subjectType') ?? 'employee');
  const subjectId = String(formData.get('subjectId') ?? '').trim();
  const subjectLabel = String(formData.get('subjectLabel') ?? '').trim();
  const note = String(formData.get('note') ?? '');
  if (!VALID_PURPOSES.has(purpose) || !subjectId) {
    revalidatePath('/admin/compliance/consents');
    return;
  }
  await prisma.consentGrant.create({
    data: {
      tenantId: user.tenantId,
      subjectType,
      subjectUserId: subjectType === 'employee' ? subjectId : null,
      customerId: subjectType === 'customer' ? subjectId : null,
      subjectLabel,
      policyKey: purpose,
      purpose,
      status: 'granted',
      source: 'admin',
      note,
      createdById: user.userId,
    },
  });
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: 'consent_grant',
    entityType: 'ConsentGrant',
    entityId: subjectId,
    summary: `同意を登録: ${purpose} / ${subjectType}:${subjectLabel || subjectId}`,
  });
  revalidatePath('/admin/compliance/consents');
}

export async function withdrawConsentAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'admin', 'update')) redirectDenied();
  const id = String(formData.get('grantId') ?? '');
  const grant = await prisma.consentGrant.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!grant) return;
  await prisma.consentGrant.update({
    where: { id },
    data: { status: 'withdrawn', withdrawnAt: new Date() },
  });
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: 'consent_withdraw',
    entityType: 'ConsentGrant',
    entityId: id,
    summary: `同意を撤回: ${grant.purpose}`,
  });
  revalidatePath('/admin/compliance/consents');
}

function redirectDenied(): never {
  throw new Error('forbidden');
}
