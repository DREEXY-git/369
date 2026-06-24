// Operations→Finance ブリッジのドメインサービス（書き込みロジックの本体）。Phase 1-8。
// 設計ルール: docs/audit/12_maintenance_architecture.md。Server Action はこのサービスを呼ぶだけ。
import { prisma, writeAudit } from '@/lib/db';
import { emitGrowthEvent } from '@/lib/growth';
import { requireApprovalForDangerousAction } from '@/lib/approval';
import { toNumber } from '@/lib/utils';
import {
  financeEventDirection,
  journalCandidateFor,
  invoiceCandidateTotals,
  type FinanceEventType,
  type FinanceDirection,
  type JournalKind,
  type DomainEventType,
} from '@hokko/shared';

export interface Actor {
  tenantId: string;
  userId?: string | null;
}

const DUE_DEFAULT_DAYS = 30;
function defaultDue(): Date {
  return new Date(Date.now() + DUE_DEFAULT_DAYS * 86_400_000);
}

// ===== 低レベル: 台帳/候補の1件作成 =====

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

/** FinanceEvent を1件記録。growthType 指定時は GrowthEvent も発火。 */
export async function emitFinanceEvent(actor: Actor, input: EmitFinanceEventInput, growthType?: string) {
  const direction = input.direction ?? financeEventDirection(input.type);
  const fe = await prisma.financeEvent.create({
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
      payload: (input.payload ?? undefined) as object | undefined,
      createdById: actor.userId ?? null,
    },
  });
  if (growthType) {
    await emitGrowthEvent({
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

export async function createJournalCandidate(actor: Actor, input: CreateJournalCandidateInput) {
  const map = journalCandidateFor(input.kind);
  const jc = await prisma.journalCandidate.create({
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
  await emitGrowthEvent({
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

export async function createInvoiceCandidate(actor: Actor, input: CreateInvoiceCandidateInput) {
  const t = invoiceCandidateTotals(input.subtotal);
  const ic = await prisma.invoiceCandidate.create({
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
  await emitFinanceEvent(actor, {
    type: 'invoice_candidate',
    sourceType: 'InvoiceCandidate',
    sourceId: ic.id,
    amount: t.total,
    direction: 'inflow',
    dueAt: input.dueAt ?? null,
    description: input.title,
  });
  await emitGrowthEvent({
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

// ===== 高レベル: 各 Operations 起点のブリッジ =====

/** イベント案件 → 売上/原価の FinanceEvent・仕訳候補・請求候補・入金予定。 */
export async function bridgeEventProjectToFinance(actor: Actor, eventId: string) {
  const event = await prisma.eventProject.findFirst({
    where: { id: eventId, tenantId: actor.tenantId },
    include: { costs: true },
  });
  if (!event) throw new Error('event not found');
  // 冪等: 既にブリッジ済みなら二重生成しない（event detail / bridge 画面どちらから来ても安全）。
  const existing = await prisma.invoiceCandidate.findFirst({
    where: { tenantId: actor.tenantId, sourceType: 'EventProject', sourceId: eventId },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });
  if (existing) return { invoiceCandidateId: existing.id, alreadyBridged: true };
  const revenue = toNumber(event.revenue);
  const cost = Math.max(toNumber(event.cost), event.costs.reduce((s, c) => s + toNumber(c.amount), 0));
  const dueAt = defaultDue();

  await emitFinanceEvent(actor, { type: 'event_revenue', sourceType: 'EventProject', sourceId: eventId, amount: revenue, description: `イベント売上: ${event.name}` }, 'finance.event.created');
  await emitFinanceEvent(actor, { type: 'event_cost', sourceType: 'EventProject', sourceId: eventId, amount: cost, description: `イベント原価: ${event.name}` });
  await createJournalCandidate(actor, { kind: 'revenue', sourceType: 'EventProject', sourceId: eventId, amount: revenue });
  await createJournalCandidate(actor, { kind: 'cost', sourceType: 'EventProject', sourceId: eventId, amount: cost });
  const ic = await createInvoiceCandidate(actor, { sourceType: 'EventProject', sourceId: eventId, customerId: event.customerId, title: `${event.name} 請求`, subtotal: revenue, dueAt });
  await emitFinanceEvent(actor, { type: 'cashflow_expected', sourceType: 'InvoiceCandidate', sourceId: ic.id, amount: toNumber(ic.total), direction: 'inflow', dueAt, description: `入金予定: ${event.name}` }, 'finance.cashflow_expected.created');

  await writeAudit({ tenantId: actor.tenantId, actorId: actor.userId, action: 'finance_bridge', entityType: 'EventProject', entityId: eventId, summary: `イベント案件をFinanceへブリッジ: ${event.name}（売上${revenue}/原価${cost}）` });
  await emitGrowthEvent({ tenantId: actor.tenantId, type: 'finance.event_project.bridged', title: `Financeブリッジ: ${event.name}`, actorId: actor.userId, entityType: 'EventProject', entityId: eventId, alsoDomainEvent: { domainType: 'EVENT_PROJECT_FINANCE_BRIDGED' as DomainEventType, aggregateType: 'EventProject', aggregateId: eventId } });
  return { invoiceCandidateId: ic.id, alreadyBridged: false };
}

/** 発注 → 買掛の FinanceEvent・仕訳候補・支払予定。 */
export async function bridgePurchaseOrderToFinance(actor: Actor, poId: string) {
  const po = await prisma.purchaseOrder.findFirst({ where: { id: poId, tenantId: actor.tenantId } });
  if (!po) throw new Error('po not found');
  const amount = toNumber(po.totalAmount);
  const dueAt = po.expectedAt ?? defaultDue();

  await emitFinanceEvent(actor, { type: 'purchase_order', sourceType: 'PurchaseOrder', sourceId: poId, amount, description: `発注: ${po.orderNo}` }, 'finance.event.created');
  await emitFinanceEvent(actor, { type: 'payment_expected', sourceType: 'PurchaseOrder', sourceId: poId, amount, direction: 'outflow', dueAt, description: `支払予定: ${po.orderNo}` });
  await createJournalCandidate(actor, { kind: 'purchase', sourceType: 'PurchaseOrder', sourceId: poId, amount });
  await emitFinanceEvent(actor, { type: 'cashflow_expected', sourceType: 'PurchaseOrder', sourceId: poId, amount, direction: 'outflow', dueAt, description: `支払予定: ${po.orderNo}` }, 'finance.cashflow_expected.created');

  await writeAudit({ tenantId: actor.tenantId, actorId: actor.userId, action: 'finance_bridge', entityType: 'PurchaseOrder', entityId: poId, summary: `発注をFinanceへブリッジ: ${po.orderNo}（${amount}円）` });
  await emitGrowthEvent({ tenantId: actor.tenantId, type: 'finance.purchase_order.bridged', title: `Financeブリッジ発注: ${po.orderNo}`, actorId: actor.userId, entityType: 'PurchaseOrder', entityId: poId, amount, alsoDomainEvent: { domainType: 'PURCHASE_ORDER_FINANCE_BRIDGED' as DomainEventType, aggregateType: 'PurchaseOrder', aggregateId: poId } });
}

/** 破損記録 → 破損請求の請求候補・仕訳候補・入金予定。 */
export async function bridgeDamageChargeToInvoiceCandidate(actor: Actor, damageId: string) {
  const dmg = await prisma.damageLossRecord.findFirst({ where: { id: damageId, tenantId: actor.tenantId } });
  if (!dmg) throw new Error('damage record not found');
  const amount = toNumber(dmg.cost);
  const dueAt = defaultDue();

  await emitFinanceEvent(actor, { type: 'damage_charge', sourceType: 'DamageLossRecord', sourceId: damageId, amount, direction: 'inflow', description: `破損請求: ${dmg.note || damageId}` }, 'finance.event.created');
  const ic = await createInvoiceCandidate(actor, { sourceType: 'DamageLossRecord', sourceId: damageId, title: `破損請求 ${dmg.note ?? ''}`.trim(), subtotal: amount, dueAt });
  await createJournalCandidate(actor, { kind: 'damage', sourceType: 'DamageLossRecord', sourceId: damageId, amount });
  await emitFinanceEvent(actor, { type: 'cashflow_expected', sourceType: 'InvoiceCandidate', sourceId: ic.id, amount: toNumber(ic.total), direction: 'inflow', dueAt, description: '入金予定: 破損請求' }, 'finance.cashflow_expected.created');

  await writeAudit({ tenantId: actor.tenantId, actorId: actor.userId, action: 'finance_bridge', entityType: 'DamageLossRecord', entityId: damageId, summary: `破損請求をFinanceへブリッジ（${amount}円）` });
  await emitGrowthEvent({ tenantId: actor.tenantId, type: 'finance.damage_charge.bridged', title: 'Financeブリッジ破損請求', actorId: actor.userId, entityType: 'DamageLossRecord', entityId: damageId, amount, alsoDomainEvent: { domainType: 'DAMAGE_CHARGE_FINANCE_BRIDGED' as DomainEventType, aggregateType: 'DamageLossRecord', aggregateId: damageId } });
  return { invoiceCandidateId: ic.id };
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

/** 請求候補を送信するための承認申請（invoice_send は常時承認）。 */
export async function requestInvoiceSend(actor: Actor, candidateId: string) {
  const ic = await prisma.invoiceCandidate.findFirst({ where: { id: candidateId, tenantId: actor.tenantId } });
  if (!ic) throw new Error('candidate not found');
  const gate = await requireApprovalForDangerousAction({
    tenantId: actor.tenantId,
    action: 'invoice_send',
    title: `請求送信: ${ic.title}（${toNumber(ic.total)}円）`,
    targetType: 'InvoiceCandidate',
    targetId: candidateId,
    requestedById: actor.userId,
    riskLevel: 'HIGH',
    external: true,
    payloadAfter: { candidateId },
  });
  await prisma.invoiceCandidate.update({ where: { id: candidateId }, data: { status: 'pending_approval', approvalId: gate.approvalId ?? null } });
  return gate;
}
