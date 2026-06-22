import Link from 'next/link';
import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Stat, Badge, EmptyState } from '@/components/ui';
import { SeverityBadge, DEAL_STAGE_LABEL } from '@/components/badges';
import { formatJpy, formatDate, SEVERITY_TONE } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function CeoDashboard() {
  const user = await requireUser();
  const t = user.tenantId;

  const [
    dealAgg,
    dealsByStage,
    pendingApprovals,
    overdue,
    recommendations,
    aiAlerts,
    leaks,
    idleAssets,
    hotLeads,
    targetSetting,
    tasks,
    cashLow,
    complaints,
    dailyReports,
  ] = await Promise.all([
    prisma.deal.aggregate({ where: { tenantId: t, stage: { not: 'LOST' } }, _sum: { amount: true, cost: true } }),
    prisma.deal.groupBy({ by: ['stage'], where: { tenantId: t }, _count: true, _sum: { amount: true } }),
    prisma.approvalRequest.findMany({ where: { tenantId: t, status: 'PENDING' }, orderBy: { createdAt: 'desc' } }),
    prisma.receivable.findMany({ where: { tenantId: t, status: 'overdue' }, include: { invoice: true } }),
    prisma.aIRecommendation.findMany({ where: { tenantId: t, audience: 'ceo', dismissed: false }, orderBy: { createdAt: 'desc' } }),
    prisma.aIAlert.findMany({ where: { tenantId: t, resolved: false }, orderBy: { createdAt: 'desc' } }),
    prisma.profitLeakFinding.findMany({ where: { tenantId: t, resolved: false }, orderBy: { impactJpy: 'desc' }, take: 5 }),
    prisma.productAsset.findMany({ where: { tenantId: t, utilizationRate: { lt: 30 } }, orderBy: { utilizationRate: 'asc' }, take: 5 }),
    prisma.localBusinessLead.findMany({ where: { tenantId: t, priority: { gte: 70 }, stage: { in: ['NEW', 'ANALYZED', 'DRAFTED', 'PENDING_APPROVAL'] } }, orderBy: { priority: 'desc' }, take: 6 }),
    prisma.systemSetting.findUnique({ where: { tenantId_key: { tenantId: t, key: 'sales_target_monthly' } } }),
    prisma.actionItem.findMany({ where: { tenantId: t, status: { not: 'done' } }, orderBy: { dueDate: 'asc' }, take: 6 }),
    prisma.cashflowForecastLine.findMany({ where: { tenantId: t }, orderBy: { balance: 'asc' }, take: 1 }),
    prisma.customerComplaint.count({ where: { tenantId: t, status: 'open' } }),
    prisma.dailyReport.findMany({ where: { tenantId: t }, orderBy: { createdAt: 'desc' }, take: 3 }),
  ]);

  const pipeline = toNumber(dealAgg._sum.amount);
  const cost = toNumber(dealAgg._sum.cost);
  const gross = pipeline - cost;
  const grossRate = pipeline > 0 ? Math.round((gross / pipeline) * 1000) / 10 : 0;
  const target = toNumber(targetSetting?.value, 12_000_000);
  const achieve = target > 0 ? Math.round((pipeline / target) * 100) : 0;
  const overdueTotal = overdue.reduce((s, r) => s + toNumber(r.amount), 0);
  const minBalance = cashLow[0] ? toNumber(cashLow[0].balance) : null;

  const stageMap = new Map(dealsByStage.map((d) => [d.stage, d._count]));

  return (
    <div>
      <PageHeader
        title="社長コックピット"
        description={`おはようございます、${user.name} さん。本日の経営状況です。`}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="パイプライン売上" value={formatJpy(pipeline)} sub={`目標達成 ${achieve}%`} tone={achieve >= 100 ? 'green' : 'amber'} />
        <Stat label="想定粗利" value={formatJpy(gross)} sub={`粗利率 ${grossRate}%`} tone={grossRate >= 30 ? 'green' : 'amber'} />
        <Stat label="承認待ち" value={pendingApprovals.length} sub="要・社長判断" tone="amber" />
        <Stat label="未回収(延滞)" value={formatJpy(overdueTotal)} sub={`${overdue.length} 件`} tone={overdue.length ? 'red' : 'green'} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 左: AIからの確認・推奨 */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>🤖 AIが社長に確認したい事項 / 推奨アクション</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recommendations.length === 0 ? (
                <EmptyState title="確認事項はありません" />
              ) : (
                recommendations.map((r) => (
                  <div key={r.id} className="flex items-start gap-2 rounded-md border p-3">
                    <SeverityBadge severity={r.severity as any} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{r.title}</div>
                      <div className="text-xs text-muted-foreground">{r.detail}</div>
                      <div className="mt-1 text-xs text-primary">→ {r.action}</div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>💸 利益漏れ検知（AI）</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {leaks.length === 0 ? (
                <EmptyState title="利益漏れは検知されていません" />
              ) : (
                leaks.map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-2 rounded-md border p-2.5">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{l.title}</div>
                      <div className="text-xs text-muted-foreground">{l.recommendation}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-bold text-red-600">{formatJpy(toNumber(l.impactJpy))}</div>
                      <SeverityBadge severity={l.severity as any} />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>🗺️ LeadMap AI の新規営業機会（高優先度・未対応）</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {hotLeads.length === 0 ? (
                <EmptyState title="未対応の高優先度リードはありません" />
              ) : (
                hotLeads.map((l) => (
                  <Link key={l.id} href={`/leadmap/leads/${l.id}`} className="flex items-center justify-between gap-2 rounded-md border p-2 hover:bg-secondary">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{l.name}</div>
                      <div className="text-xs text-muted-foreground">{l.industry}・{l.city} / 評価{l.rating ?? '—'}・口コミ{l.reviewCount}</div>
                    </div>
                    <Badge tone="red">優先度 {l.priority}</Badge>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右: 状況サマリー */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>📊 営業パイプライン</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {['CONTACT', 'HEARING', 'PROPOSAL', 'QUOTE', 'NEGOTIATION', 'CONTRACT'].map((s) => (
                <div key={s} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{DEAL_STAGE_LABEL[s]}</span>
                  <Badge>{stageMap.get(s as any) ?? 0} 件</Badge>
                </div>
              ))}
              <Link href="/deals/kanban" className="mt-2 block text-xs text-primary hover:underline">カンバンで見る →</Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>⚠️ 部署別・経営アラート</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {minBalance !== null ? (
                <div className="rounded-md border p-2 text-sm">
                  <span className={`text-${SEVERITY_TONE[minBalance < 1_500_000 ? 'HIGH' : 'LOW']}-600`}>資金繰り</span>: 最低残高見込み {formatJpy(minBalance)}
                </div>
              ) : null}
              {complaints > 0 ? <div className="rounded-md border p-2 text-sm">顧客クレーム予兆: {complaints} 件</div> : null}
              {aiAlerts.map((a) => (
                <div key={a.id} className="flex items-start gap-2 rounded-md border p-2">
                  <SeverityBadge severity={a.severity as any} />
                  <div className="text-xs">{a.title}<div className="text-muted-foreground">{a.detail}</div></div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>✅ 本日のタスク</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {tasks.length === 0 ? <EmptyState title="タスクはありません" /> : tasks.map((t2) => (
                <div key={t2.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{t2.title}</span>
                  <Badge tone={t2.priority === 'high' ? 'red' : 'slate'}>{formatDate(t2.dueDate)}</Badge>
                </div>
              ))}
              <Link href="/tasks" className="mt-1 block text-xs text-primary hover:underline">すべてのタスク →</Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>🛏️ 眠っているリース商品</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {idleAssets.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{a.name}</span>
                  <Badge tone="amber">稼働 {toNumber(a.utilizationRate)}%</Badge>
                </div>
              ))}
              <Link href="/inventory/profitability" className="mt-1 block text-xs text-primary hover:underline">商品収益性 →</Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>📣 AI社員・社員からの報告</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {dailyReports.map((r) => (
                <div key={r.id} className="rounded-md border p-2 text-xs">
                  <Badge tone={r.isAi ? 'purple' : 'blue'}>{r.isAi ? 'AI社員' : '社員'}</Badge>
                  <div className="mt-1">{r.forCeo || r.done}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
