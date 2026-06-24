import Link from 'next/link';
import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Badge, Stat, EmptyState, Button } from '@/components/ui';
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
      <PageHeader
        title="プランニングホッコー特化"
        description="イベント・リース案件を、商品を利益に変える経営資産として一気通貫で管理します。"
        action={<Link href="/operations/events/new"><Button>イベント案件を作成</Button></Link>}
      />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="イベント案件" value={events.length} />
        <Stat label="想定粗利合計" value={formatJpy(totalGross)} tone="green" />
        <Stat label="眠っている商品" value={idleAssets.length} tone={idleAssets.length ? 'amber' : 'green'} />
      </div>
      <div className="mb-4 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-900">
        各案件の「現在地と次の一手（Golden Path）」は案件詳細で確認できます。顧客→案件→商品割当→設営→原価/売上→粗利→請求→入金→資金繰りまで一本で進めます。
      </div>

      <div className="space-y-3">
        {events.length === 0 ? <Card><CardContent className="pt-6"><EmptyState title="イベント案件がありません" /></CardContent></Card> : events.map((e) => {
          const margin = toNumber(e.revenue) > 0 ? Math.round((toNumber(e.gross) / toNumber(e.revenue)) * 100) : 0;
          return (
            <Card key={e.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  <Link href={`/operations/events/${e.id}`} className="text-primary hover:underline">{e.name}</Link>
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
                <div className="mt-2"><Link href={`/operations/events/${e.id}`} className="text-xs text-primary hover:underline">案件詳細・次の一手 →</Link></div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
