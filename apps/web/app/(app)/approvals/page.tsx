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
  const [pending, recent] = await Promise.all([
    prisma.approvalRequest.findMany({ where: { tenantId: user.tenantId, status: 'PENDING' }, orderBy: { createdAt: 'desc' } }),
    prisma.approvalRequest.findMany({ where: { tenantId: user.tenantId, status: { not: 'PENDING' } }, orderBy: { decidedAt: 'desc' }, take: 10 }),
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
