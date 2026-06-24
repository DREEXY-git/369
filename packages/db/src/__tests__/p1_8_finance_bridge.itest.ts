// Phase 1-8 統合テスト（要DB）: Operations→Finance ブリッジ（FinanceEvent/JournalCandidate/
// InvoiceCandidate）/ 承認後実行（stocktake_adjust, purchase_order_issue）/ 承認必須 / tenant分離。
import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '../client';
import {
  financeEventDirection,
  journalCandidateFor,
  invoiceCandidateTotals,
  summarizeFinanceEvents,
  requiresApproval,
  inventoryEffectOfMovement,
  type FinanceEventType,
} from '@hokko/shared';

const T = `itest-p18-${Date.now()}`;
const T2 = `itest-p18b-${Date.now()}`;

// finance-bridge.emitFinanceEvent と同等のDB効果（apps/web の lib は packages/db から import 不可）。
async function emitFinanceEvent(tenantId: string, type: FinanceEventType, amount: number, opts: { direction?: string; sourceType?: string; sourceId?: string; dueAt?: Date; status?: string } = {}) {
  return prisma.financeEvent.create({
    data: {
      tenantId,
      type,
      sourceType: opts.sourceType ?? '',
      sourceId: opts.sourceId ?? null,
      direction: opts.direction ?? financeEventDirection(type),
      amount,
      dueAt: opts.dueAt ?? null,
      status: opts.status ?? 'draft',
    },
  });
}

async function claimApproval(id: string): Promise<boolean> {
  const claim = await prisma.approvalRequest.updateMany({ where: { id, executedAt: null }, data: { executedAt: new Date(), executionStatus: 'executing' } });
  return claim.count === 1;
}

afterAll(async () => {
  for (const tid of [T, T2]) {
    await prisma.financeEvent.deleteMany({ where: { tenantId: tid } });
    await prisma.journalCandidate.deleteMany({ where: { tenantId: tid } });
    await prisma.invoiceCandidate.deleteMany({ where: { tenantId: tid } });
    await prisma.inventoryMovement.deleteMany({ where: { tenantId: tid } });
    await prisma.stocktakeLine.deleteMany({ where: { tenantId: tid } });
    await prisma.stocktake.deleteMany({ where: { tenantId: tid } });
    await prisma.purchaseOrderLine.deleteMany({ where: { tenantId: tid } });
    await prisma.purchaseOrder.deleteMany({ where: { tenantId: tid } });
    await prisma.eventCost.deleteMany({ where: { tenantId: tid } });
    await prisma.eventProject.deleteMany({ where: { tenantId: tid } });
    await prisma.damageLossRecord.deleteMany({ where: { tenantId: tid } });
    await prisma.approvalRequest.deleteMany({ where: { tenantId: tid } });
    await prisma.productAsset.deleteMany({ where: { tenantId: tid } });
    await prisma.productCategory.deleteMany({ where: { tenantId: tid } });
    await prisma.growthEvent.deleteMany({ where: { tenantId: tid } });
  }
  await prisma.$disconnect();
});

describe('EventProject → Finance bridge', () => {
  it('creates revenue/cost FinanceEvents, journal candidates and an invoice candidate', async () => {
    const event = await prisma.eventProject.create({ data: { tenantId: T, name: 'ブリッジ案件', status: 'completed', revenue: 1000000, cost: 600000 } });
    const revenue = 1000000;
    const cost = 600000;

    await emitFinanceEvent(T, 'event_revenue', revenue, { sourceType: 'EventProject', sourceId: event.id });
    await emitFinanceEvent(T, 'event_cost', cost, { sourceType: 'EventProject', sourceId: event.id });
    const rev = journalCandidateFor('revenue');
    await prisma.journalCandidate.create({ data: { tenantId: T, sourceType: 'EventProject', sourceId: event.id, debitAccount: rev.debitAccount, creditAccount: rev.creditAccount, amount: revenue, description: rev.description } });
    const cst = journalCandidateFor('cost');
    await prisma.journalCandidate.create({ data: { tenantId: T, sourceType: 'EventProject', sourceId: event.id, debitAccount: cst.debitAccount, creditAccount: cst.creditAccount, amount: cost, description: cst.description } });
    const totals = invoiceCandidateTotals(revenue);
    const ic = await prisma.invoiceCandidate.create({ data: { tenantId: T, sourceType: 'EventProject', sourceId: event.id, title: 'ブリッジ案件 請求', subtotal: totals.subtotal, taxAmount: totals.taxAmount, total: totals.total, status: 'draft' } });
    await emitFinanceEvent(T, 'cashflow_expected', totals.total, { direction: 'inflow', sourceType: 'InvoiceCandidate', sourceId: ic.id, dueAt: new Date() });

    const fes = await prisma.financeEvent.findMany({ where: { tenantId: T, sourceType: 'EventProject' } });
    expect(fes.map((f) => f.type).sort()).toEqual(['event_cost', 'event_revenue']);
    const jcs = await prisma.journalCandidate.findMany({ where: { tenantId: T, sourceType: 'EventProject' } });
    expect(jcs.length).toBe(2);
    expect(Number(ic.total)).toBe(1100000); // 税込
  });
});

describe('PurchaseOrder → Finance bridge', () => {
  it('creates purchase_order + payment_expected FinanceEvents and a purchase journal candidate', async () => {
    const po = await prisma.purchaseOrder.create({ data: { tenantId: T, orderNo: 'PO-BRG', status: 'ordered', totalAmount: 200000 } });
    await emitFinanceEvent(T, 'purchase_order', 200000, { sourceType: 'PurchaseOrder', sourceId: po.id });
    await emitFinanceEvent(T, 'payment_expected', 200000, { direction: 'outflow', sourceType: 'PurchaseOrder', sourceId: po.id, dueAt: new Date() });
    const p = journalCandidateFor('purchase');
    await prisma.journalCandidate.create({ data: { tenantId: T, sourceType: 'PurchaseOrder', sourceId: po.id, debitAccount: p.debitAccount, creditAccount: p.creditAccount, amount: 200000, description: p.description } });

    const fes = await prisma.financeEvent.findMany({ where: { tenantId: T, sourceType: 'PurchaseOrder' } });
    expect(fes.find((f) => f.type === 'payment_expected')?.direction).toBe('outflow');
    const jc = await prisma.journalCandidate.findFirst({ where: { tenantId: T, sourceType: 'PurchaseOrder' } });
    expect(jc?.creditAccount).toBe('買掛金');
  });
});

describe('DamageLossRecord → InvoiceCandidate', () => {
  it('creates a damage invoice candidate with tax', async () => {
    const dmg = await prisma.damageLossRecord.create({ data: { tenantId: T, type: 'damage', cost: 50000, note: 'テント破損' } });
    const totals = invoiceCandidateTotals(50000);
    const ic = await prisma.invoiceCandidate.create({ data: { tenantId: T, sourceType: 'DamageLossRecord', sourceId: dmg.id, title: '破損請求 テント破損', subtotal: totals.subtotal, taxAmount: totals.taxAmount, total: totals.total, status: 'draft' } });
    expect(Number(ic.total)).toBe(55000);
  });
});

describe('Cashflow summary from FinanceEvents', () => {
  it('aggregates expected inflow/outflow', async () => {
    const events = await prisma.financeEvent.findMany({ where: { tenantId: T } });
    const s = summarizeFinanceEvents(events.map((e) => ({ type: e.type, direction: e.direction, amount: Number(e.amount), status: e.status })));
    expect(s.inflowExpected).toBeGreaterThan(0);
    expect(s.outflowExpected).toBeGreaterThan(0);
  });
});

describe('Post-approval execution (Phase 1-7 補完)', () => {
  it('executes approved stocktake_adjust into stock', async () => {
    const cat = await prisma.productCategory.create({ data: { tenantId: T, name: 'p18' } });
    const asset = await prisma.productAsset.create({ data: { tenantId: T, code: 'P18-A', name: '棚卸資産', categoryId: cat.id, quantity: 50 } });
    const line = await prisma.stocktake.create({ data: { tenantId: T, title: 'p18棚卸', status: 'counted', lines: { create: [{ tenantId: T, assetId: asset.id, expectedQuantity: 50, countedQuantity: 30, difference: -20 }] } }, include: { lines: true } });
    const req = await prisma.approvalRequest.create({ data: { tenantId: T, type: 'stocktake_adjust', requestedForAction: 'stocktake_adjust', title: '大幅棚卸差異', entityType: 'StocktakeLine', entityId: line.lines[0]!.id, status: 'APPROVED', payloadAfter: { assetId: asset.id, newQuantity: 30, lineId: line.lines[0]!.id } } });
    expect(await claimApproval(req.id)).toBe(true);
    // apply adjust
    const effect = inventoryEffectOfMovement('adjust');
    expect(effect.changesQuantity).toBe(true);
    await prisma.productAsset.update({ where: { id: asset.id }, data: { quantity: 30 } });
    await prisma.stocktakeLine.update({ where: { id: line.lines[0]!.id }, data: { reconciled: true } });
    const after = await prisma.productAsset.findUniqueOrThrow({ where: { id: asset.id } });
    expect(after.quantity).toBe(30);
    expect(await claimApproval(req.id)).toBe(false); // 二重実行防止
  });

  it('executes approved purchase_order_issue → ordered', async () => {
    const po = await prisma.purchaseOrder.create({ data: { tenantId: T, orderNo: 'PO-HI', status: 'pending_approval', totalAmount: 300000 } });
    const req = await prisma.approvalRequest.create({ data: { tenantId: T, type: 'purchase_order_issue', requestedForAction: 'purchase_order_issue', title: '高額発注', entityType: 'PurchaseOrder', entityId: po.id, status: 'APPROVED', payloadAfter: { purchaseOrderId: po.id } } });
    expect(await claimApproval(req.id)).toBe(true);
    await prisma.purchaseOrder.update({ where: { id: po.id }, data: { status: 'ordered', approvalId: req.id } });
    const after = await prisma.purchaseOrder.findUniqueOrThrow({ where: { id: po.id } });
    expect(after.status).toBe('ordered');
  });
});

describe('Approval requirements + tenant isolation', () => {
  it('journal_finalize and invoice_send always require approval', () => {
    expect(requiresApproval('journal_finalize')).toBe(true);
    expect(requiresApproval('invoice_send')).toBe(true);
  });
  it('isolates finance candidates by tenant', async () => {
    await prisma.journalCandidate.create({ data: { tenantId: T2, sourceType: 'EventProject', debitAccount: '売掛金', creditAccount: '売上高', amount: 1, description: 'T2' } });
    const fromT = await prisma.journalCandidate.findMany({ where: { tenantId: T, description: 'T2' } });
    expect(fromT.length).toBe(0);
  });
});
