import Link from 'next/link';
import { Megaphone, Sparkles, Cpu, TrendingUp, Clock, Wallet, CheckSquare } from 'lucide-react';
import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { summarizeGrowthEvents } from '@/lib/growth';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Stat, Badge, Button, EmptyState } from '@/components/ui';
import { BarList, Donut } from '@/components/charts';
import { formatJpy, formatDateTime } from '@hokko/shared';

export const dynamic = 'force-dynamic';

const CAT_LABEL: Record<string, string> = {
  marketing: 'マーケ', sales: '営業', finance: '財務', dx: 'DX', ai: 'AI', management: '経営', customer: '顧客',
};
const CAT_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#a855f7', '#94a3b8', '#ef4444'];

export default async function GrowthDashboardPage() {
  const user = await requireUser();
  const t = user.tenantId;
  const [summary, campaigns, assets, pendingAssets, opportunities, suggestions, aiOutputs, recent] = await Promise.all([
    summarizeGrowthEvents(t, 30),
    prisma.marketingCampaign.count({ where: { tenantId: t } }),
    prisma.contentAsset.count({ where: { tenantId: t, generatedByAi: true } }),
    prisma.contentAsset.count({ where: { tenantId: t, approvalStatus: 'pending' } }),
    prisma.dXOpportunity.findMany({ where: { tenantId: t } }),
    prisma.marketingSuggestion.count({ where: { tenantId: t } }),
    prisma.aIOutput.count({ where: { tenantId: t } }),
    prisma.growthEvent.findMany({ where: { tenantId: t }, orderBy: { occurredAt: 'desc' }, take: 12 }),
  ]);

  const oppTime = opportunities.reduce((s, o) => s + o.estimatedTimeSavingMinutes, 0);
  const oppCost = opportunities.reduce((s, o) => s + toNumber(o.estimatedCostSaving), 0);
  const oppRev = opportunities.reduce((s, o) => s + toNumber(o.estimatedRevenueImpact), 0);

  const catSegments = Object.entries(summary.byCategory)
    .map(([k, v], i) => ({ label: CAT_LABEL[k] ?? k, value: v, color: CAT_COLORS[i % CAT_COLORS.length]! }))
    .sort((a, b) => b.value - a.value);
  const totalSavingMoney = summary.totalCostSaving + Math.round((summary.totalTimeSavingMinutes / 60) * 3000);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Growth OS — 成長ダッシュボード"
        description="会社で起きた出来事を、売上・利益・生産性・DX効果に接続して可視化します（直近30日）。"
        action={<Link href="/growth/events"><Button variant="outline">成長イベント台帳</Button></Link>}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="成長イベント(30日)" value={summary.total} tone="purple" icon={<TrendingUp />} sub={`売上関連 ${summary.revenueRelated} 件`} />
        <Stat label="売上インパクト" value={formatJpy(summary.totalRevenueImpact)} tone="emerald" icon={<Wallet />} sub="記録ベース" />
        <Stat label="削減コスト換算" value={formatJpy(totalSavingMoney)} tone="blue" icon={<Clock />} sub={`工数 ${summary.totalTimeSavingMinutes}分 含む`} />
        <Stat label="AI生成資産" value={assets} tone="sky" icon={<Sparkles />} sub={`AI出力 ${aiOutputs} 件`} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="キャンペーン" value={campaigns} icon={<Megaphone />} />
        <Stat label="DX改善機会" value={opportunities.length} icon={<Cpu />} sub={`推定 ${formatJpy(oppCost + oppRev)}/月`} />
        <Stat label="AI提案" value={suggestions} />
        <Stat label="承認待ち資産" value={pendingAssets} tone={pendingAssets ? 'amber' : 'slate'} icon={<CheckSquare />} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>カテゴリ別の成長イベント</CardTitle></CardHeader>
          <CardContent>
            {catSegments.length === 0 ? <EmptyState title="イベントがありません" hint="マーケ施策やDX改善で蓄積されます。" /> : <Donut segments={catSegments} centerLabel={summary.total} centerSub="件" />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>DX改善機会の推定効果(月)</CardTitle></CardHeader>
          <CardContent>
            <BarList
              data={[
                { label: 'コスト削減', value: oppCost },
                { label: '売上インパクト', value: oppRev },
                { label: '工数削減(円換算)', value: Math.round((oppTime / 60) * 3000) },
              ]}
              valueFormat={(v) => formatJpy(v)}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>OS 入口</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-sm">
            <Link href="/marketing" className="rounded-md border p-3 text-center transition hover:border-primary/30 hover:bg-secondary">Marketing OS</Link>
            <Link href="/dx" className="rounded-md border p-3 text-center transition hover:border-primary/30 hover:bg-secondary">DX OS</Link>
            <Link href="/growth/events" className="rounded-md border p-3 text-center transition hover:border-primary/30 hover:bg-secondary">成長台帳</Link>
            <Link href="/marketing/assets" className="rounded-md border p-3 text-center transition hover:border-primary/30 hover:bg-secondary">AI資産</Link>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>最近の成長イベント</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {recent.length === 0 ? (
            <EmptyState title="まだ成長イベントがありません" hint="キャンペーン作成・AI資産生成・DX効果記録で蓄積されます。" />
          ) : (
            recent.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <Badge tone="purple">{CAT_LABEL[e.category] ?? e.category}</Badge>
                  <span className="truncate">{e.title}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  {e.revenueImpact ? <span className="text-emerald-600">{formatJpy(toNumber(e.revenueImpact))}</span> : null}
                  {formatDateTime(e.occurredAt)}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
