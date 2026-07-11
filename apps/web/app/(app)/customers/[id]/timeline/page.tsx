import { notFound } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { assertCanViewConfidential, PolicyDenied } from '@/lib/security/policy';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, Badge, EmptyState } from '@/components/ui';
import { AccessDenied } from '@/components/access-denied';
import { formatDateTime } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function CustomerTimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  // WIP1（roadmap61）: 詳細で拒否される顧客の履歴が直URLで読める穴を塞ぐ（read ゲート＋二段階取得＋ABAC）。
  if (!hasPermission(user, 'customer', 'read')) {
    return (
      <AccessDenied
        title="顧客タイムライン"
        reason="顧客履歴の閲覧には顧客情報の閲覧権限（customer:read）が必要です"
        breadcrumb={[{ label: '顧客', href: '/customers' }]}
      />
    );
  }
  const envelope = await prisma.customer.findFirst({
    where: { id, tenantId: user.tenantId },
    select: { id: true, label: true, ownerId: true },
  });
  if (!envelope) notFound();
  try {
    await assertCanViewConfidential(user, {
      dataType: 'customer',
      label: envelope.label as any,
      entityType: 'Customer',
      entityId: envelope.id,
      ownerId: envelope.ownerId,
      purpose: '顧客タイムラインの閲覧',
    });
  } catch (e) {
    if (e instanceof PolicyDenied) {
      return (
        <AccessDenied
          title="顧客タイムライン"
          reason={`この顧客履歴の閲覧は許可されていません（理由: ${e.decision.reason}）`}
          breadcrumb={[{ label: '顧客', href: '/customers' }]}
        />
      );
    }
    throw e;
  }
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
