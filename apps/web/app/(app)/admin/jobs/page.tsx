import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Table, Th, Td, Badge, Button, EmptyState, Stat } from '@/components/ui';
import { formatDateTime } from '@hokko/shared';
import { runOutboxNowAction } from './actions';

export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, string> = { pending: 'slate', running: 'blue', succeeded: 'green', failed: 'amber', dead: 'red' };

type RunRow = {
  id: string;
  jobType: string;
  status: string;
  attempts: number;
  startedAt: Date | null;
  finishedAt: Date | null;
  result: any;
  createdAt: Date;
};

export default async function JobsPage() {
  const user = await requireUser();
  const canView = hasPermission(user, 'audit', 'read');
  const canRun = hasPermission(user, 'admin', 'update');
  if (!canView) {
    return (
      <div>
        <PageHeader title="ジョブ実行" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">閲覧権限がありません。</div>
      </div>
    );
  }
  const [runs, counts, outboxPending] = await Promise.all([
    prisma.jobRun.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.jobRun.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.outboxMessage.count({ where: { status: { in: ['pending', 'failed'] } } }),
  ]);
  const countOf = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;

  return (
    <div>
      <PageHeader
        title="ジョブ実行（JobRun）"
        description="Worker / 手動実行ジョブの状態・再試行・dead-letter を確認します。"
        breadcrumb={[{ label: '管理', href: '/admin' }, { label: 'ジョブ', href: '#' }]}
        action={
          canRun ? (
            <form action={runOutboxNowAction}>
              <Button type="submit">Outbox を今すぐ処理</Button>
            </form>
          ) : null
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="成功" value={countOf('succeeded')} tone="green" />
        <Stat label="実行中" value={countOf('running')} tone="blue" />
        <Stat label="失敗" value={countOf('failed') + countOf('dead')} tone={countOf('failed') + countOf('dead') ? 'amber' : 'slate'} />
        <Stat label="Outbox未処理" value={outboxPending} tone={outboxPending ? 'amber' : 'slate'} />
      </div>
      <Card>
        <CardHeader><CardTitle>最近の実行</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr><Th>開始</Th><Th>ジョブ</Th><Th>状態</Th><Th>試行</Th><Th>結果</Th><Th></Th></tr>
            </thead>
            <tbody>
              {runs.length === 0 ? (
                <tr><Td colSpan={6}><EmptyState title="実行履歴がありません" hint="「Outbox を今すぐ処理」または worker 起動で発生します。" /></Td></tr>
              ) : (
                runs.map((r: RunRow) => (
                  <tr key={r.id} className="hover:bg-secondary/50">
                    <Td className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(r.startedAt ?? r.createdAt)}</Td>
                    <Td className="text-xs font-medium">{r.jobType}</Td>
                    <Td><Badge tone={STATUS_TONE[r.status] ?? 'slate'}>{r.status}</Badge></Td>
                    <Td className="text-xs">{r.attempts}</Td>
                    <Td className="text-xs text-muted-foreground">{r.result ? JSON.stringify(r.result) : ''}</Td>
                    <Td><Link href={`/admin/jobs/${r.id}`} className="text-xs text-primary hover:underline">詳細</Link></Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
