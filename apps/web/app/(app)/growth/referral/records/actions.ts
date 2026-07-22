'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isHumanUser, isReferralRecordStatus, canTransitionReferralRecord } from '@hokko/shared';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeAudit } from '@/lib/db';

const RECORDS = '/growth/referral/records';

/** 受けた紹介を記録（受領状態で作成）。AI 主体は isHumanUser で遮断。 */
export async function createReferralRecordAction(formData: FormData) {
  const user = await requireUser();
  if (!isHumanUser({ roles: user.roles }) || !hasPermission(user, 'marketing', 'create')) redirect(`${RECORDS}?denied=1`);
  const referrerName = String(formData.get('referrerName') ?? '').trim();
  const referredName = String(formData.get('referredName') ?? '').trim();
  const referredContact = String(formData.get('referredContact') ?? '').trim() || null;
  const note = String(formData.get('note') ?? '').trim() || null;
  const estRaw = String(formData.get('estimatedValue') ?? '').trim();
  const estimatedValue = estRaw && Number.isFinite(Number(estRaw)) ? Math.max(0, Number(estRaw)) : null;
  if (!referrerName || !referredName) redirect(`${RECORDS}?error=input`);

  const rec = await prisma.customerReferral.create({
    data: {
      tenantId: user.tenantId,
      referrerName,
      referredName,
      referredContact,
      note,
      estimatedValue,
      status: 'received',
      ownerId: user.userId,
    },
  });
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: 'create',
    entityType: 'CustomerReferral',
    entityId: rec.id,
    summary: `紹介を記録: ${referrerName} → ${referredName}`,
  });
  revalidatePath(RECORDS);
  redirect(`${RECORDS}?created=1`);
}

/** 紹介の状況を更新（状態機械で遷移を検証・tenant スコープ update）。AI 主体は遮断。 */
export async function updateReferralRecordStatusAction(formData: FormData) {
  const user = await requireUser();
  if (!isHumanUser({ roles: user.roles }) || !hasPermission(user, 'marketing', 'update')) redirect(`${RECORDS}?denied=1`);
  const id = String(formData.get('id') ?? '');
  const to = String(formData.get('status') ?? '');
  if (!isReferralRecordStatus(to)) redirect(`${RECORDS}?error=input`);
  // tenant スコープで所有権を確定（越境更新を作らない・防御多重化）。
  const rec = await prisma.customerReferral.findFirst({ where: { id, tenantId: user.tenantId }, select: { status: true } });
  if (!rec) redirect(RECORDS);
  if (!canTransitionReferralRecord(rec.status, to)) redirect(`${RECORDS}?error=transition`);
  // id 単独 update ではなく tenantId を併記した updateMany（foreign 行は count 0 の無害 no-op）。
  await prisma.customerReferral.updateMany({ where: { id, tenantId: user.tenantId }, data: { status: to } });
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: 'update',
    entityType: 'CustomerReferral',
    entityId: id,
    summary: `紹介の状況を更新: ${rec.status} → ${to}`,
  });
  revalidatePath(RECORDS);
  redirect(`${RECORDS}?updated=1`);
}
