import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, Table, Th, Td, Badge, EmptyState, Stat, Button } from '@/components/ui';
import { formatDateTime } from '@hokko/shared';
import { retryEventAction } from './actions';

export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, string> = {
  pending: 'slate',
  processing: 'blue',
  processed: 'green',
  failed: 'amber',
  dead: 'red',
  delivered: 'green',
};

type EventRow = {
  id: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  status: string;
  retryCount: number;
  failureReason: string | null;
  occurredAt: Date;
};

export default async function EventsPage() {
  const user = await requireUser();
  const canView = hasPermission(user, 'audit', 'read');
  const canRetry = hasPermission(user, 'admin', 'update');
  if (!canView) {
    return (
      <div>
        <PageHeader title="イベント管理" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">閲覧権限がありません。</div>
      </div>
    );
  }
  const [events, counts, outbox] = await Promise.all([
    prisma.domainEvent.findMany({ where: { tenantId: user.tenantId }, orderBy: { occurredAt: 'desc' }, take: 150 }),
    prisma.domainEvent.groupBy({ by: ['status'], where: { tenantId: user.tenantId }, _count: { _all: true } }),
    prisma.outboxMessage.groupBy({ by: ['status'], where: { tenantId: user.tenantId }, _count: { _all: true } }),
  ]);
  const countOf = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const outboxOf = (s: string) => outbox.find((c) => c.status === s)?._count._all ?? 0;

  return (
    <div>
      <PageHeader
        title="イベント連動基盤（DomainEvent / Outbox）"
        description="業務イベントの保存・配送状態。失敗は再実行できます。"
        breadcrumb={[{ label: '管理', href: '/admin' }, { label: 'イベント', href: '#' }]}
      />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="処理済" value={countOf('processed')} tone="green" />
        <Stat label="保留" value={countOf('pending')} />
        <Stat label="失敗" value={countOf('failed')} tone={countOf('failed') ? 'amber' : 'slate'} />
        <Stat label="dead" value={countOf('dead')} tone={countOf('dead') ? 'red' : 'slate'} />
        <Stat label="Outbox未送" value={outboxOf('pending')} />
      </div>
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>発生日時</Th>
              <Th>イベント</Th>
              <Th>集約</Th>
              <Th>状態</Th>
              <Th>再試行</Th>
              <Th>失敗理由</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <Td colSpan={7}>
                  <EmptyState title="イベントがありません" hint="顧客作成や見積承認などで発火します。" />
                </Td>
              </tr>
            ) : (
              events.map((e: EventRow) => (
                <tr key={e.id} className="hover:bg-secondary/50">
                  <Td className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(e.occurredAt)}</Td>
                  <Td className="text-xs font-medium">{e.eventType}</Td>
                  <Td className="text-xs text-muted-foreground">{e.aggregateType}:{e.aggregateId.slice(0, 8)}</Td>
                  <Td><Badge tone={STATUS_TONE[e.status] ?? 'slate'}>{e.status}</Badge></Td>
                  <Td className="text-xs">{e.retryCount}</Td>
                  <Td className="text-xs text-red-600">{e.failureReason ?? ''}</Td>
                  <Td>
                    {canRetry && (e.status === 'failed' || e.status === 'dead') ? (
                      <form action={retryEventAction}>
                        <input type="hidden" name="eventId" value={e.id} />
                        <Button type="submit" size="sm" variant="outline">再実行</Button>
                      </form>
                    ) : null}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
