// Phase 1-10 統合テスト（要DB）: 請求送信ゲート（承認後SENT・二重防止）/ 入金消込
// （Payment→Invoice/Receivable/FinanceEvent）/ cashflow集計 / tenant分離。
import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '../client';
import {
  canSendInvoice,
  invoiceStatusAfterPayment,
  receivableStatusAfterPayment,
  summarizeCashflowActualVsExpected,
  requiresApproval,
  canForRoles,
  type RoleKey,
} from '@hokko/shared';

const T = `itest-p110-${Date.now()}`;
const T2 = `itest-p110b-${Date.now()}`;

async function claimApproval(id: string): Promise<boolean> {
  const claim = await prisma.approvalRequest.updateMany({ where: { id, executedAt: null }, data: { executedAt: new Date(), executionStatus: 'executing' } });
  return claim.count === 1;
}

async function makeInvoice(tenantId: string, total: number, status = 'ISSUED') {
  return prisma.invoice.create({
    data: { tenantId, number: `INV-${Math.random().toString(36).slice(2, 7)}`, status: status as never, subtotal: total, taxAmount: 0, total, paidAmount: 0, dueDate: new Date(), lineItems: { create: [{ tenantId, name: '品目', quantity: 1, unitPrice: total, amount: total }] } },
  });
}

afterAll(async () => {
  for (const tid of [T, T2]) {
    await prisma.financeEvent.deleteMany({ where: { tenantId: tid } });
    await prisma.payment.deleteMany({ where: { tenantId: tid } });
    await prisma.receivable.deleteMany({ where: { tenantId: tid } });
    await prisma.invoiceLineItem.deleteMany({ where: { tenantId: tid } });
    await prisma.invoice.deleteMany({ where: { tenantId: tid } });
    await prisma.approvalRequest.deleteMany({ where: { tenantId: tid } });
    await prisma.growthEvent.deleteMany({ where: { tenantId: tid } });
  }
  await prisma.$disconnect();
});

describe('Invoice external send gate', () => {
  it('creates an invoice_send approval and sends only after approval (→ SENT)', async () => {
    const inv = await makeInvoice(T, 110000, 'ISSUED');
    expect(canSendInvoice(inv.status)).toBe(true);
    const req = await prisma.approvalRequest.create({ data: { tenantId: T, type: 'invoice_send', requestedForAction: 'invoice_send', title: '請求送信', entityType: 'Invoice', entityId: inv.id, status: 'APPROVED', payloadAfter: { invoiceId: inv.id } } });

    // 承認後実行（claim → SENT）
    expect(await claimApproval(req.id)).toBe(true);
    await prisma.invoice.update({ where: { id: inv.id }, data: { status: 'SENT' } });
    await prisma.financeEvent.create({ data: { tenantId: T, type: 'payment_expected', sourceType: 'Invoice', sourceId: inv.id, direction: 'inflow', amount: 110000, status: 'approved', description: '入金予定' } });
    const after = await prisma.invoice.findUniqueOrThrow({ where: { id: inv.id } });
    expect(after.status).toBe('SENT');
    expect(canSendInvoice(after.status)).toBe(false); // 二重送信不可
  });

  it('prevents double send via atomic claim', async () => {
    const req = await prisma.approvalRequest.findFirstOrThrow({ where: { tenantId: T, requestedForAction: 'invoice_send' } });
    expect(await claimApproval(req.id)).toBe(false);
  });
});

describe('Payment reconciliation', () => {
  it('partial then full payment updates Invoice/Receivable/FinanceEvent', async () => {
    const inv = await makeInvoice(T, 100000, 'SENT');
    await prisma.receivable.create({ data: { tenantId: T, invoiceId: inv.id, amount: 100000, status: 'open' } });

    // 一部入金 40,000
    await prisma.payment.create({ data: { tenantId: T, invoiceId: inv.id, amount: 40000, method: 'bank' } });
    let paid = 40000;
    await prisma.invoice.update({ where: { id: inv.id }, data: { paidAmount: paid, status: invoiceStatusAfterPayment(100000, paid) as never } });
    await prisma.receivable.updateMany({ where: { invoiceId: inv.id }, data: { status: receivableStatusAfterPayment(100000, paid) } });
    await prisma.financeEvent.create({ data: { tenantId: T, type: 'payment_received', sourceType: 'Invoice', sourceId: inv.id, direction: 'inflow', amount: 40000, status: 'posted', description: '入金' } });

    let cur = await prisma.invoice.findUniqueOrThrow({ where: { id: inv.id } });
    expect(cur.status).toBe('PARTIALLY_PAID');
    let rec = await prisma.receivable.findFirstOrThrow({ where: { invoiceId: inv.id } });
    expect(rec.status).toBe('open');

    // 残額入金 60,000 → 全額
    await prisma.payment.create({ data: { tenantId: T, invoiceId: inv.id, amount: 60000, method: 'bank' } });
    paid = 100000;
    await prisma.invoice.update({ where: { id: inv.id }, data: { paidAmount: paid, status: invoiceStatusAfterPayment(100000, paid) as never } });
    await prisma.receivable.updateMany({ where: { invoiceId: inv.id }, data: { status: receivableStatusAfterPayment(100000, paid) } });
    await prisma.financeEvent.create({ data: { tenantId: T, type: 'payment_received', sourceType: 'Invoice', sourceId: inv.id, direction: 'inflow', amount: 60000, status: 'posted', description: '入金' } });

    cur = await prisma.invoice.findUniqueOrThrow({ where: { id: inv.id } });
    expect(cur.status).toBe('PAID');
    expect(Number(cur.paidAmount)).toBe(100000);
    rec = await prisma.receivable.findFirstOrThrow({ where: { invoiceId: inv.id } });
    expect(rec.status).toBe('collected');

    const received = await prisma.financeEvent.count({ where: { tenantId: T, sourceId: inv.id, type: 'payment_received' } });
    expect(received).toBe(2);
  });
});

describe('Cashflow summary + approval + tenant isolation', () => {
  it('summarizes actual vs expected from FinanceEvents', async () => {
    const events = await prisma.financeEvent.findMany({ where: { tenantId: T } });
    const s = summarizeCashflowActualVsExpected(events.map((e) => ({ type: e.type, direction: e.direction, amount: Number(e.amount), status: e.status })));
    expect(s.inflowActual).toBeGreaterThan(0); // payment_received posted
  });

  it('invoice_send requires approval', () => {
    expect(requiresApproval('invoice_send')).toBe(true);
  });

  it('外部送信申請/承認済み送信実行/入金記録の権限境界 = invoice:update かつ finance:read（STAFF は finance:read 不足で不可）', () => {
    // 対象 server action（requestInvoiceExternalSendApprovalAction /
    // executeApprovedInvoiceExternalSendAction / recordPaymentAction）が server 側で要求する複合ガードと
    // 同一の判定を RBAC レベルで検証する（'use server' のため db テストから直接 import 不可）。dunning と同一境界。
    const canFinanceInvoiceAction = (roles: RoleKey[]) =>
      canForRoles(roles, 'invoice', 'update') && canForRoles(roles, 'finance', 'read');
    expect(canFinanceInvoiceAction(['OWNER'])).toBe(true);
    expect(canFinanceInvoiceAction(['EXECUTIVE'])).toBe(true);
    expect(canFinanceInvoiceAction(['DEPARTMENT_MANAGER'])).toBe(true);
    // STAFF は invoice:update を持つが finance:read を持たない → 複合ガードで遮断（UI 非表示だけに依存しない）。
    expect(canFinanceInvoiceAction(['STAFF'])).toBe(false);
    expect(canForRoles(['STAFF'], 'invoice', 'update')).toBe(true);
    expect(canForRoles(['STAFF'], 'finance', 'read')).toBe(false);
    // ADMIN は invoice:update を持たない（更新権限は admin/audit/backup/knowledge のみ）ため従来どおり不可。
    expect(canForRoles(['ADMIN'], 'invoice', 'update')).toBe(false);
    expect(canFinanceInvoiceAction(['ADMIN'])).toBe(false);
    // READ_ONLY / EXTERNAL 系は invoice:update を持たないため従来どおり不可。
    expect(canFinanceInvoiceAction(['READ_ONLY'])).toBe(false);
    expect(canFinanceInvoiceAction(['EXTERNAL_EXPERT'])).toBe(false);
    expect(canFinanceInvoiceAction(['EXTERNAL_PARTNER'])).toBe(false);
  });

  it('請求発行(issueInvoiceAction)の権限境界 = invoice:update かつ finance:read。下書き作成(create)は invoice:create のまま', () => {
    // Phase 1-17: 発行（DRAFT→ISSUED＋Receivable 起票＝財務確定）を finance 機密境界へ統一。
    // create（DRAFT 生成のみ）は据置＝STAFF も可（営業の下書き作成を止めない）。
    const canIssue = (roles: RoleKey[]) =>
      canForRoles(roles, 'invoice', 'update') && canForRoles(roles, 'finance', 'read');
    expect(canIssue(['OWNER'])).toBe(true);
    expect(canIssue(['EXECUTIVE'])).toBe(true);
    expect(canIssue(['DEPARTMENT_MANAGER'])).toBe(true);
    // STAFF は invoice:update を持つが finance:read 非保有 → 発行は server 側で遮断。
    expect(canIssue(['STAFF'])).toBe(false);
    // ADMIN は invoice:update 非保有のため従来どおり発行不可。READ_ONLY/EXTERNAL も不可。
    expect(canIssue(['ADMIN'])).toBe(false);
    expect(canIssue(['READ_ONLY'])).toBe(false);
    expect(canIssue(['EXTERNAL_EXPERT'])).toBe(false);
    expect(canIssue(['EXTERNAL_PARTNER'])).toBe(false);
    // RBAC 事実: STAFF は invoice:create を持つ（権限定義は不変）。境界は server action 側の複合ガードで担保。
    expect(canForRoles(['STAFF'], 'invoice', 'create')).toBe(true);
    expect(canForRoles(['OWNER'], 'invoice', 'create')).toBe(true);
  });

  it('Phase 1-18: 請求作成(createInvoiceAction)/一覧/新規ページの境界 = invoice:create かつ finance:read（STAFF 不可）', () => {
    // createInvoiceAction と /invoices/new が server 側で要求する複合ガードと同一判定を RBAC レベルで検証。
    // （一覧 /invoices は finance:read 相当の ABAC=FINANCIAL_CONFIDENTIAL で保護＝finance:read 非保有を遮断）
    const canCreateInvoice = (roles: RoleKey[]) =>
      canForRoles(roles, 'invoice', 'create') && canForRoles(roles, 'finance', 'read');
    expect(canCreateInvoice(['OWNER'])).toBe(true);
    expect(canCreateInvoice(['EXECUTIVE'])).toBe(true);
    expect(canCreateInvoice(['DEPARTMENT_MANAGER'])).toBe(true);
    // STAFF は invoice:create を持つが finance:read 非保有 → 作成は server 側で遮断（Phase 1-18 で据置から変更）。
    expect(canCreateInvoice(['STAFF'])).toBe(false);
    // ADMIN/READ_ONLY は invoice:create 非保有のため作成不可。
    expect(canCreateInvoice(['ADMIN'])).toBe(false);
    expect(canCreateInvoice(['READ_ONLY'])).toBe(false);
    expect(canCreateInvoice(['EXTERNAL_EXPERT'])).toBe(false);
    expect(canCreateInvoice(['EXTERNAL_PARTNER'])).toBe(false);
    // 一覧閲覧境界 = finance:read（ABAC FINANCIAL_CONFIDENTIAL）。ADMIN/READ_ONLY は閲覧可・作成不可。
    expect(canForRoles(['ADMIN'], 'finance', 'read')).toBe(true);
    expect(canForRoles(['READ_ONLY'], 'finance', 'read')).toBe(true);
    expect(canForRoles(['STAFF'], 'finance', 'read')).toBe(false);
  });

  it('Phase 1-19: /approvals 閲覧境界 = approval:approve（STAFF/READ_ONLY/EXTERNAL 不可）', () => {
    // 承認一覧（Decision Inbox）は finance を含む重要操作の title/summary を載せるため、閲覧を承認者に限定。
    const canViewApprovals = (roles: RoleKey[]) => canForRoles(roles, 'approval', 'approve');
    expect(canViewApprovals(['OWNER'])).toBe(true);
    expect(canViewApprovals(['EXECUTIVE'])).toBe(true);
    expect(canViewApprovals(['ADMIN'])).toBe(true);
    expect(canViewApprovals(['DEPARTMENT_MANAGER'])).toBe(true);
    expect(canViewApprovals(['STAFF'])).toBe(false);
    expect(canViewApprovals(['READ_ONLY'])).toBe(false);
    expect(canViewApprovals(['EXTERNAL_EXPERT'])).toBe(false);
    expect(canViewApprovals(['EXTERNAL_PARTNER'])).toBe(false);
  });

  it('Phase 1-19: /reports/morning の財務指標表示境界 = finance:read（STAFF は redact）', () => {
    // 朝報の売上・原価・粗利・売掛延滞は finance:read 保有者のみ。非保有は画面・AI 入力ともに redact。
    expect(canForRoles(['OWNER'], 'finance', 'read')).toBe(true);
    expect(canForRoles(['EXECUTIVE'], 'finance', 'read')).toBe(true);
    expect(canForRoles(['DEPARTMENT_MANAGER'], 'finance', 'read')).toBe(true);
    expect(canForRoles(['STAFF'], 'finance', 'read')).toBe(false);
  });

  it('isolates invoices by tenant', async () => {
    await makeInvoice(T2, 5000, 'ISSUED');
    const fromT = await prisma.invoice.findMany({ where: { tenantId: T, total: 5000 } });
    expect(fromT.length).toBe(0);
  });
});
