import Link from 'next/link';
import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, Badge, EmptyState } from '@/components/ui';
import { SeverityBadge } from '@/components/badges';
import { formatDateTime } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const user = await requireUser();
  const notes = await prisma.notification.findMany({
    where: { tenantId: user.tenantId, userId: user.userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  // 既読化
  await prisma.notification.updateMany({
    where: { tenantId: user.tenantId, userId: user.userId, readAt: null },
    data: { readAt: new Date() },
  });

  return (
    <div>
      <PageHeader title="通知" description="あなた宛ての通知一覧です。" />
      <Card>
        <CardContent className="space-y-2 pt-4">
          {notes.length === 0 ? <EmptyState title="通知はありません" /> : notes.map((n) => (
            <div key={n.id} className="flex items-start gap-2 rounded-md border p-3">
              <SeverityBadge severity={n.severity as any} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{n.title}</span>
                  {!n.readAt ? <Badge tone="blue">未読</Badge> : null}
                </div>
                <div className="text-xs text-muted-foreground">{n.body}</div>
                {n.link ? <Link href={n.link} className="text-xs text-primary hover:underline">詳細 →</Link> : null}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
