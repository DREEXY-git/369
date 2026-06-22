import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, Stat, EmptyState } from '@/components/ui';
import { SeverityBadge } from '@/components/badges';
import { formatJpy } from '@hokko/shared';

export const dynamic = 'force-dynamic';

const TYPE_LABEL: Record<string, string> = {
  low_margin: '低粗利/赤字', discount: '過大値引き', unbilled: '請求漏れ', overdue: '回収遅延', idle_asset: '眠り在庫',
};

export default async function ProfitLeaksPage() {
  const user = await requireUser();
  if (!hasPermission(user, 'finance', 'read')) {
    return <div><PageHeader title="利益漏れ検知" /><div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">閲覧権限がありません。</div></div>;
  }
  const findings = await prisma.profitLeakFinding.findMany({
    where: { tenantId: user.tenantId, resolved: false },
    orderBy: { impactJpy: 'desc' },
  });
  const total = findings.reduce((s, f) => s + toNumber(f.impactJpy), 0);

  return (
    <div>
      <PageHeader title="利益漏れ検知AI" description="原価率・値引き・未請求・回収遅延・眠り在庫などをAIが検知します。" />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="検知件数" value={findings.length} />
        <Stat label="推定影響額" value={formatJpy(total)} tone="red" />
        <Stat label="最優先" value={findings[0] ? TYPE_LABEL[findings[0].type] ?? findings[0].type : '—'} />
      </div>
      <Card>
        <CardContent className="space-y-2 pt-4">
          {findings.length === 0 ? <EmptyState title="利益漏れは検知されていません" /> : findings.map((f) => (
            <div key={f.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={f.severity as any} />
                  <span className="font-medium">{f.title}</span>
                </div>
                <div className="text-xs text-muted-foreground">{f.detail}</div>
                <div className="mt-1 text-xs text-primary">→ {f.recommendation}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-bold text-red-600">{formatJpy(toNumber(f.impactJpy))}</div>
                <div className="text-[11px] text-muted-foreground">{TYPE_LABEL[f.type] ?? f.type}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
