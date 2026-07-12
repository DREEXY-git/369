import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeDataAccess } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Badge, EmptyState } from '@/components/ui';
import { AccessDenied } from '@/components/access-denied';
import { AiProfileCard } from '@/components/ai-office/profile-card';
import { getAiWorkforceReadModel } from '@/lib/domains/ai-workforce/read-model';
import { formatDateTime, getAiCharacter, AI_WORKFORCE_STATE_LABEL, type AiWorkforceState } from '@hokko/shared';

export const dynamic = 'force-dynamic';

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

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="shrink-0 text-muted-foreground">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}

export default async function AiAgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  // Stream B（roadmap71）: 一覧と同じページ基礎権限（dashboard:read）をデータ取得前に適用。
  if (!hasPermission(user, 'dashboard', 'read')) {
    return (
      <AccessDenied
        title="AI社員詳細"
        reason="AI社員の閲覧にはダッシュボードの閲覧権限（dashboard:read）が必要です"
      />
    );
  }
  // tenantId でスコープ。別テナント/存在しない id は notFound（存在有無を漏らさない・404 に統一）。
  // 親 AIAgent は表示に必要な最小 select のみ（userId 等の内部 FK は取得しない）。
  const agent = await prisma.aIAgent.findFirst({
    where: { id, tenantId: user.tenantId },
    select: { id: true, key: true, name: true, role: true },
  });
  if (!agent) notFound();

  // v6.4 High（nested child tenant isolation）修正: 子（run/action/memory）を親 relation（agentId/runId）任せに
  // せず、**各クエリに tenantId を明示**してスコープする。さらに広域 include をやめ、表示に必要な最小 select に絞る
  // （input/output/error など未使用の payload/PII/secret を一切取得しない）。
  const runs = await prisma.aIAgentRun.findMany({
    where: { tenantId: user.tenantId, agentId: agent.id },
    select: {
      id: true,
      task: true,
      status: true,
      humanReviewed: true,
      sentExternally: true,
      riskLevel: true,
      startedAt: true,
    },
    orderBy: { startedAt: 'desc' },
    take: 20,
  });
  const runIds = runs.map((r) => r.id);
  const actionRows =
    runIds.length > 0
      ? await prisma.aIAgentAction.findMany({
          where: { tenantId: user.tenantId, runId: { in: runIds } },
          select: { runId: true, type: true, summary: true },
          orderBy: { createdAt: 'asc' },
        })
      : [];
  const actionsByRun = new Map<string, { type: string; summary: string }[]>();
  for (const a of actionRows) {
    const arr = actionsByRun.get(a.runId) ?? [];
    arr.push({ type: a.type, summary: a.summary });
    actionsByRun.set(a.runId, arr);
  }
  const memory = await prisma.aIAgentMemory.findMany({
    where: { tenantId: user.tenantId, agentId: agent.id },
    select: { id: true, key: true, value: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  // 機密表示（AI社員の記憶・実行履歴）の参照を DataAccessLog に**メタデータのみ**で記録する
  // （memory 本文・run payload・秘密・PII は記録しない・件数と対象 ID のみ）。permission-deny 時は
  // 上の AccessDenied で早期 return 済み＝取得もログもしない。
  await writeDataAccess({
    tenantId: user.tenantId,
    actorId: user.userId,
    actorType: 'user',
    entityType: 'ai_agent_detail',
    entityId: agent.id,
    action: 'read',
    purpose: 'AI社員詳細（記憶・活動履歴）閲覧',
    metadata: { agentKey: agent.key, runCount: runs.length, memoryCount: memory.length },
  });

  // v6.1 統一: 人物・プロフィールは getAiCharacter(key)、稼働状態は 3D Office と同じ read model を正本にする。
  const profile = getAiCharacter(agent.key);
  const model = await getAiWorkforceReadModel(user.tenantId);
  const view = model.agents.find((a) => a.id === agent.id) ?? null;

  return (
    <div
      data-testid="ai-agent-detail-root"
      data-agent-key={agent.key}
      data-agent-state={view?.state ?? ''}
      data-agent-name={profile.fullName !== '（設定未作成）' ? profile.fullName : agent.name}
    >
      <PageHeader
        title={profile.fullName !== '（設定未作成）' ? profile.fullName : agent.name}
        description={agent.role}
        breadcrumb={[{ label: 'AI社員', href: '/ai-agents' }, { label: agent.name, href: '#' }]}
        action={
          <div className="flex items-center gap-2">
            {view ? <Badge tone={STATE_TONE[view.state]}>{AI_WORKFORCE_STATE_LABEL[view.state]}</Badge> : null}
            <Link
              href={`/ai-office?agent=${agent.id}`}
              className="rounded-md border px-2.5 py-1 text-xs font-medium text-indigo-600 transition hover:bg-secondary dark:text-indigo-300"
              data-testid="to-3d-office"
            >
              3Dオフィスで見る →
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          {/* プロフィール（キャラクター設定・正本 = getAiCharacter） */}
          <Card>
            <CardHeader><CardTitle>プロフィール（設定）</CardTitle></CardHeader>
            <CardContent>
              <AiProfileCard profile={profile} />
            </CardContent>
          </Card>

          {/* 稼働状態（実測・証拠由来・3D Office と同じ導出） */}
          <Card>
            <CardHeader><CardTitle>稼働状態（実測・証拠由来）</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              {view ? (
                <>
                  <Row k="状態" v={AI_WORKFORCE_STATE_LABEL[view.state]} />
                  <Row k="根拠" v={view.stateReason} />
                  {view.blockedReason ? <Row k="ブロック理由" v={view.blockedReason} /> : null}
                  <Row k="現在のタスク" v={view.currentTask ?? '—'} />
                  <Row k="最終活動" v={view.lastActivityLabel} />
                  <Row k="承認待ち" v={view.pendingApprovals > 0 ? `${view.pendingApprovals} 件` : 'なし'} />
                  <Row k="実行回数" v={String(view.runCount)} />
                  <Row k="権限レベル" v={view.permissionLevel} />
                  <Row k="次の推奨" v={view.nextRecommendedAction} />
                </>
              ) : (
                <p className="text-xs text-muted-foreground">稼働状態を導出できませんでした。</p>
              )}
            </CardContent>
          </Card>

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
              {memory.length === 0 ? <span className="text-muted-foreground">なし</span> : memory.map((m) => (
                <div key={m.id}><span className="text-muted-foreground">{m.key}: </span>{m.value}</div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>活動ログ（実行履歴）</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {runs.length === 0 ? <EmptyState title="実行履歴なし" /> : runs.map((r) => (
              <div key={r.id} className="rounded-md border p-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{r.task}</span>
                  <Badge tone={r.status === 'SUCCEEDED' ? 'green' : r.status === 'FAILED' ? 'red' : 'amber'}>{r.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{(actionsByRun.get(r.id) ?? []).map((a) => `${a.type}: ${a.summary}`).join(' / ')}</div>
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
      </div>
    </div>
  );
}
