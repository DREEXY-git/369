'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeAudit } from '@/lib/db';

interface LineInput {
  name: string;
  qty: number;
  unitPrice: number;
}

export async function createInvoiceAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'invoice', 'create')) redirect('/invoices?denied=1');

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

/** 発行＝送付は危険操作。送付承認(ApprovalRequest)を作り、売掛(Receivable)を起票。 */
export async function issueInvoiceAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get('id') ?? '');
  if (!hasPermission(user, 'invoice', 'update')) redirect(`/invoices/${id}?denied=1`);
  const inv = await prisma.invoice.findFirst({ where: { id, tenantId: user.tenantId }, include: { customer: true } });
  if (!inv || inv.status !== 'DRAFT') redirect(`/invoices/${id}`);

  await prisma.invoice.update({ where: { id }, data: { status: 'ISSUED', issueDate: new Date() } });
  await prisma.receivable.upsert({
    where: { invoiceId: id },
    create: { tenantId: user.tenantId, invoiceId: id, amount: inv.total, dueDate: inv.dueDate, status: 'open' },
    update: { amount: inv.total, dueDate: inv.dueDate },
  });
  await prisma.approvalRequest.create({
    data: {
      tenantId: user.tenantId,
      type: 'invoice_send',
      title: `請求書送付承認: ${inv.number}`,
      summary: `${inv.customer?.name ?? ''} 宛 ${Number(inv.total).toLocaleString()}円`,
      entityType: 'Invoice',
      entityId: id,
      requestedById: user.userId,
      assigneeRole: 'DEPARTMENT_MANAGER',
      riskLevel: 'MEDIUM',
      status: 'PENDING',
    },
  });
  await writeAudit({ tenantId: user.tenantId, actorId: user.userId, action: 'update', entityType: 'Invoice', entityId: id, summary: `請求書 ${inv.number} を発行（送付承認を申請）` });
  revalidatePath(`/invoices/${id}`);
  revalidatePath('/approvals');
  redirect(`/invoices/${id}`);
}

/** 入金記録。回収管理（Receivable）も更新。 */
export async function recordPaymentAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get('id') ?? '');
  if (!hasPermission(user, 'invoice', 'update')) redirect(`/invoices/${id}?denied=1`);
  const amount = Math.max(0, Number(formData.get('amount') ?? 0) || 0);
  const inv = await prisma.invoice.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!inv || amount <= 0) redirect(`/invoices/${id}`);

  await prisma.payment.create({ data: { tenantId: user.tenantId, invoiceId: id, amount, method: String(formData.get('method') ?? 'bank') } });
  const paid = Number(inv.paidAmount) + amount;
  const fullyPaid = paid >= Number(inv.total);
  await prisma.invoice.update({ where: { id }, data: { paidAmount: paid, status: fullyPaid ? 'PAID' : 'PARTIALLY_PAID' } });
  await prisma.receivable.updateMany({ where: { invoiceId: id }, data: { status: fullyPaid ? 'collected' : 'open' } });
  await writeAudit({ tenantId: user.tenantId, actorId: user.userId, action: 'update', entityType: 'Invoice', entityId: id, summary: `入金記録 ${amount.toLocaleString()}円（${fullyPaid ? '全額入金' : '一部入金'}）` });
  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}`);
}
