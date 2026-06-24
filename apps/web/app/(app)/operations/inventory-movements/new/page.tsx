import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Input, Select, Button } from '@/components/ui';
import { INVENTORY_MOVEMENT_LABEL, type InventoryMovementType } from '@hokko/shared';
import { createInventoryMovementAction, adjustInventoryQuantityAction } from '../../actions';

export const dynamic = 'force-dynamic';

// adjust は専用フォーム。それ以外を汎用フォームで扱う。
const GENERAL_TYPES: InventoryMovementType[] = ['receive', 'move', 'reserve', 'dispatch', 'return', 'damage', 'maintenance_start', 'maintenance_complete'];

export default async function NewInventoryMovementPage() {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'update')) {
    return (
      <div>
        <PageHeader title="在庫移動を記録" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">記録権限がありません。</div>
      </div>
    );
  }
  const [assets, locations] = await Promise.all([
    prisma.productAsset.findMany({ where: { tenantId: user.tenantId }, select: { id: true, name: true, status: true, quantity: true }, orderBy: { name: 'asc' }, take: 200 }),
    prisma.stockLocation.findMany({ where: { tenantId: user.tenantId }, select: { id: true, name: true }, take: 100 }),
  ]);

  return (
    <div>
      <PageHeader
        title="在庫移動を記録"
        breadcrumb={[{ label: 'Operations', href: '/operations' }, { label: '在庫移動台帳', href: '/operations/inventory-movements' }, { label: '記録', href: '#' }]}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>入庫・移動・予約・出庫・返却・破損・メンテ</CardTitle></CardHeader>
          <CardContent>
            <form action={createInventoryMovementAction} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">商品 *</label>
                <Select name="assetId" required>
                  <option value="">商品を選択</option>
                  {assets.map((a) => <option key={a.id} value={a.id}>{a.name}（在庫{a.quantity}・{a.status}）</option>)}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">操作 *</label>
                <Select name="type" required>
                  {GENERAL_TYPES.map((t) => <option key={t} value={t}>{INVENTORY_MOVEMENT_LABEL[t]}</option>)}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">数量</label>
                  <Input name="quantity" type="number" min="1" defaultValue="1" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">移動先（移動時）</label>
                  <Select name="toLocationId">
                    <option value="">（変更なし）</option>
                    {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </Select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">メモ</label>
                <Input name="note" placeholder="例: A倉庫から本社倉庫へ" />
              </div>
              <Button type="submit">記録する</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>数量調整（棚卸し補正）</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-2 text-xs text-muted-foreground">差分が大きい調整（±10以上）は承認が必要です。</p>
            <form action={adjustInventoryQuantityAction} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">商品 *</label>
                <Select name="assetId" required>
                  <option value="">商品を選択</option>
                  {assets.map((a) => <option key={a.id} value={a.id}>{a.name}（現在{a.quantity}）</option>)}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">調整後の数量 *</label>
                <Input name="newQuantity" type="number" min="0" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">理由</label>
                <Input name="note" placeholder="例: 棚卸しで差異を補正" />
              </div>
              <Button type="submit" variant="outline">数量を調整</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
