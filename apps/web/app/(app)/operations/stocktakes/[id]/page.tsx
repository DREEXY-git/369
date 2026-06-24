import { notFound } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, Table, Th, Td, Badge, Input, Button, EmptyState } from '@/components/ui';
import { isLargeStocktakeDifference } from '@hokko/shared';
import { recordStocktakeCountAction, reconcileStocktakeLineAction, completeStocktakeAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function StocktakeDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const canEdit = hasPermission(user, 'inventory', 'update');

  const st = await prisma.stocktake.findFirst({
    where: { id, tenantId: user.tenantId },
    include: { lines: { include: { asset: true }, orderBy: { createdAt: 'asc' } } },
  });
  if (!st) notFound();

  const diffLines = st!.lines.filter((l) => l.countedQuantity != null && l.difference !== 0);
  const pendingReconcile = diffLines.filter((l) => !l.reconciled);

  return (
    <div>
      <PageHeader
        title={st!.title}
        description={`状態: ${st!.status} ／ ${st!.lines.length}品目 ／ 差異 ${diffLines.length}件`}
        breadcrumb={[{ label: 'Operations', href: '/operations' }, { label: '棚卸', href: '/operations/stocktakes' }, { label: st!.title, href: '#' }]}
        action={
          canEdit && pendingReconcile.length === 0 && st!.status !== 'reconciled' ? (
            <form action={completeStocktakeAction}><input type="hidden" name="stocktakeId" value={st!.id} /><Button type="submit">棚卸を完了</Button></form>
          ) : undefined
        }
      />
      {sp.pending === 'adjust' ? <div className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">大幅差異のため承認申請しました（/admin/operations-actions で承認後に反映）。</div> : null}
      {sp.reconciled ? <div className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">差異を在庫へ反映しました。</div> : null}

      <Card>
        <CardContent className="pt-3">
          <Table>
            <thead><tr><Th>商品</Th><Th>帳簿</Th><Th>実地</Th><Th>差異</Th><Th>状態</Th><Th>操作</Th></tr></thead>
            <tbody>
              {st!.lines.length === 0 ? (
                <tr><Td colSpan={6}><EmptyState title="ラインがありません" /></Td></tr>
              ) : st!.lines.map((l) => (
                <tr key={l.id} className="hover:bg-secondary/50">
                  <Td className="text-sm">{l.asset.name}</Td>
                  <Td className="text-xs">{l.expectedQuantity}</Td>
                  <Td className="text-xs">
                    {canEdit && !l.reconciled ? (
                      <form action={recordStocktakeCountAction} className="flex items-center gap-1">
                        <input type="hidden" name="lineId" value={l.id} />
                        <Input name="countedQuantity" type="number" min="0" defaultValue={l.countedQuantity ?? ''} className="h-7 w-20" />
                        <Button type="submit" variant="ghost" className="h-7 px-2 text-xs">記録</Button>
                      </form>
                    ) : (l.countedQuantity ?? '-')}
                  </Td>
                  <Td className="text-xs">
                    {l.countedQuantity != null ? (
                      <Badge tone={l.difference === 0 ? 'green' : isLargeStocktakeDifference(l.difference) ? 'red' : 'amber'}>
                        {l.difference >= 0 ? '+' : ''}{l.difference}
                      </Badge>
                    ) : '-'}
                  </Td>
                  <Td className="text-xs">{l.reconciled ? <Badge tone="green">反映済</Badge> : '-'}</Td>
                  <Td>
                    {canEdit && l.countedQuantity != null && !l.reconciled && l.difference !== 0 ? (
                      <form action={reconcileStocktakeLineAction}>
                        <input type="hidden" name="lineId" value={l.id} />
                        <Button type="submit" variant="outline" className="h-7 px-2 text-xs">{isLargeStocktakeDifference(l.difference) ? '承認申請' : '反映'}</Button>
                      </form>
                    ) : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
