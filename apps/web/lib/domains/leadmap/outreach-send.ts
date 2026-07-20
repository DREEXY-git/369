import { prisma } from '@/lib/db';
import { recordUsageEvent } from '@/lib/usage-events';
import { isSuppressed } from '@hokko/shared';
import { getEmailProvider, isExternalSendEnabled, type EmailProvider } from '@hokko/integrations';

// ============================================================================
// outreach_send 承認決定の production-shared core（Codex M1-b E-01）。
// Server Action（app/(app)/approvals/actions.ts）の本体をここへ切り出し、実 PostgreSQL 証拠 spec が
// fault hook 付きで直接呼べるようにする（next/cache 非依存で test loader から import 可能）。
// 従来は decideApprovalAction 内で「ApprovalRequest CAS を先に commit → その後に write-ahead
// OutreachSendLog / draft / lead を別 write で更新」だったため、途中 fault の retry が CAS no-op に
// なり `APPROVED + queued/未作成 log + PENDING_APPROVAL` で停止し得た。ここでは
//  (1) 決定（内部状態のみ）を単一 transaction で atomic 化（決定 CAS 勝者のみ OutreachApproval 同期＋監査）
//  (2) 送信副作用を **再開可能な状態機械** 化：ApprovalRequest 行ロックで write-ahead SendLog を1件だけ確保 →
//      queued→sending の CAS 勝者だけが provider を呼ぶ（exactly-once）→ 送信後 draft/lead 確定 → executed anchor
// にする。どの crash window から retry しても provider 送信は最大1回・最終的に整合へ収束する。
// fault hook は test-only（未指定で本番挙動と同一・lib/domains/operations/lease.ts と同様式）。
// ============================================================================

export interface OutreachSendHooks {
  /** provider 呼び出し回数を数える計装用 fake provider（未指定なら getEmailProvider()）。 */
  __emailProviderForTest?: EmailProvider;
  /** W1: write-ahead SendLog 確保後・provider 前に throw。 */
  __faultAfterSendLogForTest?: () => void;
  /** W2: provider 送信後・log status 更新前に throw。 */
  __faultAfterProviderForTest?: () => void;
  /** W3: log 確定後・draft/lead 更新前に throw。 */
  __faultBeforeDraftLeadForTest?: () => void;
}

export type OutreachDecisionResult = { outcome: 'sent' | 'suppressed' | 'rejected' | 'noop' };

/**
 * outreach_send 承認決定の本体。decideApprovalAction の early branch と証拠 spec の双方から呼ばれる。
 * 並行2決定・crash retry いずれでも decided winner は1本（決定監査1・OutreachApproval 1）、
 * provider 送信・SendLog・UsageEvent は各1へ収束する。
 */
export async function decideOutreachApprovalCore(
  ctx: {
    tenantId: string;
    userId?: string | null;
    approvalId: string;
    decision: 'approve' | 'reject';
    note: string;
    approvalTitle?: string;
  },
  opts: OutreachSendHooks = {},
): Promise<OutreachDecisionResult> {
  const { tenantId, userId, approvalId, decision, note, approvalTitle } = ctx;
  const status = decision === 'approve' ? 'APPROVED' : 'REJECTED';

  // (1) 決定（内部状態のみ・外部作用なし）を単一 transaction で atomic 化。
  //     決定 CAS（PENDING→status）勝者だけが OutreachApproval 同期・(reject時)draft REJECTED・決定監査を書く。
  const t1 = await prisma.$transaction(async (tx) => {
    const decided = await tx.approvalRequest.updateMany({
      where: { id: approvalId, tenantId, status: 'PENDING' },
      data: { status, decidedById: userId ?? null, decidedAt: new Date(), decisionNote: note },
    });
    const appr = await tx.approvalRequest.findFirst({
      where: { id: approvalId, tenantId },
      select: { status: true, entityId: true },
    });
    if (!appr?.entityId) return { winner: false, effective: appr?.status ?? null, entityId: null as string | null };
    if (decided.count === 1) {
      await tx.outreachApproval.updateMany({
        where: { draftId: appr.entityId, tenantId, status: 'PENDING' },
        data: { status, approverId: userId ?? null, decidedAt: new Date(), note },
      });
      if (status === 'REJECTED') {
        await tx.outreachDraft.updateMany({
          where: { id: appr.entityId, tenantId, status: 'PENDING_APPROVAL' },
          data: { status: 'REJECTED' },
        });
      }
      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: userId ?? null,
          actorType: 'user',
          action: status === 'APPROVED' ? 'approve' : 'reject',
          entityType: 'ApprovalRequest',
          entityId: approvalId,
          summary: `${approvalTitle ?? '営業メール送信承認'} を${status === 'APPROVED' ? '承認' : '却下'}`,
        },
      });
    }
    return { winner: decided.count === 1, effective: appr.status, entityId: appr.entityId };
  });

  if (!t1.entityId) return { outcome: 'noop' };
  if (t1.effective === 'REJECTED') return { outcome: 'rejected' };
  if (t1.effective !== 'APPROVED') return { outcome: 'noop' };

  // (2) APPROVED: 再開可能な送信状態機械（外部作用は transaction 外）。
  return runOutreachSendStateMachine({ tenantId, userId, approvalId, draftId: t1.entityId }, opts);
}

async function runOutreachSendStateMachine(
  args: { tenantId: string; userId?: string | null; approvalId: string; draftId: string },
  opts: OutreachSendHooks,
): Promise<OutreachDecisionResult> {
  const { tenantId, userId, approvalId, draftId } = args;
  const draft = await prisma.outreachDraft.findFirst({ where: { id: draftId, tenantId }, include: { lead: true } });
  if (!draft) return { outcome: 'noop' };
  const target = draft.lead.email ?? `info@${draft.lead.placeId}.example.jp`;
  const suppression = await prisma.suppressionList.findMany({ where: { tenantId, channel: 'email' } });
  const blocked = isSuppressed(
    suppression.map((s) => ({ channel: s.channel, value: s.value })),
    'email',
    target,
  );

  // (2a) write-ahead: 送信ログを **1件だけ** 確保する。ApprovalRequest 行を FOR UPDATE で直列化し、
  //      並行実行・retry でも重複ログを作らない（provider 送信自体はこの tx の外・rollback 不能なため）。
  const sendLog = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "ApprovalRequest" WHERE id = ${approvalId} AND "tenantId" = ${tenantId} FOR UPDATE`;
    const existing = await tx.outreachSendLog.findFirst({ where: { tenantId, draftId }, orderBy: { createdAt: 'desc' } });
    if (existing) return existing;
    return tx.outreachSendLog.create({
      data: {
        tenantId,
        draftId,
        channel: 'email',
        toAddress: target,
        fromAddress: process.env.MAIL_FROM ?? 'sales@dreexy.example.jp',
        subject: draft.subject,
        body: draft.body,
        status: blocked ? 'suppressed' : 'queued',
        provider: 'log',
        approvedById: userId ?? null,
      },
    });
  });

  if (opts.__faultAfterSendLogForTest) opts.__faultAfterSendLogForTest(); // W1

  // (2b) provider 送信: queued→sending の CAS 勝者だけが provider を呼ぶ（exactly-once）。
  let logStatus: string = sendLog.status;
  if (!blocked) {
    if (sendLog.status === 'queued' && isExternalSendEnabled()) {
      // queued→sending を claim（並行/再実行の二重送信防止 barrier）。
      const claim = await prisma.outreachSendLog.updateMany({ where: { id: sendLog.id, status: 'queued' }, data: { status: 'sending' } });
      if (claim.count === 1) {
        const email = opts.__emailProviderForTest ?? getEmailProvider();
        const res = await email.send({ to: target, from: sendLog.fromAddress, subject: draft.subject, text: draft.body });
        if (opts.__faultAfterProviderForTest) opts.__faultAfterProviderForTest(); // W2
        logStatus = res.status;
        await prisma.outreachSendLog.update({ where: { id: sendLog.id }, data: { status: res.status, provider: res.provider } });
      } else {
        // 並行敗者: provider は勝者が呼ぶ。draft/lead も勝者が確定するのでここで終了（副作用なし）。
        return { outcome: 'noop' };
      }
    } else if (sendLog.status === 'queued') {
      // 外部送信無効: provider を呼ばず queued→logged（CAS で1回だけ）。
      const claim = await prisma.outreachSendLog.updateMany({ where: { id: sendLog.id, status: 'queued' }, data: { status: 'logged', provider: 'log' } });
      if (claim.count !== 1) return { outcome: 'noop' };
      logStatus = 'logged';
    } else if (sendLog.status === 'sending') {
      // W2 crash retry: 'sending' は provider 呼び出し直前で立てる → provider は呼び出し済み。
      // 二重送信せず sent へ確定する（durable 再開状態・retry で送信重複も永久停止も起きない）。
      await prisma.outreachSendLog.updateMany({ where: { id: sendLog.id, status: 'sending' }, data: { status: 'sent' } });
      logStatus = 'sent';
    } else {
      // terminal（logged/sent/failed）: provider 済み。
      logStatus = sendLog.status;
    }
  }

  if (opts.__faultBeforeDraftLeadForTest) opts.__faultBeforeDraftLeadForTest(); // W3

  // (2c) 非課金の利用量記録（idempotencyKey=SendLog id で二重計上防止）。suppressed/failed は emit しない。
  if (logStatus === 'logged' || logStatus === 'sent') {
    await recordUsageEvent({
      tenantId,
      actorId: userId ?? null,
      actorType: 'user',
      eventType: 'external_send.outreach',
      category: 'external_send',
      billing: 'usage_only',
      unit: 'count',
      quantity: 1,
      sourceType: 'OutreachSendLog',
      sourceId: sendLog.id,
      idempotencyKey: `usage:external_send.outreach:${sendLog.id}`,
      metadata: { channel: 'email', status: logStatus },
    });
  }

  // (2d) draft/lead 確定（idempotent・tenant scope）。
  await prisma.outreachDraft.updateMany({
    where: { id: draftId, tenantId, status: { in: ['PENDING_APPROVAL', 'APPROVED'] } },
    data: { status: blocked ? 'APPROVED' : 'SENT' },
  });
  await prisma.localBusinessLead.updateMany({
    where: { id: draft.leadId, tenantId },
    data: { stage: blocked ? 'EXCLUDED' : 'SENT' },
  });

  // (2e) 実行完了 anchor（Phase 1-7 の executionStatus を流用・二重実行の観測点）。
  await prisma.approvalRequest.updateMany({
    where: { id: approvalId, tenantId },
    data: { executionStatus: 'executed', executedAt: new Date(), executedById: userId ?? null },
  });

  return { outcome: blocked ? 'suppressed' : 'sent' };
}
