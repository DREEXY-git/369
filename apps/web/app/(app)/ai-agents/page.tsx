import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Badge, EmptyState } from '@/components/ui';
import { AccessDenied } from '@/components/access-denied';
import { formatDateTime } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function AiAgentsPage() {
  const user = await requireUser();
  // Stream B（roadmap71）: AI社員の稼働情報は経営運用の可視化。ページ基礎権限（dashboard:read）を
  // データ取得前に適用（外部ロール・AI_ASSISTANT を遮断・/ai-office と同一規約）。
  if (!hasPermission(user, 'dashboard', 'read')) {
    return (
      <AccessDenied
        title="AI社員"
        reason="AI社員の閲覧にはダッシュボードの閲覧権限（dashboard:read）が必要です"
      />
    );
  }
  const [agents, runs] = await Promise.all([
    prisma.aIAgent.findMany({
      where: { tenantId: user.tenantId },
      include: { _count: { select: { runs: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.aIAgentRun.findMany({
      where: { tenantId: user.tenantId },
      include: { agent: true, actions: true },
      orderBy: { startedAt: 'desc' },
      take: 15,
    }),
  ]);

  return (
    <div>
      <PageHeader title="AI社員" description="AI社員は人間と同様に権限を持つ主体として扱われ、活動はすべて監査ログに記録されます。外部送信・承認はできません。" />

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((a) => (
          <Link key={a.id} href={`/ai-agents/${a.id}`}>
            <Card className="h-full transition hover:border-primary/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-lg">🤖</span>
                  <div>
                    <div className="text-sm font-semibold">{a.name}</div>
                    <div className="text-xs text-muted-foreground">{a.department}</div>
                  </div>
                  <Badge tone={a.status === 'active' ? 'green' : 'slate'} className="ml-auto">{a.status}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{a.role}</p>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <Badge tone="purple">{a.autonomy}</Badge>
                  <span className="text-muted-foreground">実行 {a._count.runs} 回</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>AI社員 活動ログ</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {runs.length === 0 ? <EmptyState title="活動ログがありません" /> : runs.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-2 rounded-md border p-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <Badge tone="purple">{r.agent.name}</Badge>
                  <span className="font-medium">{r.task}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {r.actions.map((a) => a.summary).join(' / ') || '—'}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <Badge tone={r.status === 'SUCCEEDED' ? 'green' : r.status === 'FAILED' ? 'red' : 'amber'}>{r.status}</Badge>
                <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <span>{r.humanReviewed ? '人間確認済' : '未確認'}</span>
                  <span>・{r.sentExternally ? '外部送信あり' : '外部送信なし'}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">{formatDateTime(r.startedAt)}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
