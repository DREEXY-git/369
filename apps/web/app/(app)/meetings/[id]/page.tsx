import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Badge, EmptyState } from '@/components/ui';
import { LabelBadge } from '@/components/badges';
import { formatDate } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const meeting = await prisma.meeting.findFirst({
    where: { id, tenantId: user.tenantId },
    include: {
      minutes: { orderBy: { createdAt: 'desc' }, take: 1 },
      decisions: true,
      actionItems: true,
      transcripts: { include: { segments: { orderBy: { startSec: 'asc' } } }, take: 1 },
    },
  });
  if (!meeting) notFound();
  const minutes = meeting.minutes[0];
  const segments = meeting.transcripts[0]?.segments ?? [];

  return (
    <div>
      <PageHeader
        title={meeting.title}
        description={`${formatDate(meeting.occurredAt)}`}
        breadcrumb={[{ label: '会議', href: '/meetings' }, { label: meeting.title, href: '#' }]}
        action={<LabelBadge label={meeting.label as any} />}
      />

      {minutes ? (
        <Card className="mb-4 border-primary/30 bg-accent/30">
          <CardHeader><CardTitle>🤖 AI議事録</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div><div className="text-xs font-semibold text-muted-foreground">3行要約</div><pre className="whitespace-pre-wrap font-sans">{minutes.summary3}</pre></div>
            <div><div className="text-xs font-semibold text-muted-foreground">社長向け要約</div>{minutes.ceoSummary}</div>
            {minutes.insights ? <div><div className="text-xs font-semibold text-muted-foreground">顧客インサイト</div>{minutes.insights}</div> : null}
            {minutes.risks ? <div className="rounded-md bg-amber-50 p-2 text-amber-800"><div className="text-xs font-semibold">リスク</div>{minutes.risks}</div> : null}
            {minutes.nextAgenda ? <div><div className="text-xs font-semibold text-muted-foreground">次回アジェンダ</div>{minutes.nextAgenda}</div> : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>決定事項</CardTitle></CardHeader>
          <CardContent>
            {meeting.decisions.length === 0 ? <EmptyState title="決定事項なし" /> : (
              <ul className="list-inside list-disc space-y-1 text-sm">{meeting.decisions.map((d) => <li key={d.id}>{d.text}</li>)}</ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>アクションアイテム</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {meeting.actionItems.length === 0 ? <EmptyState title="タスクなし" /> : meeting.actionItems.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                <span>{a.title}</span>
                <div className="flex items-center gap-2">
                  <Badge tone={a.priority === 'high' ? 'red' : 'slate'}>{a.priority}</Badge>
                  <span className="text-xs text-muted-foreground">{formatDate(a.dueDate)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>発言ログ（話者別）</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {segments.map((s) => (
            <div key={s.id} className="flex gap-2">
              <span className="w-16 shrink-0 font-medium text-muted-foreground">{s.speaker}</span>
              <span>{s.text}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
