import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, Table, Th, Td, Badge, EmptyState, Button } from '@/components/ui';
import { formatJpy, formatDate } from '@hokko/shared';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = { draft: '下書き', pending_approval: '承認待ち', ordered: '発注済', received: '入庫済', cancelled: '中止' };
const STATUS_TONE: Record<string, 'slate' | 'amber' | 'blue' | 'green' | 'red'> = { draft: 'slate', pending_approval: 'amber', ordered: 'blue', received: 'green', cancelled: 'red' };

export default async function PurchaseOrdersPage() {
  const user = await requireUser();
  const canViewAmount = hasPermission(user, 'finance', 'read');
  const orders = await prisma.purchaseOrder.findMany({
    where: { tenantId: user.tenantId },
    include: { vendor: true, _count: { select: { lines: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <PageHeader
        title="発注管理"
        description="発注書の作成→確定（高額は承認）→入庫。発注金額・単価は機密です。"
        breadcrumb={[{ label: 'Operations', href: '/operations' }, { label: '発注', href: '#' }]}
        action={<Link href="/operations/purchase-orders/new"><Button>発注書を作成</Button></Link>}
      />
      <Card>
        <Table>
          <thead><tr><Th>発注番号</Th><Th>発注先</Th><Th>状態</Th><Th>明細</Th>{canViewAmount ? <Th>金額</Th> : null}<Th>作成</Th></tr></thead>
          <tbody>
            {orders.length === 0 ? (
              <tr><Td colSpan={canViewAmount ? 6 : 5}><EmptyState title="発注書がありません" /></Td></tr>
            ) : orders.map((o) => (
              <tr key={o.id} className="hover:bg-secondary/50">
                <Td className="text-sm"><Link href={`/operations/purchase-orders/${o.id}`} className="text-primary hover:underline">{o.orderNo}</Link></Td>
                <Td className="text-xs text-muted-foreground">{o.vendor?.name ?? '-'}</Td>
                <Td className="text-xs"><Badge tone={STATUS_TONE[o.status] ?? 'slate'}>{STATUS_LABEL[o.status] ?? o.status}</Badge></Td>
                <Td className="text-xs">{o._count.lines}</Td>
                {canViewAmount ? <Td className="text-xs">{formatJpy(toNumber(o.totalAmount))}</Td> : null}
                <Td className="text-xs text-muted-foreground">{formatDate(o.createdAt)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
