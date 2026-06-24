import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, Input, Select, Button } from '@/components/ui';
import { createPurchaseOrderAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function NewPurchaseOrderPage() {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'create')) {
    return (
      <div>
        <PageHeader title="発注書を作成" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">作成権限がありません。</div>
      </div>
    );
  }
  const [vendors, assets] = await Promise.all([
    prisma.vendor.findMany({ where: { tenantId: user.tenantId }, select: { id: true, name: true } }),
    prisma.productAsset.findMany({ where: { tenantId: user.tenantId }, select: { id: true, name: true }, orderBy: { name: 'asc' }, take: 200 }),
  ]);

  return (
    <div>
      <PageHeader
        title="発注書を作成"
        breadcrumb={[{ label: 'Operations', href: '/operations' }, { label: '発注', href: '/operations/purchase-orders' }, { label: '新規', href: '#' }]}
      />
      <Card className="max-w-2xl">
        <CardContent className="pt-4">
          <form action={createPurchaseOrderAction} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">発注先</label>
              <Select name="vendorId"><option value="">（未選択）</option>{vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">商品（既存在庫）</label>
              <Select name="assetId"><option value="">（新規/その他は下に入力）</option>{assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">商品名（新規の場合）</label>
              <Input name="assetName" placeholder="例: 折りたたみテント 3x3m" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-sm font-medium">数量</label><Input name="quantity" type="number" min="1" defaultValue="1" /></div>
              <div><label className="mb-1 block text-sm font-medium">単価（円）</label><Input name="unitPrice" type="number" min="0" defaultValue="0" /></div>
            </div>
            <p className="text-xs text-muted-foreground">合計が10万円以上の発注は確定時に承認が必要です。</p>
            <Button type="submit">発注書を作成</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
