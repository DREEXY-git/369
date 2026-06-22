import Link from 'next/link';
import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, Table, Th, Td, Badge, Button, Input, EmptyState } from '@/components/ui';
import { LabelBadge } from '@/components/badges';
import { formatDate } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const customers = await prisma.customer.findMany({
    where: { tenantId: user.tenantId, ...(sp.q ? { name: { contains: sp.q, mode: 'insensitive' } } : {}) },
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { deals: true, complaints: true } } },
  });

  return (
    <div>
      <PageHeader
        title="顧客管理 CRM"
        description={`${customers.length} 件の顧客`}
        action={<Link href="/customers/new"><Button>＋ 顧客を追加</Button></Link>}
      />
      <Card className="mb-3 p-3">
        <form method="get" className="flex items-end gap-2">
          <Input name="q" defaultValue={sp.q} placeholder="会社名で検索…" className="w-64" />
          <Button type="submit" variant="secondary">検索</Button>
        </form>
      </Card>
      <Card>
        {customers.length === 0 ? (
          <div className="p-6"><EmptyState title="顧客がいません" /></div>
        ) : (
          <Table>
            <thead>
              <tr><Th>会社名</Th><Th>業種</Th><Th>ランク</Th><Th>満足度</Th><Th>離反リスク</Th><Th>案件</Th><Th>最終接触</Th><Th>機密</Th></tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-secondary/50">
                  <Td><Link href={`/customers/${c.id}`} className="font-medium text-primary hover:underline">{c.name}</Link></Td>
                  <Td className="text-xs text-muted-foreground">{c.industry ?? '—'}</Td>
                  <Td><Badge tone={c.rank === 'A' ? 'green' : c.rank === 'C' ? 'amber' : 'slate'}>{c.rank}</Badge></Td>
                  <Td>{c.satisfaction ?? '—'}</Td>
                  <Td><Badge tone={(c.churnRisk ?? 0) >= 40 ? 'red' : 'slate'}>{c.churnRisk ?? 0}</Badge></Td>
                  <Td>{c._count.deals}</Td>
                  <Td className="text-xs text-muted-foreground">{formatDate(c.lastContactAt)}</Td>
                  <Td><LabelBadge label={c.label as any} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
