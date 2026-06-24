import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Table, Th, Td, Badge, EmptyState, Button, Input, Select } from '@/components/ui';
import { formatDateTime } from '@hokko/shared';
import {
  executeApprovedInventoryAdjustmentAction,
  executeApprovedForceReleaseAction,
  executeApprovedDamageChargeAction,
  requestDamageChargeApprovalAction,
} from './actions';

export const dynamic = 'force-dynamic';

const OPS_ACTIONS = ['inventory_adjust', 'inventory_force_release', 'damage_charge_finalize'];
const ACTION_LABEL: Record<string, string> = {
  inventory_adjust: '在庫数量の大幅調整',
  inventory_force_release: '予約済み在庫の強制解除',
  damage_charge_finalize: '破損請求の確定',
};
const MSG: Record<string, string> = {
  adjust: '在庫数量調整を実行しました。',
  release: '予約済み在庫を解除しました。',
  damage: '破損請求を確定しました。',
};

export default async function OperationsActionsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  if (!hasPermission(user, 'inventory', 'update')) {
    return (
      <div>
        <PageHeader title="Operations 承認済み実行" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">実行権限がありません。</div>
      </div>
    );
  }

  const [approvals, assets] = await Promise.all([
    prisma.approvalRequest.findMany({
      where: { tenantId: user.tenantId, requestedForAction: { in: OPS_ACTIONS } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.productAsset.findMany({ where: { tenantId: user.tenantId }, select: { id: true, name: true }, orderBy: { name: 'asc' }, take: 200 }),
  ]);

  const approvedUnexecuted = approvals.filter((a) => a.status === 'APPROVED' && !a.executedAt);
  const pending = approvals.filter((a) => a.status === 'PENDING');
  const executed = approvals.filter((a) => a.executedAt);

  function executeForm(a: (typeof approvals)[number]) {
    const action =
      a.requestedForAction === 'inventory_adjust'
        ? executeApprovedInventoryAdjustmentAction
        : a.requestedForAction === 'inventory_force_release'
          ? executeApprovedForceReleaseAction
          : executeApprovedDamageChargeAction;
    return (
      <form action={action}>
        <input type="hidden" name="approvalId" value={a.id} />
        <Button type="submit">実行</Button>
      </form>
    );
  }

  return (
    <div>
      <PageHeader
        title="Operations 承認済み実行"
        description="承認済みの危険操作（在庫調整・強制解除・破損請求）を、二重実行防止つきで実行します。"
        breadcrumb={[{ label: '管理', href: '/admin' }, { label: 'Operations実行', href: '#' }]}
      />
      {sp.executed && MSG[sp.executed] ? <div className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{MSG[sp.executed]}</div> : null}
      {sp.requested ? <div className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">破損請求の確定を承認申請しました（/approvals）。</div> : null}
      {sp.error ? <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">実行できませんでした（{sp.error}）。</div> : null}

      <Card className="mb-4">
        <CardHeader><CardTitle>承認済み・未実行（{approvedUnexecuted.length}）</CardTitle></CardHeader>
        <CardContent>
          {approvedUnexecuted.length === 0 ? (
            <EmptyState title="実行待ちの承認はありません" hint="承認は /approvals で行います。" />
          ) : (
            <Table>
              <thead><tr><Th>操作</Th><Th>対象</Th><Th>申請</Th><Th>実行</Th></tr></thead>
              <tbody>
                {approvedUnexecuted.map((a) => (
                  <tr key={a.id} className="hover:bg-secondary/50">
                    <Td className="text-xs"><Badge tone="amber">{ACTION_LABEL[a.requestedForAction ?? ''] ?? a.requestedForAction}</Badge></Td>
                    <Td className="text-sm">{a.title}</Td>
                    <Td className="text-xs text-muted-foreground">{formatDateTime(a.createdAt)}</Td>
                    <Td>{executeForm(a)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>破損請求の確定を申請</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-2 text-xs text-muted-foreground">破損請求の確定は常時承認が必要です。申請後、上の一覧から実行します。</p>
            <form action={requestDamageChargeApprovalAction} className="space-y-2">
              <Select name="assetId" required><option value="">商品を選択</option>{assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
              <Input name="cost" type="number" min="0" placeholder="請求金額（円）" required />
              <Input name="note" placeholder="理由・メモ" />
              <Button type="submit" variant="outline">承認申請</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>履歴</CardTitle></CardHeader>
          <CardContent>
            <div className="mb-2 text-xs font-semibold text-muted-foreground">承認待ち（{pending.length}）</div>
            {pending.map((a) => <div key={a.id} className="text-xs text-muted-foreground">⏳ {a.title}</div>)}
            <div className="mb-2 mt-3 text-xs font-semibold text-muted-foreground">実行済み（{executed.length}）</div>
            {executed.slice(0, 10).map((a) => (
              <div key={a.id} className="flex items-center justify-between text-xs text-muted-foreground">
                <span>✅ {a.title}</span>
                <span>{a.executedAt ? formatDateTime(a.executedAt) : ''}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
