// 正式 Invoice の外部送信ゲート（承認後のみ）。Phase 1-10。
// 鉄則: 外部送信は必ず承認後。送信前に prepareExternalPayload でPIIマスク。
//       AI は送信主体になれない（assertAiToolAllowed で多重防御）。設計: docs/audit/12。
import { prisma, writeAudit } from '@/lib/db';
import { upsertObligationForEvent } from '@hokko/db';
import { recordUsageEvent } from '@/lib/usage-events';
import { emitGrowthEvent } from '@/lib/growth';
import { requireApprovalForDangerousAction } from '@/lib/approval';
import { prepareExternalPayload } from '@/lib/safe-external-send';
import { assertAiToolAllowed } from '@/lib/ai-safety-server';
import { toNumber } from '@/lib/utils';
import { canSendInvoice, type DomainEventType } from '@hokko/shared';
import { getEmailProvider, isExternalSendEnabled, type EmailProvider } from '@hokko/integrations';

export interface Actor {
  tenantId: string;
  userId?: string | null;
}

interface InvoiceLike {
  number: string;
  total: unknown;
  dueDate: Date | null;
}

function invoiceBody(inv: InvoiceLike): string {
  return [
    `請求書 ${inv.number}`,
    `金額（税込）: ${toNumber(inv.total).toLocaleString()}円`,
    `お支払期日: ${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('ja-JP') : '別途ご相談'}`,
    'いつもお世話になっております。上記のとおりご請求申し上げます。',
  ].join('\n');
}

export interface SendGateResult {
  ok: boolean;
  reason?: string;
  requiresApproval?: boolean;
  approvalId?: string;
}

/** 正式 Invoice の外部送信を申請（invoice_send 承認）。PIIマスク済プレビューを AISafetyLog に記録。 */
export async function requestInvoiceExternalSend(actor: Actor, invoiceId: string): Promise<SendGateResult> {
  // AI は外部送信を起動できない（多重防御。actions は人間起動）。
  await assertAiToolAllowed({ tenantId: actor.tenantId, actorId: actor.userId, actorType: 'user', tool: 'external_send', entityType: 'Invoice', entityId: invoiceId });
  const inv = await prisma.invoice.findFirst({ where: { id: invoiceId, tenantId: actor.tenantId }, include: { customer: { select: { email: true } } } });
  if (!inv) return { ok: false, reason: 'not-found' };
  if (!canSendInvoice(inv.status)) return { ok: false, reason: 'not-sendable' };

  const recipient = inv.customer?.email ?? undefined;
  const prepared = await prepareExternalPayload({
    tenantId: actor.tenantId,
    actorId: actor.userId,
    channel: 'email',
    subject: `請求書 ${inv.number}`,
    body: invoiceBody(inv),
    recipient,
    entityType: 'Invoice',
    entityId: invoiceId,
    purpose: 'invoice_send',
    logSharing: true,
  });
  const gate = await requireApprovalForDangerousAction({
    tenantId: actor.tenantId,
    action: 'invoice_send',
    title: `請求書送信: ${inv.number}（${toNumber(inv.total).toLocaleString()}円）`,
    targetType: 'Invoice',
    targetId: invoiceId,
    requestedById: actor.userId,
    riskLevel: 'HIGH',
    external: true,
    payloadAfter: { invoiceId, recipient, maskedPreview: prepared.maskedBody.slice(0, 200) },
  });
  await writeAudit({ tenantId: actor.tenantId, actorId: actor.userId, action: 'invoice_send_request', entityType: 'Invoice', entityId: invoiceId, summary: `請求書 ${inv.number} の送信を申請（承認後に送信）` });
  return { ok: true, requiresApproval: gate.requiresApproval, approvalId: gate.approvalId };
}

/**
 * 送信の exactly-once 実証用テストフック（M1-b E-01）。**未指定時は本番挙動を一切変えない**。
 * spec が provider 呼び出し回数の観測と、各クラッシュウィンドウ（provider 前後・finalize 書き込み途中）の
 * 障害注入を行うためのもの。EXTERNAL_SEND_ENABLED 等の env ゲートには影響しない。
 */
export interface InvoiceSendTestHooks {
  /** instrumented なメール Provider を注入し送信回数を観測する。指定時のみ送信経路を実行（env 非依存）。 */
  __emailProviderForTest?: EmailProvider;
  /** claim commit 後・provider 呼び出し前に throw（claim 済みなら retry は provider 再送しない、を実証）。 */
  __faultAfterClaimForTest?: () => void;
  /** provider 呼び出し成功直後・finalize tx 前に throw（送信後クラッシュ後の retry でも provider 二重送信/payment_expected 消失が起きない、を実証）。 */
  __faultAfterProviderForTest?: () => void;
  /** finalize tx 内の書き込み途中で throw（SENT/payment_expected/Audit の all-or-nothing rollback を実証）。 */
  __faultBetweenWritesForTest?: () => void;
}

// canSendInvoice(status) と一致する送信可能状態（CAS の barrier に使う）。SENT 以降は二重送信不可。
const SENDABLE_INVOICE_STATUSES = ['DRAFT', 'ISSUED'] as const;

type ClaimOutcome =
  | { kind: 'not-found' }
  | { kind: 'not-sendable' } // VOID/PAID 等の送信不可（既存 claim なし）
  | { kind: 'done' } // 完了済み（claim approved & SENT）— 冪等に成功で返す
  | { kind: 'claimed'; claimId: string } // 本実行が claim を生成＝provider 呼び出し担当（勝者1本）
  | { kind: 'resume'; claimId: string }; // 既存 claim（pending_send）を引き継ぐ＝provider を再送しない

/**
 * 承認済み Invoice を外部送信し SENT へ。EXTERNAL_SEND_ENABLED 時のみ実送信、それ以外は監査のみ。
 *
 * exactly-once（E-01）: 外部送信は「二度と取り消せない副作用」なので、DB より前に無防備に呼ぶと送信後の
 * DB 失敗/並行/クラッシュで二重送信になる。そこで **write-ahead claim → provider → finalize** の 3 相にする:
 *  1. claim（tx1・Invoice 行 FOR UPDATE で並行/再送を直列化）: 資金繰り予測の入力である payment_expected
 *     FinanceEvent を status='pending_send' の write-ahead ログとして先に確定する。これが「送信が一度でも
 *     起動された」ことの durable な証跡になり、claim 生成者だけが provider を呼ぶ（勝者1本）。
 *  2. provider: claim 生成者のみ・ちょうど1回。既存 claim を引き継ぐ retry/並行敗者は provider を呼ばない。
 *  3. finalize（tx3・冪等）: SENT への CAS（in DRAFT/ISSUED）＋ claim を approved 化（cashflow 予定へ計上）＋
 *     Audit を単一 tx で all-or-nothing 確定。途中失敗は全 rollback し、claim は pending_send のまま残るので
 *     retry が provider を再送せずに finalize をやり直す（送信は二重化せず payment_expected も失われない）。
 */
export async function executeInvoiceExternalSend(
  actor: Actor,
  invoiceId: string,
  opts: InvoiceSendTestHooks = {},
): Promise<{ ok: boolean; reason?: string }> {
  const inv = await prisma.invoice.findFirst({ where: { id: invoiceId, tenantId: actor.tenantId }, include: { customer: { select: { email: true } } } });
  if (!inv) return { ok: false, reason: 'not-found' };

  // ---- Phase 1: 送信クレーム（write-ahead・Invoice 行 FOR UPDATE で並行/再送を直列化） ----
  const claim = await prisma.$transaction(async (tx): Promise<ClaimOutcome> => {
    await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${invoiceId} AND "tenantId" = ${actor.tenantId} FOR UPDATE`;
    const cur = await tx.invoice.findFirst({ where: { id: invoiceId, tenantId: actor.tenantId }, select: { status: true } });
    if (!cur) return { kind: 'not-found' };
    // 既存 write-ahead claim（payment_expected/Invoice）: pending_send は引き継ぎ、approved は完了済み。
    const existing = await tx.financeEvent.findFirst({
      where: { tenantId: actor.tenantId, sourceType: 'Invoice', sourceId: invoiceId, type: 'payment_expected' },
      select: { id: true, status: true },
    });
    if (existing) {
      // pending_send は引き継ぎ（provider 再送なし）、approved は完了済み（冪等 done）。
      return existing.status === 'pending_send' ? { kind: 'resume', claimId: existing.id } : { kind: 'done' };
    }
    if (!canSendInvoice(cur.status)) return { kind: 'not-sendable' };
    const created = await tx.financeEvent.create({
      // status='pending_send' の間は cashflow 予定（draft|pending_approval|approved のみ計上）に**入らない**。
      // finalize の approved 化で初めて予定へ計上され、途中クラッシュでの前倒し計上を防ぐ。
      data: { tenantId: actor.tenantId, type: 'payment_expected', sourceType: 'Invoice', sourceId: invoiceId, direction: 'inflow', amount: toNumber(inv.total), dueAt: inv.dueDate, status: 'pending_send', description: `入金予定: ${inv.number}` },
      select: { id: true },
    });
    // P5-FIN-002: Invoice の payment_expected を canonical obligation（inv/invoiceId）へ upsert & link（同一 tx）。
    await upsertObligationForEvent(tx, {
      tenantId: actor.tenantId,
      eventId: created.id,
      type: 'payment_expected',
      sourceType: 'Invoice',
      sourceId: invoiceId,
      direction: 'inflow',
      amount: toNumber(inv.total),
      dueAt: inv.dueDate,
      description: `入金予定: ${inv.number}`,
    });
    return { kind: 'claimed', claimId: created.id };
  }, { timeout: 15_000 });

  if (claim.kind === 'not-found') return { ok: false, reason: 'not-found' };
  if (claim.kind === 'not-sendable') return { ok: false, reason: 'already-sent' };
  if (claim.kind === 'done') return { ok: true }; // 完了済みの replay は冪等成功（並行/再送で契約が揺れない）。
  const isClaimCreator = claim.kind === 'claimed';

  // ---- Phase 2: 外部送信（claim 生成者のみ・ちょうど1回） ----
  let sendStatus = 'logged';
  let provider = 'log';
  if (isClaimCreator) {
    const recipient = inv.customer?.email ?? `billing@${invoiceId}.example.jp`;
    // 送信直前に再度 PII マスク。
    const prepared = await prepareExternalPayload({
      tenantId: actor.tenantId,
      actorId: actor.userId,
      channel: 'email',
      subject: `請求書 ${inv.number}`,
      body: invoiceBody(inv),
      recipient,
      entityType: 'Invoice',
      entityId: invoiceId,
      purpose: 'invoice_send_execute',
    });
    if (opts.__faultAfterClaimForTest) opts.__faultAfterClaimForTest();
    const testProvider = opts.__emailProviderForTest;
    if (testProvider || isExternalSendEnabled()) {
      const email = testProvider ?? getEmailProvider();
      const res = await email.send({ to: recipient, from: process.env.MAIL_FROM ?? 'billing@dreexy.example.jp', subject: `請求書 ${inv.number}`, text: prepared.maskedBody });
      sendStatus = res.status;
      provider = res.provider;
    }
    if (opts.__faultAfterProviderForTest) opts.__faultAfterProviderForTest();
  }

  // ---- Phase 3: finalize（SENT CAS ＋ claim approved ＋ Audit を単一 tx・冪等） ----
  // 別コミットだと SENT 確定後クラッシュで payment_expected（資金繰り予測の入力）が恒久消失するため
  // all-or-nothing。SENT への遷移は status CAS（DRAFT/ISSUED のみ）で並行敗者を無害化する（count!==1 で監査/成長を発火しない）。
  const transitioned = await prisma.$transaction(async (tx) => {
    const flip = await tx.invoice.updateMany({
      where: { id: invoiceId, tenantId: actor.tenantId, status: { in: [...SENDABLE_INVOICE_STATUSES] } },
      data: { status: 'SENT' },
    });
    // write-ahead claim を確定（pending_send→approved・冪等）。これで payment_expected が cashflow 予定へ計上される。
    await tx.financeEvent.updateMany({ where: { id: claim.claimId, status: 'pending_send' }, data: { status: 'approved' } });
    if (opts.__faultBetweenWritesForTest) opts.__faultBetweenWritesForTest();
    if (flip.count === 1) {
      await tx.auditLog.create({
        data: { tenantId: actor.tenantId, actorId: actor.userId ?? null, actorType: 'user', action: 'invoice_send', entityType: 'Invoice', entityId: invoiceId, summary: `請求書 ${inv.number} を送信（${sendStatus}/${provider}）` },
      });
    }
    return flip.count === 1;
  }, { timeout: 15_000 });

  // ---- post-commit best-effort（遷移した実行のみ・二重計上しない） ----
  if (transitioned) {
    await emitGrowthEvent({
      tenantId: actor.tenantId,
      type: 'finance.invoice.sent',
      title: `請求書送信: ${inv.number}`,
      actorId: actor.userId,
      entityType: 'Invoice',
      entityId: invoiceId,
      amount: toNumber(inv.total),
      alsoDomainEvent: { domainType: 'INVOICE_SENT' as DomainEventType, aggregateType: 'Invoice', aggregateId: invoiceId },
    });
    // Phase 1-31: 非課金の利用量記録（invoice send が logged/sent として確定した事実のみ）。課金ではない・billing=usage_only 固定。
    // failed / その他 status は emit しない（送れていない＝never_billable 相当）。
    // metadata は非PIIの channel/status/kind のみ（recipient/顧客情報/請求番号/請求金額/inv.total/inv.number/maskedBody/本文/金額/secret は入れない）。
    // 記録失敗は送信主処理・financeEvent・writeAudit・戻り値を壊さない（recordUsageEvent は例外を投げず ok:false を返すだけ）。
    if (sendStatus === 'logged' || sendStatus === 'sent') {
      await recordUsageEvent({
        tenantId: actor.tenantId,
        actorId: actor.userId,
        actorType: 'user',
        eventType: 'external_send.invoice',
        category: 'external_send',
        billing: 'usage_only',
        unit: 'count',
        quantity: 1,
        sourceType: 'Invoice',
        sourceId: invoiceId,
        idempotencyKey: `usage:external_send.invoice:${invoiceId}`,
        metadata: { channel: 'email', status: sendStatus, kind: 'invoice' },
      });
    }
  }
  return { ok: true };
}

/** 発行（DRAFT→ISSUED ＋ 売掛起票）のテスト専用フック（E-03）。未指定時は本番挙動を変えない。 */
export interface IssueInvoiceTestHooks {
  /** finalize tx 内（Receivable upsert 後・Audit 前）で throw させ、全 rollback を実証する。 */
  __faultBetweenWritesForTest?: () => void;
}

export type IssueInvoiceResult = { ok: true } | { ok: false; reason: 'not-found' | 'invalid-state' | 'lost' };

/**
 * Invoice 発行の core（E-03）: DRAFT→ISSUED ＋ 売掛(Receivable)起票 ＋ 監査を単一 $transaction で all-or-nothing 確定。
 * status CAS（DRAFT のときだけ）を barrier に並行/二重発行を1本へ収束（count!==1 は rollback して no-op=lost）。
 * 途中失敗は全 rollback（ISSUED なのに売掛欠落を作らない）。Server Action は本 core を呼ぶだけ。
 * fault hook は spec 専用で、未指定時は本番挙動と一致する。
 */
export async function issueInvoiceCore(actor: Actor, invoiceId: string, opts: IssueInvoiceTestHooks = {}): Promise<IssueInvoiceResult> {
  const inv = await prisma.invoice.findFirst({ where: { id: invoiceId, tenantId: actor.tenantId } });
  if (!inv) return { ok: false, reason: 'not-found' };
  if (inv.status !== 'DRAFT') return { ok: false, reason: 'invalid-state' };
  const issued = await prisma.$transaction(async (tx) => {
    const claimCas = await tx.invoice.updateMany({
      where: { id: invoiceId, tenantId: actor.tenantId, status: 'DRAFT' },
      data: { status: 'ISSUED', issueDate: new Date() },
    });
    if (claimCas.count !== 1) return false;
    await tx.receivable.upsert({
      where: { invoiceId },
      create: { tenantId: actor.tenantId, invoiceId, amount: inv.total, dueDate: inv.dueDate, status: 'open' },
      update: { amount: inv.total, dueDate: inv.dueDate },
    });
    if (opts.__faultBetweenWritesForTest) opts.__faultBetweenWritesForTest();
    await tx.auditLog.create({
      data: { tenantId: actor.tenantId, actorId: actor.userId ?? null, actorType: 'user', action: 'update', entityType: 'Invoice', entityId: invoiceId, summary: `請求書 ${inv.number} を発行（売掛起票）` },
    });
    return true;
  }, { timeout: 15_000 });
  return issued ? { ok: true } : { ok: false, reason: 'lost' };
}
