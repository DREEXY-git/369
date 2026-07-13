import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Table, Th, Td, Badge, Button, Stat, EmptyState } from '@/components/ui';
import { AccessDenied } from '@/components/access-denied';
import { formatJpy, formatDate, bucketReceivablesByAge, agingBucketOf, invoiceOutstanding } from '@hokko/shared';
import { canSeeCustomerLabel } from '@/lib/security/customer-visibility';

export const dynamic = 'force-dynamic';

const BUCKET_TONE: Record<string, string> = { current: 'green', d1_30: 'amber', d31_60: 'amber', d61_90: 'red', d90plus: 'red' };

// P3-Q2C-B: 売掛エイジング（AR aging）read-only コックピット。未回収を経過日数バケットで見える化し、
// 各行から既存の督促フロー（/invoices/[id]#dunning）へ deep link する。実行ボタン・外部送信は持たない。
export default async function ReceivablesAgingPage() {
  const user = await requireUser();
  // 売掛・未回収額は finance 機密。データ取得前に finance:read を必須化（STAFF 直叩き遮断・他 finance 画面と統一）。
  if (!hasPermission(user, 'finance', 'read')) {
    return (
      <AccessDenied
        title="売掛エイジング"
        reason="売掛・未回収額の閲覧には財務の閲覧権限（finance:read）が必要です"
        breadcrumb={[{ label: '財務', href: '/finance/cashflow' }]}
      />
    );
  }

  const receivables = await prisma.receivable.findMany({
    where: { tenantId: user.tenantId, status: { in: ['open', 'overdue'] } },
    include: { invoice: { select: { id: true, number: true, total: true, paidAmount: true, dueDate: true, status: true, customer: { select: { name: true, label: true } } } } },
  });

  const now = new Date();
  const rows = receivables
    .map((r) => {
      const inv = r.invoice;
      const outstanding = invoiceOutstanding(toNumber(inv.total), toNumber(inv.paidAmount));
      const due = inv.dueDate ?? r.dueDate;
      const overdueDays = due ? Math.floor((now.getTime() - new Date(due).getTime()) / 86_400_000) : 0;
      const customerName = inv.customer && hasPermission(user, 'customer', 'read') && canSeeCustomerLabel(user.roles, inv.customer.label) ? inv.customer.name : '（非表示）';
      return { id: r.id, invoiceId: inv.id, number: inv.number, outstanding, due, overdueDays, bucket: agingBucketOf(overdueDays), customerName };
    })
    .filter((r) => r.outstanding > 0)
    .sort((a, b) => b.overdueDays - a.overdueDays);

  const summary = bucketReceivablesByAge(rows.map((r) => ({ outstanding: r.outstanding, dueDate: r.due })), now);

  return (
    <div>
      <PageHeader
        title="売掛エイジング（未回収の見える化）"
        description="未回収の請求を経過日数ごとに集計します。回収アクション（督促）は各行から確認できます。実行・外部送信は行いません。"
        breadcrumb={[{ label: '財務', href: '/finance/cashflow' }, { label: '売掛エイジング', href: '#' }]}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {summary.buckets.map((b) => (
          <div key={b.key} data-testid={`aging-bucket-${b.key}`}>
            <Stat label={`${b.label}（${b.count}件）`} value={formatJpy(b.amount)} tone={BUCKET_TONE[b.key] as never} />
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <span className="rounded-md bg-secondary/40 px-3 py-1">未回収合計: <span className="font-bold" data-testid="aging-total">{formatJpy(summary.totalOutstanding)}</span></span>
        <span className="rounded-md bg-red-50 px-3 py-1 text-red-700">うち延滞分: <span className="font-bold">{formatJpy(summary.overdueAmount)}</span></span>
        <span className="rounded-md bg-secondary/40 px-3 py-1">件数: {summary.count}</span>
      </div>

      <Card>
        <CardHeader><CardTitle>未回収の請求（{summary.count}件）</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState title="未回収の売掛はありません" />
          ) : (
            <Table>
              <thead><tr><Th>請求番号</Th><Th>宛先</Th><Th>支払期日</Th><Th>経過</Th><Th>区分</Th><Th>未回収額</Th><Th>回収</Th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} data-testid={`aging-row-${r.invoiceId}`}>
                    <Td className="font-mono">{r.number}</Td>
                    <Td>{r.customerName}</Td>
                    <Td>{formatDate(r.due)}</Td>
                    <Td>{r.overdueDays > 0 ? `${r.overdueDays}日超過` : '未到来'}</Td>
                    <Td><Badge tone={BUCKET_TONE[r.bucket] as never}>{summary.buckets.find((b) => b.key === r.bucket)?.label}</Badge></Td>
                    <Td className="font-medium">{formatJpy(r.outstanding)}</Td>
                    <Td>
                      <Link href={`/invoices/${r.invoiceId}#dunning`} data-testid={`aging-dunning-link-${r.invoiceId}`}>
                        <Button variant="outline" className="h-7 px-2 text-xs">督促を確認</Button>
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
