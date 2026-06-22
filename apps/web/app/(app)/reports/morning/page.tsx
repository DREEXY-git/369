import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import { SeverityBadge } from '@/components/badges';
import { generateMorningReport } from '@hokko/ai';
import { detectAnomalies, formatDate } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function MorningReportPage() {
  const user = await requireUser();
  const t = user.tenantId;

  const [dealSum, target, overdue, unhandledLeads, pendingApprovals, stalledDeals, tasks, prevMargin, complaints, expiring] =
    await Promise.all([
      prisma.deal.aggregate({ where: { tenantId: t, stage: { not: 'LOST' } }, _sum: { amount: true, cost: true } }),
      prisma.systemSetting.findUnique({ where: { tenantId_key: { tenantId: t, key: 'sales_target_monthly' } } }),
      prisma.receivable.count({ where: { tenantId: t, status: 'overdue' } }),
      prisma.localBusinessLead.count({ where: { tenantId: t, priority: { gte: 70 }, stage: { in: ['NEW', 'ANALYZED', 'DRAFTED', 'PENDING_APPROVAL'] } } }),
      prisma.approvalRequest.count({ where: { tenantId: t, status: 'PENDING' } }),
      prisma.deal.count({ where: { tenantId: t, stage: { in: ['CONTACT', 'HEARING'] }, nextActionAt: { lt: new Date() } } }),
      prisma.actionItem.findMany({ where: { tenantId: t, status: { not: 'done' } }, orderBy: { dueDate: 'asc' }, take: 5 }),
      Promise.resolve(38),
      prisma.customerComplaint.count({ where: { tenantId: t, status: 'open' } }),
      prisma.contract.count({ where: { tenantId: t, renewalDate: { lt: new Date(Date.now() + 60 * 86400000) } } }),
    ]);

  const sales = toNumber(dealSum._sum.amount);
  const cost = toNumber(dealSum._sum.cost);
  const grossRate = sales > 0 ? Math.round(((sales - cost) / sales) * 1000) / 10 : 0;
  const targetVal = toNumber(target?.value, 12_000_000);

  const anomalies = detectAnomalies({
    salesActual: sales,
    salesTarget: targetVal,
    grossMarginRate: grossRate,
    prevGrossMarginRate: prevMargin,
    overdueReceivableCount: overdue,
    highPriorityUnhandledLeads: unhandledLeads,
    stalledDeals,
    pendingApprovals,
    complaintsThisPeriod: complaints,
    complaintsPrevPeriod: 0,
    contractsExpiringSoon: expiring,
  });

  const report = await generateMorningReport({
    date: formatDate(new Date()),
    salesActual: sales,
    salesTarget: targetVal,
    overdueCount: overdue,
    unhandledLeads,
    pendingApprovals,
    stalledDeals,
    topTasks: tasks.map((t2) => t2.title),
    anomalies: anomalies.map((a) => ({ title: a.title })),
  });

  return (
    <div>
      <PageHeader title="AI朝礼レポート" description={`${formatDate(new Date())} ・ AIが経営データから自動生成（社長向け）`} />

      <Card className="mb-4 border-primary/30 bg-accent/40">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <span className="text-2xl">🤖</span>
            <p className="text-sm leading-relaxed">{report.forCeo}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ListCard title="📌 今日の重要タスク" items={report.todayTasks} />
        <ListCard title="💰 今週の売上機会" items={report.salesOpportunities} tone="green" />
        <ListCard title="🗺️ 本日対応すべきリード" items={report.leadmapTodo} tone="blue" />
        <ListCard title="❓ 社長確認事項" items={report.confirmations} tone="amber" />
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>⚠️ 経営異常検知（ルールベース + AI説明）</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {anomalies.length === 0 ? (
            <div className="text-sm text-muted-foreground">大きな異常は検知されていません。</div>
          ) : (
            anomalies.map((a) => (
              <div key={a.code} className="flex items-start gap-2 rounded-md border p-3">
                <SeverityBadge severity={a.severity} />
                <div>
                  <div className="text-sm font-medium">{a.title} <Badge tone="slate">{a.category}</Badge></div>
                  <div className="text-xs text-muted-foreground">{a.detail}</div>
                  <div className="mt-1 text-xs text-primary">→ {a.recommendation}</div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ListCard({ title, items, tone = 'slate' }: { title: string; items: string[]; tone?: string }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground">なし</div>
        ) : (
          <ul className="space-y-1 text-sm">
            {items.map((it, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-${tone}-400`} />
                <span>{it}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
