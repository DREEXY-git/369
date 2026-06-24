import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { summarizeOperationsDashboard } from '@/lib/operations';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Table, Th, Td, Badge, Stat, EmptyState, Button } from '@/components/ui';
import { formatJpy, formatDateTime, INVENTORY_MOVEMENT_LABEL, isInventoryMovementType } from '@hokko/shared';

export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, 'green' | 'blue' | 'amber' | 'red' | 'slate'> = {
  available: 'green',
  reserved: 'blue',
  out: 'amber',
  maintenance: 'red',
};

export default async function OperationsDashboardPage() {
  const user = await requireUser();
  const t = user.tenantId;
  const canViewFinance = hasPermission(user, 'finance', 'read');

  const [summary, movements, growthEvents, idleAssets, brokenAssets] = await Promise.all([
    summarizeOperationsDashboard(t),
    prisma.inventoryMovement.findMany({ where: { tenantId: t }, include: { asset: true }, orderBy: { occurredAt: 'desc' }, take: 12 }),
    prisma.growthEvent.findMany({ where: { tenantId: t, category: 'operations' }, orderBy: { occurredAt: 'desc' }, take: 8 }),
    prisma.productAsset.findMany({ where: { tenantId: t }, orderBy: { utilizationRate: 'asc' }, take: 5 }),
    prisma.productAsset.findMany({ where: { tenantId: t, OR: [{ condition: 'broken' }, { condition: 'repair' }, { status: 'maintenance' }] }, take: 5 }),
  ]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Operations OS — 経営資産ダッシュボード"
        description="在庫は売上を生む経営資産。稼働・予約・案件粗利を一枚で把握します。"
        action={
          <div className="flex gap-2">
            <Link href="/operations/events"><Button variant="outline">イベント案件</Button></Link>
            <Link href="/operations/inventory-movements"><Button variant="outline">在庫移動台帳</Button></Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="在庫資産" value={summary.assetCount} sub={`評価額 ${formatJpy(summary.totalAcquisitionValue)}`} />
        <Stat label="利用可能" value={summary.available} tone="emerald" />
        <Stat label="予約中" value={summary.reserved} tone="blue" />
        <Stat label="出庫中" value={summary.out} tone="amber" />
        <Stat label="メンテ中" value={summary.maintenance} tone="red" />
        <Stat label="破損" value={summary.broken} tone="red" />
        <Stat label="平均稼働率" value={`${summary.avgUtilization}%`} tone={summary.avgUtilization >= 50 ? 'emerald' : 'amber'} />
        <Stat label="低稼働(<30%)" value={summary.idleAssets} tone="amber" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="今月リース予約" value={summary.reservationsThisMonth} tone="blue" />
        <Stat label="今月イベント案件" value={summary.eventsThisMonth} tone="purple" />
        {canViewFinance ? (
          <>
            <Stat label="案件粗利合計" value={formatJpy(summary.eventGrossTotal)} tone="emerald" />
            <Stat label="在庫累計粗利" value={formatJpy(summary.cumulativeGross)} tone="emerald" />
          </>
        ) : (
          <div className="col-span-2 flex items-center rounded-md bg-secondary/40 px-3 text-xs text-muted-foreground">
            粗利・原価は財務閲覧権限が必要です。
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>直近の在庫移動</CardTitle></CardHeader>
          <CardContent>
            {movements.length === 0 ? (
              <EmptyState title="在庫移動がありません" hint="入庫・予約・出庫・返却などを記録すると表示されます。" />
            ) : (
              <Table>
                <thead>
                  <tr><Th>日時</Th><Th>操作</Th><Th>商品</Th><Th>状態</Th></tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id} className="hover:bg-secondary/50">
                      <Td className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(m.occurredAt)}</Td>
                      <Td className="text-xs"><Badge tone="slate">{isInventoryMovementType(m.type) ? INVENTORY_MOVEMENT_LABEL[m.type] : m.type}</Badge></Td>
                      <Td className="text-sm">{m.asset.name}</Td>
                      <Td className="text-xs">
                        {m.afterStatus ? <Badge tone={STATUS_TONE[m.afterStatus] ?? 'slate'}>{m.afterStatus}</Badge> : '-'}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>⚠️ 要対応の在庫</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div>
                <div className="mb-1 text-xs font-semibold text-muted-foreground">眠っている在庫（低稼働）</div>
                {idleAssets.length === 0 ? <p className="text-xs text-muted-foreground">なし</p> : idleAssets.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-sm">
                    <span>{a.name}</span>
                    <Badge tone="amber">稼働 {toNumber(a.utilizationRate)}%</Badge>
                  </div>
                ))}
              </div>
              <div>
                <div className="mb-1 mt-2 text-xs font-semibold text-muted-foreground">破損・修理が必要</div>
                {brokenAssets.length === 0 ? <p className="text-xs text-muted-foreground">なし</p> : brokenAssets.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-sm">
                    <span>{a.name}</span>
                    <Badge tone="red">{a.condition}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>直近のOperationsイベント</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {growthEvents.length === 0 ? (
                <EmptyState title="まだありません" />
              ) : growthEvents.map((g) => (
                <div key={g.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{g.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(g.occurredAt)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
