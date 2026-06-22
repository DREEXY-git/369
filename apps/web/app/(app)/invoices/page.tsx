import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, Table, Th, Td, Badge, Stat, EmptyState } from '@/components/ui';
import { formatJpy, formatDate, isOverdue } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function InvoicesPage() {
  const user = await requireUser();
  const invoices = await prisma.invoice.findMany({
    where: { tenantId: user.tenantId },
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
  });
  const overdueCount = invoices.filter((i) => isOverdue(i.dueDate, i.status)).length;
  const unpaid = invoices.filter((i) => i.status !== 'PAID' && i.status !== 'VOID').reduce((s, i) => s + toNumber(i.total), 0);

  return (
    <div>
      <PageHeader title="請求・回収管理" description="請求書・入金予定・未回収・回収リスクを管理します。" />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="請求件数" value={invoices.length} />
        <Stat label="未払い合計" value={formatJpy(unpaid)} />
        <Stat label="延滞" value={overdueCount} tone={overdueCount ? 'red' : 'green'} />
      </div>
      <Card>
        {invoices.length === 0 ? <div className="p-6"><EmptyState title="請求がありません" /></div> : (
          <Table>
            <thead><tr><Th>番号</Th><Th>顧客</Th><Th>金額</Th><Th>入金</Th><Th>期日</Th><Th>状態</Th></tr></thead>
            <tbody>
              {invoices.map((i) => {
                const od = isOverdue(i.dueDate, i.status);
                return (
                  <tr key={i.id} className="hover:bg-secondary/50">
                    <Td className="font-mono text-xs">{i.number}</Td>
                    <Td>{i.customer?.name ?? '—'}</Td>
                    <Td className="font-medium">{formatJpy(toNumber(i.total))}</Td>
                    <Td>{formatJpy(toNumber(i.paidAmount))}</Td>
                    <Td className={od ? 'text-red-600' : ''}>{formatDate(i.dueDate)}</Td>
                    <Td><Badge tone={i.status === 'PAID' ? 'green' : od || i.status === 'OVERDUE' ? 'red' : 'amber'}>{od && i.status !== 'PAID' ? 'OVERDUE' : i.status}</Badge></Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
