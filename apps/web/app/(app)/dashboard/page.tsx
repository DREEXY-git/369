import Link from 'next/link';
import { requireUser, primaryRole, ROLE_LABEL } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Stat, Badge, EmptyState, Button } from '@/components/ui';
import { formatJpy, formatDateTime } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await requireUser();
  const t = user.tenantId;
  const [customers, deals, leads, pendingApprovals, dealSum, recentAudit, tasks] = await Promise.all([
    prisma.customer.count({ where: { tenantId: t } }),
    prisma.deal.count({ where: { tenantId: t, stage: { not: 'LOST' } } }),
    prisma.localBusinessLead.count({ where: { tenantId: t } }),
    prisma.approvalRequest.count({ where: { tenantId: t, status: 'PENDING' } }),
    prisma.deal.aggregate({ where: { tenantId: t, stage: { not: 'LOST' } }, _sum: { amount: true } }),
    prisma.auditLog.findMany({ where: { tenantId: t }, orderBy: { createdAt: 'desc' }, take: 8 }),
    prisma.actionItem.findMany({ where: { tenantId: t, status: { not: 'done' } }, orderBy: { dueDate: 'asc' }, take: 5 }),
  ]);

  return (
    <div>
      <PageHeader
        title={`ようこそ、${user.name} さん`}
        description={`${ROLE_LABEL[primaryRole(user.roles)]} としてログイン中`}
        action={<Link href="/dashboard/ceo"><Button>社長コックピットを開く</Button></Link>}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="顧客数" value={customers} />
        <Stat label="進行中の案件" value={deals} />
        <Stat label="LeadMap リード" value={leads} />
        <Stat label="パイプライン" value={formatJpy(toNumber(dealSum._sum.amount))} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>最近のアクティビティ（監査ログ）</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {recentAudit.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate"><Badge tone="slate">{a.action}</Badge> <span className="ml-1">{a.summary || a.entityType}</span></span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(a.createdAt)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>クイックアクセス</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-sm">
              <Link href="/leadmap/campaigns/new" className="rounded-md border p-2 text-center hover:bg-secondary">新規開拓</Link>
              <Link href="/meetings/upload" className="rounded-md border p-2 text-center hover:bg-secondary">議事録取込</Link>
              <Link href="/knowledge/search" className="rounded-md border p-2 text-center hover:bg-secondary">ナレッジ検索</Link>
              <Link href="/approvals" className="rounded-md border p-2 text-center hover:bg-secondary">承認 ({pendingApprovals})</Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>あなたのタスク</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {tasks.length === 0 ? <EmptyState title="タスクなし" /> : tasks.map((t2) => (
                <div key={t2.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{t2.title}</span>
                  <Badge tone={t2.priority === 'high' ? 'red' : 'slate'}>{t2.priority}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
