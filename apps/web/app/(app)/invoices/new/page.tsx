import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui';
import { InvoiceForm } from '@/components/invoices/invoice-form';

export const dynamic = 'force-dynamic';

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const [customers, deals] = await Promise.all([
    prisma.customer.findMany({ where: { tenantId: user.tenantId }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.deal.findMany({ where: { tenantId: user.tenantId }, orderBy: { updatedAt: 'desc' }, select: { id: true, title: true }, take: 50 }),
  ]);
  const defaultDue = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="請求書の新規作成"
        description="明細を入力すると合計・消費税を自動計算します。作成後に「発行」すると送付承認と売掛が起票されます。"
        breadcrumb={[{ label: '請求', href: '/invoices' }, { label: '新規', href: '/invoices/new' }]}
      />
      <Card>
        <CardContent className="pt-4">
          {sp.error === 'items' ? (
            <div className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">明細を1行以上入力してください（品目が必要）。</div>
          ) : null}
          <InvoiceForm customers={customers} deals={deals} defaultDue={defaultDue} />
        </CardContent>
      </Card>
    </div>
  );
}
