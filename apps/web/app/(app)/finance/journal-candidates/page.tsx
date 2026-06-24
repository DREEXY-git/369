import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { writeConfidentialViewLog } from '@/lib/audit';
import { toNumber } from '@/lib/utils';
import { getJournalCandidateListData } from '@/lib/domains/finance/queries';
import { PageHeader } from '@/components/page-header';
import { Card, Table, Th, Td, Badge, EmptyState, Button } from '@/components/ui';
import { formatJpy, type ConfidentialityLabel } from '@hokko/shared';
import { requestJournalFinalizeApprovalAction, executeApprovedJournalFinalizeAction } from '../bridge/actions';

export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, 'slate' | 'amber' | 'blue' | 'green' | 'red'> = {
  draft: 'slate', pending_approval: 'amber', approved: 'blue', posted: 'green', rejected: 'red',
};

export default async function JournalCandidatesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  if (!hasPermission(user, 'finance', 'read')) {
    return (
      <div>
        <PageHeader title="仕訳候補" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">財務閲覧権限が必要です（機密情報）。</div>
      </div>
    );
  }
  const canRequest = hasPermission(user, 'finance', 'create');
  const { candidates, approvalById } = await getJournalCandidateListData(user.tenantId);
  await writeConfidentialViewLog({
    tenantId: user.tenantId, actorId: user.userId, entityType: 'JournalCandidate',
    label: 'FINANCIAL_CONFIDENTIAL' as ConfidentialityLabel, purpose: '仕訳候補一覧の閲覧',
  });

  return (
    <div>
      <PageHeader
        title="仕訳候補（Journal Candidates）"
        description="正式仕訳ではなく候補です。確定（journal_finalize）は承認が必要です。"
        breadcrumb={[{ label: '会計・財務', href: '/finance' }, { label: 'Finance Bridge', href: '/finance/bridge' }, { label: '仕訳候補', href: '#' }]}
      />
      {sp.requested ? <div className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">仕訳確定の承認申請を作成しました（/approvals）。</div> : null}
      {sp.posted ? <div className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">仕訳候補を正式仕訳（JournalEntry）に変換しました。</div> : null}
      {sp.error ? <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">正式化できませんでした（{sp.error}）。</div> : null}
      <Card>
        <Table>
          <thead><tr><Th>摘要</Th><Th>借方</Th><Th>貸方</Th><Th>金額</Th><Th>税額</Th><Th>確度</Th><Th>状態</Th><Th>由来</Th>{canRequest ? <Th>確定</Th> : null}</tr></thead>
          <tbody>
            {candidates.length === 0 ? (
              <tr><Td colSpan={canRequest ? 9 : 8}><EmptyState title="仕訳候補がありません" hint="Finance Bridge から作成します。" /></Td></tr>
            ) : candidates.map((c) => {
              const appr = c.approvalId ? approvalById[c.approvalId] : undefined;
              const canFinalize = appr?.status === 'APPROVED' && !appr.executedAt;
              return (
                <tr key={c.id} className="hover:bg-secondary/50">
                  <Td className="text-sm">{c.description}</Td>
                  <Td className="text-xs">{c.debitAccount}</Td>
                  <Td className="text-xs">{c.creditAccount}</Td>
                  <Td className="text-xs">{formatJpy(toNumber(c.amount))}</Td>
                  <Td className="text-xs">{formatJpy(toNumber(c.taxAmount))}</Td>
                  <Td className="text-xs">{Math.round(c.confidence * 100)}%</Td>
                  <Td className="text-xs"><Badge tone={STATUS_TONE[c.status] ?? 'slate'}>{c.status}</Badge></Td>
                  <Td className="text-xs text-muted-foreground">{c.sourceType}</Td>
                  {canRequest ? (
                    <Td>
                      {c.status === 'draft' ? (
                        <form action={requestJournalFinalizeApprovalAction}>
                          <input type="hidden" name="candidateId" value={c.id} />
                          <Button type="submit" variant="outline" className="h-7 px-2 text-xs">確定申請</Button>
                        </form>
                      ) : c.status === 'posted' ? (
                        <span className="text-xs text-emerald-600">仕訳 {c.journalEntryId?.slice(0, 8)}</span>
                      ) : canFinalize ? (
                        <form action={executeApprovedJournalFinalizeAction}>
                          <input type="hidden" name="approvalId" value={c.approvalId ?? ''} />
                          <Button type="submit" className="h-7 px-2 text-xs">正式仕訳化</Button>
                        </form>
                      ) : (
                        <span className="text-xs text-muted-foreground">承認待ち</span>
                      )}
                    </Td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
