import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, Table, Th, Td, Badge, EmptyState, Select, Input, Button } from '@/components/ui';
import { LeadStageBadge, PriorityBadge } from '@/components/badges';
import { AccessDenied } from '@/components/access-denied';
import { LEAD_STAGES, type LeadStage } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; q?: string; campaign?: string }>;
}) {
  const user = await requireUser();
  // リード一覧は店舗名・営業状況を含む。leadmap:read を持たないロール（外部士業等）には
  // データ取得前に遮断する（/approvals と同型・P3-CT-5 push 前レビューの指摘対応）。
  if (!hasPermission(user, 'leadmap', 'read')) {
    return (
      <AccessDenied
        title="リード一覧"
        reason="リード一覧の閲覧には LeadMap の閲覧権限（leadmap:read）が必要です"
        breadcrumb={[{ label: 'リード一覧', href: '/leadmap/leads' }]}
      />
    );
  }
  const sp = await searchParams;

  const where: any = { tenantId: user.tenantId };
  if (sp.stage && (LEAD_STAGES as readonly string[]).includes(sp.stage)) where.stage = sp.stage;
  if (sp.campaign) where.campaignId = sp.campaign;
  if (sp.q) where.name = { contains: sp.q, mode: 'insensitive' };

  const [leads, campaigns, total] = await Promise.all([
    prisma.localBusinessLead.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 100,
      include: { campaign: true, _count: { select: { outreachDrafts: true } } },
    }),
    prisma.leadSearchCampaign.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: 'desc' } }),
    prisma.localBusinessLead.count({ where: { tenantId: user.tenantId } }),
  ]);

  return (
    <div>
      <PageHeader
        title="リード一覧"
        description={`営業先 ${total} 件。優先度が高い順に表示しています。`}
        action={
          <div className="flex gap-2">
            {hasPermission(user, 'leadmap', 'export') ? (
              <a href={`/api/leadmap/export${sp.campaign ? `?campaign=${sp.campaign}` : ''}`}>
                <Button variant="outline">CSVエクスポート</Button>
              </a>
            ) : null}
            <Link href="/leadmap/map">
              <Button variant="outline">地図で見る</Button>
            </Link>
          </div>
        }
      />

      <Card className="mb-3 p-3">
        <form className="flex flex-wrap items-end gap-2" method="get">
          <div>
            <label className="mb-1 block text-[11px] text-muted-foreground">検索（店舗名）</label>
            <Input name="q" defaultValue={sp.q} placeholder="店舗名…" className="w-48" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-muted-foreground">ステージ</label>
            <Select name="stage" defaultValue={sp.stage ?? ''}>
              <option value="">すべて</option>
              {LEAD_STAGES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-muted-foreground">キャンペーン</label>
            <Select name="campaign" defaultValue={sp.campaign ?? ''}>
              <option value="">すべて</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
          <Button type="submit" variant="secondary">絞り込み</Button>
        </form>
      </Card>

      <Card>
        {leads.length === 0 ? (
          <div className="p-6"><EmptyState title="リードがありません" hint="キャンペーンを作成すると営業先が抽出されます。" /></div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>店舗名</Th>
                <Th>業種 / エリア</Th>
                <Th>評価</Th>
                <Th>口コミ</Th>
                <Th>優先度</Th>
                <Th>ステージ</Th>
                <Th>メール</Th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="hover:bg-secondary/50">
                  <Td>
                    <Link href={`/leadmap/leads/${l.id}`} className="font-medium text-primary hover:underline">{l.name}</Link>
                  </Td>
                  <Td className="text-xs text-muted-foreground">{l.industry}・{l.city}</Td>
                  <Td>{l.rating ?? '—'}</Td>
                  <Td>{l.reviewCount}</Td>
                  <Td><PriorityBadge score={l.priority} /></Td>
                  <Td><LeadStageBadge stage={l.stage as LeadStage} /></Td>
                  <Td>{l._count.outreachDrafts > 0 ? <Badge tone="blue">{l._count.outreachDrafts}件</Badge> : '—'}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
