import Link from 'next/link';
import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, Table, Th, Td, Badge, EmptyState } from '@/components/ui';
import { formatDate, daysFromNow } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function TasksPage() {
  const user = await requireUser();
  const tasks = await prisma.actionItem.findMany({
    where: { tenantId: user.tenantId },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
  });
  const open = tasks.filter((t) => t.status !== 'done');
  const done = tasks.filter((t) => t.status === 'done');

  return (
    <div>
      <PageHeader title="タスク" description={`未完了 ${open.length} 件 / 完了 ${done.length} 件。会議から自動抽出されたタスクを含みます。`} />
      <Card>
        {tasks.length === 0 ? (
          <div className="p-6"><EmptyState title="タスクがありません" /></div>
        ) : (
          <Table>
            <thead><tr><Th>タスク</Th><Th>担当</Th><Th>優先度</Th><Th>期限</Th><Th>状態</Th><Th>出所</Th></tr></thead>
            <tbody>
              {tasks.map((t) => {
                const d = daysFromNow(t.dueDate);
                const overdue = t.status !== 'done' && d !== null && d < 0;
                return (
                  <tr key={t.id} className="hover:bg-secondary/50">
                    <Td className={t.status === 'done' ? 'text-muted-foreground line-through' : ''}>{t.title}</Td>
                    <Td className="text-xs">{t.assigneeName ?? '—'}</Td>
                    <Td><Badge tone={t.priority === 'high' ? 'red' : t.priority === 'low' ? 'slate' : 'amber'}>{t.priority}</Badge></Td>
                    <Td className={overdue ? 'text-red-600' : 'text-muted-foreground'}>{formatDate(t.dueDate)}{overdue ? '（遅延）' : ''}</Td>
                    <Td><Badge tone={t.status === 'done' ? 'green' : t.status === 'in_progress' ? 'blue' : 'slate'}>{t.status}</Badge></Td>
                    <Td>{t.meetingId ? <Link href={`/meetings/${t.meetingId}`} className="text-xs text-primary hover:underline">会議</Link> : <span className="text-xs text-muted-foreground">{t.source}</span>}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
