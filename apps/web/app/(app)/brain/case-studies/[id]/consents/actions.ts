'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isHumanUser } from '@hokko/shared';
import { validateCaseStudyConsentInput } from '@hokko/shared';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeAudit } from '@/lib/db';

// CaseStudyConsent（許諾台帳）: create / revoke の2操作のみ（doc86 §4/§7 準拠）。
// - 台帳の登録・取り消しは人間のみ: AIロールは権限にかかわらずここで一律拒否（rbac.ts 無変更・2-C-4 と同じ型）。
// - update（自由編集）は作らない。誤登録は revoke（取り消し）→ 正しい行を再登録の運用（証跡改変を防ぐ）。
// - 物理削除は実装しない（取り消しでも行は残す＝取り消し履歴も台帳の一部・追記主義）。
// - evidence には証跡の所在説明だけを書く（原本本文・メール本文・PII を貼らない・UI ガイドで明記）。
// - expiresAt は必須（期限なし許諾は認めない・doc84 §0）。expiresAt <= grantedAt は拒否（shared の純粋関数・単体テストあり）。
// - customerId は入力させない: 対象 CaseStudy.customerId があれば自動反映、無ければ null（Customer picker は作らない・PII 非複製）。
// - writeAudit には evidence / note の本文・PII を入れない（用途・期限などの最小情報のみ）。
// - この台帳は AI 参照条件に影響しない（company-brain-reference 無変更・CaseStudyConsent は AI 文脈へ注入しない）。

function parseDate(formData: FormData, key: string): Date | null {
  const raw = String(formData.get(key) ?? '').trim();
  if (!raw) return null;
  const d = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createCaseStudyConsentAction(formData: FormData) {
  const user = await requireUser();
  const caseStudyId = String(formData.get('caseStudyId') ?? '');
  if (!isHumanUser(user)) redirect('/brain/case-studies?denied=1');
  if (!hasPermission(user, 'knowledge', 'update')) redirect('/brain/case-studies?denied=1');

  const caseStudy = await prisma.caseStudy.findFirst({
    where: { id: caseStudyId, tenantId: user.tenantId, archivedAt: null },
    select: { id: true, title: true, customerId: true },
  });
  if (!caseStudy) redirect('/brain/case-studies');

  const purposes = formData.getAll('purpose').map((p) => String(p));
  const evidence = String(formData.get('evidence') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim();
  const grantedAt = parseDate(formData, 'grantedAt');
  const expiresAt = parseDate(formData, 'expiresAt');

  if (evidence.length > 1000) redirect(`/brain/case-studies/${caseStudy.id}/consents/new?error=evidence`);
  if (note.length > 500) redirect(`/brain/case-studies/${caseStudy.id}/consents/new?error=note`);

  const parsed = validateCaseStudyConsentInput({ purposes, evidence, grantedAt, expiresAt });
  if (!parsed.ok) redirect(`/brain/case-studies/${caseStudy.id}/consents/new?error=${parsed.error}`);

  const created = await prisma.caseStudyConsent.create({
    data: {
      tenantId: user.tenantId,
      caseStudyId: caseStudy.id,
      customerId: caseStudy.customerId,
      status: 'granted',
      purpose: purposes,
      evidence,
      grantedAt: grantedAt as Date,
      expiresAt: expiresAt as Date,
      note,
      grantedById: user.userId,
    },
  });
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: 'create',
    entityType: 'CaseStudyConsent',
    entityId: created.id,
    summary: `顧客事例「${caseStudy.title}」の許諾を登録（用途: ${purposes.join('/')}・期限: ${created.expiresAt.toISOString().slice(0, 10)}）`,
  });
  revalidatePath(`/brain/case-studies/${caseStudy.id}/consents`);
  redirect(`/brain/case-studies/${caseStudy.id}/consents`);
}

export async function revokeCaseStudyConsentAction(formData: FormData) {
  const user = await requireUser();
  const consentId = String(formData.get('consentId') ?? '');
  if (!isHumanUser(user)) redirect('/brain/case-studies?denied=1');
  if (!hasPermission(user, 'knowledge', 'update')) redirect('/brain/case-studies?denied=1');

  const existing = await prisma.caseStudyConsent.findFirst({
    where: { id: consentId, tenantId: user.tenantId, status: { not: 'revoked' }, revokedAt: null },
    select: { id: true, caseStudyId: true, purpose: true },
  });
  if (!existing) redirect('/brain/case-studies');

  const revokedAt = new Date();
  await prisma.caseStudyConsent.update({
    where: { id: existing.id },
    data: { status: 'revoked', revokedAt },
  });
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: 'update',
    entityType: 'CaseStudyConsent',
    entityId: existing.id,
    summary: `顧客事例の許諾を取り消し（revoke・用途: ${existing.purpose.join('/')}・取り消し日: ${revokedAt.toISOString().slice(0, 10)}・行は削除しない）`,
  });
  revalidatePath(`/brain/case-studies/${existing.caseStudyId}/consents`);
  redirect(`/brain/case-studies/${existing.caseStudyId}/consents`);
}
