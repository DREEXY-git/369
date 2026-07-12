import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, Badge, Button, Input, EmptyState } from '@/components/ui';
import { SeverityBadge } from '@/components/badges';
import { AccessDenied } from '@/components/access-denied';
import { decideApprovalAction, decideAiGateAction } from './actions';
import Link from 'next/link';
import { formatDateTime, isStaleApprovalGate, type RunLifecycleStatus } from '@hokko/shared';

export const dynamic = 'force-dynamic';

const TYPE_LABEL: Record<string, string> = {
  outreach_send: '営業メール送信',
  quote_issue: '見積発行',
  invoice_send: '請求書送付',
  invoice_finalize: '請求書の正式化',
  dunning_send: '督促送信（お支払い状況の確認）',
  contract_sign: '契約締結',
  payment_execute: '支払実行',
  content_review: 'コンテンツ承認（review-only）',
  ai_run_resume: 'AI承認ゲートの判断（承認=再開待ち・実行なし）',
};

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const sp = (await searchParams) ?? {};
  // 承認一覧（Decision Inbox）は外部送信・契約・請求・権限・削除など重要操作の title/summary を含み、
  // 請求金額・請求番号など finance 機密も載る。閲覧は承認者（approval:approve）に限定し、データ取得前に遮断する
  // （Phase 1-18 で /invoices から隠した請求情報が承認一覧経由で漏れる抜け穴を塞ぐ・Phase 1-19）。
  // v7.0 R2（Codex P2-1 comment 4951050657）: AI ロールは approval:approve が誤設定で付与されていても
  // **データ取得前に遮断**する（gate reason・判断フォームを AI に見せない。action 側の拒否と二重防御）。
  const canApprove = hasPermission(user, 'approval', 'approve') && !user.isAi;
  if (!canApprove) {
    return (
      <AccessDenied
        title="承認待ち"
        reason={
          user.isAi
            ? '承認一覧は人間の承認者のみ閲覧できます（AI ロールは権限設定に関わらず閲覧・判断できません）'
            : '承認一覧の閲覧には承認権限（approval:approve）が必要です'
        }
        breadcrumb={[{ label: '承認待ち', href: '/approvals' }]}
      />
    );
  }
  const [pending, recent, aiGates] = await Promise.all([
    prisma.approvalRequest.findMany({ where: { tenantId: user.tenantId, status: 'PENDING' }, orderBy: { createdAt: 'desc' } }),
    prisma.approvalRequest.findMany({ where: { tenantId: user.tenantId, status: { not: 'PENDING' } }, orderBy: { decidedAt: 'desc' }, take: 10 }),
    // v5.8 Medium-2: AI 実行の承認ゲート（AIApprovalGate PENDING）を人間の承認画面から可視化する。
    // 判断（承認/却下→run 再開/失敗）の実行導線は bridge 設計（roadmap78 Gate）実装まで作らない
    // （read-only 表示のみ。payload 本文は取得しない: action/reason/時刻のみ）。
    prisma.aIApprovalGate.findMany({
      where: { tenantId: user.tenantId, status: 'PENDING' },
      select: { id: true, action: true, reason: true, createdAt: true, runId: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);
  // AI 社員詳細への deep link 用に、gate の run → agentId を tenant スコープの最小 select で解決する
  // （input/output/error は取得しない・roadmap82）。
  const gateRunIds = aiGates.map((g) => g.runId).filter((v): v is string => Boolean(v));
  const gateRuns = gateRunIds.length
    ? await prisma.aIAgentRun.findMany({
        where: { id: { in: gateRunIds }, tenantId: user.tenantId },
        select: { id: true, agentId: true, status: true, startedAt: true },
      })
    : [];
  const agentIdByRun = new Map(gateRuns.map((r) => [r.id, r.agentId]));
  const runFreshnessByRun = new Map(gateRuns.map((r) => [r.id, { status: r.status as RunLifecycleStatus, startedAt: r.startedAt }]));
  const now = new Date();

  return (
    <div>
      <PageHeader title="承認待ち" description="外部送信・見積発行・契約・請求などの重要操作は人間の承認が必要です。" />

      {sp.error === 'stale_gate' ? (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" data-testid="stale-gate-banner">
          この AI 承認ゲートは stale（作成から24時間超・または実行系譜を断定できない状態）です。何も変更していません。
          内容を再確認のうえ「stale を再確認しました」にチェックして承認するか、却下してください。
        </div>
      ) : null}
      {sp.error === 'gate_transition' ? (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900" data-testid="gate-transition-banner">
          対象 run の状態が変わったため判断を確定できませんでした（全体を巻き戻しています）。一覧を確認して再判断してください。
        </div>
      ) : null}

      <Card className="mb-4">
        <CardContent className="space-y-3 pt-4">
          {pending.length === 0 ? (
            <EmptyState title="承認待ちはありません" />
          ) : (
            pending.map((a) => (
              <div key={a.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="blue">{TYPE_LABEL[a.type] ?? a.type}</Badge>
                  <SeverityBadge severity={a.riskLevel as any} />
                  <span className="font-medium">{a.title}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{formatDateTime(a.createdAt)}</span>
                </div>
                {a.summary ? <div className="mt-1 text-sm text-muted-foreground">{a.summary}</div> : null}
                {a.type === 'content_review' && a.entityId ? (
                  <div className="mt-1 text-xs">
                    <a
                      href={`/marketing/content?highlight=${a.entityId}#content-${a.entityId}`}
                      className="text-blue-700 underline"
                      data-testid={`approval-content-deeplink-${a.entityId}`}
                    >
                      元の下書きを開く（/marketing/content）
                    </a>
                  </div>
                ) : null}
                {canApprove ? (
                  <form action={decideApprovalAction} className="mt-2 flex flex-wrap items-center gap-2">
                    <input type="hidden" name="approvalId" value={a.id} />
                    <Input name="note" placeholder="判断メモ（任意）" className="max-w-xs" />
                    <Button type="submit" name="decision" value="approve">承認</Button>
                    <Button type="submit" name="decision" value="reject" variant="danger">却下</Button>
                  </form>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <h2 className="mb-2 text-sm font-semibold">AI 実行の承認ゲート（人間の判断）</h2>
      <Card className="mb-4" data-testid="ai-approval-gates">
        <CardContent className="space-y-1.5 pt-4">
          <p className="text-xs text-muted-foreground">
            AI 実行が人間の判断待ちで停止している記録です。AI は自己承認しません。承認は「再開待ち（QUEUED）」の
            記録までで、実行・完了はここでは発生しません（実 queue 再投入・実行は別 Gate・外部送信/実 LLM/課金なし）。
          </p>
          {aiGates.length === 0 ? (
            <EmptyState title="判断待ちの AI 承認ゲートはありません" />
          ) : (
            aiGates.map((g) => {
              const agentId = g.runId ? agentIdByRun.get(g.runId) : undefined;
              // v7.0 R2（Codex P2-2）: stale 判定は shared 正本（isStaleApprovalGate）。stale の承認には
              // 明示再確認 checkbox（confirmStale）が必須（action/core 側でも強制される）。
              const stale = isStaleApprovalGate(
                { createdAt: g.createdAt },
                g.runId ? (runFreshnessByRun.get(g.runId) ?? null) : null,
                now,
              );
              return (
                <div key={g.id} className="rounded-md border p-2.5 text-sm" data-testid={`ai-gate-${g.id}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="purple">AIゲート</Badge>
                    <span className="font-medium">{g.action}</span>
                    {stale ? (
                      <Badge tone="amber" data-testid={`ai-gate-stale-${g.id}`}>
                        stale（24h超・要再確認）
                      </Badge>
                    ) : null}
                    <span className="ml-auto text-xs text-muted-foreground">{formatDateTime(g.createdAt)}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{g.reason}</div>
                  {agentId ? (
                    <div className="mt-1 text-xs">
                      <Link href={`/ai-agents/${agentId}`} className="text-blue-700 underline" data-testid={`ai-gate-agent-link-${g.id}`}>
                        対象の AI 社員詳細を開く
                      </Link>
                    </div>
                  ) : null}
                  {canApprove ? (
                    <form action={decideAiGateAction} className="mt-2 flex flex-wrap items-center gap-2">
                      <input type="hidden" name="gateId" value={g.id} />
                      <Input name="note" placeholder="判断メモ（任意）" className="max-w-xs" />
                      {stale ? (
                        <label className="flex items-center gap-1.5 text-xs text-amber-900">
                          <input type="checkbox" name="confirmStale" value="1" data-testid={`ai-gate-confirm-stale-${g.id}`} />
                          stale を再確認しました（承認に必須）
                        </label>
                      ) : null}
                      <Button type="submit" name="decision" value="approve" data-testid={`ai-gate-approve-${g.id}`}>
                        承認（再開待ちにする）
                      </Button>
                      <Button type="submit" name="decision" value="reject" variant="danger" data-testid={`ai-gate-reject-${g.id}`}>
                        却下
                      </Button>
                    </form>
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <h2 className="mb-2 text-sm font-semibold">最近の承認履歴</h2>
      <Card>
        <CardContent className="space-y-1.5 pt-4">
          {recent.length === 0 ? (
            <EmptyState title="履歴はありません" />
          ) : (
            recent.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{a.title}</span>
                <div className="flex items-center gap-2">
                  <Badge tone={a.status === 'APPROVED' ? 'green' : 'red'}>{a.status === 'APPROVED' ? '承認済' : '却下'}</Badge>
                  <span className="text-xs text-muted-foreground">{formatDateTime(a.decidedAt)}</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
