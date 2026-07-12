'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeAudit } from '@/lib/db';
import { recordUsageEvent } from '@/lib/usage-events';
import { isSuppressed } from '@hokko/shared';
import { getEmailProvider, isExternalSendEnabled } from '@hokko/integrations';
import { decideContentReviewCore, type BridgeDb } from '@/lib/content-review-bridge';

export async function decideApprovalAction(formData: FormData) {
  const user = await requireUser();
  const approvalId = String(formData.get('approvalId') ?? '');
  const decision = String(formData.get('decision') ?? '');
  const note = String(formData.get('note') ?? '');

  // v6.9（Codex r3565885990）: 承認の決定は人間のみ。AI ロールは approval:approve が誤設定で
  // 付与されていても action 境界で一律拒否する（不変条件・RBAC とは独立の二重防御）。
  if (!hasPermission(user, 'approval', 'approve') || user.isAi) redirect('/approvals?denied=1');

  const approval = await prisma.approvalRequest.findFirst({
    where: { id: approvalId, tenantId: user.tenantId, status: 'PENDING' },
  });
  if (!approval) redirect('/approvals');

  // v6.9（Codex r3565885992）: content_review は「ApprovalRequest CAS → ContentAsset 更新 count===1 →
  // 監査」を単一 transaction で確定する（承認だけ確定して対象が pending のまま残る不整合を禁止）。
  // 外部作用（送信/公開/CMS/実LLM/課金）はこの分岐に存在しない（review-only）。
  if (approval.type === 'content_review') {
    let r;
    try {
      r = await decideContentReviewCore(prisma as unknown as BridgeDb, {
        tenantId: user.tenantId,
        approvalId,
        entityId: approval.entityId,
        decision: decision === 'approve' ? 'approve' : 'reject',
        decidedById: user.userId,
        note,
        approvalTitle: approval.title,
        actorIsAi: user.isAi,
      });
    } catch {
      // 対象消失・別 tenant・状態不整合 → 全体 rollback 済み（PENDING のまま）。理由を UI へ返す。
      revalidatePath('/approvals');
      redirect('/approvals?error=content_transition');
    }
    revalidatePath('/approvals');
    revalidatePath('/marketing/content');
    if (r.outcome === 'forbidden') redirect('/approvals?denied=1');
    redirect('/approvals'); // decided / already（冪等）とも一覧へ
  }

  const status = decision === 'approve' ? 'APPROVED' : 'REJECTED';
  // 決定は原子的 CAS（PENDING のときのみ→決定）。二重 submit / 同時決定は count===0 で弾き、
  // 副作用（送信・状態遷移）は CAS の勝者だけが実行する＝1回だけ反映（冪等）。
  // 外部送信を伴う type（outreach_send 等）の副作用は DB transaction に入れない（メール送信は
  // rollback 不能な外部作用のため・従来どおり CAS 勝者が transaction 外で実行）。
  const decided = await prisma.approvalRequest.updateMany({
    where: { id: approvalId, tenantId: user.tenantId, status: 'PENDING' },
    data: { status, decidedById: user.userId, decidedAt: new Date(), decisionNote: note },
  });
  if (decided.count === 0) redirect('/approvals'); // 既に決定済み（別 submit が反映済み）。

  // 承認対象が営業メール送信の場合の処理（送信ゲート）
  if (approval.type === 'outreach_send' && approval.entityId) {
    const draft = await prisma.outreachDraft.findFirst({
      where: { id: approval.entityId, tenantId: user.tenantId },
      include: { lead: true },
    });
    if (draft) {
      await prisma.outreachApproval.updateMany({
        where: { draftId: draft.id, status: 'PENDING' },
        data: { status, approverId: user.userId, decidedAt: new Date(), note },
      });

      if (status === 'APPROVED') {
        const target = draft.lead.email ?? `info@${draft.lead.placeId}.example.jp`;
        const suppression = await prisma.suppressionList.findMany({
          where: { tenantId: user.tenantId, channel: 'email' },
        });
        const blocked = isSuppressed(
          suppression.map((s) => ({ channel: s.channel, value: s.value })),
          'email',
          target,
        );

        let sendStatus: string = 'logged';
        let provider = 'log';
        if (blocked) {
          sendStatus = 'suppressed';
        } else if (isExternalSendEnabled()) {
          const email = getEmailProvider();
          const res = await email.send({
            to: target,
            from: process.env.MAIL_FROM ?? 'sales@dreexy.example.jp',
            subject: draft.subject,
            text: draft.body,
          });
          sendStatus = res.status;
          provider = res.provider;
        }

        const outreachLog = await prisma.outreachSendLog.create({
          data: {
            tenantId: user.tenantId,
            draftId: draft.id,
            channel: 'email',
            toAddress: target,
            fromAddress: process.env.MAIL_FROM ?? 'sales@dreexy.example.jp',
            subject: draft.subject,
            body: draft.body,
            status: sendStatus,
            provider,
            approvedById: user.userId,
          },
        });
        // Phase 1-29: 非課金の利用量記録（outreach 送信が logged/sent として確定した事実のみ）。課金ではない・billing=usage_only 固定。
        // suppressed / failed は emit しない（抑止・失敗はユーザーに課金しない＝never_billable 相当）。
        // metadata は非PIIの channel/status のみ（toAddress/subject/body/draftId/leadId/顧客情報/金額は入れない）。
        // 記録失敗は承認・送信の主処理を壊さない（recordUsageEvent は例外を投げず ok:false を返すだけ）。
        if (sendStatus === 'logged' || sendStatus === 'sent') {
          await recordUsageEvent({
            tenantId: user.tenantId,
            actorId: user.userId,
            actorType: 'user',
            eventType: 'external_send.outreach',
            category: 'external_send',
            billing: 'usage_only',
            unit: 'count',
            quantity: 1,
            sourceType: 'OutreachSendLog',
            sourceId: outreachLog.id,
            idempotencyKey: `usage:external_send.outreach:${outreachLog.id}`,
            metadata: { channel: 'email', status: sendStatus },
          });
        }
        await prisma.outreachDraft.update({
          where: { id: draft.id },
          data: { status: sendStatus === 'suppressed' ? 'APPROVED' : 'SENT' },
        });
        await prisma.localBusinessLead.update({
          where: { id: draft.leadId },
          data: { stage: sendStatus === 'suppressed' ? 'EXCLUDED' : 'SENT' },
        });
      } else {
        await prisma.outreachDraft.update({ where: { id: draft.id }, data: { status: 'REJECTED' } });
      }
    }
  }

  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: status === 'APPROVED' ? 'approve' : 'reject',
    entityType: 'ApprovalRequest',
    entityId: approvalId,
    summary: `${approval.title} を${status === 'APPROVED' ? '承認' : '却下'}`,
  });

  revalidatePath('/approvals');
  redirect('/approvals');
}
