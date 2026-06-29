'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeAudit } from '@/lib/db';
import { recordUsageEvent } from '@/lib/usage-events';
import { isSuppressed } from '@hokko/shared';
import { getEmailProvider, isExternalSendEnabled } from '@hokko/integrations';

export async function decideApprovalAction(formData: FormData) {
  const user = await requireUser();
  const approvalId = String(formData.get('approvalId') ?? '');
  const decision = String(formData.get('decision') ?? '');
  const note = String(formData.get('note') ?? '');

  if (!hasPermission(user, 'approval', 'approve')) redirect('/approvals?denied=1');

  const approval = await prisma.approvalRequest.findFirst({
    where: { id: approvalId, tenantId: user.tenantId, status: 'PENDING' },
  });
  if (!approval) redirect('/approvals');

  const status = decision === 'approve' ? 'APPROVED' : 'REJECTED';
  await prisma.approvalRequest.update({
    where: { id: approvalId },
    data: { status, decidedById: user.userId, decidedAt: new Date(), decisionNote: note },
  });

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
