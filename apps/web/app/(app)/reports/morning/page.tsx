import { requireUser, hasPermission } from '@/lib/auth/current-user';
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
  // 朝報は全社的に閲覧されうる。売上・原価・粗利・売掛延滞などの財務指標は finance:read 保有者のみに限定し、
  // 表示だけでなく AI 朝報生成の入力からも redact する（画面 redact のすり抜け防止・Phase 1-19）。
  const canViewFinance = hasPermission(user, 'finance', 'read');

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

  // 財務指標は finance:read 非保有者には redact（0/neutral）。AI 入力・異常検知・画面のすべてに redact 後の値を使う。
  const sales = canViewFinance ? toNumber(dealSum._sum.amount) : 0;
  const cost = canViewFinance ? toNumber(dealSum._sum.cost) : 0;
  const grossRate = canViewFinance && sales > 0 ? Math.round(((sales - cost) / sales) * 1000) / 10 : 0;
  const targetVal = canViewFinance ? toNumber(target?.value, 12_000_000) : 0;
  const overdueShown = canViewFinance ? overdue : 0;
  const prevMarginShown = canViewFinance ? prevMargin : 0;

  const anomalies = detectAnomalies({
    salesActual: sales,
    salesTarget: targetVal,
    grossMarginRate: grossRate,
    prevGrossMarginRate: prevMarginShown,
    overdueReceivableCount: overdueShown,
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
    overdueCount: overdueShown,
    unhandledLeads,
    pendingApprovals,
    stalledDeals,
    topTasks: tasks.map((t2) => t2.title),
    anomalies: anomalies.map((a) => ({ title: a.title })),
  });

  return (
    <div>
      <PageHeader title="AI朝礼レポート" description={`${formatDate(new Date())} ・ AIが経営データから自動生成（社長向け）`} />

      {!canViewFinance ? (
        <div className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          財務指標（売上・原価・粗利・売掛・延滞・資金繰り）は閲覧権限がないため非表示です（AI生成にも含めていません）。
        </div>
      ) : null}

      <Card className="mb-4 border-primary/30 bg-accent/40">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <span className="text-2xl">🤖</span>
            {/* 非finance ユーザーには財務 redact 値（0）由来の AI 文を見せず、固定の安全文に差し替え（0 を実績と誤解させない）。 */}
            <p className="text-sm leading-relaxed">
              {canViewFinance
                ? report.forCeo
                : '本日の朝報では、財務指標（売上・原価・粗利・売掛・延滞・資金繰り）は閲覧権限により非表示です。タスク・リード・承認待ち・顧客対応など、非財務の確認事項を中心にご確認ください。'}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ListCard title="📌 今日の重要タスク" items={report.todayTasks} />
        {/* 売上機会は財務由来。非finance ユーザーには redact(0) 由来の内容を見せないため非表示。 */}
        {canViewFinance ? <ListCard title="💰 今週の売上機会" items={report.salesOpportunities} tone="green" /> : null}
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
