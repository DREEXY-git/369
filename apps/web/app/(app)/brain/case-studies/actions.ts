'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isHumanUser } from '@hokko/shared';
import { validateCaseStudyConsent } from '@hokko/shared';
import { validateCaseStudyConsentReconciliation, resolveCaseStudyConsentSuppressed } from '@hokko/shared';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeAudit } from '@/lib/db';

// Company Brain（顧客事例）Phase 2-C-4: create / update / archive の3操作のみ。
// 物理削除は実装しない（archivedAt によるソフトアーカイブのみ）。
// externalAiAllowed はこの画面からは変更できない（create は false 固定・update では触らない）。
// publishStatus は 'private' 固定（公開機能を作らない。create で固定・update では触らない）。
// 顧客事例の変更（作成含む）は人間のみ: AIロール（AI_AGENT/AI_ASSISTANT）は権限にかかわらず
// ここで一律拒否する（rbac.ts は無変更・2-A-3b-1 安全補正と同じ型）。
// label は NORMAL / INTERNAL のみ扱う。高機密ラベルは扱わない。
// 匿名化（anonymized）を外せるのは consentStatus='granted'（許諾あり）のときだけ
// （@hokko/shared validateCaseStudyConsent・単体テストあり・doc71 §6-4）。
// 保存条件接続（doc92・CONNECT_ONLY）: 匿名化を外す保存は、申告値（granted）に加えて
// 許諾台帳（CaseStudyConsent）の有効な行（用途 internal_view・期限内・取り消しなし）との
// 突合（validateCaseStudyConsentReconciliation）を必須にする。解禁ではない（AI参照・公開には使われない）。
// 新規作成時は台帳行がまだ存在し得ないため anonymized=false を一律拒否し、
// 「匿名化ありで作成 → 許諾台帳に登録 → 編集で匿名化を外す」運用に固定する（doc92 §5-1）。
// customerId / consentRecordId の参照選択 UI は今回未実装（ConsentRecord 連携は後続の別承認）。
// 入力ガイド（運用）: 顧客名・取引先名・成果数値・顧客の声は許諾なしに書かない。
// 機械的な禁止ワード検査は誤判定が多いため行わず、UI のガイド表示と運用で担保する（doc51 §4-3 と同方針）。

const ALLOWED_LABELS = ['NORMAL', 'INTERNAL'] as const;

// isHumanUser は @hokko/shared の共通判定（Phase X-05-2 で共通化・単体テストあり）。

type CaseStudyInput = {
  title: string;
  body: string;
  industry: string | null;
  challenge: string | null;
  solution: string | null;
  outcome: string | null;
  consentStatus: string;
  anonymized: boolean;
  sourceNote: string | null;
  label: (typeof ALLOWED_LABELS)[number];
  tags: string[];
};

function optionalText(formData: FormData, key: string, maxLength: number): { ok: boolean; value: string | null } {
  const raw = String(formData.get(key) ?? '').trim();
  if (!raw) return { ok: true, value: null };
  if (raw.length > maxLength) return { ok: false, value: null };
  return { ok: true, value: raw };
}

function parseCaseStudyForm(formData: FormData): { ok: true; value: CaseStudyInput } | { ok: false; error: string } {
  const title = String(formData.get('title') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const label = String(formData.get('label') ?? '');
  const consentStatus = String(formData.get('consentStatus') ?? '');
  const anonymized = formData.get('anonymized') === 'on';
  const tagsRaw = String(formData.get('tags') ?? '');

  if (!title || title.length > 120) return { ok: false, error: 'title' };
  if (!body || body.length > 5000) return { ok: false, error: 'body' };
  if (!(ALLOWED_LABELS as readonly string[]).includes(label)) return { ok: false, error: 'label' };

  // 許諾・匿名化の安全判定: 許諾（granted）なしに匿名化は外せない（shared の純粋関数・単体テストあり）。
  const consent = validateCaseStudyConsent({ consentStatus, anonymized });
  if (!consent.ok) return { ok: false, error: consent.error };

  const industry = optionalText(formData, 'industry', 80);
  if (!industry.ok) return { ok: false, error: 'industry' };
  const challenge = optionalText(formData, 'challenge', 500);
  if (!challenge.ok) return { ok: false, error: 'challenge' };
  const solution = optionalText(formData, 'solution', 500);
  if (!solution.ok) return { ok: false, error: 'solution' };
  const outcome = optionalText(formData, 'outcome', 500);
  if (!outcome.ok) return { ok: false, error: 'outcome' };
  const sourceNote = optionalText(formData, 'sourceNote', 200);
  if (!sourceNote.ok) return { ok: false, error: 'sourceNote' };

  const tags = tagsRaw
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  if (tags.length > 10 || tags.some((t) => t.length > 20)) return { ok: false, error: 'tags' };

  return {
    ok: true,
    value: {
      title,
      body,
      industry: industry.value,
      challenge: challenge.value,
      solution: solution.value,
      outcome: outcome.value,
      consentStatus,
      anonymized,
      sourceNote: sourceNote.value,
      label: label as CaseStudyInput['label'],
      tags,
    },
  };
}

export async function createCaseStudyAction(formData: FormData) {
  const user = await requireUser();
  if (!isHumanUser(user)) redirect('/brain/case-studies?denied=1');
  if (!hasPermission(user, 'knowledge', 'create')) redirect('/brain/case-studies?denied=1');

  const parsed = parseCaseStudyForm(formData);
  if (!parsed.ok) redirect(`/brain/case-studies/new?error=${parsed.error}`);

  // 新規作成では CaseStudy ID が無く許諾台帳の行を突合できないため、匿名化オフは拒否（doc92 §5-1）。
  if (!parsed.value.anonymized) redirect('/brain/case-studies/new?error=ledger_createNotAllowed');

  const created = await prisma.caseStudy.create({
    data: {
      tenantId: user.tenantId,
      title: parsed.value.title,
      body: parsed.value.body,
      industry: parsed.value.industry,
      challenge: parsed.value.challenge,
      solution: parsed.value.solution,
      outcome: parsed.value.outcome,
      anonymized: parsed.value.anonymized,
      consentStatus: parsed.value.consentStatus,
      publishStatus: 'private',
      tags: parsed.value.tags,
      label: parsed.value.label,
      externalAiAllowed: false,
      sourceType: 'manual',
      sourceNote: parsed.value.sourceNote,
      createdById: user.userId,
      updatedById: user.userId,
    },
  });
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: 'create',
    entityType: 'CaseStudy',
    entityId: created.id,
    summary: `顧客事例「${created.title}」を作成（非公開・匿名化=${created.anonymized ? 'あり' : 'なし（許諾あり）'}）`,
  });
  revalidatePath('/brain/case-studies');
  redirect('/brain/case-studies');
}

export async function updateCaseStudyAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get('id') ?? '');
  if (!isHumanUser(user)) redirect('/brain/case-studies?denied=1');
  if (!hasPermission(user, 'knowledge', 'update')) redirect('/brain/case-studies?denied=1');

  const existing = await prisma.caseStudy.findFirst({
    where: { id, tenantId: user.tenantId, archivedAt: null },
  });
  if (!existing) redirect('/brain/case-studies');

  const parsed = parseCaseStudyForm(formData);
  if (!parsed.ok) redirect(`/brain/case-studies/${id}/edit?error=${parsed.error}`);

  // 保存条件接続（doc92・CONNECT_ONLY）: 匿名化を外す保存だけ、許諾台帳の有効な行との突合を必須化。
  // suppressed は actions 層で Customer / SuppressionList を tenantId スコープで読んで解決する
  // （CALLER_RESOLVES_SUPPRESSED_BOOLEAN・doc92 §0）。純粋関数は DB を読まない。
  if (!parsed.value.anonymized) {
    const consents = await prisma.caseStudyConsent.findMany({
      where: { tenantId: user.tenantId, caseStudyId: existing.id },
    });
    let suppressed = false;
    if (existing.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: existing.customerId, tenantId: user.tenantId },
        select: { email: true, phone: true },
      });
      const suppressionEntries = await prisma.suppressionList.findMany({
        where: { tenantId: user.tenantId },
        select: { channel: true, value: true },
      });
      suppressed = resolveCaseStudyConsentSuppressed({
        customerId: existing.customerId,
        customer,
        suppressionEntries,
      });
    }
    const reconciled = validateCaseStudyConsentReconciliation({
      caseStudy: {
        id: existing.id,
        tenantId: user.tenantId,
        consentStatus: parsed.value.consentStatus,
        archivedAt: existing.archivedAt,
        publishStatus: existing.publishStatus,
        label: parsed.value.label,
      },
      consents,
      targetPurpose: 'internal_view',
      now: new Date(),
      suppressed,
    });
    // 拒否理由は reason コードとして query に載せる（REDIRECT_WITH_REASON_CODE・doc92 §0）。
    // 画面側の文言は PII・証跡本文・抑止詳細を出さない一般化した日本語にする。
    if (!reconciled.ok) redirect(`/brain/case-studies/${id}/edit?error=ledger_${reconciled.reason}`);
  }

  await prisma.caseStudy.update({
    where: { id: existing.id },
    data: {
      title: parsed.value.title,
      body: parsed.value.body,
      industry: parsed.value.industry,
      challenge: parsed.value.challenge,
      solution: parsed.value.solution,
      outcome: parsed.value.outcome,
      anonymized: parsed.value.anonymized,
      consentStatus: parsed.value.consentStatus,
      tags: parsed.value.tags,
      label: parsed.value.label,
      sourceNote: parsed.value.sourceNote,
      updatedById: user.userId,
    },
  });
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: 'update',
    entityType: 'CaseStudy',
    entityId: existing.id,
    summary: `顧客事例「${parsed.value.title}」を編集`,
  });
  revalidatePath('/brain/case-studies');
  redirect('/brain/case-studies');
}

export async function archiveCaseStudyAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get('id') ?? '');
  if (!isHumanUser(user)) redirect('/brain/case-studies?denied=1');
  if (!hasPermission(user, 'knowledge', 'update')) redirect('/brain/case-studies?denied=1');

  const existing = await prisma.caseStudy.findFirst({
    where: { id, tenantId: user.tenantId, archivedAt: null },
  });
  if (!existing) redirect('/brain/case-studies');

  await prisma.caseStudy.update({
    where: { id: existing.id },
    data: { archivedAt: new Date(), updatedById: user.userId },
  });
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: 'update',
    entityType: 'CaseStudy',
    entityId: existing.id,
    summary: `顧客事例「${existing.title}」をアーカイブ`,
  });
  revalidatePath('/brain/case-studies');
  redirect('/brain/case-studies');
}
