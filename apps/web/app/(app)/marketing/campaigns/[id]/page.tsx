import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/current-user';
import { prisma, writeDataAccess } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Stat, Badge, Input, Select, Button, EmptyState } from '@/components/ui';
import { formatJpy, formatDateTime } from '@hokko/shared';
import { generateMarketingAssetDraftAction, recordMarketingCampaignResultAction } from '../../actions';
import { MARKETING_ASSET_KIND_LABEL } from '@/lib/ai-generate';

export const dynamic = 'force-dynamic';

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const campaign = await prisma.marketingCampaign.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!campaign) notFound();
  // 売上/予算情報を含むため参照ログを記録
  await writeDataAccess({ tenantId: user.tenantId, actorId: user.userId, entityType: 'MarketingCampaign', entityId: campaign.id, label: 'INTERNAL', action: 'read', purpose: 'キャンペーン詳細の閲覧' });

  const [assets, growth, metrics] = await Promise.all([
    prisma.contentAsset.findMany({ where: { tenantId: user.tenantId, campaignId: id }, orderBy: { createdAt: 'desc' } }),
    prisma.growthEvent.findMany({ where: { tenantId: user.tenantId, entityType: 'MarketingCampaign', entityId: id }, orderBy: { occurredAt: 'desc' }, take: 10 }),
    prisma.campaignMetric.aggregate({ where: { tenantId: user.tenantId, campaignId: id }, _sum: { conversions: true, clicks: true, cost: true } }),
  ]);
  const kpiPlan = (campaign.kpiPlan ?? {}) as any;

  return (
    <div>
      <PageHeader
        title={campaign.name}
        description={`${campaign.channel} ・ ${campaign.purpose || '目的未設定'}`}
        breadcrumb={[{ label: 'Marketing OS', href: '/marketing' }, { label: 'キャンペーン', href: '/marketing/campaigns' }, { label: campaign.name, href: '#' }]}
        action={<Badge tone={campaign.status === 'active' ? 'green' : 'slate'}>{campaign.status}</Badge>}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="予算" value={formatJpy(toNumber(campaign.budget))} />
        <Stat label="消化" value={formatJpy(toNumber(campaign.spent))} />
        <Stat label="CV実績" value={metrics._sum.conversions ?? 0} tone="emerald" sub={`目標 ${kpiPlan.conversions ?? '-'}`} />
        <Stat label="費用" value={formatJpy(toNumber(metrics._sum.cost))} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>AI資産を生成（外部送信なし・下書き）</CardTitle></CardHeader>
          <CardContent>
            <form action={generateMarketingAssetDraftAction} className="space-y-2">
              <input type="hidden" name="campaignId" value={campaign.id} />
              <input type="hidden" name="campaignName" value={campaign.name} />
              <Select name="kind" defaultValue="sns" className="w-full">
                {Object.entries(MARKETING_ASSET_KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
              <Input name="audience" placeholder="ターゲット（例: 30代女性）" defaultValue={campaign.target} />
              <Input name="instruction" placeholder="指示（例: 初回20%オフを訴求）" />
              <Button type="submit" className="w-full">🤖 AIで下書き生成</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>実績KPIを記録</CardTitle></CardHeader>
          <CardContent>
            <form action={recordMarketingCampaignResultAction} className="grid grid-cols-2 gap-2">
              <input type="hidden" name="campaignId" value={campaign.id} />
              <Input name="impressions" type="number" placeholder="表示数" />
              <Input name="clicks" type="number" placeholder="クリック" />
              <Input name="conversions" type="number" placeholder="CV数" />
              <Input name="cost" type="number" placeholder="費用(円)" />
              <Input name="revenue" type="number" placeholder="売上(円)" className="col-span-2" />
              <Button type="submit" className="col-span-2">記録（成長イベント発火）</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>関連AI資産（{assets.length}）</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {assets.length === 0 ? <EmptyState title="まだ資産がありません" /> : assets.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                <span className="truncate">{a.title}</span>
                <Badge tone={a.approvalStatus === 'approved' ? 'green' : a.approvalStatus === 'pending' ? 'amber' : 'slate'}>{a.approvalStatus}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>関連成長イベント</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {growth.length === 0 ? <EmptyState title="まだイベントがありません" /> : growth.map((g) => (
              <div key={g.id} className="flex items-center justify-between text-sm">
                <span className="truncate">{g.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(g.occurredAt)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
