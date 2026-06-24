import Link from 'next/link';
import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, Table, Th, Td, Badge, Button, EmptyState } from '@/components/ui';
import { formatJpy, formatDate } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function CampaignsPage() {
  const user = await requireUser();
  const campaigns = await prisma.marketingCampaign.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: 'desc' } });
  return (
    <div>
      <PageHeader
        title="キャンペーン"
        description="マーケティングキャンペーンの一覧。"
        breadcrumb={[{ label: 'Marketing OS', href: '/marketing' }, { label: 'キャンペーン', href: '#' }]}
        action={<Link href="/marketing/campaigns/new"><Button>キャンペーン作成</Button></Link>}
      />
      <Card>
        <Table>
          <thead><tr><Th>名称</Th><Th>チャネル</Th><Th>目的</Th><Th>予算</Th><Th>状態</Th><Th>作成</Th></tr></thead>
          <tbody>
            {campaigns.length === 0 ? (
              <tr><Td colSpan={6}><EmptyState title="キャンペーンがありません" /></Td></tr>
            ) : (
              campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-secondary/50">
                  <Td><Link href={`/marketing/campaigns/${c.id}`} className="text-sm font-medium text-primary hover:underline">{c.name}</Link></Td>
                  <Td><Badge tone="blue">{c.channel}</Badge></Td>
                  <Td className="text-xs text-muted-foreground">{c.purpose || '-'}</Td>
                  <Td className="text-xs">{formatJpy(toNumber(c.budget))}</Td>
                  <Td><Badge tone={c.status === 'active' ? 'green' : 'slate'}>{c.status}</Badge></Td>
                  <Td className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
