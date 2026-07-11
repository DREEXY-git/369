import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui';
import { AccessDenied } from '@/components/access-denied';
import { InvoiceForm } from '@/components/invoices/invoice-form';
import { visibleCustomerLabels } from '@/lib/security/customer-visibility';

export const dynamic = 'force-dynamic';

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  // 請求作成は finance 機密の確定前段。invoice:create かつ finance:read を必須化し、顧客/案件の取得前に遮断する
  // （権限の無いユーザーに顧客名・案件名を渡さない）。STAFF は invoice:create を持つが finance:read 非保有のため不可。
  if (!hasPermission(user, 'invoice', 'create') || !hasPermission(user, 'finance', 'read')) {
    return (
      <AccessDenied
        title="請求書の新規作成"
        reason="請求書の作成には finance（経理）権限が必要です"
        breadcrumb={[{ label: '請求', href: '/invoices' }, { label: '新規', href: '/invoices/new' }]}
      />
    );
  }
  const sp = await searchParams;
  const [customers, deals] = await Promise.all([
    // WIP-4（roadmap65）: 顧客ドロップダウンは CRM 一覧（WIP1）と同じ可視ラベル集合でフィルタ。
    prisma.customer.findMany({
      where: { tenantId: user.tenantId, label: { in: visibleCustomerLabels(user.roles) } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    // 案件候補も、不可視ラベル顧客に紐づく案件を除外（title に顧客名が含まれる運用への備え・fail-closed）。
    prisma.deal.findMany({
      where: { tenantId: user.tenantId, customer: { label: { in: visibleCustomerLabels(user.roles) } } },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true },
      take: 50,
    }),
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
