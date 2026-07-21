import { prisma } from '@/lib/db';

// ============================================================================
// LeadMap 営業メール状態機械の production-shared core（Codex M1-b E-04）。
// Server Action（app/(app)/leadmap/actions.ts）の本体をここへ切り出し、実 PostgreSQL 証拠 spec が
// fault hook 付きで直接呼べるようにする（lib/domains/operations/lease.ts の LeaseTestHooks /
// __faultAfterLineForTest と同じ様式・next/cache 非依存で test loader から import 可能）。
// hook 未指定時は本番挙動と同一。
// ============================================================================

/** requestOutreachApprovalCore の crash window 注入（test-only・未指定で本番と同一）。 */
export interface OutreachRequestHooks {
  __faultAfterClaimForTest?: () => void;
  __faultAfterOutreachApprovalForTest?: () => void;
  __faultAfterApprovalRequestForTest?: () => void;
  __faultAfterLeadForTest?: () => void;
  __faultAfterAuditForTest?: () => void;
}

export type OutreachRequestResult =
  | { outcome: 'requested' }
  | { outcome: 'already' }
  | { outcome: 'notfound' };

/**
 * 送信承認の申請（E-04）。DRAFT→PENDING_APPROVAL の CAS claim を barrier に、5 書き込み
 * （draft 状態・OutreachApproval・ApprovalRequest・lead stage・監査）を単一 transaction で確定。
 * 並行申請は DRAFT を claim できた1本だけが承認セットを作り、敗者は書き込みゼロで already。
 * 途中 fault は 5 表すべて rollback（孤児 PENDING 申請なし・retry でちょうど1組へ収束）。
 */
export async function requestOutreachApprovalCore(
  ctx: { tenantId: string; userId?: string | null; draftId: string },
  opts: OutreachRequestHooks = {},
): Promise<OutreachRequestResult> {
  const { tenantId, userId, draftId } = ctx;
  return prisma.$transaction(async (tx) => {
    // ★ DRAFT→PENDING_APPROVAL の CAS claim。並行申請の勝者を1本に絞る barrier（updateMany が行ロック）。
    const claim = await tx.outreachDraft.updateMany({
      where: { id: draftId, tenantId, status: 'DRAFT' },
      data: { status: 'PENDING_APPROVAL' },
    });
    if (claim.count !== 1) {
      // 敗者 / 非 DRAFT: 書き込みゼロ。notfound と already を区別。
      const cur = await tx.outreachDraft.findFirst({ where: { id: draftId, tenantId }, select: { id: true } });
      return cur ? { outcome: 'already' as const } : { outcome: 'notfound' as const };
    }
    if (opts.__faultAfterClaimForTest) opts.__faultAfterClaimForTest();
    const draft = await tx.outreachDraft.findFirst({ where: { id: draftId, tenantId }, include: { lead: true } });
    if (!draft) throw new Error('outreach draft vanished after claim');
    await tx.outreachApproval.create({ data: { tenantId, draftId, status: 'PENDING' } });
    if (opts.__faultAfterOutreachApprovalForTest) opts.__faultAfterOutreachApprovalForTest();
    await tx.approvalRequest.create({
      data: {
        tenantId,
        type: 'outreach_send',
        title: `営業メール送信承認: ${draft.lead.name}`,
        summary: draft.subject,
        entityType: 'OutreachDraft',
        entityId: draftId,
        requestedById: userId ?? null,
        assigneeRole: 'DEPARTMENT_MANAGER',
        riskLevel: 'MEDIUM',
        status: 'PENDING',
      },
    });
    if (opts.__faultAfterApprovalRequestForTest) opts.__faultAfterApprovalRequestForTest();
    await tx.localBusinessLead.update({ where: { id: draft.leadId }, data: { stage: 'PENDING_APPROVAL' } });
    if (opts.__faultAfterLeadForTest) opts.__faultAfterLeadForTest();
    await tx.auditLog.create({
      data: { tenantId, actorId: userId ?? null, actorType: 'user', action: 'create', entityType: 'ApprovalRequest', entityId: draftId, summary: `営業メール送信の承認を申請: ${draft.lead.name}` },
    });
    if (opts.__faultAfterAuditForTest) opts.__faultAfterAuditForTest();
    return { outcome: 'requested' as const };
  });
}

/** updateOutreachDraftCore の crash window 注入。 */
export interface OutreachEditHooks {
  __faultAfterInvalidateRequestForTest?: () => void;
  __faultAfterInvalidateApprovalForTest?: () => void;
}

export type OutreachEditResult =
  | { outcome: 'edited'; invalidated: boolean }
  | { outcome: 'conflict' }
  | { outcome: 'sent' }
  | { outcome: 'notfound' };

/**
 * 下書き編集（E-04・承認送信との競合安全化）。単一 transaction 内で draft 状態を再読取し、
 * PENDING_APPROVAL なら紐づく ApprovalRequest PENDING の CAS を decideApprovalAction の決定 CAS と競わせる。
 *  - 編集が CAS を勝ち取れば承認種2つ（ApprovalRequest / OutreachApproval）を REJECTED 化し draft→DRAFT＋本文差替。
 *  - 決定側が先に APPROVED を取得済み（count0）なら本文を書き換えず conflict で fail-closed
 *    （送信 payload は承認時 snapshot に一致し「承認内容≠送信内容」を作らない）。
 */
export async function updateOutreachDraftCore(
  ctx: { tenantId: string; userId?: string | null; draftId: string; subject: string; body: string },
  opts: OutreachEditHooks = {},
): Promise<OutreachEditResult> {
  const { tenantId, userId, draftId, subject, body } = ctx;
  return prisma.$transaction(async (tx) => {
    const draft = await tx.outreachDraft.findFirst({ where: { id: draftId, tenantId }, select: { status: true } });
    if (!draft) return { outcome: 'notfound' as const };
    if (draft.status === 'SENT') return { outcome: 'sent' as const };
    if (draft.status === 'PENDING_APPROVAL') {
      // 決定 CAS と同じ ApprovalRequest PENDING 行を奪い合う。勝てば無効化、負ければ conflict。
      const invalidated = await tx.approvalRequest.updateMany({
        where: { tenantId, type: 'outreach_send', entityType: 'OutreachDraft', entityId: draftId, status: 'PENDING' },
        data: { status: 'REJECTED' },
      });
      if (invalidated.count === 0) {
        // 決定側が先に APPROVED 済み（送信中/送信済み）。本文を書き換えず fail-closed。
        return { outcome: 'conflict' as const };
      }
      if (opts.__faultAfterInvalidateRequestForTest) opts.__faultAfterInvalidateRequestForTest();
      await tx.outreachApproval.updateMany({
        where: { draftId, tenantId, status: 'PENDING' },
        data: { status: 'REJECTED', note: '下書き編集により無効化（再申請が必要）' },
      });
      if (opts.__faultAfterInvalidateApprovalForTest) opts.__faultAfterInvalidateApprovalForTest();
      await tx.outreachDraft.update({ where: { id: draftId }, data: { subject, body, status: 'DRAFT' } });
      await tx.auditLog.create({
        data: { tenantId, actorId: userId ?? null, actorType: 'user', action: 'update', entityType: 'OutreachDraft', entityId: draftId, summary: '営業メール下書きを人手で編集（承認申請を無効化・再申請要）' },
      });
      return { outcome: 'edited' as const, invalidated: true };
    }
    // DRAFT / APPROVED(=suppressed 済) / REJECTED / FAILED: 保留承認なし。素の編集（→DRAFT）。
    await tx.outreachDraft.update({ where: { id: draftId }, data: { subject, body, status: 'DRAFT' } });
    await tx.auditLog.create({
      data: { tenantId, actorId: userId ?? null, actorType: 'user', action: 'update', entityType: 'OutreachDraft', entityId: draftId, summary: '営業メール下書きを人手で編集' },
    });
    return { outcome: 'edited' as const, invalidated: false };
  });
}

/** applyUnsubscribeCore の crash window 注入。 */
export interface UnsubscribeHooks {
  __faultAfterSuppressionForTest?: () => void;
}

/**
 * 返信の配信停止希望を確定（E-04）。SuppressionList upsert ＋ lead stage を単一 transaction。
 * 再送は upsert で冪等（SuppressionList 1・lead UNSUBSCRIBED）。lead 更新 fault では upsert も rollback（fail-closed・
 * 抑止記録に失敗したまま stage だけ進めて送信ゲートをすり抜けさせない）。tenant 別の同一 email は独立。
 */
export async function applyUnsubscribeCore(
  ctx: { tenantId: string; leadId: string; target: string },
  opts: UnsubscribeHooks = {},
): Promise<void> {
  const { tenantId, leadId, target } = ctx;
  await prisma.$transaction(async (tx) => {
    await tx.suppressionList.upsert({
      where: { tenantId_channel_value: { tenantId, channel: 'email', value: target } },
      create: { tenantId, channel: 'email', value: target, reason: '返信で配信停止希望' },
      update: {},
    });
    if (opts.__faultAfterSuppressionForTest) opts.__faultAfterSuppressionForTest();
    await tx.localBusinessLead.update({ where: { id: leadId }, data: { stage: 'UNSUBSCRIBED' } });
  });
}
