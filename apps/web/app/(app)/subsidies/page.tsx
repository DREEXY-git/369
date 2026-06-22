import Link from 'next/link';
import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Badge, EmptyState } from '@/components/ui';
import { formatJpy, formatDate } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function SubsidiesPage() {
  const user = await requireUser();
  const programs = await prisma.subsidyProgram.findMany({
    where: { tenantId: user.tenantId },
    include: { eligibilityChecks: { orderBy: { createdAt: 'desc' }, take: 1 }, tasks: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <PageHeader title="補助金・助成金" description="対象条件判定・申請可能性スコア・必要書類・申請タスクを管理します（本番は外部データProviderに差替可）。" />
      <div className="space-y-3">
        {programs.length === 0 ? <Card><CardContent className="pt-6"><EmptyState title="補助金情報がありません" /></CardContent></Card> : programs.map((p) => {
          const check = p.eligibilityChecks[0];
          return (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  <span>{p.name}</span>
                  <Badge tone="blue">{p.authority}</Badge>
                  <Badge tone="slate">上限 {formatJpy(toNumber(p.maxAmount))}</Badge>
                  {check ? <Badge tone={check.score >= 70 ? 'green' : 'amber'}>申請可能性 {check.score}</Badge> : null}
                  <Link href={`/subsidies/${p.id}`} className="ml-auto text-xs text-primary hover:underline">詳細 →</Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{p.summary}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>締切: {formatDate(p.deadline)}</span>
                  <span>必要書類: {p.documents.join('・')}</span>
                  <span>申請タスク: {p.tasks.length}件</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
