import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, Badge, Button, Input, EmptyState } from '@/components/ui';
import { SeverityBadge } from '@/components/badges';
import { AccessDenied } from '@/components/access-denied';
import { decideApprovalAction } from './actions';
import { formatDateTime } from '@hokko/shared';

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
  ad_suggestion_review: '広告改善案の承認（review-only）',
};

export default async function ApprovalsPage() {
  const user = await requireUser();
  const canApprove = hasPermission(user, 'approval', 'approve');
  // 承認一覧（Decision Inbox）は外部送信・契約・請求・権限・削除など重要操作の title/summary を含み、
  // 請求金額・請求番号など finance 機密も載る。閲覧は承認者（approval:approve）に限定し、データ取得前に遮断する
  // （Phase 1-18 で /invoices から隠した請求情報が承認一覧経由で漏れる抜け穴を塞ぐ・Phase 1-19）。
  if (!canApprove) {
    return (
      <AccessDenied
        title="承認待ち"
        reason="承認一覧の閲覧には承認権限（approval:approve）が必要です"
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

  return (
    <div>
      <PageHeader title="承認待ち" description="外部送信・見積発行・契約・請求などの重要操作は人間の承認が必要です。" />

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
                {a.type === 'ad_suggestion_review' && a.entityId ? (
                  <div className="mt-1 text-xs">
                    <a
                      href={`/marketing/ads?highlight=${a.entityId}#suggestion-${a.entityId}`}
                      className="text-blue-700 underline"
                      data-testid={`approval-suggestion-deeplink-${a.entityId}`}
                    >
                      元の改善案を開く（/marketing/ads）
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

      <h2 className="mb-2 text-sm font-semibold">AI 実行の承認ゲート（read-only）</h2>
      <Card className="mb-4" data-testid="ai-approval-gates">
        <CardContent className="space-y-1.5 pt-4">
          <p className="text-xs text-muted-foreground">
            AI 実行が人間の判断待ちで停止している記録です。AI は自己承認しません。この一覧からの承認・却下は
            判断導線（bridge）の設計 Gate が完了するまで提供されません（現在 read-only）。
          </p>
          {aiGates.length === 0 ? (
            <EmptyState title="判断待ちの AI 承認ゲートはありません" />
          ) : (
            aiGates.map((g) => (
              <div key={g.id} className="rounded-md border p-2.5 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="purple">AIゲート</Badge>
                  <span className="font-medium">{g.action}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{formatDateTime(g.createdAt)}</span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">{g.reason}</div>
              </div>
            ))
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
