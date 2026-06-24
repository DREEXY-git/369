import Link from 'next/link';
import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, Table, Th, Td, Badge, EmptyState, Button } from '@/components/ui';
import { formatDateTime, INVENTORY_MOVEMENT_LABEL, isInventoryMovementType } from '@hokko/shared';

export const dynamic = 'force-dynamic';

const TYPE_TONE: Record<string, 'green' | 'blue' | 'amber' | 'red' | 'slate' | 'purple'> = {
  receive: 'green',
  move: 'slate',
  reserve: 'blue',
  dispatch: 'amber',
  return: 'green',
  damage: 'red',
  maintenance_start: 'red',
  maintenance_complete: 'green',
  adjust: 'purple',
};

export default async function InventoryMovementsPage() {
  const user = await requireUser();
  const movements = await prisma.inventoryMovement.findMany({
    where: { tenantId: user.tenantId },
    include: { asset: true },
    orderBy: { occurredAt: 'desc' },
    take: 200,
  });

  return (
    <div>
      <PageHeader
        title="在庫移動台帳（InventoryMovement）"
        description="入庫・移動・予約・出庫・返却・破損・メンテ・調整を記録。在庫状態の単一の真実源です。"
        breadcrumb={[{ label: 'Operations', href: '/operations' }, { label: '在庫移動台帳', href: '#' }]}
        action={<Link href="/operations/inventory-movements/new"><Button>在庫移動を記録</Button></Link>}
      />
      <Card>
        <Table>
          <thead>
            <tr><Th>日時</Th><Th>操作</Th><Th>商品</Th><Th>数量</Th><Th>状態遷移</Th><Th>メモ</Th></tr>
          </thead>
          <tbody>
            {movements.length === 0 ? (
              <tr><Td colSpan={6}><EmptyState title="記録がありません" hint="「在庫移動を記録」から入庫・出庫などを登録します。" /></Td></tr>
            ) : (
              movements.map((m) => (
                <tr key={m.id} className="hover:bg-secondary/50">
                  <Td className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(m.occurredAt)}</Td>
                  <Td className="text-xs"><Badge tone={TYPE_TONE[m.type] ?? 'slate'}>{isInventoryMovementType(m.type) ? INVENTORY_MOVEMENT_LABEL[m.type] : m.type}</Badge></Td>
                  <Td className="text-sm">{m.asset.name}</Td>
                  <Td className="text-xs">{m.quantity}</Td>
                  <Td className="text-xs text-muted-foreground">{m.beforeStatus ?? '-'} → {m.afterStatus ?? '-'}</Td>
                  <Td className="text-xs text-muted-foreground">{m.note || '-'}</Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
