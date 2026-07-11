import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui';
import { AccessDenied } from '@/components/access-denied';
import { QuoteForm } from '@/components/quotes/quote-form';
import { visibleCustomerLabels } from '@/lib/security/customer-visibility';

export const dynamic = 'force-dynamic';

export default async function NewQuotePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  // WIP-4（roadmap65）: 作成フォームは quote:create をデータ取得前に適用。
  if (!hasPermission(user, 'quote', 'create')) {
    return (
      <AccessDenied
        title="見積の新規作成"
        reason="見積の作成には見積の作成権限（quote:create）が必要です"
        breadcrumb={[{ label: '見積', href: '/quotes' }, { label: '新規', href: '#' }]}
      />
    );
  }
  const sp = await searchParams;
  const [customers, deals] = await Promise.all([
    // 顧客ドロップダウンは CRM 一覧（WIP1）と同じ可視ラベル集合でフィルタ
    // （閲覧不可 label の顧客名を候補として露出しない）。
    prisma.customer.findMany({
      where: { tenantId: user.tenantId, label: { in: visibleCustomerLabels(user.roles) } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
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
