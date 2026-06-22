import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Badge, EmptyState } from '@/components/ui';
import { SeverityBadge } from '@/components/badges';
import { formatJpy } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function AlertsPage() {
  const user = await requireUser();
  const t = user.tenantId;
  const [aiAlerts, finAlerts, leaks] = await Promise.all([
    prisma.aIAlert.findMany({ where: { tenantId: t, resolved: false }, orderBy: { createdAt: 'desc' } }),
    prisma.financialAlert.findMany({ where: { tenantId: t, resolved: false }, orderBy: { createdAt: 'desc' } }),
    prisma.profitLeakFinding.findMany({ where: { tenantId: t, resolved: false }, orderBy: { impactJpy: 'desc' } }),
  ]);

  return (
    <div>
      <PageHeader title="アラート" description="AI・財務・利益漏れの検知結果を一元表示します。" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>🤖 AIアラート</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {aiAlerts.length === 0 ? <EmptyState title="なし" /> : aiAlerts.map((a) => (
              <div key={a.id} className="rounded-md border p-2">
                <div className="flex items-center gap-2"><SeverityBadge severity={a.severity as any} /><span className="text-sm font-medium">{a.title}</span></div>
                <div className="text-xs text-muted-foreground">{a.detail}</div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>💴 財務アラート</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {finAlerts.length === 0 ? <EmptyState title="なし" /> : finAlerts.map((a) => (
              <div key={a.id} className="rounded-md border p-2">
                <div className="flex items-center gap-2"><SeverityBadge severity={a.severity as any} /><span className="text-sm font-medium">{a.title}</span></div>
                <div className="text-xs text-muted-foreground">{a.detail}</div>
                <div className="mt-1 text-xs text-primary">→ {a.recommendation}</div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>💸 利益漏れ</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {leaks.length === 0 ? <EmptyState title="なし" /> : leaks.map((a) => (
              <div key={a.id} className="rounded-md border p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{a.title}</span>
                  <Badge tone="red">{formatJpy(toNumber(a.impactJpy))}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{a.recommendation}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
