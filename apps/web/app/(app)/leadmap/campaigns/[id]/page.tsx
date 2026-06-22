import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, Table, Th, Td, Stat, EmptyState } from '@/components/ui';
import { LeadStageBadge, PriorityBadge } from '@/components/badges';
import { DemoMap, type MapLead } from '@/components/leadmap/demo-map';
import { isGoogleMapsEnabled } from '@hokko/integrations';
import type { LeadStage } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const campaign = await prisma.leadSearchCampaign.findFirst({
    where: { id, tenantId: user.tenantId },
    include: { leads: { orderBy: { priority: 'desc' } } },
  });
  if (!campaign) notFound();

  const leads = campaign.leads;
  const analyzed = leads.filter((l) => l.stage !== 'NEW').length;
  const avgPriority = leads.length ? Math.round(leads.reduce((s, l) => s + l.priority, 0) / leads.length) : 0;
  const mapLeads: MapLead[] = leads
    .filter((l) => l.lat && l.lng)
    .map((l) => ({ id: l.id, name: l.name, lat: l.lat!, lng: l.lng!, stage: l.stage as LeadStage, priority: l.priority, industry: l.industry, city: l.city ?? '', source: l.source }));

  return (
    <div>
      <PageHeader
        title={campaign.name}
        description={`${campaign.region}・${campaign.industry}・営業種別: ${campaign.forSalesType}`}
        breadcrumb={[
          { label: 'LeadMap', href: '/leadmap/campaigns' },
          { label: campaign.name, href: `/leadmap/campaigns/${campaign.id}` },
        ]}
      />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="リード数" value={leads.length} />
        <Stat label="分析済み" value={analyzed} sub={`${leads.length ? Math.round((analyzed / leads.length) * 100) : 0}%`} />
        <Stat label="平均優先度" value={avgPriority} />
        <Stat label="データソース" value={campaign.source} />
      </div>

      <Card className="mb-4">
        <CardContent className="pt-4">
          <DemoMap leads={mapLeads} isGoogle={isGoogleMapsEnabled()} />
        </CardContent>
      </Card>

      <Card>
        {leads.length === 0 ? (
          <div className="p-6"><EmptyState title="リードがありません" /></div>
        ) : (
          <Table>
            <thead>
              <tr><Th>店舗名</Th><Th>評価/口コミ</Th><Th>優先度</Th><Th>ステージ</Th><Th></Th></tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="hover:bg-secondary/50">
                  <Td><Link href={`/leadmap/leads/${l.id}`} className="font-medium text-primary hover:underline">{l.name}</Link></Td>
                  <Td>★{l.rating ?? '—'} / {l.reviewCount}</Td>
                  <Td><PriorityBadge score={l.priority} /></Td>
                  <Td><LeadStageBadge stage={l.stage as LeadStage} /></Td>
                  <Td className="text-right"><Link href={`/leadmap/leads/${l.id}/analysis`} className="text-xs text-primary hover:underline">分析</Link></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
