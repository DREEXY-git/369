'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeAudit } from '@/lib/db';
import { recordUsageEvent } from '@/lib/usage-events';
import { isSuppressed, isHumanUser } from '@hokko/shared';
import { getEmailProvider, isExternalSendEnabled, type EmailProvider } from '@hokko/integrations';
import { decideContentReviewCore, type BridgeDb } from '@/lib/content-review-bridge';
import { decideSuggestionReviewCore, type SuggestionBridgeDb } from '@/lib/suggestion-review-bridge';
import { decideQuoteIssueCore, type QuoteIssueBridgeDb } from '@/lib/quote-issue-bridge';
import { decideInvoiceVoidCore, type InvoiceVoidBridgeDb } from '@/lib/invoice-void-bridge';
import { decidePurchaseOrderIssueCore, type PoIssueBridgeDb } from '@/lib/purchase-order-issue-bridge';
import { decideAiGateCore, type GateBridgeDb } from '@/lib/ai-gate-bridge';

// Phase 4 安全実行 Bridge（v7.0 Lane P4・roadmap82）: AI 承認ゲートへの人間の approve/reject。
// approve = run を内部処理のみで再開・完了（外部作用なし）。reject = run 終了（再開不可）。
// gate CAS → run 遷移 count===1 → ApprovalRequest 1:1 決定レコード → 監査 を単一 transaction で確定。
export async function decideAiGateAction(formData: FormData) {
  const user = await requireUser();
  // 判断は人間のみ（AI は approval:approve が誤設定で付与されていても action 境界で拒否）。
  if (!hasPermission(user, 'approval', 'approve') || user.isAi) redirect('/approvals?denied=1');

  const gateId = String(formData.get('gateId') ?? '').trim();
  const decision = String(formData.get('decision') ?? '');
  const note = String(formData.get('note') ?? '');
  // v7.0 R2（Codex P2-2）: stale gate（24h 超・fail-closed）の承認は人間の明示再確認 checkbox が必須。
  const confirmStale = String(formData.get('confirmStale') ?? '') === '1';
  if (!/^[a-z0-9]{20,40}$/i.test(gateId) || (decision !== 'approve' && decision !== 'reject')) {
    redirect('/approvals?error=input');
  }

  let r;
  try {
    r = await decideAiGateCore(prisma as unknown as GateBridgeDb, {
      tenantId: user.tenantId,
      gateId,
      decision: decision === 'approve' ? 'approve' : 'reject',
      decidedById: user.userId,
      note,
      actorIsAi: user.isAi,
      confirmStale,
    });
  } catch {
    // run 消失/terminal/競合 → 全体 rollback 済み（gate は PENDING のまま）。
    revalidatePath('/approvals');
    redirect('/approvals?error=gate_transition');
  }
  revalidatePath('/approvals');
  revalidatePath('/ai-office');
  if (r.outcome === 'forbidden') redirect('/approvals?denied=1');
  if (r.outcome === 'stale') redirect('/approvals?error=stale_gate'); // 何も変更していない（再確認が必要）
  redirect('/approvals');
}

// ============================================================================
// outreach_send 承認決定の production-shared core（Codex M1-b E-01）。
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

export async function decideApprovalAction(formData: FormData) {
  const user = await requireUser();
  const approvalId = String(formData.get('approvalId') ?? '');
  const decision = String(formData.get('decision') ?? '');
  const note = String(formData.get('note') ?? '');

  // v6.9（Codex r3565885990）/ PR#58 R8: 承認の決定は人間のみ。isAi boolean（User.isAiAgent 由来・
  // role と整合制約なし）単独では判定せず、role 由来の isHumanUser（AI_AGENT/AI_ASSISTANT を1つでも
  // 含む混在・空roles を拒否）で DB 接触前に fail-closed する（不変条件・RBAC とは独立の二重防御）。
  if (!hasPermission(user, 'approval', 'approve') || user.isAi || !isHumanUser({ roles: user.roles })) redirect('/approvals?denied=1');

  const approval = await prisma.approvalRequest.findFirst({
    where: { id: approvalId, tenantId: user.tenantId, status: 'PENDING' },
  });
  if (!approval) {
    // E-01: outreach_send の送信状態機械は決定 CAS 後にある。前回が送信途中で落ちた場合、
    // 再 submit 時は approval が既に APPROVED（≠PENDING）のため上の findFirst は null になる。
    // この場合だけ core を再入して送信状態機械を再開する（core は idempotent：provider 送信は最大1回）。
    const decidedOutreach = await prisma.approvalRequest.findFirst({
      where: { id: approvalId, tenantId: user.tenantId, type: 'outreach_send', status: 'APPROVED' },
      select: { title: true },
    });
    if (decidedOutreach) {
      try {
        await decideOutreachApprovalCore({
          tenantId: user.tenantId,
          userId: user.userId,
          approvalId,
          decision: 'approve',
          note,
          approvalTitle: decidedOutreach.title,
        });
      } catch {
        revalidatePath('/approvals');
        redirect('/approvals?error=outreach_transition');
      }
      revalidatePath('/approvals');
      revalidatePath('/leadmap');
      redirect('/approvals');
    }
    redirect('/approvals');
  }

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

  // C19 承認ブリッジ（roadmap83 案A）: content_review と同型の単一 transaction 決定。
  // 承認しても広告の実変更・予算・出稿・外部送信は発生しない（社内状態のみ）。
  if (approval.type === 'ad_suggestion_review') {
    let r;
    try {
      r = await decideSuggestionReviewCore(prisma as unknown as SuggestionBridgeDb, {
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
      revalidatePath('/approvals');
      redirect('/approvals?error=suggestion_transition');
    }
    revalidatePath('/approvals');
    revalidatePath('/marketing/ads');
    if (r.outcome === 'forbidden') redirect('/approvals?denied=1');
    redirect('/approvals'); // decided / already（冪等）とも一覧へ
  }

  // P3-Q2C 見積発行承認: content_review / ad_suggestion_review と同型の単一 transaction 決定。
  // 承認で Quote pending_approval→approved（発行確定・請求書化が可能に）／却下→rejected。
  // 従来はここに分岐が無く汎用 CAS で ApprovalRequest だけ確定し Quote が取り残されていた（dangling half-slice）。
  // 承認しても外部送信・請求書化・課金は発生しない（見積の社内ステータス確定のみ）。
  if (approval.type === 'quote_issue') {
    let r;
    try {
      r = await decideQuoteIssueCore(prisma as unknown as QuoteIssueBridgeDb, {
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
      revalidatePath('/approvals');
      redirect('/approvals?error=quote_transition');
    }
    revalidatePath('/approvals');
    revalidatePath('/quotes');
    if (r.outcome === 'forbidden') redirect('/approvals?denied=1');
    redirect('/approvals'); // decided / already（冪等）とも一覧へ
  }

  // Wave2 請求書VOID承認: 承認で「未入金かつVOID可能」限定の Invoice→VOID＋Receivable void＋
  // 入金予定 FinanceEvent ignored＋監査を単一 transaction で確定（承認後に入金が入っていたら count!==1 で全 rollback）。
  // 却下は Invoice 不変。外部送信・課金・削除・実 LLM は行わない（社内の請求ステータス訂正のみ）。
  if (approval.type === 'invoice_void') {
    let r;
    try {
      r = await decideInvoiceVoidCore(prisma as unknown as InvoiceVoidBridgeDb, {
        tenantId: user.tenantId,
        approvalId,
        entityId: approval.entityId,
        decision: decision === 'approve' ? 'approve' : 'reject',
        decidedById: user.userId,
        note,
        invoiceLabel: approval.title,
        actorIsAi: user.isAi,
      });
    } catch {
      revalidatePath('/approvals');
      redirect('/approvals?error=invoice_void_transition');
    }
    revalidatePath('/approvals');
    revalidatePath('/invoices');
    if (r.outcome === 'forbidden') redirect('/approvals?denied=1');
    redirect('/approvals'); // decided / already（冪等）とも一覧へ
  }

  // PR#58 R3 高額発注承認: 汎用 CAS で ApprovalRequest だけ確定すると PO が pending_approval のまま
  // 取り残され（reject 後に再申請不能な dangling）閉塞する。専用 bridge で ApprovalRequest 決定＋PO 遷移
  // （reject→draft/approvalId 解除・approve→整合確認）＋監査を単一 transaction/CAS で確定する。
  // 承認しても在庫移動・外部送信・課金は発生しない（発注の社内ステータス遷移のみ）。
  if (approval.type === 'purchase_order_issue') {
    const purchaseOrderId = String(((approval.payloadAfter ?? {}) as Record<string, unknown>).purchaseOrderId ?? approval.entityId);
    let r;
    try {
      r = await decidePurchaseOrderIssueCore(prisma as unknown as PoIssueBridgeDb, {
        tenantId: user.tenantId,
        approvalId,
        purchaseOrderId,
        decision: decision === 'approve' ? 'approve' : 'reject',
        decidedById: user.userId,
        note,
        approvalTitle: approval.title,
        decidedByRoles: user.roles,
        decidedBySessionIsAi: user.isAi,
      });
    } catch {
      // 対象消失・別 tenant・状態不整合（既に別 submit が確定 等）→ 全体 rollback 済み（PENDING のまま）。
      revalidatePath('/approvals');
      redirect('/approvals?error=po_issue_transition');
    }
    revalidatePath('/approvals');
    revalidatePath('/operations/purchase-orders');
    if (r.outcome === 'forbidden') redirect('/approvals?denied=1');
    redirect('/approvals'); // decided / already（冪等）とも一覧へ
  }

  // E-01 営業メール送信承認: 決定（内部状態）を atomic 化し、送信副作用を再開可能な状態機械で exactly-once に。
  // 従来の「汎用 CAS を先に commit → その後 write-ahead log / draft / lead を別 write」だと途中 fault の
  // retry が CAS no-op になり `APPROVED + queued/未作成 log + PENDING_APPROVAL` で停止し得た。core に集約。
  if (approval.type === 'outreach_send') {
    try {
      await decideOutreachApprovalCore({
        tenantId: user.tenantId,
        userId: user.userId,
        approvalId,
        decision: decision === 'approve' ? 'approve' : 'reject',
        note,
        approvalTitle: approval.title,
      });
    } catch {
      // provider 送信は最大1回・SendLog は durable。実 DB 失敗時は PENDING/再開可能状態のまま UI へ理由を返す。
      revalidatePath('/approvals');
      redirect('/approvals?error=outreach_transition');
    }
    revalidatePath('/approvals');
    revalidatePath('/leadmap');
    redirect('/approvals');
  }

  const status = decision === 'approve' ? 'APPROVED' : 'REJECTED';
  // 決定は原子的 CAS（PENDING のときのみ→決定）。二重 submit / 同時決定は count===0 で弾き、
  // 副作用（状態遷移）は CAS の勝者だけが実行する＝1回だけ反映（冪等）。
  const decided = await prisma.approvalRequest.updateMany({
    where: { id: approvalId, tenantId: user.tenantId, status: 'PENDING' },
    data: { status, decidedById: user.userId, decidedAt: new Date(), decisionNote: note },
  });
  if (decided.count === 0) redirect('/approvals'); // 既に決定済み（別 submit が反映済み）。

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
