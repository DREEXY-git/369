import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { reorderCandidates } from '@/lib/operations';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Table, Th, Td, Badge, EmptyState, Input, Select, Button } from '@/components/ui';
import { createReorderRuleAction } from '../purchase-orders/actions';

export const dynamic = 'force-dynamic';

export default async function ReorderPage() {
  const user = await requireUser();
  const canCreate = hasPermission(user, 'inventory', 'create');
  const [candidates, rules, assets, vendors] = await Promise.all([
    reorderCandidates(user.tenantId),
    prisma.reorderRule.findMany({ where: { tenantId: user.tenantId, active: true }, include: { asset: true, vendor: true }, orderBy: { createdAt: 'desc' } }),
    prisma.productAsset.findMany({ where: { tenantId: user.tenantId }, select: { id: true, name: true, quantity: true }, orderBy: { name: 'asc' }, take: 200 }),
    prisma.vendor.findMany({ where: { tenantId: user.tenantId }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <PageHeader
        title="発注点・発注候補"
        description="在庫が発注点を下回った商品を自動抽出します。発注書は発注管理から作成します。"
        breadcrumb={[{ label: 'Operations', href: '/operations' }, { label: '発注点', href: '#' }]}
        action={<Link href="/operations/purchase-orders/new"><Button variant="outline">発注書を作成</Button></Link>}
      />

      <Card className="mb-4 border-amber-300">
        <CardHeader><CardTitle>発注候補（{candidates.length}）</CardTitle></CardHeader>
        <CardContent>
          {candidates.length === 0 ? (
            <EmptyState title="発注が必要な在庫はありません" hint="発注点ルールを設定すると不足品を自動抽出します。" />
          ) : (
            <Table>
              <thead><tr><Th>商品</Th><Th>在庫</Th><Th>発注点</Th><Th>不足</Th><Th>推奨発注</Th><Th>発注先</Th></tr></thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.rule.id} className="hover:bg-secondary/50">
                    <Td className="text-sm">{c.asset.name}</Td>
                    <Td className="text-xs"><Badge tone="red">{c.asset.quantity}</Badge></Td>
                    <Td className="text-xs">{c.rule.minQuantity}</Td>
                    <Td className="text-xs">{c.shortBy}</Td>
                    <Td className="text-xs"><Badge tone="amber">{c.suggestedQuantity}</Badge></Td>
                    <Td className="text-xs text-muted-foreground">{c.vendor?.name ?? '-'}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      {canCreate ? (
        <Card className="mb-4">
          <CardHeader><CardTitle>発注点ルールを追加</CardTitle></CardHeader>
          <CardContent>
            <form action={createReorderRuleAction} className="flex flex-wrap items-end gap-2">
              <Select name="assetId" required className="flex-1"><option value="">商品</option>{assets.map((a) => <option key={a.id} value={a.id}>{a.name}（在庫{a.quantity}）</option>)}</Select>
              <div><label className="mb-1 block text-xs">発注点</label><Input name="minQuantity" type="number" min="0" defaultValue="2" className="w-24" /></div>
              <div><label className="mb-1 block text-xs">補充数</label><Input name="reorderQuantity" type="number" min="1" defaultValue="5" className="w-24" /></div>
              <Select name="vendorId"><option value="">発注先（任意）</option>{vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</Select>
              <Button type="submit" variant="outline">追加</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader><CardTitle>発注点ルール（{rules.length}）</CardTitle></CardHeader>
        <CardContent>
          {rules.length === 0 ? <EmptyState title="ルールがありません" /> : (
            <Table>
              <thead><tr><Th>商品</Th><Th>発注点</Th><Th>補充数</Th><Th>発注先</Th></tr></thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id}><Td className="text-sm">{r.asset.name}</Td><Td className="text-xs">{r.minQuantity}</Td><Td className="text-xs">{r.reorderQuantity}</Td><Td className="text-xs text-muted-foreground">{r.vendor?.name ?? '-'}</Td></tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
