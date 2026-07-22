import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeDataAccess } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Badge, EmptyState } from '@/components/ui';
import { AccessDenied } from '@/components/access-denied';
import { formatDateTime } from '@hokko/shared';

export const dynamic = 'force-dynamic';

// B2: AI社員の「実行レシート」。1つの run を「何を根拠に（行動トレイル・参照先）→ 何をしたか（出力）→
// 安全（外部送信の有無・ブロック回数）」まで証拠付きで表示する read-only ページ。schema 非変更。
// 権限は AI社員詳細と同じ dashboard:read。子（run/action）は agentId/runId 任せにせず各クエリに tenantId を明示。

const ACTION_TONE: Record<string, 'green' | 'amber' | 'red' | 'slate' | 'blue' | 'purple'> = {
  read: 'slate',
  write: 'blue',
  recommend: 'purple',
  draft: 'purple',
  external_send_blocked: 'red',
};

function pretty(json: unknown): string {
  if (json == null) return '（出力なし）';
  try {
    return JSON.stringify(json, null, 2);
  } catch {
    return String(json);
  }
}

export default async function AiRunReceiptPage({ params }: { params: Promise<{ id: string; runId: string }> }) {
  const { id, runId } = await params;
  const user = await requireUser();
  if (!hasPermission(user, 'dashboard', 'read')) {
    return (
      <AccessDenied
        title="AI社員 実行レシート"
        reason="AI社員の実行履歴の閲覧にはダッシュボードの閲覧権限（dashboard:read）が必要です"
        breadcrumb={[{ label: 'AI社員', href: '/ai-agents' }]}
      />
    );
  }
  const agent = await prisma.aIAgent.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true, name: true, role: true } });
  if (!agent) notFound();
  // tenant + agentId + runId の三重スコープ（別テナント/別エージェントの run は存在を漏らさず 404 に統一）。
  const run = await prisma.aIAgentRun.findFirst({
    where: { id: runId, tenantId: user.tenantId, agentId: agent.id },
    select: { id: true, task: true, status: true, humanReviewed: true, sentExternally: true, riskLevel: true, startedAt: true, finishedAt: true, error: true, output: true },
  });
  if (!run) notFound();
  const actions = await prisma.aIAgentAction.findMany({
    where: { tenantId: user.tenantId, runId: run.id },
    select: { id: true, type: true, summary: true, refType: true, refId: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  const blockedSends = actions.filter((a) => a.type === 'external_send_blocked').length;
  // Codex G-AI-04: 生の output（任意 JSON）・error は AI が参照した個別データ（PII/機密を含み得る）を露出し得るため、
  // 広い dashboard:read では出さず、監査閲覧権限（audit:read）保有者にのみ生表示する。行動トレイル・統計は従来どおり全 dashboard:read。
  const canSeeRawOutput = hasPermission(user, 'audit', 'read');

  // 機密（AI 実行履歴）の参照を metadata-only で監査（出力本文・payload・PII は記録しない・件数と対象 ID のみ）。
  await writeDataAccess({
    tenantId: user.tenantId,
    actorId: user.userId,
    actorType: 'user',
    entityType: 'ai_agent_run_receipt',
    entityId: run.id,
    action: 'read',
    label: 'INTERNAL',
    purpose: 'ai_run_receipt',
    metadata: { agentId: agent.id, actions: actions.length, blockedSends },
  });

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={`実行レシート: ${run.task}`}
        description={`AI社員「${agent.name}」が何を根拠に何をしたか（証拠付き・read-only）`}
        breadcrumb={[{ label: 'AI社員', href: '/ai-agents' }, { label: agent.name, href: `/ai-agents/${agent.id}` }, { label: '実行レシート', href: '#' }]}
        action={<Badge tone={run.status === 'SUCCEEDED' ? 'green' : run.status === 'FAILED' ? 'red' : 'amber'}>{run.status}</Badge>}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">人間の確認</div><div className="text-lg font-bold">{run.humanReviewed ? '✅ 確認済' : '⏳ 未確認'}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">外部送信</div><div className="text-lg font-bold">{run.sentExternally ? '⚠️ あり' : 'なし'}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">送信ブロック</div><div className="text-lg font-bold">{blockedSends}件</div><div className="text-[11px] text-muted-foreground">AIの外部送信を遮断した回数</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">リスク</div><div className="text-lg font-bold">{run.riskLevel}</div></CardContent></Card>
      </div>

      <Card className="mb-4">
        <CardHeader><CardTitle>行動トレイル（何を根拠に・何をしたか）</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {actions.length === 0 ? (
            <EmptyState title="行動記録なし" hint="この実行では記録された行動がありません。" />
          ) : (
            actions.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm">
                <Badge tone={ACTION_TONE[a.type] ?? 'slate'}>{a.type}</Badge>
                <span>{a.summary}</span>
                {a.refType ? <span className="text-xs text-muted-foreground">参照: {a.refType}{a.refId ? `#${a.refId}` : ''}</span> : null}
                <span className="ml-auto text-[11px] text-muted-foreground">{formatDateTime(a.createdAt)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader><CardTitle>出力（AIの結果・下書き）</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">AIの生成物は下書きです。承認・外部送信は人間の承認導線でのみ行われます。</p>
          {canSeeRawOutput ? (
            <>
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md border bg-secondary/40 p-3 text-xs">{pretty(run.output)}</pre>
              {run.error ? <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">エラー: {run.error}</div> : null}
            </>
          ) : (
            <div className="rounded-md border bg-secondary/30 p-3 text-xs text-muted-foreground">
              生の出力・エラー内容には個別の顧客・財務・機密データが含まれ得るため、監査閲覧権限（audit:read）保有者にのみ表示します。上の行動トレイル・統計・安全指標はどなたでも確認できます。{run.error ? '（この実行にはエラーが記録されています）' : ''}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span>開始: {formatDateTime(run.startedAt)}</span>
        <span>終了: {run.finishedAt ? formatDateTime(run.finishedAt) : '—'}</span>
        <Link href={`/ai-agents/${agent.id}`} className="ml-auto text-primary hover:underline">← AI社員詳細へ戻る</Link>
      </div>
    </div>
  );
}
