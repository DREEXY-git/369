import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui';
import { DemoMap, type MapLead } from '@/components/leadmap/demo-map';
import { isGoogleMapsEnabled } from '@hokko/integrations';
import type { LeadStage } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function MapPage({ searchParams }: { searchParams: Promise<{ campaign?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const leads = await prisma.localBusinessLead.findMany({
    where: { tenantId: user.tenantId, ...(sp.campaign ? { campaignId: sp.campaign } : {}), lat: { not: null }, lng: { not: null } },
    orderBy: { priority: 'desc' },
    take: 300,
  });

  const mapLeads: MapLead[] = leads.map((l) => ({
    id: l.id,
    name: l.name,
    lat: l.lat!,
    lng: l.lng!,
    stage: l.stage as LeadStage,
    priority: l.priority,
    industry: l.industry,
    city: l.city ?? '',
    source: l.source,
  }));

  return (
    <div>
      <PageHeader title="地図CRM" description="営業先を地図上のピンで管理。色はステージ、サイズは優先度を表します。" />
      <Card>
        <CardContent className="pt-4">
          <DemoMap leads={mapLeads} isGoogle={isGoogleMapsEnabled()} />
        </CardContent>
      </Card>
    </div>
  );
}
