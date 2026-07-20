// Operations→Finance ブリッジのドメインサービス（書き込みロジックの本体）。Phase 1-8 / M1-b E-02。
// 設計ルール: docs/audit/12_maintenance_architecture.md。Server Action はこのサービスを呼ぶだけ。
//
// M1-b E-02（bridge TOCTOU 修正）:
//  旧実装は `findFirst（既存判定）→ 複数 create` の check-then-create で、判定と生成の間に unique/advisory/
//  transactional claim が無かった。同一 source を並行 bridge すると両者が「未処理」を観測し、FinanceEvent/
//  JournalCandidate/InvoiceCandidate/Audit/Growth/DomainEvent/Outbox を重複または片欠けにできた。
//  修正: source 論理 identity（tenantId, sourceType, sourceId）単位の **advisory xact lock** で並行 bridge を
//  直列化し、ロック取得**後**に同 tx 内で既存判定 → 全 ledger 生成を **単一 transaction** で確定する。
//  途中失敗は全 rollback（片欠けなし）、勝者以外はロック解放後に既存を観測して no-op（重複なし）。
//  低レベル helper（emitFinanceEvent/createJournalCandidate/createInvoiceCandidate）は emitGrowthEvent が独自
//  transaction を張り合成できないため、tx 受け取り版（*Tx）へ切り出し、GrowthEvent/DomainEvent/Outbox を
//  同一 transaction 内で直接作成する（transactional outbox）。公開の非 tx 版は後方互換の薄い wrapper。
import { prisma } from '@/lib/db';
import type { Prisma } from '@hokko/db';
import { emitGrowthEvent } from '@/lib/growth';
import { emitDomainEventInTx } from '@/lib/events';
import { requireApprovalForDangerousAction } from '@/lib/approval';
import { toNumber } from '@/lib/utils';
import {
  financeEventDirection,
  journalCandidateFor,
  invoiceCandidateTotals,
  growthCategoryOf,
  type FinanceEventType,
  type FinanceDirection,
  type JournalKind,
  type DomainEventType,
} from '@hokko/shared';

export interface Actor {
  tenantId: string;
  userId?: string | null;
}

/**
 * ブリッジの原子性/rollback を実証するためのテスト専用フック（E-02）。**未指定時は本番挙動を一切変えない**。
 * `step` は各 downstream 書き込みの直後に渡される（spec が任意ステップで throw して tx 全 rollback を実証）。
 */
export interface FinanceBridgeTestHooks {
  __faultDuringBridgeForTest?: (step: string) => void;
}

const DUE_DEFAULT_DAYS = 30;
function defaultDue(): Date {
  return new Date(Date.now() + DUE_DEFAULT_DAYS * 86_400_000);
}

// ===== source 論理 identity の advisory barrier（並行 bridge の直列化） =====

/** schema 非依存・単射な lock material（成分は encodeURIComponent で区切り注入不可）。 */
function bridgeLockMaterial(tenantId: string, sourceType: string, sourceId: string): string {
  return `FINANCE_BRIDGE:${encodeURIComponent(tenantId)}:${encodeURIComponent(sourceType)}:${encodeURIComponent(sourceId)}`;
}

/**
 * (tenantId, sourceType, sourceId) 単位の tx スコープ advisory lock を取得する（commit/rollback で自動解放）。
 * bigint 化は PostgreSQL 側の hashtextextended のみ（JS 側 hash drift 不可能）。同一 source の並行 bridge は
 * ここで直列化され、後続の「既存判定→生成」がちょうど1回だけ通る。別 source/別 tenant は material が異なり非干渉。
 */
async function acquireBridgeBarrier(tx: Prisma.TransactionClient, tenantId: string, sourceType: string, sourceId: string): Promise<void> {
  await tx.$executeRaw`SET LOCAL lock_timeout = '10s'`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${bridgeLockMaterial(tenantId, sourceType, sourceId)}::text, 0))`;
}

// ===== tx 合成可能な低レベル生成（GrowthEvent/DomainEvent/Outbox を同一 tx 内で作成） =====

/** GrowthEvent を1件作成（DomainEvent なし・低レベル台帳用）。 */
async function createGrowthTx(
  tx: Prisma.TransactionClient,
  args: { tenantId: string; type: string; title: string; actorId?: string | null; entityType: string; entityId: string; amount?: number; revenueImpact?: number },
): Promise<void> {
  await tx.growthEvent.create({
    data: {
      tenantId: args.tenantId,
      type: args.type,
      category: growthCategoryOf(args.type),
      title: args.title,
      description: '',
      actorId: args.actorId ?? null,
      actorType: 'user',
      entityType: args.entityType,
      entityId: args.entityId,
      amount: args.amount ?? null,
      revenueImpact: args.revenueImpact ?? null,
      domainEventId: null,
    },
  });
}

/** ブリッジ完了 GrowthEvent＋DomainEvent（＋Outbox）を同一 tx で作成（emitGrowthEvent の tx 合成版）。 */
async function emitBridgeGrowthTx(
  tx: Prisma.TransactionClient,
  actor: Actor,
  args: { type: string; title: string; entityType: string; entityId: string; amount?: number; domainType: DomainEventType; aggregateType: string; aggregateId: string },
): Promise<void> {
  const emit = await emitDomainEventInTx(tx, {
    tenantId: actor.tenantId,
    eventType: args.domainType,
    aggregateType: args.aggregateType,
    aggregateId: args.aggregateId,
    actorId: actor.userId,
    actorType: 'user',
    payload: { growthType: args.type },
  });
  await tx.growthEvent.create({
    data: {
      tenantId: actor.tenantId,
      type: args.type,
      category: growthCategoryOf(args.type),
      title: args.title,
      description: '',
      actorId: actor.userId ?? null,
      actorType: 'user',
      entityType: args.entityType,
      entityId: args.entityId,
      amount: args.amount ?? null,
      revenueImpact: null,
      domainEventId: emit.eventId,
    },
  });
}

async function writeAuditTx(
  tx: Prisma.TransactionClient,
  actor: Actor,
  args: { action: string; entityType: string; entityId: string; summary: string },
): Promise<void> {
  await tx.auditLog.create({
    data: {
      tenantId: actor.tenantId,
      actorId: actor.userId ?? null,
      actorType: 'user',
      action: args.action,
      entityType: args.entityType,
      entityId: args.entityId,
      summary: args.summary,
    },
  });
}

interface EmitFinanceEventInput {
  type: FinanceEventType;
  sourceType: string;
  sourceId?: string | null;
  amount: number;
  direction?: FinanceDirection;
  dueAt?: Date | null;
  description?: string;
  status?: string;
  payload?: Record<string, unknown>;
}

/** FinanceEvent を1件記録（tx 内）。growthType 指定時は GrowthEvent も同一 tx で作成。 */
async function emitFinanceEventTx(tx: Prisma.TransactionClient, actor: Actor, input: EmitFinanceEventInput, growthType?: string) {
  const direction = input.direction ?? financeEventDirection(input.type);
  const fe = await tx.financeEvent.create({
    data: {
      tenantId: actor.tenantId,
      type: input.type,
      sourceType: input.sourceType,
      sourceId: input.sourceId ?? null,
      direction,
      amount: input.amount,
      dueAt: input.dueAt ?? null,
      status: input.status ?? 'draft',
      description: input.description ?? '',
      payload: (input.payload ?? undefined) as Prisma.InputJsonValue | undefined,
      createdById: actor.userId ?? null,
    },
  });
  if (growthType) {
    await createGrowthTx(tx, {
      tenantId: actor.tenantId,
      type: growthType,
      title: input.description || input.type,
      actorId: actor.userId,
      entityType: 'FinanceEvent',
      entityId: fe.id,
      amount: input.amount,
      revenueImpact: direction === 'inflow' ? input.amount : undefined,
    });
  }
  return fe;
}

interface CreateJournalCandidateInput {
  kind: JournalKind;
  sourceType: string;
  sourceId?: string | null;
  amount: number;
  taxAmount?: number;
  aiOutputId?: string | null;
  confidence?: number;
}

async function createJournalCandidateTx(tx: Prisma.TransactionClient, actor: Actor, input: CreateJournalCandidateInput) {
  const map = journalCandidateFor(input.kind);
  const jc = await tx.journalCandidate.create({
    data: {
      tenantId: actor.tenantId,
      sourceType: input.sourceType,
      sourceId: input.sourceId ?? null,
      debitAccount: map.debitAccount,
      creditAccount: map.creditAccount,
      amount: input.amount,
      taxAmount: input.taxAmount ?? 0,
      description: map.description,
      status: 'draft',
      confidence: input.confidence ?? 0.7,
      aiOutputId: input.aiOutputId ?? null,
      createdById: actor.userId ?? null,
    },
  });
  await createGrowthTx(tx, {
    tenantId: actor.tenantId,
    type: 'finance.journal_candidate.created',
    title: `仕訳候補: ${map.description}`,
    actorId: actor.userId,
    entityType: 'JournalCandidate',
    entityId: jc.id,
    amount: input.amount,
  });
  return jc;
}

interface CreateInvoiceCandidateInput {
  sourceType: string;
  sourceId?: string | null;
  customerId?: string | null;
  title: string;
  subtotal: number;
  dueAt?: Date | null;
}

async function createInvoiceCandidateTx(tx: Prisma.TransactionClient, actor: Actor, input: CreateInvoiceCandidateInput) {
  const t = invoiceCandidateTotals(input.subtotal);
  const ic = await tx.invoiceCandidate.create({
    data: {
      tenantId: actor.tenantId,
      sourceType: input.sourceType,
      sourceId: input.sourceId ?? null,
      customerId: input.customerId ?? null,
      title: input.title,
      subtotal: t.subtotal,
      taxAmount: t.taxAmount,
      total: t.total,
      dueAt: input.dueAt ?? null,
      status: 'draft',
      createdById: actor.userId ?? null,
    },
  });
  await emitFinanceEventTx(tx, actor, {
    type: 'invoice_candidate',
    sourceType: 'InvoiceCandidate',
    sourceId: ic.id,
    amount: t.total,
    direction: 'inflow',
    dueAt: input.dueAt ?? null,
    description: input.title,
  });
  await createGrowthTx(tx, {
    tenantId: actor.tenantId,
    type: 'finance.invoice_candidate.created',
    title: `請求候補: ${input.title}`,
    actorId: actor.userId,
    entityType: 'InvoiceCandidate',
    entityId: ic.id,
    amount: t.total,
    revenueImpact: t.total,
  });
  return ic;
}

// ===== 公開の非 tx 版（後方互換・単発利用向け。内部は単一 transaction） =====

/** FinanceEvent を1件記録。growthType 指定時は GrowthEvent も発火。 */
export async function emitFinanceEvent(actor: Actor, input: EmitFinanceEventInput, growthType?: string) {
  return prisma.$transaction((tx) => emitFinanceEventTx(tx, actor, input, growthType));
}

export async function createJournalCandidate(actor: Actor, input: CreateJournalCandidateInput) {
  return prisma.$transaction((tx) => createJournalCandidateTx(tx, actor, input));
}

export async function createInvoiceCandidate(actor: Actor, input: CreateInvoiceCandidateInput) {
  return prisma.$transaction((tx) => createInvoiceCandidateTx(tx, actor, input));
}

// ===== 高レベル: 各 Operations 起点のブリッジ（advisory barrier ＋ 単一 transaction） =====

/** イベント案件 → 売上/原価の FinanceEvent・仕訳候補・請求候補・入金予定。 */
export async function bridgeEventProjectToFinance(actor: Actor, eventId: string, opts: FinanceBridgeTestHooks = {}) {
  const event = await prisma.eventProject.findFirst({
    where: { id: eventId, tenantId: actor.tenantId },
    include: { costs: true },
  });
  if (!event) throw new Error('event not found');
  const revenue = toNumber(event.revenue);
  const cost = Math.max(toNumber(event.cost), event.costs.reduce((s, c) => s + toNumber(c.amount), 0));
  const dueAt = defaultDue();

  return prisma.$transaction(
    async (tx) => {
      await acquireBridgeBarrier(tx, actor.tenantId, 'EventProject', eventId);
      // 冪等: ロック取得後に同 tx 内で既存判定（TOCTOU 排除）。既にブリッジ済みなら二重生成しない。
      const existing = await tx.invoiceCandidate.findFirst({
        where: { tenantId: actor.tenantId, sourceType: 'EventProject', sourceId: eventId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      if (existing) return { invoiceCandidateId: existing.id, alreadyBridged: true };

      await emitFinanceEventTx(tx, actor, { type: 'event_revenue', sourceType: 'EventProject', sourceId: eventId, amount: revenue, description: `イベント売上: ${event.name}` }, 'finance.event.created');
      await emitFinanceEventTx(tx, actor, { type: 'event_cost', sourceType: 'EventProject', sourceId: eventId, amount: cost, description: `イベント原価: ${event.name}` });
      opts.__faultDuringBridgeForTest?.('after-finance-event');
      await createJournalCandidateTx(tx, actor, { kind: 'revenue', sourceType: 'EventProject', sourceId: eventId, amount: revenue });
      await createJournalCandidateTx(tx, actor, { kind: 'cost', sourceType: 'EventProject', sourceId: eventId, amount: cost });
      const ic = await createInvoiceCandidateTx(tx, actor, { sourceType: 'EventProject', sourceId: eventId, customerId: event.customerId, title: `${event.name} 請求`, subtotal: revenue, dueAt });
      opts.__faultDuringBridgeForTest?.('after-invoice-candidate');
      await emitFinanceEventTx(tx, actor, { type: 'cashflow_expected', sourceType: 'InvoiceCandidate', sourceId: ic.id, amount: toNumber(ic.total), direction: 'inflow', dueAt, description: `入金予定: ${event.name}` }, 'finance.cashflow_expected.created');

      await writeAuditTx(tx, actor, { action: 'finance_bridge', entityType: 'EventProject', entityId: eventId, summary: `イベント案件をFinanceへブリッジ: ${event.name}（売上${revenue}/原価${cost}）` });
      opts.__faultDuringBridgeForTest?.('before-growth');
      await emitBridgeGrowthTx(tx, actor, { type: 'finance.event_project.bridged', title: `Financeブリッジ: ${event.name}`, entityType: 'EventProject', entityId: eventId, domainType: 'EVENT_PROJECT_FINANCE_BRIDGED' as DomainEventType, aggregateType: 'EventProject', aggregateId: eventId });
      return { invoiceCandidateId: ic.id, alreadyBridged: false };
    },
    { timeout: 20_000 },
  );
}

/** 発注 → 買掛の FinanceEvent・仕訳候補・支払予定。 */
export async function bridgePurchaseOrderToFinance(actor: Actor, poId: string, opts: FinanceBridgeTestHooks = {}) {
  const po = await prisma.purchaseOrder.findFirst({ where: { id: poId, tenantId: actor.tenantId } });
  if (!po) throw new Error('po not found');
  const amount = toNumber(po.totalAmount);
  const dueAt = po.expectedAt ?? defaultDue();

  await prisma.$transaction(
    async (tx) => {
      await acquireBridgeBarrier(tx, actor.tenantId, 'PurchaseOrder', poId);
      // 冪等: ロック取得後に同 tx 内で既存判定（同 PO の purchase_order FinanceEvent があれば二重生成しない）。
      const existing = await tx.financeEvent.findFirst({
        where: { tenantId: actor.tenantId, sourceType: 'PurchaseOrder', sourceId: poId, type: 'purchase_order' },
        select: { id: true },
      });
      if (existing) return;

      await emitFinanceEventTx(tx, actor, { type: 'purchase_order', sourceType: 'PurchaseOrder', sourceId: poId, amount, description: `発注: ${po.orderNo}` }, 'finance.event.created');
      opts.__faultDuringBridgeForTest?.('after-finance-event');
      await emitFinanceEventTx(tx, actor, { type: 'payment_expected', sourceType: 'PurchaseOrder', sourceId: poId, amount, direction: 'outflow', dueAt, description: `支払予定: ${po.orderNo}` });
      await createJournalCandidateTx(tx, actor, { kind: 'purchase', sourceType: 'PurchaseOrder', sourceId: poId, amount });
      opts.__faultDuringBridgeForTest?.('after-journal');
      await emitFinanceEventTx(tx, actor, { type: 'cashflow_expected', sourceType: 'PurchaseOrder', sourceId: poId, amount, direction: 'outflow', dueAt, description: `支払予定: ${po.orderNo}` }, 'finance.cashflow_expected.created');

      await writeAuditTx(tx, actor, { action: 'finance_bridge', entityType: 'PurchaseOrder', entityId: poId, summary: `発注をFinanceへブリッジ: ${po.orderNo}（${amount}円）` });
      opts.__faultDuringBridgeForTest?.('before-growth');
      await emitBridgeGrowthTx(tx, actor, { type: 'finance.purchase_order.bridged', title: `Financeブリッジ発注: ${po.orderNo}`, entityType: 'PurchaseOrder', entityId: poId, amount, domainType: 'PURCHASE_ORDER_FINANCE_BRIDGED' as DomainEventType, aggregateType: 'PurchaseOrder', aggregateId: poId });
    },
    { timeout: 20_000 },
  );
}

/** 破損記録 → 破損請求の請求候補・仕訳候補・入金予定。 */
export async function bridgeDamageChargeToInvoiceCandidate(actor: Actor, damageId: string, opts: FinanceBridgeTestHooks = {}) {
  const dmg = await prisma.damageLossRecord.findFirst({ where: { id: damageId, tenantId: actor.tenantId } });
  if (!dmg) throw new Error('damage record not found');
  const amount = toNumber(dmg.cost);
  const dueAt = defaultDue();

  return prisma.$transaction(
    async (tx) => {
      await acquireBridgeBarrier(tx, actor.tenantId, 'DamageLossRecord', damageId);
      // 冪等: ロック取得後に同 tx 内で既存判定（同破損記録の請求候補があれば二重生成しない）。
      const existing = await tx.invoiceCandidate.findFirst({
        where: { tenantId: actor.tenantId, sourceType: 'DamageLossRecord', sourceId: damageId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      if (existing) return { invoiceCandidateId: existing.id };

      await emitFinanceEventTx(tx, actor, { type: 'damage_charge', sourceType: 'DamageLossRecord', sourceId: damageId, amount, direction: 'inflow', description: `破損請求: ${dmg.note || damageId}` }, 'finance.event.created');
      opts.__faultDuringBridgeForTest?.('after-finance-event');
      const ic = await createInvoiceCandidateTx(tx, actor, { sourceType: 'DamageLossRecord', sourceId: damageId, title: `破損請求 ${dmg.note ?? ''}`.trim(), subtotal: amount, dueAt });
      opts.__faultDuringBridgeForTest?.('after-invoice-candidate');
      await createJournalCandidateTx(tx, actor, { kind: 'damage', sourceType: 'DamageLossRecord', sourceId: damageId, amount });
      await emitFinanceEventTx(tx, actor, { type: 'cashflow_expected', sourceType: 'InvoiceCandidate', sourceId: ic.id, amount: toNumber(ic.total), direction: 'inflow', dueAt, description: '入金予定: 破損請求' }, 'finance.cashflow_expected.created');

      await writeAuditTx(tx, actor, { action: 'finance_bridge', entityType: 'DamageLossRecord', entityId: damageId, summary: `破損請求をFinanceへブリッジ（${amount}円）` });
      opts.__faultDuringBridgeForTest?.('before-growth');
      await emitBridgeGrowthTx(tx, actor, { type: 'finance.damage_charge.bridged', title: 'Financeブリッジ破損請求', entityType: 'DamageLossRecord', entityId: damageId, amount, domainType: 'DAMAGE_CHARGE_FINANCE_BRIDGED' as DomainEventType, aggregateType: 'DamageLossRecord', aggregateId: damageId });
      return { invoiceCandidateId: ic.id };
    },
    { timeout: 20_000 },
  );
}

// ===== 承認申請（候補→正式化の入口。今回は申請まで） =====

/** 仕訳候補を正式仕訳化するための承認申請（journal_finalize は常時承認）。 */
export async function requestJournalFinalize(actor: Actor, candidateId: string) {
  const jc = await prisma.journalCandidate.findFirst({ where: { id: candidateId, tenantId: actor.tenantId } });
  if (!jc) throw new Error('candidate not found');
  const gate = await requireApprovalForDangerousAction({
    tenantId: actor.tenantId,
    action: 'journal_finalize',
    title: `仕訳確定: ${jc.description}（${toNumber(jc.amount)}円）`,
    targetType: 'JournalCandidate',
    targetId: candidateId,
    requestedById: actor.userId,
    riskLevel: 'HIGH',
    payloadAfter: { candidateId },
  });
  await prisma.journalCandidate.update({ where: { id: candidateId }, data: { status: 'pending_approval', approvalId: gate.approvalId ?? null } });
  await emitGrowthEvent({ tenantId: actor.tenantId, type: 'finance.journal_candidate.created', title: `仕訳確定申請: ${jc.description}`, actorId: actor.userId, entityType: 'JournalCandidate', entityId: candidateId });
  return gate;
}

/**
 * 請求候補 → 正式 Invoice 化の承認申請（Phase 1-13 で invoice_finalize に意味分離）。
 * これは「正式化（内部確定）」であり外部送信ではない（外部送信は invoice-send.ts の invoice_send）。
 * 関数名は後方互換のため据え置き（呼び出し元/UIを壊さない）。
 */
export async function requestInvoiceSend(actor: Actor, candidateId: string) {
  const ic = await prisma.invoiceCandidate.findFirst({ where: { id: candidateId, tenantId: actor.tenantId } });
  if (!ic) throw new Error('candidate not found');
  const gate = await requireApprovalForDangerousAction({
    tenantId: actor.tenantId,
    action: 'invoice_finalize',
    title: `請求書の正式化: ${ic.title}（${toNumber(ic.total)}円）`,
    targetType: 'InvoiceCandidate',
    targetId: candidateId,
    requestedById: actor.userId,
    riskLevel: 'HIGH',
    external: false,
    payloadAfter: { candidateId },
  });
  await prisma.invoiceCandidate.update({ where: { id: candidateId }, data: { status: 'pending_approval', approvalId: gate.approvalId ?? null } });
  return gate;
}
