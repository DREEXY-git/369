import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Table, Th, Td, Badge, Button, Input, Stat, EmptyState } from '@/components/ui';
import { issueInvoiceAction, recordPaymentAction } from '../actions';
import { formatJpy, formatDate, isOverdue } from '@hokko/shared';

export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, string> = {
  DRAFT: 'slate', ISSUED: 'blue', SENT: 'blue', PARTIALLY_PAID: 'amber', PAID: 'green', OVERDUE: 'red', VOID: 'slate',
};

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const invoice = await prisma.invoice.findFirst({
    where: { id, tenantId: user.tenantId },
    include: { lineItems: true, payments: { orderBy: { paidAt: 'desc' } }, customer: true, receivable: true },
  });
  if (!invoice) notFound();
  const canUpdate = hasPermission(user, 'invoice', 'update');
  const overdue = isOverdue(invoice.dueDate, invoice.status);
  const outstanding = toNumber(invoice.total) - toNumber(invoice.paidAmount);

  return (
    <div>
      <PageHeader
        title={`${invoice.number}`}
        description={invoice.customer?.name ?? ''}
        breadcrumb={[{ label: '請求', href: '/invoices' }, { label: invoice.number, href: '#' }]}
        action={
          <div className="flex items-center gap-3">
            <Badge tone={overdue && invoice.status !== 'PAID' ? 'red' : STATUS_TONE[invoice.status] ?? 'slate'}>{overdue && invoice.status !== 'PAID' ? 'OVERDUE' : invoice.status}</Badge>
            <Link href={`/print/invoices/${invoice.id}`} target="_blank"><Button variant="outline">印刷 / PDF</Button></Link>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="合計(税込)" value={formatJpy(toNumber(invoice.total))} />
        <Stat label="入金済" value={formatJpy(toNumber(invoice.paidAmount))} tone="green" />
        <Stat label="未収" value={formatJpy(outstanding)} tone={outstanding > 0 ? 'amber' : 'green'} />
        <Stat label="支払期日" value={formatDate(invoice.dueDate)} tone={overdue ? 'red' : 'slate'} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>明細</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <thead><tr><Th>品目</Th><Th>数量</Th><Th>単価</Th><Th>金額</Th></tr></thead>
              <tbody>
                {invoice.lineItems.map((li) => (
                  <tr key={li.id}>
                    <Td>{li.name}</Td>
                    <Td>{toNumber(li.quantity)}</Td>
                    <Td>{formatJpy(toNumber(li.unitPrice))}</Td>
                    <Td className="font-medium">{formatJpy(toNumber(li.amount))}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="mt-3 flex flex-col items-end gap-0.5 text-sm">
              <div>小計: {formatJpy(toNumber(invoice.subtotal))}</div>
              <div>消費税: {formatJpy(toNumber(invoice.taxAmount))}</div>
              <div className="text-base font-bold">合計: {formatJpy(toNumber(invoice.total))}</div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {invoice.status === 'DRAFT' ? (
            <Card>
              <CardHeader><CardTitle>発行</CardTitle></CardHeader>
              <CardContent>
                <form action={issueInvoiceAction}>
                  <input type="hidden" name="id" value={invoice.id} />
                  <Button type="submit" className="w-full" disabled={!canUpdate}>請求書を発行（送付承認へ）</Button>
                </form>
                <p className="mt-1 text-[11px] text-muted-foreground">発行で売掛が起票され、送付は承認を経て行います。</p>
              </CardContent>
            </Card>
          ) : null}

          {invoice.status !== 'PAID' && invoice.status !== 'DRAFT' ? (
            <Card>
              <CardHeader><CardTitle>入金記録</CardTitle></CardHeader>
              <CardContent>
                <form action={recordPaymentAction} className="space-y-2">
                  <input type="hidden" name="id" value={invoice.id} />
                  <Input name="amount" type="number" placeholder={`未収 ${outstanding}`} defaultValue={outstanding} disabled={!canUpdate} />
                  <Button type="submit" variant="secondary" className="w-full" disabled={!canUpdate}>入金を記録</Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader><CardTitle>入金履歴</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              {invoice.payments.length === 0 ? <EmptyState title="入金なし" /> : invoice.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between"><span>{formatJpy(toNumber(p.amount))}（{p.method}）</span><span className="text-xs text-muted-foreground">{formatDate(p.paidAt)}</span></div>
              ))}
            </CardContent>
          </Card>

          {invoice.receivable ? (
            <Card>
              <CardHeader><CardTitle>売掛（回収）</CardTitle></CardHeader>
              <CardContent className="text-sm">
                <Badge tone={invoice.receivable.status === 'collected' ? 'green' : overdue ? 'red' : 'amber'}>{invoice.receivable.status}</Badge>
                <div className="mt-1 text-xs text-muted-foreground">期日: {formatDate(invoice.receivable.dueDate)}</div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
