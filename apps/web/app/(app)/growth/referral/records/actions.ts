'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isHumanUser, isReferralRecordStatus, canTransitionReferralRecord, validateReferralRecordInput } from '@hokko/shared';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';

const RECORDS = '/growth/referral/records';

/** 受けた紹介を記録（受領状態で作成）。AI 主体（role/isAi 不整合含む）を遮断し、作成＋監査を単一 tx で確定（Codex R4-01/03/04）。 */
export async function createReferralRecordAction(formData: FormData) {
  const user = await requireUser();
  if (user.isAi || !isHumanUser({ roles: user.roles }) || !hasPermission(user, 'marketing', 'create')) redirect(`${RECORDS}?denied=1`);
  const input = validateReferralRecordInput({
    referrerName: String(formData.get('referrerName') ?? ''),
    referredName: String(formData.get('referredName') ?? ''),
    referredContact: String(formData.get('referredContact') ?? ''),
    note: String(formData.get('note') ?? ''),
    estimatedValue: String(formData.get('estimatedValue') ?? ''),
  });
  if (!input) redirect(`${RECORDS}?error=input`);
  await prisma.$transaction(async (tx) => {
    const rec = await tx.customerReferral.create({
      data: {
        tenantId: user.tenantId,
        referrerName: input.referrerName,
        referredName: input.referredName,
        referredContact: input.referredContact,
        note: input.note,
        estimatedValue: input.estimatedValue,
        status: 'received',
        ownerId: user.userId,
      },
    });
    // Audit summary へ氏名を複製しない（entityId で追跡・Codex R4-05）。
    await tx.auditLog.create({
      data: {
        tenantId: user.tenantId,
        actorId: user.userId,
        actorType: 'user',
        action: 'create',
        entityType: 'CustomerReferral',
        entityId: rec.id,
        summary: '紹介を1件記録',
      },
    });
  });
  revalidatePath(RECORDS);
  redirect(`${RECORDS}?created=1`);
}

/** 紹介の状況を更新。AI 主体遮断＋ expected status を含む CAS で競合遷移を排除し、更新＋監査を単一 tx で確定（Codex R4-01/02）。 */
export async function updateReferralRecordStatusAction(formData: FormData) {
  const user = await requireUser();
  if (user.isAi || !isHumanUser({ roles: user.roles }) || !hasPermission(user, 'marketing', 'update')) redirect(`${RECORDS}?denied=1`);
  const id = String(formData.get('id') ?? '');
  const to = String(formData.get('status') ?? '');
  if (!isReferralRecordStatus(to)) redirect(`${RECORDS}?error=input`);
  // redirect は tx を中断するため、tx 内は outcome を返し、確定後に redirect する。
  const outcome = await prisma.$transaction(async (tx) => {
    const rec = await tx.customerReferral.findFirst({ where: { id, tenantId: user.tenantId }, select: { status: true } });
    if (!rec) return 'notfound' as const;
    if (!canTransitionReferralRecord(rec.status, to)) return 'transition' as const;
    // expected status を CAS 条件へ。並行遷移（received→won と received→lost 等）は勝者1本だけ count===1、敗者は 0＝競合。
    const upd = await tx.customerReferral.updateMany({ where: { id, tenantId: user.tenantId, status: rec.status }, data: { status: to } });
    if (upd.count !== 1) return 'conflict' as const;
    await tx.auditLog.create({
      data: {
        tenantId: user.tenantId,
        actorId: user.userId,
        actorType: 'user',
        action: 'update',
        entityType: 'CustomerReferral',
        entityId: id,
        summary: `紹介の状況を更新: ${rec.status} → ${to}`,
      },
    });
    return 'updated' as const;
  });
  if (outcome === 'notfound') redirect(RECORDS);
  if (outcome !== 'updated') redirect(`${RECORDS}?error=transition`);
  revalidatePath(RECORDS);
  redirect(`${RECORDS}?updated=1`);
}
