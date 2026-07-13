'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { computeQuoteTotals, requiresApproval, isLowMargin, canConvertQuoteToInvoice, buildInvoiceDraftFromQuote } from '@hokko/shared';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeAudit } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { visibleCustomerLabels } from '@/lib/security/customer-visibility';
import { convertQuoteToInvoiceCore, type ConvertBridgeDb } from '@/lib/quote-convert-bridge';

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
  let customerId = String(formData.get('customerId') ?? '') || null;
  let dealId = String(formData.get('dealId') ?? '') || null;
  // WIP-4（roadmap65 追補）: フォーム値の紐付け ID を server 側で検証する。
  // ドロップダウンのフィルタは表示層に過ぎないため、①自テナント外の ID（テナント越え FK 接続）
  // ②閲覧不可ラベル顧客の ID を直接 POST された場合は紐付けを拒否（null に落とす・fail-closed）。
  if (customerId) {
    const c = await prisma.customer.findFirst({
      where: { id: customerId, tenantId: user.tenantId, label: { in: visibleCustomerLabels(user.roles) } },
      select: { id: true },
    });
    customerId = c?.id ?? null;
  }
  if (dealId) {
    // v5.8 Medium-3 修正: dealId 直 POST で「閲覧不可ラベル顧客の案件」を紐付ける迂回を遮断する。
    // Deal 自体の tenant 確認に加え、Deal→Customer の label 可視性も条件に含める（取得段階遮断）。
    // 不可視 ID は黙って null 化せず、監査ログを残して拒否する（存在推測はできるが接続はできない）。
    const d = await prisma.deal.findFirst({
      where: { id: dealId, tenantId: user.tenantId, customer: { label: { in: visibleCustomerLabels(user.roles) } } },
      select: { id: true },
    });
    if (!d) {
      await writeAudit({
        tenantId: user.tenantId,
        actorId: user.userId,
        action: 'quote_create_denied_deal_link',
        entityType: 'Deal',
        entityId: dealId,
        summary: '閲覧可能範囲外の案件 ID の紐付けを拒否（テナント外または閲覧不可ラベル顧客）',
      });
      redirect('/quotes/new?error=deal');
    }
    dealId = d.id;
  }
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

  // Codex V75 Q2C P2-1: Quote＋（必要時）ApprovalRequest＋監査を単一 transaction で確定する。
  // 従来は別処理で、ApprovalRequest/監査失敗時に pending_approval の見積だけが孤児化しえた。
  // all-or-nothing にし、失敗時は全 rollback（利用者は再作成できる・承認待ちの孤児を残さない）。
  const reason = isLowMargin(totals.grossMarginRate)
    ? `粗利率 ${totals.grossMarginRate}%（低粗利）`
    : `金額 ${totals.total.toLocaleString()} 円`;
  const quote = await prisma.$transaction(async (tx) => {
    const q = await tx.quote.create({
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
      await tx.approvalRequest.create({
        data: {
          tenantId: user.tenantId,
          type: 'quote_issue',
          title: `見積発行承認: ${title}`,
          summary: `${number} / ${reason} のため承認が必要`,
          entityType: 'Quote',
          entityId: q.id,
          requestedById: user.userId,
          assigneeRole: 'DEPARTMENT_MANAGER',
          riskLevel: totals.grossMarginRate < 0 ? 'HIGH' : 'MEDIUM',
          status: 'PENDING',
        },
      });
    }
    await tx.auditLog.create({
      data: {
        tenantId: user.tenantId,
        actorId: user.userId,
        actorType: 'user',
        action: 'create',
        entityType: 'Quote',
        entityId: q.id,
        summary: `見積「${title}」を作成（合計 ${totals.total.toLocaleString()}円・粗利率 ${totals.grossMarginRate}%）`,
      },
    });
    return q;
  });

  revalidatePath('/quotes');
  redirect(`/quotes/${quote.id}`);
}

/**
 * P3-Q2C: 承認確定済み（approved）の見積から DRAFT 請求書を生成し、双方を Invoice.quoteId で連携する。
 * 見積〜入金の流れの「真ん中の欠落」を塞ぐ変換ホップ。**外部送信・実支払・課金・実 LLM は一切なし**
 * （生成物は DRAFT 請求書の下書きで、発行/送信は従来どおり invoices 側の別アクション＋承認を経る）。
 *  - 権限: invoice:create かつ finance:read（財務作成境界・createInvoiceAction と対称）。AI は不可（isAi 拒否）。
 *  - 変換可否: canConvertQuoteToInvoice（approved のみ）。既変換は Invoice.quoteId の unique 制約が
 *    DB レベルの並行 barrier になり、敗者/再送は既存請求書へ冪等に収束（新規行を作らない）。
 *  - 金額: buildInvoiceDraftFromQuote で値引きを明細へ按分（サーバ権威計算・クライアント値は信用しない）。
 */
export async function convertQuoteToInvoiceAction(formData: FormData) {
  const user = await requireUser();
  // 請求書の作成は finance 機密。UI 非表示だけに頼らず server 側でも invoice:create かつ finance:read を必須化。
  // AI ロールは requireUser の isAi で一律拒否（承認・生成・実行を持たない不変条件の二重防御）。
  if (user.isAi || !hasPermission(user, 'invoice', 'create') || !hasPermission(user, 'finance', 'read')) {
    redirect('/quotes?denied=1');
  }
  const quoteId = String(formData.get('quoteId') ?? '');

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, tenantId: user.tenantId },
    include: { lineItems: true },
  });
  if (!quote) redirect('/quotes?error=notfound');

  // 発行確定（approved）でなければ変換しない（draft/pending_approval/rejected/sent は不可・fail-closed）。
  if (!canConvertQuoteToInvoice(quote!.status)) redirect(`/quotes/${quoteId}?error=not_convertible`);

  // 冪等: 既に請求書化済みなら既存へ（並行/再送でも新規は作らない）。
  const existing = await prisma.invoice.findFirst({
    where: { quoteId: quote!.id, tenantId: user.tenantId },
    select: { id: true },
  });
  if (existing) redirect(`/invoices/${existing.id}?from_quote=already`);

  // Codex V75 Q2C P2-3: 関連 customer/deal を「変換の場でも」tenant＋可視ラベルで再検証する
  // （見積作成時に検証済みでも、データ不整合や後発の越境参照を invoice/監査へ複製しない・fail-closed で null）。
  // customer は quote.customerId → 無ければ deal.customerId の順で解決し、それぞれ tenant スコープで実在確認。
  let dealId: string | null = null;
  if (quote!.dealId) {
    const d = await prisma.deal.findFirst({
      where: { id: quote!.dealId, tenantId: user.tenantId, customer: { label: { in: visibleCustomerLabels(user.roles) } } },
      select: { id: true, customerId: true },
    });
    dealId = d?.id ?? null;
  }
  let customerId: string | null = null;
  const candidateCustomerId = quote!.customerId ?? (dealId ? (await prisma.deal.findFirst({ where: { id: dealId, tenantId: user.tenantId }, select: { customerId: true } }))?.customerId ?? null : null);
  if (candidateCustomerId) {
    const c = await prisma.customer.findFirst({
      where: { id: candidateCustomerId, tenantId: user.tenantId, label: { in: visibleCustomerLabels(user.roles) } },
      select: { id: true },
    });
    customerId = c?.id ?? null;
  }

  const draft = buildInvoiceDraftFromQuote(
    { discountRate: toNumber(quote!.discountRate), taxRate: toNumber(quote!.taxRate) },
    quote!.lineItems.map((li) => ({
      name: li.name,
      quantity: toNumber(li.quantity),
      unitPrice: toNumber(li.unitPrice),
      amount: toNumber(li.amount),
    })),
  );

  const count = await prisma.invoice.count({ where: { tenantId: user.tenantId } });
  const number = `INV-${new Date().getFullYear()}-${String(200 + count + 1)}`;

  // Codex V75 Q2C P2-2: Invoice+lineItems+監査を単一 transaction で確定（監査失敗でも孤児を残さない）。
  const r = await convertQuoteToInvoiceCore(prisma as unknown as ConvertBridgeDb, {
    tenantId: user.tenantId,
    actorId: user.userId,
    actorIsAi: user.isAi,
    quoteId: quote!.id,
    quoteNumber: quote!.number,
    invoiceNumber: number,
    customerId,
    dealId,
    dueDate: new Date(Date.now() + 30 * 86400000),
    draft,
  });
  if (r.outcome === 'forbidden') redirect('/quotes?denied=1');
  if (r.outcome === 'already') {
    // 並行変換の敗者/再送: 勝者の請求書へ収束（新規行は作られていない）。
    const won = await prisma.invoice.findFirst({ where: { quoteId: quote!.id, tenantId: user.tenantId }, select: { id: true } });
    if (won) redirect(`/invoices/${won.id}?from_quote=already`);
    redirect('/quotes?error=convert');
  }

  revalidatePath('/quotes');
  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath('/invoices');
  redirect(`/invoices/${r.invoiceId}?from_quote=1`);
}
