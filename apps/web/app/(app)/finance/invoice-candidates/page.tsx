import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { writeConfidentialViewLog } from '@/lib/audit';
import { toNumber } from '@/lib/utils';
import { getInvoiceCandidateListData } from '@/lib/domains/finance/queries';
import { PageHeader } from '@/components/page-header';
import { Card, Table, Th, Td, Badge, EmptyState, Button } from '@/components/ui';
import { formatJpy, formatDate, type ConfidentialityLabel } from '@hokko/shared';
import { requestInvoiceSendApprovalAction } from '../bridge/actions';

export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, 'slate' | 'amber' | 'blue' | 'green' | 'red'> = {
  draft: 'slate', pending_approval: 'amber', approved: 'blue', sent: 'green', rejected: 'red',
};

export default async function InvoiceCandidatesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  if (!hasPermission(user, 'finance', 'read')) {
    return (
      <div>
        <PageHeader title="請求候補" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">財務閲覧権限が必要です（機密情報）。</div>
      </div>
    );
  }
  const canRequest = hasPermission(user, 'finance', 'create');
  const candidates = await getInvoiceCandidateListData(user.tenantId);
  await writeConfidentialViewLog({
    tenantId: user.tenantId, actorId: user.userId, entityType: 'InvoiceCandidate',
    label: 'FINANCIAL_CONFIDENTIAL' as ConfidentialityLabel, purpose: '請求候補一覧の閲覧',
  });

  return (
    <div>
      <PageHeader
        title="請求候補（Invoice Candidates）"
        description="正式請求書ではなく候補です。送信（invoice_send）は承認が必要です。"
        breadcrumb={[{ label: '会計・財務', href: '/finance' }, { label: 'Finance Bridge', href: '/finance/bridge' }, { label: '請求候補', href: '#' }]}
      />
      {sp.requested ? <div className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">請求送信の承認申請を作成しました（/approvals）。</div> : null}
      <Card>
        <Table>
          <thead><tr><Th>件名</Th><Th>税抜</Th><Th>税額</Th><Th>税込</Th><Th>請求予定</Th><Th>状態</Th><Th>由来</Th>{canRequest ? <Th>送信</Th> : null}</tr></thead>
          <tbody>
            {candidates.length === 0 ? (
              <tr><Td colSpan={canRequest ? 8 : 7}><EmptyState title="請求候補がありません" hint="Finance Bridge から作成します。" /></Td></tr>
            ) : candidates.map((c) => (
              <tr key={c.id} className="hover:bg-secondary/50">
                <Td className="text-sm">{c.title}</Td>
                <Td className="text-xs">{formatJpy(toNumber(c.subtotal))}</Td>
                <Td className="text-xs">{formatJpy(toNumber(c.taxAmount))}</Td>
                <Td className="text-xs">{formatJpy(toNumber(c.total))}</Td>
                <Td className="text-xs text-muted-foreground">{c.dueAt ? formatDate(c.dueAt) : '-'}</Td>
                <Td className="text-xs"><Badge tone={STATUS_TONE[c.status] ?? 'slate'}>{c.status}</Badge></Td>
                <Td className="text-xs text-muted-foreground">{c.sourceType}</Td>
                {canRequest ? (
                  <Td>
                    {c.status === 'draft' ? (
                      <form action={requestInvoiceSendApprovalAction}>
                        <input type="hidden" name="candidateId" value={c.id} />
                        <Button type="submit" variant="outline" className="h-7 px-2 text-xs">送信申請</Button>
                      </form>
                    ) : null}
                  </Td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
