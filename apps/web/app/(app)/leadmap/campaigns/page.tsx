import Link from 'next/link';
import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, Table, Th, Td, Badge, Button, EmptyState } from '@/components/ui';
import { formatDate } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function CampaignsPage() {
  const user = await requireUser();
  const campaigns = await prisma.leadSearchCampaign.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { leads: true } } },
  });

  return (
    <div>
      <PageHeader
        title="LeadMap AI — キャンペーン"
        description="地域・業種で営業先を抽出し、AIが分析・営業文生成・追客まで支援します。"
        action={
          <Link href="/leadmap/campaigns/new">
            <Button>＋ 新規キャンペーン</Button>
          </Link>
        }
      />
      <Card>
        {campaigns.length === 0 ? (
          <div className="p-6">
            <EmptyState title="キャンペーンがありません" hint="「新規キャンペーン」から札幌市の業種を指定して開始できます。" />
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>キャンペーン</Th>
                <Th>地域 / 業種</Th>
                <Th>営業種別</Th>
                <Th>リード数</Th>
                <Th>データソース</Th>
                <Th>作成日</Th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-secondary/50">
                  <Td>
                    <Link href={`/leadmap/campaigns/${c.id}`} className="font-medium text-primary hover:underline">
                      {c.name}
                    </Link>
                  </Td>
                  <Td>{c.region} / {c.industry}</Td>
                  <Td><Badge tone="blue">{c.forSalesType}</Badge></Td>
                  <Td>{c._count.leads} 件</Td>
                  <Td><Badge tone={c.source === 'DEMO' ? 'slate' : 'green'}>{c.source}</Badge></Td>
                  <Td className="text-muted-foreground">{formatDate(c.createdAt)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
