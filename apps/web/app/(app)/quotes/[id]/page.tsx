import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Table, Th, Td, Badge, Button, Stat } from '@/components/ui';
import { AccessDenied } from '@/components/access-denied';
import { formatJpy, formatDate } from '@hokko/shared';
import { visibleCustomerLabels } from '@/lib/security/customer-visibility';

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
