import { notFound } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, Table, Th, Td, Badge, EmptyState, Button } from '@/components/ui';
import { formatJpy } from '@hokko/shared';
import { confirmPurchaseOrderAction, receivePurchaseOrderAction } from '../actions';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = { draft: '下書き', pending_approval: '承認待ち', ordered: '発注済', received: '入庫済', cancelled: '中止' };

export default async function PurchaseOrderDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const canEdit = hasPermission(user, 'inventory', 'update');
  const canViewAmount = hasPermission(user, 'finance', 'read');

  const po = await prisma.purchaseOrder.findFirst({
    where: { id, tenantId: user.tenantId },
    include: { vendor: true, lines: true },
  });
  if (!po) notFound();

  return (
    <div>
      <PageHeader
        title={`発注書 ${po!.orderNo}`}
        description={`${po!.vendor?.name ?? '発注先未設定'} ／ 状態: ${STATUS_LABEL[po!.status] ?? po!.status}`}
        breadcrumb={[{ label: 'Operations', href: '/operations' }, { label: '発注', href: '/operations/purchase-orders' }, { label: po!.orderNo, href: '#' }]}
        action={<Badge tone={po!.status === 'received' ? 'green' : po!.status === 'pending_approval' ? 'amber' : 'blue'}>{STATUS_LABEL[po!.status] ?? po!.status}</Badge>}
      />
      {sp.pending ? <div className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">高額のため承認申請しました（/approvals）。承認後に発注確定されます。</div> : null}
      {sp.ordered ? <div className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">発注を確定しました。</div> : null}
      {sp.received ? <div className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">入庫を記録しました。在庫に反映済みです。</div> : null}

      <Card className="mb-4">
        <CardContent className="pt-3">
          <Table>
            <thead><tr><Th>商品</Th><Th>数量</Th>{canViewAmount ? <><Th>単価</Th><Th>金額</Th></> : null}<Th>入庫</Th></tr></thead>
            <tbody>
              {po!.lines.length === 0 ? (
                <tr><Td colSpan={canViewAmount ? 5 : 3}><EmptyState title="明細がありません" /></Td></tr>
              ) : po!.lines.map((l) => (
                <tr key={l.id}>
                  <Td className="text-sm">{l.assetName}</Td>
                  <Td className="text-xs">{l.quantity}</Td>
                  {canViewAmount ? (
                    <>
                      <Td className="text-xs">{formatJpy(toNumber(l.unitPrice))}</Td>
                      <Td className="text-xs">{formatJpy(toNumber(l.amount))}</Td>
                    </>
                  ) : null}
                  <Td className="text-xs">{l.receivedQuantity > 0 ? <Badge tone="green">{l.receivedQuantity}</Badge> : '-'}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          {canViewAmount ? <div className="mt-2 text-right text-sm font-semibold">合計 {formatJpy(toNumber(po!.totalAmount))}</div> : null}
        </CardContent>
      </Card>

      {canEdit ? (
        <div className="flex flex-wrap gap-2">
          {po!.status === 'draft' ? (
            <form action={confirmPurchaseOrderAction}><input type="hidden" name="purchaseOrderId" value={po!.id} /><Button type="submit">発注を確定</Button></form>
          ) : null}
          {po!.status === 'ordered' ? (
            <form action={receivePurchaseOrderAction}><input type="hidden" name="purchaseOrderId" value={po!.id} /><Button type="submit">入庫する</Button></form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
