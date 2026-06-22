import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Badge, EmptyState } from '@/components/ui';
import { formatDate } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function RoutesPage() {
  const user = await requireUser();
  const routes = await prisma.visitRoute.findMany({
    where: { tenantId: user.tenantId },
    include: { stops: { orderBy: { order: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <PageHeader title="訪問ルート" description="近接する営業先を効率よく回るための訪問ルートを管理します。" />
      {routes.length === 0 ? (
        <Card><CardContent className="pt-6"><EmptyState title="ルートがありません" /></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {routes.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{r.name}</span>
                  <Badge tone="blue">{formatDate(r.date)}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {r.stops.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2 text-sm">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">{i + 1}</span>
                    <span>{s.label}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
