import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, Table, Th, Td, Stat, Button, EmptyState } from '@/components/ui';
import { LeadStageBadge, PriorityBadge } from '@/components/badges';
import { DemoMap, type MapLead } from '@/components/leadmap/demo-map';
import { bulkAnalyzeCampaignAction, bulkGenerateOutreachAction } from '../../actions';
import { isGoogleMapsEnabled } from '@hokko/integrations';
import type { LeadStage } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ analyzed?: string; generated?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
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
        action={
          <div className="flex gap-2">
            <form action={bulkAnalyzeCampaignAction}>
              <input type="hidden" name="campaignId" value={campaign.id} />
              <Button type="submit" variant="secondary">🔍 一括AI分析</Button>
            </form>
            <form action={bulkGenerateOutreachAction}>
              <input type="hidden" name="campaignId" value={campaign.id} />
              <Button type="submit">✉️ 一括営業メール生成</Button>
            </form>
          </div>
        }
      />
      {sp.analyzed ? (
        <div className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          🤖 {sp.analyzed} 件のリードをAIで分析しました（強み・改善余地・営業切り口）。
        </div>
      ) : null}
      {sp.generated ? (
        <div className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          ✉️ {sp.generated} 件の個別営業メール下書きを生成しました。送信には人間の承認が必要です。
        </div>
      ) : null}
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
