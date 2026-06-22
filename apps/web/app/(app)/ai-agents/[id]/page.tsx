import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Badge, EmptyState } from '@/components/ui';
import { formatDateTime } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function AiAgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const agent = await prisma.aIAgent.findFirst({
    where: { id, tenantId: user.tenantId },
    include: {
      runs: { include: { actions: true }, orderBy: { startedAt: 'desc' }, take: 20 },
      memory: { take: 10 },
    },
  });
  if (!agent) notFound();

  return (
    <div>
      <PageHeader
        title={agent.name}
        description={agent.role}
        breadcrumb={[{ label: 'AI社員', href: '/ai-agents' }, { label: agent.name, href: '#' }]}
        action={<Badge tone="purple">{agent.autonomy}</Badge>}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>活動ログ（実行履歴）</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {agent.runs.length === 0 ? <EmptyState title="実行履歴なし" /> : agent.runs.map((r) => (
              <div key={r.id} className="rounded-md border p-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{r.task}</span>
                  <Badge tone={r.status === 'SUCCEEDED' ? 'green' : 'amber'}>{r.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{r.actions.map((a) => `${a.type}: ${a.summary}`).join(' / ')}</div>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{r.humanReviewed ? '✅ 人間確認済' : '⏳ 未確認'}</span>
                  <span>{r.sentExternally ? '⚠️ 外部送信あり' : '外部送信なし'}</span>
                  <span>リスク: {r.riskLevel}</span>
                  <span className="ml-auto">{formatDateTime(r.startedAt)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>権限・ガードレール</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex items-center justify-between"><span>外部送信</span><Badge tone="red">禁止</Badge></div>
              <div className="flex items-center justify-between"><span>承認権限</span><Badge tone="red">なし</Badge></div>
              <div className="flex items-center justify-between"><span>データ参照</span><Badge tone="green">許可（ログ記録）</Badge></div>
              <div className="flex items-center justify-between"><span>下書き生成</span><Badge tone="green">許可</Badge></div>
              <p className="pt-1 text-[11px] text-muted-foreground">AI社員の生成物は必ず下書きで、送信・承認は人間が行います。</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>記憶（メモリ）</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-xs">
              {agent.memory.length === 0 ? <span className="text-muted-foreground">なし</span> : agent.memory.map((m) => (
                <div key={m.id}><span className="text-muted-foreground">{m.key}: </span>{m.value}</div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
