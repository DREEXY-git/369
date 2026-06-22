import Link from 'next/link';
import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, Table, Th, Td, Badge, Stat, EmptyState, Button } from '@/components/ui';
import { formatJpy } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
  const user = await requireUser();
  const assets = await prisma.productAsset.findMany({
    where: { tenantId: user.tenantId },
    include: { category: true },
    orderBy: { utilizationRate: 'desc' },
  });
  const idle = assets.filter((a) => toNumber(a.utilizationRate) < 30).length;
  const repair = assets.filter((a) => a.condition === 'repair').length;
  const totalValue = assets.reduce((s, a) => s + toNumber(a.acquisitionCost), 0);

  return (
    <div>
      <PageHeader
        title="在庫・商品管理"
        description="イベント・リース商品を経営資産として管理します。"
        action={<Link href="/inventory/lease"><Button variant="outline">リース予約</Button></Link>}
      />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="商品種類" value={assets.length} />
        <Stat label="眠っている商品" value={idle} tone={idle ? 'amber' : 'green'} />
        <Stat label="要修理" value={repair} tone={repair ? 'red' : 'green'} />
        <Stat label="取得原価合計" value={formatJpy(totalValue)} />
      </div>
      <Card>
        {assets.length === 0 ? (
          <div className="p-6"><EmptyState title="商品がありません" /></div>
        ) : (
          <Table>
            <thead><tr><Th>管理番号</Th><Th>商品名</Th><Th>保有数</Th><Th>状態</Th><Th>稼働率</Th><Th>累計粗利</Th><Th>レンタル単価</Th></tr></thead>
            <tbody>
              {assets.map((a) => {
                const util = toNumber(a.utilizationRate);
                return (
                  <tr key={a.id} className="hover:bg-secondary/50">
                    <Td className="font-mono text-xs">{a.code}</Td>
                    <Td className="font-medium">{a.name}</Td>
                    <Td>{a.quantity}</Td>
                    <Td><Badge tone={a.condition === 'good' ? 'green' : a.condition === 'repair' ? 'red' : 'amber'}>{a.condition}</Badge></Td>
                    <Td><Badge tone={util >= 50 ? 'green' : util >= 30 ? 'amber' : 'red'}>{util}%</Badge></Td>
                    <Td>{formatJpy(toNumber(a.cumulativeGross))}</Td>
                    <Td>{formatJpy(toNumber(a.rentalPrice))}</Td>
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
