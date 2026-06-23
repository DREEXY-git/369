import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, Badge, EmptyState } from '@/components/ui';
import { LabelBadge } from '@/components/badges';
import { formatDateTime } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function ThreadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const thread = await prisma.communicationThread.findFirst({
    where: { id, tenantId: user.tenantId },
    include: { messages: { orderBy: { sentAt: 'asc' } } },
  });
  if (!thread) notFound();

  return (
    <div>
      <PageHeader
        title={thread.subject}
        description={`${thread.channel}`}
        breadcrumb={[
          { label: 'コミュニケーション', href: '/communications/inbox' },
          { label: thread.subject, href: '#' },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Badge tone="green">業務関連</Badge>
            <LabelBadge label={thread.label as any} />
          </div>
        }
      />
      <Card>
        <CardContent className="space-y-3 pt-4">
          {thread.messages.length === 0 ? (
            <EmptyState title="メッセージがありません" hint="一時保管からの保存スレッドのため本文は取り込まれていません。" />
          ) : (
            thread.messages.map((m) => (
              <div key={m.id} className="rounded-md border p-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium">{m.sender}</span>
                  <span className="text-xs text-muted-foreground">{m.direction} ・ {formatDateTime(m.sentAt)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm">{m.body}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
