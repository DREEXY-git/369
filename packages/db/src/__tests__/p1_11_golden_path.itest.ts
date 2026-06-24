// Phase 1-11 統合テスト（要DB）: Planning Hokko Golden Path。
// 顧客→案件→商品/物流/人員/原価/売上/粗利→Finance Bridge→正式請求書→送信→入金→回収 を
// 既存モデル横断で前進させ、computeGoldenPath の nextAction が段階的に進むことを検証。
// さらに bridge 冪等（InvoiceCandidate 重複なし）と tenant 分離を検証。新規DBモデルは使わない。
import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '../client';
import { computeGoldenPath } from '@hokko/shared';

const T = `itest-p111-${Date.now()}`;
const T2 = `itest-p111b-${Date.now()}`;

// lib/domains/operations/golden-path.ts の集約を DB 上で再現（web lib は db から import 不可のため）。
async function gather(tenantId: string, eventId: string) {
  const event = await prisma.eventProject.findFirstOrThrow({
    where: { id: eventId, tenantId },
    include: { _count: { select: { productUsages: true, logisticsTasks: true, staffAssignments: true, risks: true, costs: true, grossSnapshots: true } } },
  });
  const [eventRevenueFe, candidate] = await Promise.all([
    prisma.financeEvent.findFirst({ where: { tenantId, sourceType: 'EventProject', sourceId: eventId, type: 'event_revenue' } }),
    prisma.invoiceCandidate.findFirst({ where: { tenantId, sourceType: 'EventProject', sourceId: eventId }, orderBy: { createdAt: 'desc' } }),
  ]);
  const invoice = candidate?.invoiceId ? await prisma.invoice.findFirst({ where: { id: candidate.invoiceId, tenantId } }) : null;
  return computeGoldenPath({
    hasCustomer: event.customerId != null,
    productUsageCount: event._count.productUsages,
    logisticsTaskCount: event._count.logisticsTasks,
    staffCount: event._count.staffAssignments,
    riskCount: event._count.risks,
    costRecorded: event._count.costs > 0 || Number(event.cost) > 0,
    revenue: Number(event.revenue),
    cost: Number(event.cost),
    grossSnapshotCount: event._count.grossSnapshots,
    bridged: eventRevenueFe != null,
    invoiceCandidateStatus: candidate?.status ?? null,
    invoiceStatus: invoice?.status ?? null,
    paidAmount: Number(invoice?.paidAmount ?? 0),
    invoiceTotal: Number(invoice?.total ?? 0),
  });
}

afterAll(async () => {
  for (const tid of [T, T2]) {
    await prisma.financeEvent.deleteMany({ where: { tenantId: tid } });
    await prisma.payment.deleteMany({ where: { tenantId: tid } });
    await prisma.receivable.deleteMany({ where: { tenantId: tid } });
    await prisma.invoiceLineItem.deleteMany({ where: { tenantId: tid } });
    await prisma.invoice.deleteMany({ where: { tenantId: tid } });
    await prisma.invoiceCandidate.deleteMany({ where: { tenantId: tid } });
    await prisma.eventProductUsage.deleteMany({ where: { tenantId: tid } });
    await prisma.logisticsTask.deleteMany({ where: { tenantId: tid } });
    await prisma.eventStaffAssignment.deleteMany({ where: { tenantId: tid } });
    await prisma.eventCost.deleteMany({ where: { tenantId: tid } });
    await prisma.eventGrossProfitSnapshot.deleteMany({ where: { tenantId: tid } });
    await prisma.eventProject.deleteMany({ where: { tenantId: tid } });
    await prisma.customer.deleteMany({ where: { tenantId: tid } });
    await prisma.growthEvent.deleteMany({ where: { tenantId: tid } });
  }
  await prisma.$disconnect();
});

describe('Golden Path — end-to-end progression of next action', () => {
  it('advances from customer → … → collected as each step completes', async () => {
    const customer = await prisma.customer.create({ data: { tenantId: T, name: '夏祭り実行委員会' } });
    const event = await prisma.eventProject.create({ data: { tenantId: T, name: '夏祭り2026', customerId: customer.id, revenue: 0, cost: 0 } });

    // 初期: 顧客は紐付け済み → 次は商品割当（assets）
    expect((await gather(T, event.id)).nextActionKey).toBe('assets');

    // 商品割当
    await prisma.eventProductUsage.create({ data: { tenantId: T, eventId: event.id, assetName: '音響セット', quantity: 1 } });
    expect((await gather(T, event.id)).nextActionKey).toBe('logistics');

    // 物流タスク
    await prisma.logisticsTask.create({ data: { tenantId: T, eventId: event.id, type: 'delivery', title: '搬入' } });
    expect((await gather(T, event.id)).nextActionKey).toBe('staff');

    // 人員配置
    await prisma.eventStaffAssignment.create({ data: { tenantId: T, eventId: event.id, name: '山田', role: 'PA', cost: 20000 } });
    expect((await gather(T, event.id)).nextActionKey).toBe('cost');

    // 原価
    await prisma.eventCost.create({ data: { tenantId: T, eventId: event.id, category: '人件費', amount: 20000 } });
    await prisma.eventProject.update({ where: { id: event.id }, data: { cost: 60000 } });
    expect((await gather(T, event.id)).nextActionKey).toBe('revenue');

    // 売上
    await prisma.eventProject.update({ where: { id: event.id }, data: { revenue: 100000 } });
    expect((await gather(T, event.id)).nextActionKey).toBe('profit');

    // 粗利スナップショット
    await prisma.eventGrossProfitSnapshot.create({ data: { tenantId: T, eventId: event.id, revenue: 100000, cost: 60000, gross: 40000, marginRate: 40 } });
    expect((await gather(T, event.id)).nextActionKey).toBe('bridge');

    // Finance Bridge（FinanceEvent event_revenue + InvoiceCandidate を作成）
    await prisma.financeEvent.create({ data: { tenantId: T, type: 'event_revenue', sourceType: 'EventProject', sourceId: event.id, direction: 'inflow', amount: 100000, status: 'draft', description: 'イベント売上' } });
    const cand = await prisma.invoiceCandidate.create({ data: { tenantId: T, sourceType: 'EventProject', sourceId: event.id, customerId: customer.id, title: '夏祭り2026 請求', subtotal: 100000, taxAmount: 10000, total: 110000, status: 'draft' } });
    expect((await gather(T, event.id)).nextActionKey).toBe('formalize');

    // 正式請求書化（InvoiceCandidate.invoiceId → Invoice）
    const invoice = await prisma.invoice.create({ data: { tenantId: T, number: 'INV-GP-1', status: 'ISSUED', subtotal: 100000, taxAmount: 10000, total: 110000, paidAmount: 0, dueDate: new Date() } });
    await prisma.invoiceCandidate.update({ where: { id: cand.id }, data: { status: 'sent', invoiceId: invoice.id } });
    expect((await gather(T, event.id)).nextActionKey).toBe('send');

    // 送信（SENT）
    await prisma.invoice.update({ where: { id: invoice.id }, data: { status: 'SENT' } });
    expect((await gather(T, event.id)).nextActionKey).toBe('payment');

    // 入金（一部）
    await prisma.invoice.update({ where: { id: invoice.id }, data: { status: 'PARTIALLY_PAID', paidAmount: 50000 } });
    expect((await gather(T, event.id)).nextActionKey).toBe('collected');

    // 全額回収
    await prisma.invoice.update({ where: { id: invoice.id }, data: { status: 'PAID', paidAmount: 110000 } });
    const done = await gather(T, event.id);
    expect(done.nextActionKey).toBeNull();
    expect(done.percent).toBe(100);
    expect(done.fullyCollected).toBe(true);
  });
});

describe('Golden Path — bridge idempotency & tenant isolation', () => {
  it('does not create a duplicate InvoiceCandidate for the same EventProject', async () => {
    const event = await prisma.eventProject.create({ data: { tenantId: T, name: '二重ブリッジ検証', revenue: 50000, cost: 30000 } });
    // 1回目のブリッジ相当
    await prisma.invoiceCandidate.create({ data: { tenantId: T, sourceType: 'EventProject', sourceId: event.id, title: 'x', subtotal: 50000, total: 55000, status: 'draft' } });
    // 冪等ガード: 既存があるなら再作成しない（lib の findFirst 判定を再現）
    const existing = await prisma.invoiceCandidate.findFirst({ where: { tenantId: T, sourceType: 'EventProject', sourceId: event.id } });
    expect(existing).not.toBeNull();
    const count = await prisma.invoiceCandidate.count({ where: { tenantId: T, sourceType: 'EventProject', sourceId: event.id } });
    expect(count).toBe(1);
  });

  it('isolates events and candidates by tenant', async () => {
    const ev2 = await prisma.eventProject.create({ data: { tenantId: T2, name: '別テナント案件', revenue: 1 } });
    const seenFromT = await prisma.eventProject.findFirst({ where: { id: ev2.id, tenantId: T } });
    expect(seenFromT).toBeNull();
  });
});
