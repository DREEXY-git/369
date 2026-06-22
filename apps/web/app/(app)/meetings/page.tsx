import Link from 'next/link';
import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, Table, Th, Td, Badge, Button, EmptyState } from '@/components/ui';
import { LabelBadge } from '@/components/badges';
import { formatDateTime } from '@hokko/shared';

export const dynamic = 'force-dynamic';

const TYPE_LABEL: Record<string, string> = {
  social: '商談', internal: '社内', interview: '面接', oneonone: '1on1', event: 'イベント', complaint: 'クレーム',
};

export default async function MeetingsPage() {
  const user = await requireUser();
  const meetings = await prisma.meeting.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { occurredAt: 'desc' },
    include: { _count: { select: { actionItems: true, decisions: true } } },
  });

  return (
    <div>
      <PageHeader
        title="会議・議事録"
        description={`${meetings.length} 件`}
        action={<Link href="/meetings/upload"><Button>＋ 議事録を取込</Button></Link>}
      />
      <Card>
        {meetings.length === 0 ? (
          <div className="p-6"><EmptyState title="会議がありません" hint="「議事録を取込」からテキストを貼り付けて生成できます。" /></div>
        ) : (
          <Table>
            <thead><tr><Th>タイトル</Th><Th>種別</Th><Th>決定</Th><Th>タスク</Th><Th>機密</Th><Th>日時</Th></tr></thead>
            <tbody>
              {meetings.map((m) => (
                <tr key={m.id} className="hover:bg-secondary/50">
                  <Td><Link href={`/meetings/${m.id}`} className="font-medium text-primary hover:underline">{m.title}</Link></Td>
                  <Td><Badge tone="slate">{TYPE_LABEL[m.type] ?? m.type}</Badge></Td>
                  <Td>{m._count.decisions}</Td>
                  <Td>{m._count.actionItems}</Td>
                  <Td><LabelBadge label={m.label as any} /></Td>
                  <Td className="text-xs text-muted-foreground">{formatDateTime(m.occurredAt)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
