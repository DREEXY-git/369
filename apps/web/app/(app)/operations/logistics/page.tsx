import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Table, Th, Td, Badge, EmptyState, Input, Select, Button } from '@/components/ui';
import {
  LOGISTICS_TASK_LABEL,
  LOGISTICS_TASK_TYPES,
  canTransitionLogistics,
  formatDateTime,
  isLogisticsTaskType,
  type LogisticsStatus,
} from '@hokko/shared';
import { createLogisticsTaskAction, updateLogisticsTaskStatusAction } from './actions';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = { todo: '未着手', in_progress: '進行中', done: '完了', blocked: '保留' };
const STATUS_TONE: Record<string, 'slate' | 'blue' | 'green' | 'red'> = { todo: 'slate', in_progress: 'blue', done: 'green', blocked: 'red' };
const NEXT_LABEL: Record<string, string> = { in_progress: '開始', done: '完了', blocked: '保留', todo: '戻す' };
const NEXT: LogisticsStatus[] = ['in_progress', 'done', 'blocked', 'todo'];

export default async function LogisticsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const canEdit = hasPermission(user, 'inventory', 'update');
  const tasks = await prisma.logisticsTask.findMany({
    where: { tenantId: user.tenantId },
    include: { event: { select: { name: true } } },
    orderBy: [{ status: 'asc' }, { scheduledAt: 'asc' }],
    take: 200,
  });
  const open = tasks.filter((t) => t.status !== 'done');

  return (
    <div>
      <PageHeader
        title="配送・設営・撤去・回収"
        description="物流タスクの進捗を管理します。未完了の遅延を可視化します。"
        breadcrumb={[{ label: 'Operations', href: '/operations' }, { label: '物流', href: '#' }]}
      />
      {sp.error === 'transition' ? <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">その状態へは遷移できません。</div> : null}
      {open.length > 0 ? <div className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">未完了の物流タスクが {open.length} 件あります。</div> : null}

      {canEdit ? (
        <Card className="mb-4">
          <CardHeader><CardTitle>物流タスクを追加</CardTitle></CardHeader>
          <CardContent>
            <form action={createLogisticsTaskAction} className="flex flex-wrap items-end gap-2">
              <Select name="type" required>{LOGISTICS_TASK_TYPES.map((t) => <option key={t} value={t}>{LOGISTICS_TASK_LABEL[t]}</option>)}</Select>
              <Input name="title" required placeholder="タイトル" className="flex-1" />
              <Input name="scheduledAt" type="date" />
              <Input name="vehicle" placeholder="車両" />
              <Button type="submit" variant="outline">追加</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="pt-3">
          <Table>
            <thead><tr><Th>種別</Th><Th>タイトル</Th><Th>案件</Th><Th>予定</Th><Th>状態</Th>{canEdit ? <Th>操作</Th> : null}</tr></thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr><Td colSpan={canEdit ? 6 : 5}><EmptyState title="物流タスクがありません" hint="イベント詳細から一括作成、またはここで個別追加できます。" /></Td></tr>
              ) : tasks.map((t) => (
                <tr key={t.id} className="hover:bg-secondary/50">
                  <Td className="text-xs"><Badge tone="slate">{isLogisticsTaskType(t.type) ? LOGISTICS_TASK_LABEL[t.type] : t.type}</Badge></Td>
                  <Td className="text-sm">{t.title}</Td>
                  <Td className="text-xs text-muted-foreground">{t.event?.name ?? '-'}</Td>
                  <Td className="text-xs text-muted-foreground">{t.scheduledAt ? formatDateTime(t.scheduledAt) : '-'}</Td>
                  <Td className="text-xs"><Badge tone={STATUS_TONE[t.status] ?? 'slate'}>{STATUS_LABEL[t.status] ?? t.status}</Badge></Td>
                  {canEdit ? (
                    <Td>
                      <div className="flex gap-1">
                        {NEXT.filter((to) => canTransitionLogistics(t.status as LogisticsStatus, to)).map((to) => (
                          <form key={to} action={updateLogisticsTaskStatusAction}>
                            <input type="hidden" name="taskId" value={t.id} />
                            <input type="hidden" name="status" value={to} />
                            <Button type="submit" variant="ghost" className="h-7 px-2 text-xs">{NEXT_LABEL[to]}</Button>
                          </form>
                        ))}
                      </div>
                    </Td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
