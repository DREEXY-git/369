import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Badge, Stat, EmptyState } from '@/components/ui';
import { formatJpy, formatDate } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function PlanningHokkoPage() {
  const user = await requireUser();
  const [events, idleAssets] = await Promise.all([
    prisma.eventProject.findMany({
      where: { tenantId: user.tenantId },
      include: { productUsages: true, nextProposals: true },
      orderBy: { eventDate: 'asc' },
    }),
    prisma.productAsset.findMany({ where: { tenantId: user.tenantId, utilizationRate: { lt: 30 } }, take: 5 }),
  ]);
  const totalGross = events.reduce((s, e) => s + toNumber(e.gross), 0);

  return (
    <div>
      <PageHeader title="プランニングホッコー特化" description="イベント・リース案件を、商品を利益に変える経営資産として一気通貫で管理します。" />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="イベント案件" value={events.length} />
        <Stat label="想定粗利合計" value={formatJpy(totalGross)} tone="green" />
        <Stat label="眠っている商品" value={idleAssets.length} tone={idleAssets.length ? 'amber' : 'green'} />
      </div>

      <div className="space-y-3">
        {events.length === 0 ? <Card><CardContent className="pt-6"><EmptyState title="イベント案件がありません" /></CardContent></Card> : events.map((e) => {
          const margin = toNumber(e.revenue) > 0 ? Math.round((toNumber(e.gross) / toNumber(e.revenue)) * 100) : 0;
          return (
            <Card key={e.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  <span>{e.name}</span>
                  <Badge tone="blue">{e.venue}</Badge>
                  <Badge tone="slate">{formatDate(e.eventDate)}</Badge>
                  <Badge tone={margin >= 30 ? 'green' : 'amber'}>粗利率 {margin}%</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>売上: {formatJpy(toNumber(e.revenue))}</span>
                  <span>原価: {formatJpy(toNumber(e.cost))}</span>
                  <span>粗利: {formatJpy(toNumber(e.gross))}</span>
                  {e.weatherRisk ? <span className="text-amber-700">天候リスク: {e.weatherRisk}</span> : null}
                </div>
                <div className="text-xs"><span className="text-muted-foreground">使用商品: </span>{e.productUsages.map((u) => `${u.assetName}×${u.quantity}`).join('、')}</div>
                {e.nextProposals.length ? (
                  <div className="mt-2 rounded-md bg-emerald-50 p-2 text-xs text-emerald-800">🤖 次回提案: {e.nextProposals[0]!.proposal}</div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
