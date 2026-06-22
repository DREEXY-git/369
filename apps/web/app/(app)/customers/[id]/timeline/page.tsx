import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, Badge, EmptyState } from '@/components/ui';
import { formatDateTime } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function CustomerTimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const customer = await prisma.customer.findFirst({
    where: { id, tenantId: user.tenantId },
    include: { timelineEvents: { orderBy: { occurredAt: 'desc' } } },
  });
  if (!customer) notFound();

  return (
    <div>
      <PageHeader
        title={`${customer.name} のタイムライン`}
        description="メール・会議・見積・請求・AI分析などを時系列で表示します。"
        breadcrumb={[{ label: '顧客', href: '/customers' }, { label: customer.name, href: `/customers/${customer.id}` }, { label: 'タイムライン', href: '#' }]}
      />
      <Card>
        <CardContent className="pt-4">
          {customer.timelineEvents.length === 0 ? <EmptyState title="イベントなし" /> : (
            <ol className="relative space-y-4 border-l pl-4">
              {customer.timelineEvents.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                  <div className="flex items-center gap-2 text-sm">
                    <Badge tone="slate">{e.type}</Badge>
                    <span className="font-medium">{e.title}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{formatDateTime(e.occurredAt)}</span>
                  </div>
                  {e.body ? <div className="mt-0.5 text-xs text-muted-foreground">{e.body}</div> : null}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
