import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui';
import { QuoteForm } from '@/components/quotes/quote-form';

export const dynamic = 'force-dynamic';

export default async function NewQuotePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const [customers, deals] = await Promise.all([
    prisma.customer.findMany({ where: { tenantId: user.tenantId }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.deal.findMany({ where: { tenantId: user.tenantId }, orderBy: { updatedAt: 'desc' }, select: { id: true, title: true }, take: 50 }),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="見積の新規作成"
        description="明細を入力すると、原価・粗利・税込合計をその場で自動計算します。低粗利・高額は承認が必要です。"
        breadcrumb={[{ label: '見積', href: '/quotes' }, { label: '新規', href: '/quotes/new' }]}
      />
      <Card>
        <CardContent className="pt-4">
          {sp.error === 'items' ? (
            <div className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">明細を1行以上入力してください（品名が必要）。</div>
          ) : null}
          <QuoteForm customers={customers} deals={deals} />
        </CardContent>
      </Card>
    </div>
  );
}
