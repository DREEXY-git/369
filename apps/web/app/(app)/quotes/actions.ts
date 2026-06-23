'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { computeQuoteTotals, requiresApproval, isLowMargin } from '@hokko/shared';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeAudit } from '@/lib/db';

interface LineInput {
  name: string;
  qty: number;
  unitPrice: number;
  unitCost: number;
}

export async function createQuoteAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'quote', 'create')) redirect('/quotes?denied=1');

  const title = String(formData.get('title') ?? '').trim() || '無題の見積';
  const customerId = String(formData.get('customerId') ?? '') || null;
  const dealId = String(formData.get('dealId') ?? '') || null;
  const discountRate = Math.max(0, Math.min(100, Number(formData.get('discountRate') ?? 0) || 0));
  const taxRate = Number(formData.get('taxRate') ?? 10) || 10;

  let items: LineInput[] = [];
  try {
    items = (JSON.parse(String(formData.get('items') ?? '[]')) as LineInput[])
      .filter((i) => i && String(i.name).trim())
      .map((i) => ({
        name: String(i.name).trim(),
        qty: Math.max(0, Number(i.qty) || 0),
        unitPrice: Math.max(0, Number(i.unitPrice) || 0),
        unitCost: Math.max(0, Number(i.unitCost) || 0),
      }));
  } catch {
    items = [];
  }
  if (items.length === 0) redirect('/quotes/new?error=items');

  // サーバ側で権威的に再計算（クライアントの値は信用しない）
  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const cost = items.reduce((s, i) => s + i.qty * i.unitCost, 0);
  const totals = computeQuoteTotals(subtotal, cost, discountRate, taxRate);

  const count = await prisma.quote.count({ where: { tenantId: user.tenantId } });
  const number = `Q-${new Date().getFullYear()}-${String(100 + count + 1)}`;

  // 一定金額以上、または低粗利/赤字は発行に承認が必要
  const needsApproval =
    requiresApproval('quote_issue', { amount: totals.total }) || isLowMargin(totals.grossMarginRate);

  const quote = await prisma.quote.create({
    data: {
      tenantId: user.tenantId,
      customerId,
      dealId,
      number,
      title,
      status: needsApproval ? 'pending_approval' : 'draft',
      subtotal,
      cost,
      discountRate,
      taxRate,
      total: totals.total,
      grossMargin: totals.grossMargin,
      grossMarginRate: totals.grossMarginRate,
      validUntil: new Date(Date.now() + 30 * 86400000),
      lineItems: {
        create: items.map((i) => ({
          tenantId: user.tenantId,
          name: i.name,
          quantity: i.qty,
          unitPrice: i.unitPrice,
          unitCost: i.unitCost,
          amount: i.qty * i.unitPrice,
        })),
      },
    },
  });

  if (needsApproval) {
    const reason = isLowMargin(totals.grossMarginRate)
      ? `粗利率 ${totals.grossMarginRate}%（低粗利）`
      : `金額 ${totals.total.toLocaleString()} 円`;
    await prisma.approvalRequest.create({
      data: {
        tenantId: user.tenantId,
        type: 'quote_issue',
        title: `見積発行承認: ${title}`,
        summary: `${number} / ${reason} のため承認が必要`,
        entityType: 'Quote',
        entityId: quote.id,
        requestedById: user.userId,
        assigneeRole: 'DEPARTMENT_MANAGER',
        riskLevel: totals.grossMarginRate < 0 ? 'HIGH' : 'MEDIUM',
        status: 'PENDING',
      },
    });
  }

  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: 'create',
    entityType: 'Quote',
    entityId: quote.id,
    summary: `見積「${title}」を作成（合計 ${totals.total.toLocaleString()}円・粗利率 ${totals.grossMarginRate}%）`,
  });

  revalidatePath('/quotes');
  redirect(`/quotes/${quote.id}`);
}
