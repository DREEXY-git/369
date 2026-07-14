'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeAudit } from '@/lib/db';
import { recordUsageEvent } from '@/lib/usage-events';
import { isSuppressed, invoiceStatusAfterPayment, receivableStatusAfterPayment } from '@hokko/shared';
import { toNumber } from '@/lib/utils';
import { getEmailProvider, isExternalSendEnabled } from '@hokko/integrations';
import { decideContentReviewCore, type BridgeDb } from '@/lib/content-review-bridge';
import { decideSuggestionReviewCore, type SuggestionBridgeDb } from '@/lib/suggestion-review-bridge';
import { decideQuoteIssueCore, type QuoteIssueBridgeDb } from '@/lib/quote-issue-bridge';
import { decideInvoiceVoidCore, type InvoiceVoidBridgeDb } from '@/lib/invoice-void-bridge';
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

  // Wave2 入金取消: 承認で対象 Payment を取り消し、paidAmount を残り Payment の SUM から再導出、
  // Invoice/Receivable ステータスを巻き戻し、相殺の FinanceEvent（outflow・posted）と監査を単一 transaction で確定。
  // recordInvoicePayment（#45）と同じ FOR UPDATE 直列化で、並行入金/取消の lost update を防ぐ。AI は不可。
  if (approval.type === 'payment_reversal') {
    const apprStatus = decision === 'approve' ? 'APPROVED' : 'REJECTED';
    const invoiceId = approval.entityId;
    const paymentId = (approval.payloadAfter as { paymentId?: string } | null)?.paymentId ?? '';
    try {
      await prisma.$transaction(async (tx) => {
        const decided = await tx.approvalRequest.updateMany({
          where: { id: approvalId, tenantId: user.tenantId, status: 'PENDING' },
          data: { status: apprStatus, decidedById: user.userId, decidedAt: new Date(), decisionNote: note },
        });
        if (decided.count === 0) return; // 既に決定済み（冪等）。
        if (decision === 'approve') {
          // 対象 Invoice をロックし、並行入金/取消と直列化。
          await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${invoiceId} AND "tenantId" = ${user.tenantId} FOR UPDATE`;
          const pay = await tx.payment.findFirst({ where: { id: paymentId, tenantId: user.tenantId, invoiceId }, select: { amount: true } });
          if (!pay) throw new Error('payment not reversible'); // 既に取消済み等 → 全 rollback。
          const reversed = toNumber(pay.amount);
          await tx.payment.delete({ where: { id: paymentId } });
          const inv = await tx.invoice.findFirst({ where: { id: invoiceId, tenantId: user.tenantId }, select: { total: true, number: true } });
          const total = toNumber(inv?.total ?? 0);
          const agg = await tx.payment.aggregate({ where: { tenantId: user.tenantId, invoiceId }, _sum: { amount: true } });
          const paidSum = toNumber(agg._sum.amount ?? 0);
          // 全額取消（paidSum=0）は「発行済み未入金」= ISSUED に戻す（invoiceStatusAfterPayment は 0 を
          // PARTIALLY_PAID と返すため特別扱い）。延滞表示は dueDate から派生するので状態は ISSUED でよい。
          const nextStatus = paidSum === 0 ? 'ISSUED' : invoiceStatusAfterPayment(total, paidSum);
          await tx.invoice.update({ where: { id: invoiceId }, data: { paidAmount: paidSum, status: nextStatus } });
          await tx.receivable.updateMany({ where: { invoiceId, tenantId: user.tenantId }, data: { status: receivableStatusAfterPayment(total, paidSum) } });
          // 相殺の実績（actual 資金は inflow−outflow で集計されるため outflow で純額を戻す）。
          await tx.financeEvent.create({
            data: { tenantId: user.tenantId, type: 'payment_reversal', sourceType: 'Invoice', sourceId: invoiceId, direction: 'outflow', amount: reversed, status: 'posted', occurredAt: new Date(), description: `入金取消: ${inv?.number ?? invoiceId}` },
          });
          await tx.auditLog.create({
            data: { tenantId: user.tenantId, actorId: user.userId, actorType: 'user', action: 'payment_reversal', entityType: 'Invoice', entityId: invoiceId, summary: `入金 ${reversed.toLocaleString()}円 を取消（残額入金 ${paidSum.toLocaleString()}円）` },
          });
        } else {
          await tx.auditLog.create({
            data: { tenantId: user.tenantId, actorId: user.userId, actorType: 'user', action: 'reject', entityType: 'Invoice', entityId: invoiceId, summary: '入金取消の申請を却下' },
          });
        }
      });
    } catch {
      revalidatePath('/approvals');
      redirect('/approvals?error=payment_reversal_transition');
    }
    revalidatePath('/approvals');
    revalidatePath('/invoices');
    redirect('/approvals');
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
