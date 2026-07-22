// 督促（お支払い状況のご確認）の下書き作成・承認申請・送信実行。Phase 1-15。
// 鉄則（invoice-send.ts と同一の安全パターン）:
//   - 外部送信は必ず人間承認後（dunning_send）。AI は送信主体になれない（assertAiToolAllowed）。
//   - 送信前に prepareExternalPayload で PII マスク。EXTERNAL_SEND_ENABLED=false なら logged/監査のみ。
//   - 二重実行防止は action 側の executeApprovedAction。送信しても Receivable は collected にしない（入金時のみ）。
//   - 新規DBモデル/フィールドなし: CollectionReminder を使用。件名は決定論導出（非保存）、
//     承認状態は ApprovalRequest(entityType='CollectionReminder') 逆引き、実行者は writeAudit で記録。
import { prisma, writeAudit } from '@/lib/db';
import { recordUsageEvent } from '@/lib/usage-events';
import { emitGrowthEvent } from '@/lib/growth';
import { requireApprovalForDangerousAction } from '@/lib/approval';
import { prepareExternalPayload } from '@/lib/safe-external-send';
import { assertAiToolAllowed } from '@/lib/ai-safety-server';
import { toNumber } from '@/lib/utils';
import { buildDunningDraft, isDunningEligible, nextDunningStage, dunningStageMeta } from '@hokko/shared';
import { getEmailProvider, isExternalSendEnabled, type EmailProvider } from '@hokko/integrations';

export interface Actor {
  tenantId: string;
  userId?: string | null;
}

// 送信者（自社）表示は特定企業に固定しない（IKEZAKI OS は特定企業向けではない）。
// テナント名（Tenant.name）から解決し、取得できない場合は汎用フォールバック「請求元」を用いる。
const FALLBACK_COMPANY_NAME = '請求元';

/** 送信者（自社）名をテナントから解決。未取得時は汎用フォールバック。 */
async function resolveCompanyName(tenantId: string): Promise<string> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
  return tenant?.name?.trim() || FALLBACK_COMPANY_NAME;
}

interface InvoiceWithRel {
  id: string;
  number: string;
  status: string;
  total: unknown;
  paidAmount: unknown;
  dueDate: Date | null;
  customer: { name: string; email: string | null } | null;
  receivable: { id: string; status: string } | null;
}

function draftBodyFromInvoice(inv: InvoiceWithRel, companyName: string, stage = 1): { subject: string; body: string } {
  const total = toNumber(inv.total);
  const paid = toNumber(inv.paidAmount);
  return buildDunningDraft({
    customerName: inv.customer?.name ?? null,
    companyName,
    invoiceNumber: inv.number,
    total,
    paidAmount: paid,
    outstanding: Math.max(total - paid, 0),
    dueDate: inv.dueDate,
    stage, // P3-Q2C-C 督促段数（上がるほど丁寧に強め・威圧なし）
  });
}

/** この売掛について、次に作成する督促の段数（送信/記録済みの回数 +1・最大3）。 */
async function computeNextDunningStage(tenantId: string, receivableId: string): Promise<number> {
  const sentCount = await prisma.collectionReminder.count({
    where: { tenantId, receivableId, status: { in: ['sent', 'logged'] } },
  });
  return nextDunningStage(sentCount);
}

export interface DunningContext {
  eligible: boolean;
  invoiceId: string;
  invoiceNumber: string;
  outstanding: number;
  recipient: string | null; // 顧客メール（無ければ null → 送信不可）
  draft: { subject: string; body: string } | null; // 対象時のみ
  reminder: { id: string; status: string; draftMessage: string; createdAt: Date; stage: number } | null; // 最新下書き
  stage: number; // P3-Q2C-C 次に作成/現在の督促段数
  stageLabel: string; // 段数の画面ラベル
  pendingApprovalId: string | null; // PENDING の dunning_send
  approvedApprovalId: string | null; // APPROVED かつ未実行
}

/** Invoice 詳細の督促セクション表示に必要な情報を集約（読み取り専用）。 */
export async function getDunningContext(actor: Actor, invoiceId: string): Promise<DunningContext | null> {
  const inv = (await prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId: actor.tenantId },
    include: { customer: { select: { name: true, email: true } }, receivable: { select: { id: true, status: true } } },
  })) as InvoiceWithRel | null;
  if (!inv) return null;

  const total = toNumber(inv.total);
  const paid = toNumber(inv.paidAmount);
  const eligible = isDunningEligible(inv.status, paid, total, inv.receivable?.status ?? null);

  const reminder = inv.receivable
    ? await prisma.collectionReminder.findFirst({
        where: { tenantId: actor.tenantId, receivableId: inv.receivable.id },
        orderBy: { createdAt: 'desc' },
      })
    : null;

  let pendingApprovalId: string | null = null;
  let approvedApprovalId: string | null = null;
  if (reminder) {
    const approvals = await prisma.approvalRequest.findMany({
      where: { tenantId: actor.tenantId, entityType: 'CollectionReminder', entityId: reminder.id, requestedForAction: 'dunning_send' },
      orderBy: { createdAt: 'desc' },
    });
    pendingApprovalId = approvals.find((a) => a.status === 'PENDING')?.id ?? null;
    approvedApprovalId = approvals.find((a) => a.status === 'APPROVED' && a.executedAt == null)?.id ?? null;
  }

  const companyName = eligible ? await resolveCompanyName(actor.tenantId) : FALLBACK_COMPANY_NAME;

  // P3-Q2C-C: 現在の下書きが有れば その段数、無ければ「次に作成する段数」で preview を出す。
  const stage = reminder?.stage ?? (inv.receivable ? await computeNextDunningStage(actor.tenantId, inv.receivable.id) : 1);

  return {
    eligible,
    invoiceId: inv.id,
    invoiceNumber: inv.number,
    outstanding: Math.max(total - paid, 0),
    recipient: inv.customer?.email ?? null,
    draft: eligible ? draftBodyFromInvoice(inv, companyName, stage) : null,
    reminder: reminder ? { id: reminder.id, status: reminder.status, draftMessage: reminder.draftMessage, createdAt: reminder.createdAt, stage: reminder.stage } : null,
    stage,
    stageLabel: dunningStageMeta(stage).label,
    pendingApprovalId,
    approvedApprovalId,
  };
}

/** 督促下書きを get-or-create（重複下書き防止: draft/pending_approval の既存があれば再利用）。 */
export async function createDunningDraft(actor: Actor, invoiceId: string): Promise<{ ok: boolean; reason?: string; reminderId?: string }> {
  const inv = (await prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId: actor.tenantId },
    include: { customer: { select: { name: true, email: true } }, receivable: { select: { id: true, status: true } } },
  })) as InvoiceWithRel | null;
  if (!inv) return { ok: false, reason: 'not-found' };
  if (!inv.receivable) return { ok: false, reason: 'no-receivable' };
  const total = toNumber(inv.total);
  const paid = toNumber(inv.paidAmount);
  if (!isDunningEligible(inv.status, paid, total, inv.receivable.status)) return { ok: false, reason: 'not-eligible' };

  const existing = await prisma.collectionReminder.findFirst({
    where: { tenantId: actor.tenantId, receivableId: inv.receivable.id, status: { in: ['draft', 'pending_approval'] } },
    orderBy: { createdAt: 'desc' },
  });
  if (existing) return { ok: true, reminderId: existing.id };

  const companyName = await resolveCompanyName(actor.tenantId);
  // P3-Q2C-C: 次段数を送信済み回数から算出（初回=1・以降 送信ごとに +1・最大3）。文面も段数に応じ丁寧に強め。
  const stage = await computeNextDunningStage(actor.tenantId, inv.receivable.id);
  const { body } = draftBodyFromInvoice(inv, companyName, stage);
  const reminder = await prisma.collectionReminder.create({
    data: { tenantId: actor.tenantId, receivableId: inv.receivable.id, draftMessage: body, status: 'draft', stage },
  });
  await writeAudit({ tenantId: actor.tenantId, actorId: actor.userId, action: 'dunning_draft_create', entityType: 'CollectionReminder', entityId: reminder.id, summary: `督促下書き(第${stage}段)を作成: 請求書 ${inv.number}` });
  return { ok: true, reminderId: reminder.id };
}

async function loadReminderChain(tenantId: string, reminderId: string) {
  const reminder = await prisma.collectionReminder.findFirst({ where: { id: reminderId, tenantId } });
  if (!reminder) return null;
  const receivable = await prisma.receivable.findFirst({
    where: { id: reminder.receivableId, tenantId },
    include: { invoice: { include: { customer: { select: { name: true, email: true } } } } },
  });
  if (!receivable) return null;
  return { reminder, receivable, invoice: receivable.invoice };
}

/** 督促下書きの外部送信を申請（dunning_send 承認）。重複（PENDING）があれば再申請しない。 */
export async function requestDunningSend(actor: Actor, reminderId: string): Promise<{ ok: boolean; reason?: string; requiresApproval?: boolean; approvalId?: string }> {
  // AI は外部送信を起動できない（多重防御）。
  await assertAiToolAllowed({ tenantId: actor.tenantId, actorId: actor.userId, actorType: 'user', tool: 'external_send', entityType: 'CollectionReminder', entityId: reminderId });

  const existingPending = await prisma.approvalRequest.findFirst({
    where: { tenantId: actor.tenantId, entityType: 'CollectionReminder', entityId: reminderId, requestedForAction: 'dunning_send', status: 'PENDING' },
  });
  if (existingPending) return { ok: true, requiresApproval: true, approvalId: existingPending.id };

  const chain = await loadReminderChain(actor.tenantId, reminderId);
  if (!chain) return { ok: false, reason: 'not-found' };
  const { reminder, receivable, invoice: inv } = chain;
  const recipient = inv.customer?.email ?? undefined;
  const subject = `【お支払い状況のご確認】請求書 ${inv.number}`;
  const prepared = await prepareExternalPayload({
    tenantId: actor.tenantId,
    actorId: actor.userId,
    channel: 'email',
    subject,
    body: reminder.draftMessage,
    recipient,
    entityType: 'CollectionReminder',
    entityId: reminderId,
    purpose: 'dunning_send',
    logSharing: true,
  });
  const gate = await requireApprovalForDangerousAction({
    tenantId: actor.tenantId,
    action: 'dunning_send',
    title: `督促送信（お支払い状況の確認）: 請求書 ${inv.number}`,
    targetType: 'CollectionReminder',
    targetId: reminderId,
    requestedById: actor.userId,
    riskLevel: 'MEDIUM',
    external: true,
    payloadAfter: { invoiceId: inv.id, receivableId: receivable.id, reminderId, recipient, maskedPreview: prepared.maskedBody.slice(0, 200) },
  });
  await prisma.collectionReminder.update({ where: { id: reminderId }, data: { status: 'pending_approval' } });
  await writeAudit({ tenantId: actor.tenantId, actorId: actor.userId, action: 'dunning_send_request', entityType: 'CollectionReminder', entityId: reminderId, summary: `督促送信を申請（承認後に送信）: 請求書 ${inv.number}` });
  return { ok: true, requiresApproval: gate.requiresApproval, approvalId: gate.approvalId };
}

/**
 * 送信の exactly-once 実証用テストフック（invoice-send E-01 と同型）。**未指定時は本番挙動を一切変えない**。
 * spec が provider 呼び出し回数の観測と、各クラッシュウィンドウ（claim 後・provider 後・finalize 途中）の
 * 障害注入を行うためのもの。EXTERNAL_SEND_ENABLED 等の env ゲートには影響しない。
 */
export interface DunningSendTestHooks {
  /** instrumented なメール Provider を注入し送信回数を観測（指定時のみ送信経路を実行・env 非依存）。 */
  __emailProviderForTest?: EmailProvider;
  /** claim commit 後・provider 呼び出し前に throw（claim 済みなら retry は provider 再送しない、を実証）。 */
  __faultAfterClaimForTest?: () => void;
  /** provider 呼び出し成功直後・finalize tx 前に throw（送信後クラッシュ後の retry でも provider 二重送信が起きない、を実証）。 */
  __faultAfterProviderForTest?: () => void;
  /** finalize tx 内の書き込み途中で throw（sent/Audit の all-or-nothing rollback を実証）。 */
  __faultBetweenWritesForTest?: () => void;
}

// 送信可能状態（CAS の barrier）。sent/logged は送信済み・'sending' は write-ahead claim（送信起動済み）。
const DUNNING_SENDABLE_STATUSES = ['draft', 'pending_approval'] as const;

type DunningClaimOutcome =
  | { kind: 'not-found' }
  | { kind: 'no-recipient' } // 宛先メール無し（claim を立てず送信不可で返す）
  | { kind: 'done' } // 既に sent/logged（冪等に成功で返す）
  | { kind: 'claimed' } // 本実行が 'sending' を立てた＝provider 呼び出し担当（勝者1本）
  | { kind: 'resume' }; // 既存 'sending' を引き継ぐ＝provider を再送しない

/**
 * 承認済み督促を外部送信/記録し sent|logged へ。EXTERNAL_SEND_ENABLED 時のみ実送信・それ以外は監査のみ。
 * Receivable は触らない（送信だけで collected にしない・入金時のみ collected）。
 *
 * exactly-once（invoice-send E-01 と同型）: 外部送信は取り消せない副作用なので、DB より前に無防備に呼ぶと
 * 送信後の DB 失敗/並行/クラッシュで二重送信になる（旧実装は status を read してから update する非原子的ガードで、
 * provider 成功→finalize 失敗の retry が再送し得た）。そこで **write-ahead claim → provider → finalize** の3相にする:
 *  1. claim（tx1・CollectionReminder 行 FOR UPDATE で並行/再送を直列化）: status を 'sending' に前進させ、
 *     「送信が一度でも起動された」ことの durable な証跡にする。claim 生成者だけが provider を呼ぶ（勝者1本）。
 *  2. provider: claim 生成者のみ・ちょうど1回。既存 'sending' を引き継ぐ retry/並行敗者は provider を呼ばない
 *     （＝二重送信より「稀な pre-send クラッシュで1通落ちる（手動再送可）」を選ぶ at-most-once。督促は二重送信が最悪手）。
 *  3. finalize（tx3・冪等）: 'sending'→sent|logged への CAS ＋ Audit を単一 tx で all-or-nothing 確定。
 *     途中失敗は全 rollback し 'sending' のまま残るので、retry が provider を再送せず finalize をやり直す。
 */
export async function executeDunningSend(
  actor: Actor,
  reminderId: string,
  opts: DunningSendTestHooks = {},
): Promise<{ ok: boolean; reason?: string }> {
  const chain = await loadReminderChain(actor.tenantId, reminderId);
  if (!chain) return { ok: false, reason: 'not-found' };
  const { reminder, invoice: inv } = chain;
  const recipient = inv.customer?.email ?? null;

  // ---- Phase 1: 送信クレーム（write-ahead・CollectionReminder 行 FOR UPDATE で並行/再送を直列化） ----
  const claim = await prisma.$transaction(async (tx): Promise<DunningClaimOutcome> => {
    await tx.$queryRaw`SELECT id FROM "CollectionReminder" WHERE id = ${reminderId} AND "tenantId" = ${actor.tenantId} FOR UPDATE`;
    const cur = await tx.collectionReminder.findFirst({ where: { id: reminderId, tenantId: actor.tenantId }, select: { status: true } });
    if (!cur) return { kind: 'not-found' };
    if (cur.status === 'sent' || cur.status === 'logged') return { kind: 'done' }; // 完了済みは冪等成功
    if (cur.status === 'sending') return { kind: 'resume' }; // 既存 claim を引き継ぐ（provider 再送なし）
    if (!recipient) return { kind: 'no-recipient' }; // 宛先無しは claim を立てず送信不可で返す
    if (!(DUNNING_SENDABLE_STATUSES as readonly string[]).includes(cur.status)) return { kind: 'not-found' };
    await tx.collectionReminder.update({ where: { id: reminderId }, data: { status: 'sending' } });
    return { kind: 'claimed' };
  }, { timeout: 15_000 });

  if (claim.kind === 'not-found') return { ok: false, reason: 'not-found' };
  if (claim.kind === 'no-recipient') return { ok: false, reason: 'no-recipient' };
  if (claim.kind === 'done') return { ok: true }; // 完了済みの replay は冪等成功（並行/再送で契約が揺れない）
  const isClaimCreator = claim.kind === 'claimed';

  const subject = `【お支払い状況のご確認】請求書 ${inv.number}`;
  const enabled = isExternalSendEnabled(); // デプロイ定数（retry/resume を跨いで安定）
  let sendStatus = 'logged';
  let provider = 'log';

  // ---- Phase 2: 外部送信（claim 生成者のみ・ちょうど1回） ----
  if (isClaimCreator && recipient) {
    // 送信直前に再度 PII マスク。
    const prepared = await prepareExternalPayload({
      tenantId: actor.tenantId,
      actorId: actor.userId,
      channel: 'email',
      subject,
      body: reminder.draftMessage,
      recipient,
      entityType: 'CollectionReminder',
      entityId: reminderId,
      purpose: 'dunning_send_execute',
    });
    if (opts.__faultAfterClaimForTest) opts.__faultAfterClaimForTest();
    const testProvider = opts.__emailProviderForTest;
    if (testProvider || enabled) {
      const email = testProvider ?? getEmailProvider();
      const res = await email.send({ to: recipient, from: process.env.MAIL_FROM ?? 'billing@dreexy.example.jp', subject, text: prepared.maskedBody });
      sendStatus = res.status;
      provider = res.provider;
    }
    if (opts.__faultAfterProviderForTest) opts.__faultAfterProviderForTest();
  }

  // ---- Phase 3: finalize（'sending'→sent|logged への CAS ＋ Audit を単一 tx・冪等） ----
  const newStatus = enabled ? 'sent' : 'logged';
  const finalized = await prisma.$transaction(async (tx) => {
    const flip = await tx.collectionReminder.updateMany({
      where: { id: reminderId, tenantId: actor.tenantId, status: 'sending' },
      data: { status: newStatus },
    });
    if (opts.__faultBetweenWritesForTest) opts.__faultBetweenWritesForTest();
    if (flip.count === 1) {
      // 注意: Receivable.status は変更しない（送信だけで collected にしない。入金時のみ collected）。
      await tx.auditLog.create({
        data: { tenantId: actor.tenantId, actorId: actor.userId ?? null, actorType: 'user', action: 'dunning_send', entityType: 'CollectionReminder', entityId: reminderId, summary: `督促を${newStatus === 'sent' ? '送信' : '記録'}: 請求書 ${inv.number}（${sendStatus}/${provider}）` },
      });
    }
    return flip.count === 1;
  }, { timeout: 15_000 });

  // ---- post-commit best-effort（finalize した実行のみ・二重計上しない） ----
  if (finalized) {
    await emitGrowthEvent({
      tenantId: actor.tenantId,
      type: 'finance.dunning.sent',
      title: `督促送信（お支払い状況の確認）: 請求書 ${inv.number}`,
      actorId: actor.userId,
      entityType: 'CollectionReminder',
      entityId: reminderId,
    });
    // Phase 1-33: 非課金の利用量記録（dunning 送信が logged/sent として確定した事実のみ）。課金ではない・billing=usage_only 固定。
    // metadata は非PIIの channel/status/kind のみ（recipient/draftMessage/subject/maskedBody/inv.number/金額/reminderId/secret は入れない）。
    // 記録失敗は dunning 主処理を壊さない（recordUsageEvent は例外を投げず ok:false を返すだけ）。idempotencyKey で再送収束。
    if (sendStatus === 'logged' || sendStatus === 'sent') {
      await recordUsageEvent({
        tenantId: actor.tenantId,
        actorId: actor.userId,
        actorType: 'user',
        eventType: 'external_send.dunning',
        category: 'external_send',
        billing: 'usage_only',
        unit: 'count',
        quantity: 1,
        sourceType: 'CollectionReminder',
        sourceId: reminderId,
        idempotencyKey: `usage:external_send.dunning:${reminderId}`,
        metadata: { channel: 'email', status: sendStatus, kind: 'dunning' },
      });
    }
  }
  return { ok: true };
}
