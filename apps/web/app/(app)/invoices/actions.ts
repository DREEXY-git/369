'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeAudit } from '@/lib/db';
import { executeApprovedAction } from '@/lib/approval';
import { requestInvoiceExternalSend, executeInvoiceExternalSend } from '@/lib/domains/finance/invoice-send';
import { recordInvoicePayment } from '@/lib/domains/finance/payments';
import { createDunningDraft, requestDunningSend, executeDunningSend } from '@/lib/domains/finance/dunning';

interface LineInput {
  name: string;
  qty: number;
  unitPrice: number;
}

export async function createInvoiceAction(formData: FormData) {
  const user = await requireUser();
  // 請求作成は finance 機密。UI 非表示だけに頼らず server 側でも finance:read を必須化（STAFF 直叩き遮断・Phase 1-18）。
  // 営業/STAFF の下書き業務は当面 Quote(見積) で担保。STAFF 向けマスク/スコープ付き請求は将来の案E。
  if (!hasPermission(user, 'invoice', 'create') || !hasPermission(user, 'finance', 'read')) redirect('/invoices?denied=1');

  const customerId = String(formData.get('customerId') ?? '') || null;
  const dealId = String(formData.get('dealId') ?? '') || null;
  const taxRate = Number(formData.get('taxRate') ?? 10) || 10;
  const dueRaw = String(formData.get('dueDate') ?? '');

  let items: LineInput[] = [];
  try {
    items = (JSON.parse(String(formData.get('items') ?? '[]')) as LineInput[])
      .filter((i) => i && String(i.name).trim())
      .map((i) => ({ name: String(i.name).trim(), qty: Math.max(0, Number(i.qty) || 0), unitPrice: Math.max(0, Number(i.unitPrice) || 0) }));
  } catch {
    items = [];
  }
  if (items.length === 0) redirect('/invoices/new?error=items');

  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const taxAmount = Math.round((subtotal * taxRate) / 100);
  const total = subtotal + taxAmount;
  const count = await prisma.invoice.count({ where: { tenantId: user.tenantId } });
  const number = `INV-${new Date().getFullYear()}-${String(200 + count + 1)}`;

  const invoice = await prisma.invoice.create({
    data: {
      tenantId: user.tenantId,
      customerId,
      dealId,
      number,
      status: 'DRAFT',
      dueDate: dueRaw ? new Date(dueRaw) : new Date(Date.now() + 30 * 86400000),
      subtotal,
      taxAmount,
      total,
      paidAmount: 0,
      lineItems: { create: items.map((i) => ({ tenantId: user.tenantId, name: i.name, quantity: i.qty, unitPrice: i.unitPrice, amount: i.qty * i.unitPrice })) },
    },
  });
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: 'create',
    entityType: 'Invoice',
    entityId: invoice.id,
    summary: `請求書「${number}」を作成（${total.toLocaleString()}円）`,
  });
  revalidatePath('/invoices');
  redirect(`/invoices/${invoice.id}`);
}

/** 発行: DRAFT→ISSUED ＋ 売掛(Receivable)起票。送信は別アクション（正式化と送信を分離）。 */
export async function issueInvoiceAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get('id') ?? '');
  // 発行は DRAFT→ISSUED ＋ 売掛起票＝財務状態の確定（finance 機密）。server 側で finance:read も必須化
  // （STAFF は invoice:update を持つが finance:read 非保有のため直叩き遮断・dunning/invoice_send/payment と統一）。
  if (!hasPermission(user, 'invoice', 'update') || !hasPermission(user, 'finance', 'read')) redirect(`/invoices/${id}?denied=1`);
  const inv = await prisma.invoice.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!inv || inv.status !== 'DRAFT') redirect(`/invoices/${id}`);

  await prisma.invoice.update({ where: { id }, data: { status: 'ISSUED', issueDate: new Date() } });
  await prisma.receivable.upsert({
    where: { invoiceId: id },
    create: { tenantId: user.tenantId, invoiceId: id, amount: inv.total, dueDate: inv.dueDate, status: 'open' },
    update: { amount: inv.total, dueDate: inv.dueDate },
  });
  await writeAudit({ tenantId: user.tenantId, actorId: user.userId, action: 'update', entityType: 'Invoice', entityId: id, summary: `請求書 ${inv.number} を発行（売掛起票）` });
  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}?issued=1`);
}

/** 請求書の外部送信を申請（承認後送信）。業務ロジックは lib/domains/finance/invoice-send.ts。 */
export async function requestInvoiceExternalSendApprovalAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get('id') ?? '');
  // 請求書の外部送信申請は finance 機密。server 側で finance:read も必須化（STAFF 直叩き遮断・dunning と統一）。
  if (!hasPermission(user, 'invoice', 'update') || !hasPermission(user, 'finance', 'read')) redirect(`/invoices/${id}?denied=1`);
  const res = await requestInvoiceExternalSend({ tenantId: user.tenantId, userId: user.userId }, id);
  revalidatePath(`/invoices/${id}`);
  revalidatePath('/approvals');
  redirect(res.ok ? `/invoices/${id}?send_requested=1` : `/invoices/${id}?error=${res.reason}`);
}

/** 承認済み請求書を外部送信（→SENT）。業務ロジックは invoice-send.ts。二重実行防止は executeApprovedAction。 */
export async function executeApprovedInvoiceExternalSendAction(formData: FormData) {
  const user = await requireUser();
  // 承認済み請求書の外部送信実行は finance 機密。server 側で finance:read も必須化（STAFF 直叩き遮断）。
  if (!hasPermission(user, 'invoice', 'update') || !hasPermission(user, 'finance', 'read')) redirect('/invoices?denied=1');
  const approvalId = String(formData.get('approvalId') ?? '');
  const req = await prisma.approvalRequest.findFirst({ where: { id: approvalId, tenantId: user.tenantId, requestedForAction: 'invoice_send' } });
  if (!req) redirect('/invoices?error=notfound');
  const invoiceId = String((req!.payloadAfter as { invoiceId?: string } | null)?.invoiceId ?? req!.entityId);

  let reason: string | undefined;
  try {
    const r = await executeApprovedAction(
      approvalId,
      async () => {
        const res = await executeInvoiceExternalSend({ tenantId: user.tenantId, userId: user.userId }, invoiceId);
        if (!res.ok) throw new Error(res.reason ?? 'send-failed');
        return res;
      },
      { executedById: user.userId },
    );
    if (!r.executed) reason = r.reason;
  } catch (e) {
    reason = e instanceof Error ? e.message : 'error';
  }
  redirect(reason ? `/invoices/${invoiceId}?error=${encodeURIComponent(reason)}` : `/invoices/${invoiceId}?sent=1`);
}

/** 入金記録。業務ロジックは lib/domains/finance/payments.ts（Invoice/Payment/Receivable/FinanceEvent連動）。 */
export async function recordPaymentAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get('id') ?? '');
  // 入金記録は finance 機密（Invoice/Receivable/FinanceEvent 連動）。server 側で finance:read も必須化（STAFF 直叩き遮断）。
  if (!hasPermission(user, 'invoice', 'update') || !hasPermission(user, 'finance', 'read')) redirect(`/invoices/${id}?denied=1`);
  const amount = Math.max(0, Number(formData.get('amount') ?? 0) || 0);
  const method = String(formData.get('method') ?? 'bank');
  const res = await recordInvoicePayment({ tenantId: user.tenantId, userId: user.userId }, id, amount, method);
  revalidatePath(`/invoices/${id}`);
  redirect(res.ok ? `/invoices/${id}?paid=1` : `/invoices/${id}?error=${res.reason}`);
}

/** 督促（お支払い状況の確認）下書きを作成。未回収/延滞のみ。業務ロジックは lib/domains/finance/dunning.ts。 */
export async function createDunningDraftAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get('id') ?? '');
  // 督促は財務機密に属する外部送信系。UI 非表示だけに頼らず、server 側でも finance:read を必須化
  // （STAFF は invoice:update を持つが finance:read を持たないため直叩きでも遮断される）。
  if (!hasPermission(user, 'invoice', 'update') || !hasPermission(user, 'finance', 'read')) redirect(`/invoices/${id}?denied=1`);
  const res = await createDunningDraft({ tenantId: user.tenantId, userId: user.userId }, id);
  revalidatePath(`/invoices/${id}`);
  redirect(res.ok ? `/invoices/${id}?dunning_draft=1#dunning` : `/invoices/${id}?error=${res.reason}#dunning`);
}

/** 督促送信を申請（dunning_send 承認・重複防止）。実送信は承認後。 */
export async function requestDunningSendApprovalAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get('id') ?? '');
  const reminderId = String(formData.get('reminderId') ?? '');
  // 外部送信申請。server 側で finance:read を必須化（STAFF 直叩き遮断）。
  if (!hasPermission(user, 'invoice', 'update') || !hasPermission(user, 'finance', 'read')) redirect(`/invoices/${id}?denied=1`);
  const res = await requestDunningSend({ tenantId: user.tenantId, userId: user.userId }, reminderId);
  revalidatePath(`/invoices/${id}`);
  revalidatePath('/approvals');
  redirect(res.ok ? `/invoices/${id}?dunning_requested=1#dunning` : `/invoices/${id}?error=${res.reason}#dunning`);
}

/** 承認済み督促を送信/記録。業務ロジックは dunning.ts。二重実行防止は executeApprovedAction。 */
export async function executeApprovedDunningSendAction(formData: FormData) {
  const user = await requireUser();
  // 承認済み督促の送信実行。server 側で finance:read を必須化（STAFF 直叩き遮断）。
  if (!hasPermission(user, 'invoice', 'update') || !hasPermission(user, 'finance', 'read')) redirect('/invoices?denied=1');
  const approvalId = String(formData.get('approvalId') ?? '');
  const req = await prisma.approvalRequest.findFirst({ where: { id: approvalId, tenantId: user.tenantId, entityType: 'CollectionReminder', requestedForAction: 'dunning_send' } });
  if (!req) redirect('/invoices?error=notfound');
  const payload = (req!.payloadAfter as { invoiceId?: string; reminderId?: string } | null) ?? {};
  const reminderId = String(payload.reminderId ?? req!.entityId);
  const invoiceId = String(payload.invoiceId ?? '');

  let reason: string | undefined;
  try {
    const r = await executeApprovedAction(
      approvalId,
      async () => {
        const res = await executeDunningSend({ tenantId: user.tenantId, userId: user.userId }, reminderId);
        if (!res.ok) throw new Error(res.reason ?? 'send-failed');
        return res;
      },
      { executedById: user.userId },
    );
    if (!r.executed) reason = r.reason;
  } catch (e) {
    reason = e instanceof Error ? e.message : 'error';
  }
  const dest = invoiceId ? `/invoices/${invoiceId}` : '/invoices';
  redirect(reason ? `${dest}?error=${encodeURIComponent(reason)}#dunning` : `${dest}?dunning_sent=1#dunning`);
}
