import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, Table, Th, Td, Badge, EmptyState, Button } from '@/components/ui';
import { formatJpy, formatDate, eventProfitMargin } from '@hokko/shared';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  planned: '計画', confirmed: '確定', in_progress: '進行中', completed: '完了', cancelled: '中止',
};

export default async function EventsPage() {
  const user = await requireUser();
  const canViewFinance = hasPermission(user, 'finance', 'read');
  const events = await prisma.eventProject.findMany({
    where: { tenantId: user.tenantId },
    include: { _count: { select: { productUsages: true, costs: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <PageHeader
        title="イベント案件管理"
        description="営業→見積→在庫予約→設営→本番→撤去→請求→粗利分析。案件別の黒字/赤字を可視化します。"
        breadcrumb={[{ label: 'Operations', href: '/operations' }, { label: 'イベント案件', href: '#' }]}
        action={<Link href="/operations/events/new"><Button>イベント案件を作成</Button></Link>}
      />
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>案件</Th><Th>会場</Th><Th>開催日</Th><Th>状態</Th><Th>使用商品</Th><Th>売上</Th>
              {canViewFinance ? <><Th>原価</Th><Th>粗利率</Th></> : null}
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr><Td colSpan={canViewFinance ? 8 : 6}><EmptyState title="イベント案件がありません" hint="「イベント案件を作成」から始めてください。" /></Td></tr>
            ) : (
              events.map((e) => {
                const revenue = toNumber(e.revenue);
                const cost = toNumber(e.cost);
                const margin = eventProfitMargin(revenue, cost);
                return (
                  <tr key={e.id} className="hover:bg-secondary/50">
                    <Td className="text-sm"><Link href={`/operations/events/${e.id}`} className="text-primary hover:underline">{e.name}</Link></Td>
                    <Td className="text-xs text-muted-foreground">{e.venue ?? '-'}</Td>
                    <Td className="text-xs">{e.eventDate ? formatDate(e.eventDate) : '-'}</Td>
                    <Td className="text-xs"><Badge tone={e.status === 'completed' ? 'green' : e.status === 'cancelled' ? 'red' : 'blue'}>{STATUS_LABEL[e.status] ?? e.status}</Badge></Td>
                    <Td className="text-xs">{e._count.productUsages}点</Td>
                    <Td className="text-xs">{formatJpy(revenue)}</Td>
                    {canViewFinance ? (
                      <>
                        <Td className="text-xs">{formatJpy(cost)}</Td>
                        <Td className="text-xs"><Badge tone={margin >= 30 ? 'green' : margin >= 10 ? 'amber' : 'red'}>{margin}%</Badge></Td>
                      </>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
