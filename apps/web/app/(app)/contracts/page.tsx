import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Badge, EmptyState } from '@/components/ui';
import { SeverityBadge } from '@/components/badges';
import { formatJpy, formatDate, daysFromNow } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function ContractsPage() {
  const user = await requireUser();
  const contracts = await prisma.contract.findMany({
    where: { tenantId: user.tenantId },
    include: { risks: true, clauses: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <PageHeader title="契約管理" description="契約ステータス・更新期限・重要条項・契約リスク（法務AIチェック）を管理します。" />
      <div className="space-y-3">
        {contracts.length === 0 ? <Card><CardContent className="pt-6"><EmptyState title="契約がありません" /></CardContent></Card> : contracts.map((c) => {
          const renewIn = daysFromNow(c.renewalDate);
          return (
            <Card key={c.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  <span>{c.number} {c.title}</span>
                  <Badge tone={c.status === 'active' ? 'green' : 'slate'}>{c.status}</Badge>
                  {c.autoRenew ? <Badge tone="amber">自動更新</Badge> : null}
                  {renewIn !== null && renewIn < 60 ? <Badge tone="red">更新まで{renewIn}日</Badge> : null}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>金額: {formatJpy(toNumber(c.value))}</span>
                  <span>期間: {formatDate(c.startDate)} 〜 {formatDate(c.endDate)}</span>
                  <span>更新期限: {formatDate(c.renewalDate)}</span>
                </div>
                {c.risks.length ? (
                  <div className="space-y-1">
                    {c.risks.map((r) => (
                      <div key={r.id} className="flex items-start gap-2 rounded-md bg-amber-50 p-2 text-xs text-amber-900">
                        <SeverityBadge severity={r.severity as any} />
                        <div><span>{r.description}</span> <span className="text-amber-700">→ {r.recommendation}</span>{r.expertNeeded ? <Badge tone="purple" className="ml-1">弁護士確認推奨</Badge> : null}</div>
                      </div>
                    ))}
                  </div>
                ) : <div className="text-xs text-muted-foreground">リスクは検知されていません。</div>}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
