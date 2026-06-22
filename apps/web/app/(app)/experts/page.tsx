import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Badge, EmptyState } from '@/components/ui';
import { SeverityBadge } from '@/components/badges';

export const dynamic = 'force-dynamic';

export default async function ExpertsPage() {
  const user = await requireUser();
  const [partners, referrals] = await Promise.all([
    prisma.expertPartner.findMany({ where: { tenantId: user.tenantId } }),
    prisma.expertReferral.findMany({ where: { tenantId: user.tenantId }, include: { partner: true }, orderBy: { createdAt: 'desc' } }),
  ]);

  return (
    <div>
      <PageHeader title="士業・専門家連携" description="AIが検知したリスクに対し、税理士・社労士・弁護士等への相談候補を提示します。" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>連携先</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {partners.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span><Badge tone="blue">{p.type}</Badge> {p.name}</span>
                <span className="text-xs text-muted-foreground">{p.email}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>AIによる相談候補</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {referrals.length === 0 ? <EmptyState title="相談候補なし" /> : referrals.map((r) => (
              <div key={r.id} className="rounded-md border p-2 text-sm">
                <div className="flex items-center gap-2"><SeverityBadge severity={r.severity as any} /><Badge tone="purple">{r.topic}</Badge></div>
                <div className="mt-1">{r.reason}</div>
                {r.partner ? <div className="text-xs text-muted-foreground">候補: {r.partner.name}</div> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
