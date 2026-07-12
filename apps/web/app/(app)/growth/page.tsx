import Link from 'next/link';
import { Megaphone, Sparkles, Cpu, TrendingUp, Clock, Wallet, CheckSquare } from 'lucide-react';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { summarizeGrowthEvents, summarizeGrowthEventCounts } from '@/lib/growth';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Stat, Badge, Button, EmptyState } from '@/components/ui';
import { AccessDenied } from '@/components/access-denied';
import { BarList, Donut } from '@/components/charts';
import { formatJpy, formatDateTime } from '@hokko/shared';

export const dynamic = 'force-dynamic';

const CAT_LABEL: Record<string, string> = {
  marketing: 'マーケ', sales: '営業', finance: '財務', dx: 'DX', ai: 'AI', management: '経営', customer: '顧客', operations: '運用',
};
const CAT_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#a855f7', '#94a3b8', '#ef4444'];

export default async function GrowthDashboardPage() {
  const user = await requireUser();
  // WIP-3（roadmap64）: ページ基礎権限を明示（経営ダッシュボード = dashboard:read）。
  if (!hasPermission(user, 'dashboard', 'read')) {
    return (
      <AccessDenied
        title="Growth OS — 成長ダッシュボード"
        reason="成長ダッシュボードの閲覧にはダッシュボードの閲覧権限（dashboard:read）が必要です"
        breadcrumb={[{ label: 'Growth OS', href: '/growth' }]}
      />
    );
  }
  const t = user.tenantId;
  // WIP-3: 金額（売上インパクト・コスト削減・DX 推定金額・イベント別金額）は finance:read 保持者のみ
  // 取得・表示する。非財務閲覧者は金額列を DB クエリ段階から取得しない（counts 変種）。
  const canViewFinance = hasPermission(user, 'finance', 'read');
  const [summary, campaigns, assets, pendingAssets, opportunities, suggestions, aiOutputs, recent] = await Promise.all([
    canViewFinance ? summarizeGrowthEvents(t, 30) : summarizeGrowthEventCounts(t, 30),
    prisma.marketingCampaign.count({ where: { tenantId: t } }),
    prisma.contentAsset.count({ where: { tenantId: t, generatedByAi: true } }),
    prisma.contentAsset.count({ where: { tenantId: t, approvalStatus: 'pending' } }),
    // DX 機会: 非財務閲覧者には金額列（estimatedCostSaving/estimatedRevenueImpact）を取得しない。
    canViewFinance
      ? prisma.dXOpportunity.findMany({
          where: { tenantId: t },
          select: { estimatedTimeSavingMinutes: true, estimatedCostSaving: true, estimatedRevenueImpact: true },
        })
      : prisma.dXOpportunity.findMany({
          where: { tenantId: t },
          select: { estimatedTimeSavingMinutes: true },
        }),
    prisma.marketingSuggestion.count({ where: { tenantId: t } }),
    prisma.aIOutput.count({ where: { tenantId: t } }),
    // 直近イベント: 非財務閲覧者には finance カテゴリの行と金額列を取得しない（title 経由の情報露出も遮断）。
    prisma.growthEvent.findMany({
      where: { tenantId: t, ...(canViewFinance ? {} : { category: { not: 'finance' } }) },
      orderBy: { occurredAt: 'desc' },
      take: 12,
      select: canViewFinance
        ? { id: true, category: true, title: true, occurredAt: true, revenueImpact: true }
        : { id: true, category: true, title: true, occurredAt: true },
    }),
  ]);

  const oppTime = opportunities.reduce((s, o) => s + o.estimatedTimeSavingMinutes, 0);
  const oppCost = canViewFinance
    ? opportunities.reduce((s, o) => s + toNumber((o as { estimatedCostSaving?: unknown }).estimatedCostSaving), 0)
    : 0;
  const oppRev = canViewFinance
    ? opportunities.reduce((s, o) => s + toNumber((o as { estimatedRevenueImpact?: unknown }).estimatedRevenueImpact), 0)
    : 0;

  // 非財務閲覧者にはカテゴリ集計からも finance を除外する（件数の算術復元・存在シグナルの遮断・WIP2 と同方針）。
  const shownByCategory = Object.entries(summary.byCategory).filter(([k]) => canViewFinance || k !== 'finance');
  const shownTotal = canViewFinance
    ? summary.total
    : summary.total - (summary.byCategory['finance'] ?? 0);
  const catSegments = shownByCategory
    .map(([k, v], i) => ({ label: CAT_LABEL[k] ?? k, value: v, color: CAT_COLORS[i % CAT_COLORS.length]! }))
    .sort((a, b) => b.value - a.value);
  // 工数×固定単価の円換算は金額表示に該当するため、財務閲覧権限者にのみ表示する（逆算防止・WIP-3）。
  const totalSavingMoney = canViewFinance
    ? summary.totalCostSaving + Math.round((summary.totalTimeSavingMinutes / 60) * 3000)
    : 0;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Growth OS — 成長ダッシュボード"
        description="会社で起きた出来事を、売上・利益・生産性・DX効果に接続して可視化します（直近30日）。"
        action={
          <div className="flex gap-2">
            {/* C22 read-only 縦切り（v7.2 Lane B）: NAV 67 契約は変更せず、Growth ダッシュボードから deep link で導線を張る。 */}
            <Link href="/growth/referral"><Button variant="outline" data-testid="growth-referral-link">紹介・リファラル分析</Button></Link>
            <Link href="/growth/events"><Button variant="outline">成長イベント台帳</Button></Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="成長イベント(30日)" value={shownTotal} tone="purple" icon={<TrendingUp />} sub={canViewFinance ? `売上関連 ${summary.revenueRelated} 件` : '削減工数の記録を含む'} />
        {canViewFinance ? (
          <>
            <Stat label="売上インパクト" value={formatJpy(summary.totalRevenueImpact)} tone="emerald" icon={<Wallet />} sub="記録ベース" />
            <Stat label="削減コスト換算" value={formatJpy(totalSavingMoney)} tone="blue" icon={<Clock />} sub={`工数 ${summary.totalTimeSavingMinutes}分 含む`} />
          </>
        ) : (
          <>
            <Stat label="削減工数(30日)" value={`${summary.totalTimeSavingMinutes}分`} tone="blue" icon={<Clock />} sub="自己申告値を含む集計" />
            <Stat label="金額集計" value="権限者のみ" tone="slate" icon={<Wallet />} sub="財務閲覧権限で表示" />
          </>
        )}
        <Stat label="AI生成資産" value={assets} tone="sky" icon={<Sparkles />} sub={`AI出力 ${aiOutputs} 件`} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="キャンペーン" value={campaigns} icon={<Megaphone />} />
        <Stat label="DX改善機会" value={opportunities.length} icon={<Cpu />} sub={canViewFinance ? `推定 ${formatJpy(oppCost + oppRev)}/月` : `推定工数削減 ${oppTime}分/月`} />
        <Stat label="AI提案" value={suggestions} />
        <Stat label="承認待ち資産" value={pendingAssets} tone={pendingAssets ? 'amber' : 'slate'} icon={<CheckSquare />} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>カテゴリ別の成長イベント</CardTitle></CardHeader>
          <CardContent>
            {catSegments.length === 0 ? <EmptyState title="イベントがありません" hint="マーケ施策やDX改善で蓄積されます。" /> : <Donut segments={catSegments} centerLabel={shownTotal} centerSub="件" />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>DX改善機会の推定効果(月)</CardTitle></CardHeader>
          <CardContent>
            {canViewFinance ? (
              <BarList
                data={[
                  { label: 'コスト削減', value: oppCost },
                  { label: '売上インパクト', value: oppRev },
                  { label: '工数削減(円換算)', value: Math.round((oppTime / 60) * 3000) },
                ]}
                valueFormat={(v) => formatJpy(v)}
              />
            ) : (
              <div className="space-y-2 text-sm">
                <div>推定工数削減: <span className="font-bold tabular-nums">{oppTime}</span> 分/月</div>
                <p className="text-xs text-muted-foreground">金額の集計は財務閲覧権限のある人にのみ表示されます。</p>
              </div>
            )}
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
                  {canViewFinance && 'revenueImpact' in e && e.revenueImpact ? (
                    <span className="text-emerald-600">{formatJpy(toNumber(e.revenueImpact))}</span>
                  ) : null}
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
