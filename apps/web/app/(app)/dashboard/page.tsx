import Link from 'next/link';
import { Users, Briefcase, MapPin, Wallet } from 'lucide-react';
import { requireUser, hasPermission, primaryRole, ROLE_LABEL } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { AccessDenied } from '@/components/access-denied';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Stat,
  Badge,
  EmptyState,
  Button,
} from '@/components/ui';
import { BarList, TrendChart, Donut } from '@/components/charts';
import { DEAL_STAGE_LABEL, LEAD_STAGE_LABEL } from '@/components/badges';
import { formatJpy, formatDateTime } from '@hokko/shared';

export const dynamic = 'force-dynamic';

const LEAD_LABEL = LEAD_STAGE_LABEL as Record<string, { text: string; tone: string }>;
const DONUT_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#a855f7', '#94a3b8'];

export default async function DashboardPage() {
  const user = await requireUser();
  // WIP-5（roadmap66）: 経営ダッシュボード（商談パイプライン金額・監査ログ含む）にページ基礎権限
  // dashboard:read をデータ取得前に適用（/growth 系と同一規約・roadmap64 追補で記録した不整合の解消）。
  if (!hasPermission(user, 'dashboard', 'read')) {
    return (
      <AccessDenied
        title="ダッシュボード"
        reason="ダッシュボードの閲覧にはダッシュボードの閲覧権限（dashboard:read）が必要です"
      />
    );
  }
  const t = user.tenantId;
  const [
    customers,
    deals,
    leads,
    pendingApprovals,
    dealSum,
    recentAudit,
    tasks,
    dealsByStage,
    leadsByStage,
    dealsForTrend,
  ] = await Promise.all([
    prisma.customer.count({ where: { tenantId: t } }),
    prisma.deal.count({ where: { tenantId: t, stage: { not: 'LOST' } } }),
    prisma.localBusinessLead.count({ where: { tenantId: t } }),
    prisma.approvalRequest.count({ where: { tenantId: t, status: 'PENDING' } }),
    prisma.deal.aggregate({ where: { tenantId: t, stage: { not: 'LOST' } }, _sum: { amount: true } }),
    prisma.auditLog.findMany({ where: { tenantId: t }, orderBy: { createdAt: 'desc' }, take: 8 }),
    prisma.actionItem.findMany({
      where: { tenantId: t, status: { not: 'done' } },
      orderBy: { dueDate: 'asc' },
      take: 5,
    }),
    prisma.deal.groupBy({
      by: ['stage'],
      where: { tenantId: t, stage: { not: 'LOST' } },
      _sum: { amount: true },
    }),
    prisma.localBusinessLead.groupBy({ by: ['stage'], where: { tenantId: t }, _count: { _all: true } }),
    prisma.deal.findMany({
      where: { tenantId: t, stage: { not: 'LOST' } },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 800,
    }),
  ]);

  // ステージ別パイプライン（金額・上位6）
  const pipeline = dealsByStage
    .map((d) => ({ label: DEAL_STAGE_LABEL[String(d.stage)] ?? String(d.stage), value: toNumber(d._sum.amount) }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // リード構成（件数・上位5＋その他）
  const leadSorted = leadsByStage
    .map((l) => ({ label: LEAD_LABEL[String(l.stage)]?.text ?? String(l.stage), value: l._count._all }))
    .sort((a, b) => b.value - a.value);
  const leadTop = leadSorted.slice(0, 5);
  const leadOther = leadSorted.slice(5).reduce((s, x) => s + x.value, 0);
  const leadSegments = [
    ...leadTop.map((l, i) => ({ ...l, color: DONUT_COLORS[i] ?? '#94a3b8' })),
    ...(leadOther > 0 ? [{ label: 'その他', value: leadOther, color: '#cbd5e1' }] : []),
  ];
  const leadTotal = leadSegments.reduce((s, x) => s + x.value, 0);

  // 月次パイプライン推移（直近6か月の新規案件金額）
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: `${d.getMonth() + 1}月`, value: 0 };
  });
  for (const d of dealsForTrend) {
    const c = new Date(d.createdAt);
    const m = months.find((x) => x.key === `${c.getFullYear()}-${c.getMonth()}`);
    if (m) m.value += toNumber(d.amount);
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={`ようこそ、${user.name} さん`}
        description={`${ROLE_LABEL[primaryRole(user.roles)]} としてログイン中`}
        action={
          <Link href="/dashboard/ceo">
            <Button>社長コックピットを開く</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="顧客数" value={customers} tone="blue" icon={<Users />} sub="CRM登録済み" />
        <Stat label="進行中の案件" value={deals} tone="purple" icon={<Briefcase />} sub="失注を除く" />
        <Stat label="LeadMap リード" value={leads} tone="sky" icon={<MapPin />} sub="地図開拓" />
        <Stat
          label="パイプライン総額"
          value={formatJpy(toNumber(dealSum._sum.amount))}
          tone="emerald"
          icon={<Wallet />}
          sub="進行中案件の合計"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>月次パイプライン推移</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={months} height={140} valueFormat={(v) => formatJpy(v)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>リード進捗の構成</CardTitle>
          </CardHeader>
          <CardContent>
            {leadSegments.length === 0 ? (
              <EmptyState title="リードがありません" />
            ) : (
              <Donut segments={leadSegments} centerLabel={leadTotal} centerSub="件" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>最近のアクティビティ（監査ログ）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {recentAudit.length === 0 ? (
              <EmptyState title="アクティビティがありません" />
            ) : (
              recentAudit.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">
                    <Badge tone="slate">{a.action}</Badge>
                    <span className="ml-1.5">{a.summary || a.entityType}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDateTime(a.createdAt)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ステージ別パイプライン</CardTitle>
            </CardHeader>
            <CardContent>
              <BarList data={pipeline} valueFormat={(v) => formatJpy(v)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>クイックアクセス</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-sm">
              <Link
                href="/leadmap/campaigns/new"
                className="rounded-md border p-2 text-center transition hover:border-primary/30 hover:bg-secondary"
              >
                新規開拓
              </Link>
              <Link
                href="/meetings/upload"
                className="rounded-md border p-2 text-center transition hover:border-primary/30 hover:bg-secondary"
              >
                議事録取込
              </Link>
              <Link
                href="/knowledge/search"
                className="rounded-md border p-2 text-center transition hover:border-primary/30 hover:bg-secondary"
              >
                ナレッジ検索
              </Link>
              <Link
                href="/approvals"
                className="rounded-md border p-2 text-center transition hover:border-primary/30 hover:bg-secondary"
              >
                承認 ({pendingApprovals})
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>あなたのタスク</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {tasks.length === 0 ? (
                <EmptyState title="タスクなし" />
              ) : (
                tasks.map((t2) => (
                  <div key={t2.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{t2.title}</span>
                    <Badge tone={t2.priority === 'high' ? 'red' : 'slate'}>{t2.priority}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
