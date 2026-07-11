import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeDataAccess } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Badge, EmptyState } from '@/components/ui';
import { AccessDenied } from '@/components/access-denied';
import { AiPortrait } from '@/components/ai-office/portrait';
import { getAiWorkforceReadModel } from '@/lib/domains/ai-workforce/read-model';
import { formatDateTime, getAiCharacter, AI_WORKFORCE_STATE_LABEL, type AiWorkforceState } from '@hokko/shared';

export const dynamic = 'force-dynamic';

// 自律レベルの短い日本語ラベル（v6.4: 長い permissionLevel を nowrap Badge に入れて見切れる問題の分離）。
const AUTONOMY_LABEL: Record<string, string> = {
  supervised: '監督付き',
  assist: '補助',
  autonomous: '自律',
};
function autonomyLabel(a: string): string {
  return AUTONOMY_LABEL[a] ?? a;
}

// 稼働状態バッジの色（3D Office と同じ AiWorkforceState を使い、同じ意味で表示する）。
const STATE_TONE: Record<AiWorkforceState, 'green' | 'amber' | 'red' | 'slate' | 'purple'> = {
  working: 'green',
  idle: 'slate',
  planning: 'purple',
  waiting_approval: 'amber',
  blocked: 'red',
  error: 'red',
  offline: 'slate',
  unknown: 'slate',
};

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
  // v6.1 統一: 一覧の人物・ポートレートは getAiCharacter(key) を正本にし、稼働状態は 3D Office と
  // 同じ read model（deriveAgentState 由来）を使う。生の AIAgent.status は表示に使わない。
  // v6.4 High（child tenant isolation）修正: run は tenantId 明示 + 最小 select（input/output/error は取得しない）。
  // agent は表示に必要な name のみを relation 越しに select（親 relation は run の tenantId で既にスコープ済み）。
  const [model, runs] = await Promise.all([
    getAiWorkforceReadModel(user.tenantId),
    prisma.aIAgentRun.findMany({
      where: { tenantId: user.tenantId },
      select: {
        id: true,
        task: true,
        status: true,
        humanReviewed: true,
        sentExternally: true,
        startedAt: true,
        agent: { select: { name: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: 15,
    }),
  ]);
  // 活動ログの action 要約は、run relation 任せにせず **tenantId を明示**した別クエリで取得し、最小 select に絞る。
  const runIds = runs.map((r) => r.id);
  const actionRows =
    runIds.length > 0
      ? await prisma.aIAgentAction.findMany({
          where: { tenantId: user.tenantId, runId: { in: runIds } },
          select: { runId: true, summary: true },
          orderBy: { createdAt: 'asc' },
        })
      : [];
  const summariesByRun = new Map<string, string[]>();
  for (const a of actionRows) {
    const arr = summariesByRun.get(a.runId) ?? [];
    arr.push(a.summary);
    summariesByRun.set(a.runId, arr);
  }

  // 機密表示（AI社員の稼働・活動ログ一覧）の参照を DataAccessLog に**メタデータのみ**で記録
  // （run payload・action 本文・秘密・PII は記録しない・件数のみ）。permission-deny は上で早期 return 済み。
  await writeDataAccess({
    tenantId: user.tenantId,
    actorId: user.userId,
    actorType: 'user',
    entityType: 'ai_agent_list',
    action: 'read',
    purpose: 'AI社員 一覧・活動ログ閲覧',
    metadata: { agentCount: model.agents.length, runCount: runs.length },
  });

  return (
    <div>
      <PageHeader title="AI社員" description="AI社員は人間と同様に権限を持つ主体として扱われ、活動はすべて監査ログに記録されます。外部送信・承認はできません。稼働状態は証拠から導出（生データの断定なし）。" />

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {model.agents.map((a) => {
          const prof = getAiCharacter(a.key);
          const hasProfile = prof.fullName !== '（設定未作成）';
          return (
            <Link
              key={a.id}
              href={`/ai-agents/${a.id}`}
              data-testid={`ai-agent-card-${a.id}`}
              data-agent-key={a.key}
              data-agent-state={a.state}
              data-agent-name={hasProfile ? prof.fullName : a.name}
            >
              <Card className="h-full transition hover:border-primary/50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2.5">
                    <span className="shrink-0 overflow-hidden rounded-lg shadow-sm">
                      <AiPortrait profile={prof} size={44} />
                    </span>
                    <div className="min-w-0">
                      {prof.epithet ? (
                        <div className="truncate text-[11px] font-medium" style={{ color: prof.appearance.accentColor }}>
                          {prof.epithet}
                        </div>
                      ) : null}
                      <div className="truncate text-sm font-semibold">{hasProfile ? prof.fullName : a.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{a.department}</div>
                    </div>
                    <Badge tone={STATE_TONE[a.state]} className="ml-auto shrink-0">
                      {AI_WORKFORCE_STATE_LABEL[a.state]}
                    </Badge>
                  </div>
                  <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">{a.role}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    {/* 短い自律ラベルだけを Badge（nowrap）に。長いガードレール説明は折返し可能な行に分離（v6.4）。 */}
                    <Badge tone="purple">{autonomyLabel(a.autonomy)}</Badge>
                    <span className="text-muted-foreground">実行 {a.runCount} 回</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                    外部送信・承認・削除は不可／人間承認必須
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
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
                  {(summariesByRun.get(r.id) ?? []).join(' / ') || '—'}
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
