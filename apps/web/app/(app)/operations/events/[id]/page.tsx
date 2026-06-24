import { notFound } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { writeConfidentialViewLog } from '@/lib/audit';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Table, Th, Td, Badge, Stat, Input, Select, Button, EmptyState } from '@/components/ui';
import { formatJpy, formatDate, eventProfitMargin, type ConfidentialityLabel } from '@hokko/shared';
import {
  assignAssetToEventAction,
  recordEventCostAction,
  recordEventRevenueAction,
  calculateEventProfitabilityAction,
  completeEventProjectAction,
  createEventNextProposalAction,
} from '../../actions';

export const dynamic = 'force-dynamic';

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const canEdit = hasPermission(user, 'inventory', 'update');
  const canViewFinance = hasPermission(user, 'finance', 'read');

  const event = await prisma.eventProject.findFirst({
    where: { id, tenantId: user.tenantId },
    include: {
      productUsages: true,
      costs: true,
      grossSnapshots: { orderBy: { createdAt: 'desc' }, take: 1 },
      nextProposals: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!event) notFound();

  const revenue = toNumber(event!.revenue);
  const costLines = event!.costs.reduce((s, c) => s + toNumber(c.amount), 0);
  const cost = Math.max(toNumber(event!.cost), costLines);
  const gross = revenue - cost;
  const margin = eventProfitMargin(revenue, cost);
  const snap = event!.grossSnapshots[0];

  // 原価・粗利の閲覧は機密。財務閲覧権限で見た場合は参照ログを残す。
  if (canViewFinance) {
    await writeConfidentialViewLog({
      tenantId: user.tenantId,
      actorId: user.userId,
      entityType: 'EventProject',
      entityId: event!.id,
      label: 'CONFIDENTIAL' as ConfidentialityLabel,
      purpose: `イベント原価・粗利の閲覧: ${event!.name}`,
    });
  }

  const assets = canEdit
    ? await prisma.productAsset.findMany({ where: { tenantId: user.tenantId }, select: { id: true, name: true, status: true }, orderBy: { name: 'asc' }, take: 200 })
    : [];

  return (
    <div>
      <PageHeader
        title={event!.name}
        description={`${event!.venue ?? '会場未定'} ／ ${event!.eventDate ? formatDate(event!.eventDate) : '日程未定'}`}
        breadcrumb={[{ label: 'Operations', href: '/operations' }, { label: 'イベント案件', href: '/operations/events' }, { label: event!.name, href: '#' }]}
        action={<Badge tone={event!.status === 'completed' ? 'green' : 'blue'}>{event!.status}</Badge>}
      />

      {/* 粗利サマリー（財務権限のみ） */}
      {canViewFinance ? (
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="売上" value={formatJpy(revenue)} tone="emerald" />
          <Stat label="原価" value={formatJpy(cost)} tone="amber" />
          <Stat label="粗利" value={formatJpy(gross)} tone={gross >= 0 ? 'emerald' : 'red'} />
          <Stat label="粗利率" value={`${margin}%`} tone={margin >= 30 ? 'emerald' : margin >= 10 ? 'amber' : 'red'} />
        </div>
      ) : (
        <div className="mb-4 rounded-md bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">原価・粗利は財務閲覧権限が必要です（機密情報）。</div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 使用商品 */}
        <Card>
          <CardHeader><CardTitle>使用商品・備品（{event!.productUsages.length}点）</CardTitle></CardHeader>
          <CardContent>
            {event!.productUsages.length === 0 ? <EmptyState title="まだ割り当てがありません" /> : (
              <Table>
                <thead><tr><Th>商品</Th><Th>数量</Th></tr></thead>
                <tbody>
                  {event!.productUsages.map((u) => (
                    <tr key={u.id}><Td className="text-sm">{u.assetName}</Td><Td className="text-xs">{u.quantity}</Td></tr>
                  ))}
                </tbody>
              </Table>
            )}
            {canEdit ? (
              <form action={assignAssetToEventAction} className="mt-3 flex flex-wrap items-end gap-2">
                <input type="hidden" name="eventId" value={event!.id} />
                <Select name="assetId" required className="flex-1">
                  <option value="">商品を選択</option>
                  {assets.map((a) => <option key={a.id} value={a.id}>{a.name}（{a.status}）</option>)}
                </Select>
                <Input name="quantity" type="number" min="1" defaultValue="1" className="w-20" />
                <Button type="submit" variant="outline">割当</Button>
              </form>
            ) : null}
          </CardContent>
        </Card>

        {/* 原価内訳（財務権限のみ） */}
        <Card>
          <CardHeader><CardTitle>原価内訳</CardTitle></CardHeader>
          <CardContent>
            {!canViewFinance ? (
              <p className="text-sm text-muted-foreground">財務閲覧権限が必要です。</p>
            ) : event!.costs.length === 0 ? <EmptyState title="原価の記録がありません" /> : (
              <Table>
                <thead><tr><Th>区分</Th><Th>金額</Th></tr></thead>
                <tbody>
                  {event!.costs.map((c) => (
                    <tr key={c.id}><Td className="text-sm">{c.category}</Td><Td className="text-xs">{formatJpy(toNumber(c.amount))}</Td></tr>
                  ))}
                </tbody>
              </Table>
            )}
            {canEdit ? (
              <div className="mt-3 space-y-2">
                <form action={recordEventCostAction} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="eventId" value={event!.id} />
                  <Input name="category" placeholder="区分（人件費/機材/配送 等）" className="flex-1" />
                  <Input name="amount" type="number" min="0" placeholder="金額" className="w-28" />
                  <Button type="submit" variant="outline">原価を追加</Button>
                </form>
                <form action={recordEventRevenueAction} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="eventId" value={event!.id} />
                  <Input name="revenue" type="number" min="0" placeholder="売上を更新" className="flex-1" />
                  <Button type="submit" variant="outline">売上を更新</Button>
                </form>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* アクション行 */}
      {canEdit ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <form action={calculateEventProfitabilityAction}><input type="hidden" name="eventId" value={event!.id} /><Button type="submit">粗利を計算・スナップショット</Button></form>
          <form action={createEventNextProposalAction}><input type="hidden" name="eventId" value={event!.id} /><Button type="submit" variant="outline">AI次回提案を生成</Button></form>
          {event!.status !== 'completed' ? (
            <form action={completeEventProjectAction}><input type="hidden" name="eventId" value={event!.id} /><Button type="submit" variant="outline">案件を完了</Button></form>
          ) : null}
        </div>
      ) : null}

      {/* 粗利スナップショット & 次回提案 */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {canViewFinance && snap ? (
          <Card>
            <CardHeader><CardTitle>最新の粗利スナップショット</CardTitle></CardHeader>
            <CardContent className="text-sm">
              <div className="flex flex-wrap gap-4">
                <span>売上 {formatJpy(toNumber(snap.revenue))}</span>
                <span>原価 {formatJpy(toNumber(snap.cost))}</span>
                <span>粗利 {formatJpy(toNumber(snap.gross))}</span>
                <Badge tone={toNumber(snap.marginRate) >= 30 ? 'green' : 'amber'}>{toNumber(snap.marginRate)}%</Badge>
              </div>
            </CardContent>
          </Card>
        ) : null}
        <Card>
          <CardHeader><CardTitle>次回提案（AI下書き）</CardTitle></CardHeader>
          <CardContent>
            {event!.nextProposals.length === 0 ? <EmptyState title="まだありません" hint="「AI次回提案を生成」で作成します。" /> : (
              <div className="space-y-2">
                {event!.nextProposals.map((p) => (
                  <pre key={p.id} className="whitespace-pre-wrap rounded-md border bg-secondary/30 p-2 text-xs">{p.proposal}</pre>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
