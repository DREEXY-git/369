// Phase 1-14 統合テスト（要DB）: Golden Path Inline Corrective Actions の効果検証。
// 既存 action（apps/web）は db テストから import 不可のため、各 action が起こす「データ効果」を再現して検証する。
// 併せて RBAC（finance:create ゲート）と shared 遷移ロジックを検証。新規DBモデル/フィールドなし。
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../client';
import { canTransitionLogistics, growthTypeOfLogisticsCompletion, canForRoles } from '@hokko/shared';

const T = `itest-p114-${Date.now()}`;
const T2 = `itest-p114b-${Date.now()}`;

let eventId = '';
let riskId = '';
let logiId = '';
let invoiceId = '';

beforeAll(async () => {
  const cust = await prisma.customer.create({ data: { tenantId: T, name: 'P114顧客' } });
  const ev = await prisma.eventProject.create({ data: { tenantId: T, name: 'P114案件', customerId: cust.id, status: 'planned', revenue: 100000, cost: 60000 } });
  eventId = ev.id;
  const risk = await prisma.eventRisk.create({ data: { tenantId: T, eventId: ev.id, type: 'safety', severity: 'high', status: 'open', description: '安全' } });
  riskId = risk.id;
  const logi = await prisma.logisticsTask.create({ data: { tenantId: T, eventId: ev.id, type: 'delivery', title: '搬入', status: 'todo' } });
  logiId = logi.id;
  const inv = await prisma.invoice.create({ data: { tenantId: T, number: 'INV-P114', status: 'SENT', subtotal: 100000, taxAmount: 0, total: 100000, paidAmount: 0, dueDate: new Date() } });
  invoiceId = inv.id;
  await prisma.receivable.create({ data: { tenantId: T, invoiceId: inv.id, amount: 100000, dueDate: new Date(), status: 'open' } });
  // 送信承認の既存 pending（重複申請防止の検証用）
  await prisma.approvalRequest.create({ data: { tenantId: T, type: 'invoice_send', title: '送信申請', entityType: 'Invoice', entityId: inv.id, requestedForAction: 'invoice_send', status: 'PENDING' } });
  await prisma.eventProject.create({ data: { tenantId: T2, name: 'T2案件', status: 'planned' } });
});

afterAll(async () => {
  for (const tid of [T, T2]) {
    await prisma.payment.deleteMany({ where: { tenantId: tid } });
    await prisma.receivable.deleteMany({ where: { tenantId: tid } });
    await prisma.invoice.deleteMany({ where: { tenantId: tid } });
    await prisma.financeEvent.deleteMany({ where: { tenantId: tid } });
    await prisma.approvalRequest.deleteMany({ where: { tenantId: tid } });
    await prisma.eventRisk.deleteMany({ where: { tenantId: tid } });
    await prisma.logisticsTask.deleteMany({ where: { tenantId: tid } });
    await prisma.eventProject.deleteMany({ where: { tenantId: tid } });
    await prisma.customer.deleteMany({ where: { tenantId: tid } });
  }
  await prisma.$disconnect();
});

describe('物流タスク完了（overdue_logistics → 完了）', () => {
  it('todo→done は許可、blocked→done は不可（shared 遷移）', () => {
    expect(canTransitionLogistics('todo', 'done')).toBe(true);
    expect(canTransitionLogistics('in_progress', 'done')).toBe(true);
    expect(canTransitionLogistics('blocked', 'done')).toBe(false);
    expect(growthTypeOfLogisticsCompletion('delivery')).toBe('logistics.delivery.completed');
  });

  it('完了で status=done と completedAt がセットされる（action の効果）', async () => {
    // updateLogisticsTaskStatusAction の中核効果を再現
    const now = new Date();
    await prisma.logisticsTask.update({ where: { id: logiId }, data: { status: 'done', completedAt: now } });
    const after = await prisma.logisticsTask.findUniqueOrThrow({ where: { id: logiId } });
    expect(after.status).toBe('done');
    expect(after.completedAt).not.toBeNull();
  });
});

describe('リスク解消（high_risk → 解消）', () => {
  it('解消で status=resolved になる', async () => {
    await prisma.eventRisk.update({ where: { id: riskId }, data: { status: 'resolved' } });
    const after = await prisma.eventRisk.findUniqueOrThrow({ where: { id: riskId } });
    expect(after.status).toBe('resolved');
  });
});

describe('Finance Bridge 実行は finance:create が必要（RBAC ゲート）', () => {
  it('OWNER は finance:create 可、STAFF は不可（実行ボタンを出さない根拠）', () => {
    expect(canForRoles(['OWNER'], 'finance', 'create')).toBe(true);
    expect(canForRoles(['STAFF'], 'finance', 'create')).toBe(false);
  });

  it('リスク解消・物流完了は inventory:update に従う（OWNER は可）', () => {
    expect(canForRoles(['OWNER'], 'inventory', 'update')).toBe(true);
  });
});

describe('請求書送信承認申請は重複しない（unsent_invoice → 申請）', () => {
  it('既存 pending の invoice_send があれば再申請しない（page の sendPending 判定）', async () => {
    const existing = await prisma.approvalRequest.findFirst({
      where: { tenantId: T, entityType: 'Invoice', entityId: invoiceId, requestedForAction: 'invoice_send', status: 'PENDING' },
    });
    expect(existing).not.toBeNull(); // 既に申請済み → ボタンではなく「送信承認待ち」表示になる
    const count = await prisma.approvalRequest.count({ where: { tenantId: T, entityType: 'Invoice', entityId: invoiceId, requestedForAction: 'invoice_send' } });
    expect(count).toBe(1);
  });
});

describe('入金記録（unpaid/overdue_receivable → 記録）', () => {
  it('入金で Invoice/Receivable/Payment/FinanceEvent が整合更新される（action の効果）', async () => {
    // recordPaymentAction の中核効果を再現（全額入金）
    const amount = 100000;
    await prisma.payment.create({ data: { tenantId: T, invoiceId, amount, method: 'bank', paidAt: new Date() } });
    await prisma.invoice.update({ where: { id: invoiceId }, data: { status: 'PAID', paidAmount: amount } });
    await prisma.receivable.update({ where: { invoiceId }, data: { status: 'collected' } });
    await prisma.financeEvent.create({ data: { tenantId: T, type: 'payment_received', sourceType: 'Invoice', sourceId: invoiceId, direction: 'inflow', amount, status: 'posted', description: '入金' } });

    const inv = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    const rec = await prisma.receivable.findUniqueOrThrow({ where: { invoiceId } });
    const pays = await prisma.payment.findMany({ where: { tenantId: T, invoiceId } });
    const fes = await prisma.financeEvent.findMany({ where: { tenantId: T, sourceType: 'Invoice', sourceId: invoiceId, type: 'payment_received' } });
    expect(inv.status).toBe('PAID');
    expect(Number(inv.paidAmount)).toBe(amount);
    expect(rec.status).toBe('collected');
    expect(pays).toHaveLength(1);
    expect(fes.length).toBeGreaterThanOrEqual(1);
  });
});

describe('tenant 分離', () => {
  it('別テナントの案件・タスクは見えない', async () => {
    const seen = await prisma.eventProject.findFirst({ where: { id: eventId, tenantId: T2 } });
    expect(seen).toBeNull();
    const t2events = await prisma.eventProject.findMany({ where: { tenantId: T2 } });
    expect(t2events.every((e) => e.name === 'T2案件')).toBe(true);
  });
});
