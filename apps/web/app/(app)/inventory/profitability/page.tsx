import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Table, Th, Td, Badge, EmptyState } from '@/components/ui';
import { formatJpy, suggestDynamicPrice } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function ProfitabilityPage() {
  const user = await requireUser();
  const assets = await prisma.productAsset.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { cumulativeGross: 'desc' },
  });

  const sellers = [...assets].sort((a, b) => toNumber(b.cumulativeGross) - toNumber(a.cumulativeGross)).slice(0, 5);
  const idle = assets.filter((a) => toNumber(a.utilizationRate) < 30);

  // ダイナミックプライシング提案（ルールベース）
  const pricing = assets.slice(0, 8).map((a) => {
    const util = toNumber(a.utilizationRate);
    const s = suggestDynamicPrice(toNumber(a.rentalPrice), {
      peakSeason: util > 60,
      lowUtilization: util < 30,
      lowStock: a.quantity < 10,
      lowSeason: util < 20,
    });
    return { name: a.name, base: toNumber(a.rentalPrice), ...s };
  });

  return (
    <div>
      <PageHeader title="商品収益性分析" description="商品別の粗利・稼働率と、AIによるダイナミックプライシング提案。" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>💹 売れ筋商品（累計粗利）</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {sellers.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span>{a.name}</span>
                <span className="flex items-center gap-2"><Badge tone="green">稼働 {toNumber(a.utilizationRate)}%</Badge><span className="font-medium">{formatJpy(toNumber(a.cumulativeGross))}</span></span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>🛏️ 眠っている商品（要対策）</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {idle.length === 0 ? <EmptyState title="なし" /> : idle.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span>{a.name}</span>
                <Badge tone="red">稼働 {toNumber(a.utilizationRate)}%</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>🤖 ダイナミックプライシング提案（AI・理由付き）</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <thead><tr><Th>商品</Th><Th>現在単価</Th><Th>提案単価</Th><Th>変化</Th><Th>理由</Th></tr></thead>
            <tbody>
              {pricing.map((p) => (
                <tr key={p.name}>
                  <Td>{p.name}</Td>
                  <Td>{formatJpy(p.base)}</Td>
                  <Td className="font-medium">{formatJpy(p.suggestedPrice)}</Td>
                  <Td><Badge tone={p.changeRate > 0 ? 'green' : p.changeRate < 0 ? 'red' : 'slate'}>{p.changeRate > 0 ? '+' : ''}{p.changeRate}%</Badge></Td>
                  <Td className="text-xs text-muted-foreground">{p.reason}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
