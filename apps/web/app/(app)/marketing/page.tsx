import Link from 'next/link';
import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Stat, Badge, Button, EmptyState } from '@/components/ui';
import { formatJpy, formatDateTime } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function MarketingHomePage() {
  const user = await requireUser();
  const t = user.tenantId;
  const [campaigns, assets, pending, metrics, recentCampaigns] = await Promise.all([
    prisma.marketingCampaign.findMany({ where: { tenantId: t } }),
    prisma.contentAsset.count({ where: { tenantId: t, generatedByAi: true } }),
    prisma.contentAsset.count({ where: { tenantId: t, approvalStatus: 'pending' } }),
    prisma.campaignMetric.aggregate({ where: { tenantId: t }, _sum: { conversions: true, cost: true } }),
    prisma.marketingCampaign.findMany({ where: { tenantId: t }, orderBy: { createdAt: 'desc' }, take: 6 }),
  ]);
  const budget = campaigns.reduce((s, c) => s + toNumber(c.budget), 0);
  const spent = campaigns.reduce((s, c) => s + toNumber(c.spent), 0);
  const cv = metrics._sum.conversions ?? 0;
  const cost = toNumber(metrics._sum.cost);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Marketing OS"
        description="キャンペーン・AI生成資産・成果を一元管理。外部送信は必ず承認を通します。"
        action={<Link href="/marketing/campaigns/new"><Button>キャンペーン作成</Button></Link>}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="キャンペーン" value={campaigns.length} tone="purple" />
        <Stat label="AI生成資産" value={assets} tone="sky" />
        <Stat label="予算 / 消化" value={`${formatJpy(budget)}`} sub={`消化 ${formatJpy(spent)}`} />
        <Stat label="成果(CV/費用)" value={cv} sub={`費用 ${formatJpy(cost)}`} tone="emerald" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>最近のキャンペーン</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recentCampaigns.length === 0 ? (
              <EmptyState title="キャンペーンがありません" hint="「キャンペーン作成」から始めましょう。" />
            ) : (
              recentCampaigns.map((c) => (
                <Link key={c.id} href={`/marketing/campaigns/${c.id}`} className="flex items-center justify-between rounded-md border p-3 hover:bg-secondary">
                  <span className="flex items-center gap-2"><Badge tone="blue">{c.channel}</Badge><span className="font-medium">{c.name}</span></span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(c.createdAt)}</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>クイック</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 text-sm">
            <Link href="/marketing/campaigns" className="rounded-md border p-2 text-center hover:bg-secondary">キャンペーン一覧</Link>
            <Link href="/marketing/assets" className="rounded-md border p-2 text-center hover:bg-secondary">AI資産（生成・承認申請）</Link>
            <Link href="/growth" className="rounded-md border p-2 text-center hover:bg-secondary">Growth ダッシュボード</Link>
            {pending > 0 ? <div className="rounded-md bg-amber-50 p-2 text-center text-amber-800">承認待ち資産 {pending} 件</div> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
