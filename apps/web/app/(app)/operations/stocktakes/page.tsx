import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Table, Th, Td, Badge, EmptyState, Input, Select, Button } from '@/components/ui';
import { formatDateTime } from '@hokko/shared';
import { createStocktakeAction } from './actions';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = { draft: '下書き', counted: 'カウント済', reconciled: '反映済', approved: '承認済' };

export default async function StocktakesPage() {
  const user = await requireUser();
  const canCreate = hasPermission(user, 'inventory', 'create');
  const [stocktakes, locations] = await Promise.all([
    prisma.stocktake.findMany({
      where: { tenantId: user.tenantId },
      include: { _count: { select: { lines: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.stockLocation.findMany({ where: { tenantId: user.tenantId }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <PageHeader
        title="棚卸（実地在庫照合）"
        description="帳簿在庫と実地カウントを照合し、差異を在庫へ反映します（大幅差異は承認）。"
        breadcrumb={[{ label: 'Operations', href: '/operations' }, { label: '棚卸', href: '#' }]}
      />
      {canCreate ? (
        <Card className="mb-4">
          <CardHeader><CardTitle>棚卸を開始</CardTitle></CardHeader>
          <CardContent>
            <form action={createStocktakeAction} className="flex flex-wrap items-end gap-2">
              <div className="flex-1"><label className="mb-1 block text-xs">タイトル</label><Input name="title" placeholder="例: 2026年6月度 棚卸" /></div>
              <div><label className="mb-1 block text-xs">対象倉庫</label>
                <Select name="locationId"><option value="">全倉庫</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select>
              </div>
              <Button type="submit">棚卸を開始</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <Table>
          <thead><tr><Th>タイトル</Th><Th>状態</Th><Th>品目数</Th><Th>開始</Th></tr></thead>
          <tbody>
            {stocktakes.length === 0 ? (
              <tr><Td colSpan={4}><EmptyState title="棚卸がありません" /></Td></tr>
            ) : stocktakes.map((s) => (
              <tr key={s.id} className="hover:bg-secondary/50">
                <Td className="text-sm"><Link href={`/operations/stocktakes/${s.id}`} className="text-primary hover:underline">{s.title}</Link></Td>
                <Td className="text-xs"><Badge tone={s.status === 'reconciled' ? 'green' : 'blue'}>{STATUS_LABEL[s.status] ?? s.status}</Badge></Td>
                <Td className="text-xs">{s._count.lines}</Td>
                <Td className="text-xs text-muted-foreground">{formatDateTime(s.startedAt)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
