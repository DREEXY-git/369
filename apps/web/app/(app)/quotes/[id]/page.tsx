import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Table, Th, Td, Badge, Button, Stat } from '@/components/ui';
import { AccessDenied } from '@/components/access-denied';
import { formatJpy, formatDate, canConvertQuoteToInvoice } from '@hokko/shared';
import { visibleCustomerLabels } from '@/lib/security/customer-visibility';
import { convertQuoteToInvoiceAction } from '../actions';

export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, string> = {
  draft: 'slate', pending_approval: 'amber', approved: 'green', sent: 'blue', accepted: 'green', rejected: 'red',
};

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  // WIP-4（roadmap65）: 原価・粗利を含む見積詳細は quote:read 配下（値引き承認ルールを含む
  // STAFF の業務フロー）。ページ基礎権限をデータ取得前に適用する。
  if (!hasPermission(user, 'quote', 'read')) {
    return (
      <AccessDenied
        title="見積詳細"
        reason="見積の閲覧には見積の閲覧権限（quote:read）が必要です"
        breadcrumb={[{ label: '見積', href: '/quotes' }]}
      />
    );
  }
  const quote = await prisma.quote.findFirst({
    where: { id, tenantId: user.tenantId },
    include: { lineItems: true, deal: true },
  });
  if (!quote) notFound();
  // v5.8 Medium-4 修正: 顧客名は「表示抑止」ではなく取得段階から遮断する（WIP-4 受入条件）。
  // customer:read が無ければ customer を select しない。権限があっても label 条件付き別クエリで
  // 可視範囲のみ取得する（不可視は空 = 未設定と区別不能でオラクルにならない）。
  let customerName = '';
  if (quote.deal && hasPermission(user, 'customer', 'read')) {
    const c = await prisma.customer.findFirst({
      where: { id: quote.deal.customerId, tenantId: user.tenantId, label: { in: visibleCustomerLabels(user.roles) } },
      select: { name: true },
    });
    customerName = c?.name ?? '';
  }

  const gm = toNumber(quote.grossMarginRate);

  // P3-Q2C: この見積から生成済みの請求書（1件・逆参照）。変換可否・請求書化ボタンの出し分けに使う。
  const linkedInvoice = await prisma.invoice.findFirst({
    where: { quoteId: quote.id, tenantId: user.tenantId },
    select: { id: true, number: true, status: true },
  });
  // 変換は財務作成境界（invoice:create かつ finance:read）。AI は不可。approved のみ変換可。
  const canConvert =
    !user.isAi && hasPermission(user, 'invoice', 'create') && hasPermission(user, 'finance', 'read');
  const convertible = canConvert && canConvertQuoteToInvoice(quote.status) && !linkedInvoice;

  return (
    <div>
      <PageHeader
        title={`${quote.number} ${quote.title}`}
        description={customerName}
        breadcrumb={[{ label: '見積', href: '/quotes' }, { label: quote.number, href: '#' }]}
        action={
          <div className="flex items-center gap-3">
            <Badge tone={STATUS_TONE[quote.status] ?? 'slate'}>{quote.status}</Badge>
            <Link href={`/print/quotes/${quote.id}`} target="_blank"><Button variant="outline">印刷 / PDF</Button></Link>
          </div>
        }
      />

      {quote.status === 'pending_approval' ? (
        <div className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          この見積は発行に承認が必要です。<Link href="/approvals" className="font-medium underline">承認待ち一覧</Link>で処理してください。
        </div>
      ) : null}

      {/* P3-Q2C 見積→請求 変換: approved かつ未変換なら請求書化ボタン、変換済みなら請求書への導線。 */}
      {linkedInvoice ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800" data-testid={`quote-linked-invoice-${quote.id}`}>
          <Badge tone="green">請求書化済み</Badge>
          この見積から請求書
          <Link href={`/invoices/${linkedInvoice.id}`} className="font-medium underline" data-testid="quote-linked-invoice-link">
            {linkedInvoice.number}
          </Link>
          （{linkedInvoice.status}）を作成済みです。
        </div>
      ) : convertible ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          <span>この見積は発行確定済みです。内容を引き継いで請求書（下書き）を作成できます（外部送信はしません）。</span>
          <form action={convertQuoteToInvoiceAction}>
            <input type="hidden" name="quoteId" value={quote.id} />
            <Button type="submit" data-testid="quote-convert-to-invoice">この見積から請求書を作成</Button>
          </form>
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="合計(税込)" value={formatJpy(toNumber(quote.total))} />
        <Stat label="粗利" value={formatJpy(toNumber(quote.grossMargin))} />
        <Stat label="粗利率" value={`${gm}%`} tone={gm < 0 ? 'red' : gm < 15 ? 'amber' : 'green'} />
        <Stat label="値引き率" value={`${toNumber(quote.discountRate)}%`} />
      </div>

      <Card>
        <CardHeader><CardTitle>明細</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <thead><tr><Th>品名</Th><Th>数量</Th><Th>単価</Th><Th>原価</Th><Th>金額</Th></tr></thead>
            <tbody>
              {quote.lineItems.map((li) => (
                <tr key={li.id}>
                  <Td>{li.name}</Td>
                  <Td>{toNumber(li.quantity)}</Td>
                  <Td>{formatJpy(toNumber(li.unitPrice))}</Td>
                  <Td>{formatJpy(toNumber(li.unitCost))}</Td>
                  <Td className="font-medium">{formatJpy(toNumber(li.amount))}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="mt-3 flex flex-col items-end gap-0.5 text-sm">
            <div>小計: {formatJpy(toNumber(quote.subtotal))}</div>
            <div>消費税: {formatJpy(toNumber(quote.total) - toNumber(quote.subtotal) * (1 - toNumber(quote.discountRate) / 100))}</div>
            <div className="text-base font-bold">合計: {formatJpy(toNumber(quote.total))}</div>
            <div className="text-xs text-muted-foreground">有効期限: {formatDate(quote.validUntil)}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
