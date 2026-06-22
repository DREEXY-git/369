import Link from 'next/link';
import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, Table, Th, Td, Badge, Button, EmptyState } from '@/components/ui';
import { DEAL_STAGE_LABEL } from '@/components/badges';
import { formatJpy, formatDate, computeQuoteTotals } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function DealsPage() {
  const user = await requireUser();
  const deals = await prisma.deal.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { updatedAt: 'desc' },
    include: { customer: true },
  });

  return (
    <div>
      <PageHeader
        title="案件管理"
        description={`${deals.length} 件の案件`}
        action={<Link href="/deals/kanban"><Button>カンバン表示</Button></Link>}
      />
      <Card>
        {deals.length === 0 ? (
          <div className="p-6"><EmptyState title="案件がありません" /></div>
        ) : (
          <Table>
            <thead>
              <tr><Th>案件</Th><Th>顧客</Th><Th>ステージ</Th><Th>金額</Th><Th>粗利率</Th><Th>確度</Th><Th>次アクション</Th></tr>
            </thead>
            <tbody>
              {deals.map((d) => {
                const amount = toNumber(d.amount);
                const cost = toNumber(d.cost);
                const gm = computeQuoteTotals(amount, cost, 0, 10).grossMarginRate;
                return (
                  <tr key={d.id} className="hover:bg-secondary/50">
                    <Td><Link href={`/deals/${d.id}`} className="font-medium text-primary hover:underline">{d.title}</Link></Td>
                    <Td className="text-xs">{d.customer.name}</Td>
                    <Td><Badge tone="blue">{DEAL_STAGE_LABEL[d.stage]}</Badge></Td>
                    <Td className="font-medium">{formatJpy(amount)}</Td>
                    <Td><Badge tone={gm < 15 ? 'red' : gm < 25 ? 'amber' : 'green'}>{gm}%</Badge></Td>
                    <Td>{d.probability}%</Td>
                    <Td className="text-xs text-muted-foreground">{d.nextAction}（{formatDate(d.nextActionAt)}）</Td>
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
