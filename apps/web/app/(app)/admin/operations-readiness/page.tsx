import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Table, Th, Td, Badge, Stat, EmptyState } from '@/components/ui';
import { eventProfitMargin, formatJpy } from '@hokko/shared';

export const dynamic = 'force-dynamic';

// Operations OS（在庫・リース・イベント会社・営業）の準備状況を、既存モデルの実データで可視化する。
// 注: 本画面は「棚卸し・準備の可視化」であり、OS本体（CRUD/承認/ワーカー）は後続フェーズ。
export default async function OperationsReadinessPage() {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'read')) {
    return (
      <div>
        <PageHeader title="Operations OS 準備状況" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">閲覧権限がありません。</div>
      </div>
    );
  }

  const t = user.tenantId;
  const [assets, reservations, events] = await Promise.all([
    prisma.productAsset.findMany({ where: { tenantId: t }, take: 100 }),
    prisma.leaseReservation.count({ where: { tenantId: t } }),
    prisma.eventProject.findMany({ where: { tenantId: t }, orderBy: { createdAt: 'desc' }, take: 20 }),
  ]);

  const avgUtil =
    assets.length > 0 ? Math.round(assets.reduce((s, a) => s + toNumber(a.utilizationRate), 0) / assets.length) : 0;
  const idle = assets.filter((a) => toNumber(a.utilizationRate) < 30).length;

  const eventRows = events.map((e) => ({
    id: e.id,
    name: e.name,
    revenue: toNumber(e.revenue),
    cost: toNumber(e.cost),
    margin: eventProfitMargin(toNumber(e.revenue), toNumber(e.cost)),
  }));

  return (
    <div>
      <PageHeader
        title="Operations OS 準備状況（在庫・リース・イベント・営業）"
        description="既存モデルの実データと operations.ts の指標で、後続フェーズの増築準備を可視化します。"
        breadcrumb={[{ label: '管理', href: '/admin' }, { label: 'Operations準備', href: '#' }]}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="在庫/リース資産" value={assets.length} />
        <Stat label="平均稼働率" value={`${avgUtil}%`} tone={avgUtil >= 50 ? 'emerald' : 'amber'} />
        <Stat label="低稼働資産(<30%)" value={idle} tone="amber" />
        <Stat label="リース予約" value={reservations} />
      </div>

      <Card className="mb-4">
        <CardHeader><CardTitle>イベント案件の粗利率（eventProfitMargin）</CardTitle></CardHeader>
        <CardContent>
          {eventRows.length === 0 ? (
            <EmptyState title="イベント案件がありません" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>案件</Th>
                  <Th>売上</Th>
                  <Th>原価</Th>
                  <Th>粗利率</Th>
                </tr>
              </thead>
              <tbody>
                {eventRows.map((e) => (
                  <tr key={e.id} className="hover:bg-secondary/50">
                    <Td className="text-sm">{e.name}</Td>
                    <Td className="text-xs">{formatJpy(e.revenue)}</Td>
                    <Td className="text-xs">{formatJpy(e.cost)}</Td>
                    <Td className="text-xs">
                      <Badge tone={e.margin >= 30 ? 'green' : e.margin >= 10 ? 'amber' : 'red'}>{e.margin}%</Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>後続フェーズの増築計画</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>・在庫: 入出庫・棚卸・発注点（StockMovement / Stocktake / PurchaseOrder）。</p>
          <p>・リース/イベント: 予約→搬入→設営→撤去→回収→精算のワークフローと案件粗利スナップショット。</p>
          <p>・営業（販売）: SalesOrder / Shipment と在庫・会計連動（EC含む）。</p>
          <p>・いずれも DB→Action(Zod/RBAC/監査)→UI→承認→DomainEvent/GrowthEvent→Worker→テスト を縦に通す。</p>
          <p className="text-xs">詳細は docs/audit/11_operations_os_readiness.md を参照。</p>
        </CardContent>
      </Card>
    </div>
  );
}
