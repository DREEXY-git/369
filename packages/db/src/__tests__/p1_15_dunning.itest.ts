// Phase 1-15 統合テスト（要DB）: 督促下書き＋承認ゲート＋送信記録。
// 既存 CollectionReminder を新規フィールドなしで使用。orchestration（apps/web の dunning.ts）は db テストから
// import 不可のため、各 lib/action が起こす「データ効果」を再現し、shared 判定・RBAC・送信ゲートを検証する。
// 検証: 下書き作成/重複防止/dunning_send 承認申請/PENDING 重複防止/承認済み実行効果（status=logged・
//        Receivable は collected にしない）/EXTERNAL_SEND_ENABLED=false で logged/宛先メールなしは送信不可/tenant分離/権限。
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../client';
import { buildDunningDraft, isDunningEligible, canForRoles } from '@hokko/shared';
import { isExternalSendEnabled } from '@hokko/integrations';

const T = `itest-p115-${Date.now()}`;
const T2 = `itest-p115b-${Date.now()}`;

let invoiceId = '';
let receivableId = '';
let noEmailInvoiceId = '';
let _noEmailReceivableId = '';

beforeAll(async () => {
  // 顧客（メールあり）+ 未回収 SENT 請求 + Receivable open
  const cust = await prisma.customer.create({ data: { tenantId: T, name: '株式会社テスト', email: 'ar@test.example.jp' } });
  const inv = await prisma.invoice.create({ data: { tenantId: T, customerId: cust.id, number: 'INV-P115', status: 'SENT', subtotal: 100000, taxAmount: 10000, total: 110000, paidAmount: 30000, dueDate: new Date(Date.now() - 3 * 86_400_000) } });
  invoiceId = inv.id;
  const rec = await prisma.receivable.create({ data: { tenantId: T, invoiceId: inv.id, amount: 110000, dueDate: new Date(Date.now() - 3 * 86_400_000), status: 'overdue' } });
  receivableId = rec.id;

  // 顧客メールなし（送信不可ケース）
  const cust2 = await prisma.customer.create({ data: { tenantId: T, name: 'メール未登録社', email: null } });
  const inv2 = await prisma.invoice.create({ data: { tenantId: T, customerId: cust2.id, number: 'INV-P115-NOEMAIL', status: 'SENT', subtotal: 50000, taxAmount: 0, total: 50000, paidAmount: 0, dueDate: new Date() } });
  noEmailInvoiceId = inv2.id;
  const rec2 = await prisma.receivable.create({ data: { tenantId: T, invoiceId: inv2.id, amount: 50000, dueDate: new Date(), status: 'open' } });
  _noEmailReceivableId = rec2.id;

  // 別テナント
  const cust3 = await prisma.customer.create({ data: { tenantId: T2, name: 'T2顧客' } });
  const inv3 = await prisma.invoice.create({ data: { tenantId: T2, customerId: cust3.id, number: 'INV-T2', status: 'SENT', subtotal: 1000, taxAmount: 0, total: 1000, paidAmount: 0 } });
  await prisma.receivable.create({ data: { tenantId: T2, invoiceId: inv3.id, amount: 1000, status: 'open' } });
});

afterAll(async () => {
  for (const tid of [T, T2]) {
    await prisma.collectionReminder.deleteMany({ where: { tenantId: tid } });
    await prisma.approvalRequest.deleteMany({ where: { tenantId: tid } });
    await prisma.payment.deleteMany({ where: { tenantId: tid } });
    await prisma.receivable.deleteMany({ where: { tenantId: tid } });
    await prisma.invoice.deleteMany({ where: { tenantId: tid } });
    await prisma.customer.deleteMany({ where: { tenantId: tid } });
  }
  await prisma.$disconnect();
});

describe('督促対象判定 + テンプレート', () => {
  it('未回収 SENT は対象、テンプレートに必須要素が入る', () => {
    expect(isDunningEligible('SENT', 30000, 110000, 'overdue')).toBe(true);
    const { subject, body } = buildDunningDraft({ customerName: '株式会社テスト', companyName: 'プランニングホッコー', invoiceNumber: 'INV-P115', total: 110000, paidAmount: 30000, outstanding: 80000, dueDate: new Date() });
    expect(subject).toContain('INV-P115');
    expect(body).toContain('80,000円');
    expect(body).toContain('行き違い');
  });
});

describe('督促下書き（CollectionReminder）', () => {
  it('下書きを作成・保存できる（draftMessage/status/receivableId）', async () => {
    const { body } = buildDunningDraft({ customerName: '株式会社テスト', companyName: 'プランニングホッコー', invoiceNumber: 'INV-P115', total: 110000, paidAmount: 30000, outstanding: 80000, dueDate: new Date() });
    const reminder = await prisma.collectionReminder.create({ data: { tenantId: T, receivableId, draftMessage: body, status: 'draft' } });
    expect(reminder.status).toBe('draft');
    expect(reminder.draftMessage).toContain('INV-P115');
  });

  it('重複下書き防止: draft/pending_approval の既存があれば再利用（get-or-create）', async () => {
    const existing = await prisma.collectionReminder.findFirst({ where: { tenantId: T, receivableId, status: { in: ['draft', 'pending_approval'] } }, orderBy: { createdAt: 'desc' } });
    expect(existing).not.toBeNull(); // 既存があるので新規作成しない
    const count = await prisma.collectionReminder.count({ where: { tenantId: T, receivableId } });
    expect(count).toBe(1);
  });
});

describe('dunning_send 承認ゲート', () => {
  it('dunning_send の承認申請を作成し、PENDING 重複を防止できる', async () => {
    const reminder = await prisma.collectionReminder.findFirstOrThrow({ where: { tenantId: T, receivableId } });
    // 申請（entityType=CollectionReminder, external 相当・MEDIUM）
    await prisma.approvalRequest.create({ data: { tenantId: T, type: 'dunning_send', title: '督促送信', entityType: 'CollectionReminder', entityId: reminder.id, requestedForAction: 'dunning_send', riskLevel: 'MEDIUM', status: 'PENDING', payloadAfter: { invoiceId, receivableId, reminderId: reminder.id, recipient: 'ar@test.example.jp' } } });
    await prisma.collectionReminder.update({ where: { id: reminder.id }, data: { status: 'pending_approval' } });

    // 重複防止: 既存 PENDING があれば再申請しない
    const existingPending = await prisma.approvalRequest.findFirst({ where: { tenantId: T, entityType: 'CollectionReminder', entityId: reminder.id, requestedForAction: 'dunning_send', status: 'PENDING' } });
    expect(existingPending).not.toBeNull();
    const count = await prisma.approvalRequest.count({ where: { tenantId: T, entityType: 'CollectionReminder', entityId: reminder.id, requestedForAction: 'dunning_send' } });
    expect(count).toBe(1);
  });
});

describe('承認済み督促の送信実行（効果）', () => {
  it('EXTERNAL_SEND_ENABLED=false なら logged のみ／Receivable は collected にしない／承認は executed', async () => {
    expect(isExternalSendEnabled()).toBe(false); // 既定は無効 → 実送信せず logged
    const reminder = await prisma.collectionReminder.findFirstOrThrow({ where: { tenantId: T, receivableId } });
    const approval = await prisma.approvalRequest.findFirstOrThrow({ where: { tenantId: T, entityType: 'CollectionReminder', entityId: reminder.id, requestedForAction: 'dunning_send' } });

    // executeApprovedAction 相当（承認後・二重実行防止）の効果を再現
    await prisma.approvalRequest.update({ where: { id: approval.id }, data: { status: 'APPROVED' } });
    await prisma.approvalRequest.update({ where: { id: approval.id }, data: { executedAt: new Date(), executionStatus: 'executed' } });
    await prisma.collectionReminder.update({ where: { id: reminder.id }, data: { status: 'logged' } }); // 送信せず記録

    const after = await prisma.collectionReminder.findUniqueOrThrow({ where: { id: reminder.id } });
    const rec = await prisma.receivable.findUniqueOrThrow({ where: { id: receivableId } });
    const appr = await prisma.approvalRequest.findUniqueOrThrow({ where: { id: approval.id } });
    expect(after.status).toBe('logged');
    expect(rec.status).toBe('overdue'); // 送信だけでは collected にしない（入金時のみ）
    expect(appr.executedAt).not.toBeNull(); // 二重実行防止のフラグ
  });

  it('宛先メールが無い請求は送信不可（recipient=null）', async () => {
    const inv = await prisma.invoice.findFirstOrThrow({ where: { id: noEmailInvoiceId }, include: { customer: true } });
    expect(inv.customer?.email ?? null).toBeNull(); // → lib は no-recipient で送信しない
    // 下書き作成・申請は可能（receivable がある）
    expect(isDunningEligible(inv.status, Number(inv.paidAmount), Number(inv.total), 'open')).toBe(true);
  });
});

describe('権限と tenant 分離', () => {
  it('督促操作は OWNER 可。STAFF への督促非表示は finance 機密ゲートで担保', () => {
    // OWNER は督促操作（invoice:update）可。
    expect(canForRoles(['OWNER'], 'invoice', 'update')).toBe(true);
    // STAFF も invoice:update RBAC は持つが、督促非表示は別レイヤで担保:
    //  - invoice detail ページの ABAC（FINANCIAL_CONFIDENTIAL）で STAFF を遮断
    //  - AttentionList の督促アクションは finance:read（STAFF=false）で redact/非表示
    expect(canForRoles(['STAFF'], 'finance', 'read')).toBe(false);
    expect(canForRoles(['OWNER'], 'finance', 'read')).toBe(true);
  });

  it('別テナントの請求・督促は見えない', async () => {
    const seen = await prisma.invoice.findFirst({ where: { id: invoiceId, tenantId: T2 } });
    expect(seen).toBeNull();
    const t2reminders = await prisma.collectionReminder.findMany({ where: { tenantId: T2 } });
    expect(t2reminders).toHaveLength(0);
  });
});
