import { notFound } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Badge, Table, Th, Td, EmptyState } from '@/components/ui';
import { formatDateTime } from '@hokko/shared';

export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, string> = { pending: 'slate', running: 'blue', succeeded: 'green', failed: 'amber', dead: 'red' };
const LEVEL_TONE: Record<string, string> = { info: 'slate', warn: 'amber', error: 'red' };

export default async function JobRunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!hasPermission(user, 'audit', 'read')) {
    return (
      <div>
        <PageHeader title="ジョブ詳細" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">閲覧権限がありません。</div>
      </div>
    );
  }
  const run = await prisma.jobRun.findUnique({ where: { id }, include: { logs: { orderBy: { createdAt: 'asc' } } } });
  if (!run) notFound();
  // tenant スコープ確認（tenantId が付くジョブは自テナントのみ）
  if (run.tenantId && run.tenantId !== user.tenantId) notFound();

  return (
    <div>
      <PageHeader
        title={`ジョブ: ${run.jobType}`}
        description={`実行ID ${run.id}`}
        breadcrumb={[{ label: '管理', href: '/admin' }, { label: 'ジョブ', href: '/admin/jobs' }, { label: run.jobType, href: '#' }]}
        action={<Badge tone={STATUS_TONE[run.status] ?? 'slate'}>{run.status}</Badge>}
      />
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>概要</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">開始</span><span>{run.startedAt ? formatDateTime(run.startedAt) : '-'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">終了</span><span>{run.finishedAt ? formatDateTime(run.finishedAt) : '-'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">試行回数</span><span>{run.attempts}</span></div>
            {run.error ? <div className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">{run.error}</div> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>結果 / ペイロード</CardTitle></CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded bg-secondary/40 p-2 text-[11px]">{JSON.stringify({ result: run.result, payload: run.payload }, null, 2)}</pre>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>ログ（{run.logs.length}）</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <thead><tr><Th>時刻</Th><Th>レベル</Th><Th>メッセージ</Th></tr></thead>
            <tbody>
              {run.logs.length === 0 ? (
                <tr><Td colSpan={3}><EmptyState title="ログがありません" /></Td></tr>
              ) : (
                run.logs.map((l) => (
                  <tr key={l.id}>
                    <Td className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(l.createdAt)}</Td>
                    <Td><Badge tone={LEVEL_TONE[l.level] ?? 'slate'}>{l.level}</Badge></Td>
                    <Td className="text-xs">{l.message}</Td>
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
