import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { writeConfidentialViewLog } from '@/lib/audit';
import { getFinanceBridgeDashboardData } from '@/lib/domains/finance/queries';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Table, Th, Td, Badge, Stat, EmptyState, Select, Button } from '@/components/ui';
import { formatJpy, formatDateTime, type ConfidentialityLabel } from '@hokko/shared';
import {
  createFinanceBridgeFromEventProjectAction,
  createFinanceBridgeFromPurchaseOrderAction,
  createInvoiceCandidateFromDamageChargeAction,
} from './actions';

export const dynamic = 'force-dynamic';

const TYPE_LABEL: Record<string, string> = {
  event_revenue: 'イベント売上', event_cost: 'イベント原価', purchase_order: '発注', purchase_order_received: '入庫',
  damage_charge: '破損請求', invoice_candidate: '請求候補', payment_expected: '支払予定', payment_received: '入金',
  journal_candidate: '仕訳候補', cashflow_expected: '資金繰り予定',
};

export default async function FinanceBridgePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  // 仕訳候補/原価/粗利/請求候補/支払予定は機密。財務閲覧権限が必須。
  if (!hasPermission(user, 'finance', 'read')) {
    return (
      <div>
        <PageHeader title="Finance Bridge" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">財務閲覧権限が必要です（機密情報）。</div>
      </div>
    );
  }
  const canCreate = hasPermission(user, 'finance', 'create');

  const [data, events, pos, damages] = await Promise.all([
    getFinanceBridgeDashboardData(user.tenantId),
    prisma.eventProject.findMany({ where: { tenantId: user.tenantId }, select: { id: true, name: true }, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.purchaseOrder.findMany({ where: { tenantId: user.tenantId }, select: { id: true, orderNo: true }, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.damageLossRecord.findMany({ where: { tenantId: user.tenantId }, select: { id: true, note: true, cost: true }, orderBy: { createdAt: 'desc' }, take: 100 }),
  ]);

  await writeConfidentialViewLog({
    tenantId: user.tenantId,
    actorId: user.userId,
    entityType: 'FinanceBridge',
    label: 'FINANCIAL_CONFIDENTIAL' as ConfidentialityLabel,
    purpose: 'Finance Bridge ダッシュボード閲覧（仕訳候補/原価/資金繰り）',
  });

  const MSG: Record<string, string> = { event: 'イベント案件をFinanceへブリッジしました。', po: '発注をFinanceへブリッジしました。', damage: '破損請求をFinanceへブリッジしました。' };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Finance Bridge — Operations → Finance"
        description="現場で発生した売上・原価・発注・破損請求を、仕訳候補・請求候補・資金繰り予定へ橋渡しします（候補段階）。"
        breadcrumb={[{ label: '会計・財務', href: '/finance' }, { label: 'Finance Bridge', href: '#' }]}
        action={
          <div className="flex gap-2">
            <Link href="/finance/journal-candidates"><Button variant="outline">仕訳候補</Button></Link>
            <Link href="/finance/invoice-candidates"><Button variant="outline">請求候補</Button></Link>
          </div>
        }
      />
      {sp.bridged && MSG[sp.bridged] ? <div className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{MSG[sp.bridged]}</div> : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="FinanceEvent" value={data.summary.total} tone="purple" />
        <Stat label="今月の入金予定" value={formatJpy(data.monthInflow)} tone="emerald" />
        <Stat label="今月の支払予定" value={formatJpy(data.monthOutflow)} tone="amber" />
        <Stat label="差引（見込）" value={formatJpy(data.summary.netExpected)} tone={data.summary.netExpected >= 0 ? 'emerald' : 'red'} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="仕訳候補" value={data.journalCandidates} sub={`未承認 ${data.pendingJournals}`} />
        <Stat label="請求候補" value={data.invoiceCandidates} sub={`未承認 ${data.pendingInvoices}`} />
        <Stat label="入金見込(全期間)" value={formatJpy(data.summary.inflowExpected)} tone="emerald" />
        <Stat label="支払見込(全期間)" value={formatJpy(data.summary.outflowExpected)} tone="amber" />
      </div>

      {canCreate ? (
        <Card className="mt-4">
          <CardHeader><CardTitle>Operations → Finance ブリッジ</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <form action={createFinanceBridgeFromEventProjectAction} className="space-y-2">
              <label className="block text-xs font-medium">イベント案件 → 売上/原価/請求候補/入金予定</label>
              <Select name="eventId" required><option value="">案件を選択</option>{events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</Select>
              <Button type="submit" variant="outline">ブリッジ</Button>
            </form>
            <form action={createFinanceBridgeFromPurchaseOrderAction} className="space-y-2">
              <label className="block text-xs font-medium">発注 → 買掛/仕訳候補/支払予定</label>
              <Select name="purchaseOrderId" required><option value="">発注を選択</option>{pos.map((p) => <option key={p.id} value={p.id}>{p.orderNo}</option>)}</Select>
              <Button type="submit" variant="outline">ブリッジ</Button>
            </form>
            <form action={createInvoiceCandidateFromDamageChargeAction} className="space-y-2">
              <label className="block text-xs font-medium">破損請求 → 請求候補/仕訳候補/入金予定</label>
              <Select name="damageId" required><option value="">破損記録を選択</option>{damages.map((d) => <option key={d.id} value={d.id}>{(d.note || '破損')} / {formatJpy(toNumber(d.cost))}</option>)}</Select>
              <Button type="submit" variant="outline">ブリッジ</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-4">
        <CardHeader><CardTitle>直近の FinanceEvent</CardTitle></CardHeader>
        <CardContent>
          {data.recent.length === 0 ? (
            <EmptyState title="まだFinanceEventがありません" hint="上のブリッジから作成します。" />
          ) : (
            <Table>
              <thead><tr><Th>日時</Th><Th>種別</Th><Th>方向</Th><Th>金額</Th><Th>予定日</Th><Th>状態</Th><Th>摘要</Th></tr></thead>
              <tbody>
                {data.recent.map((e) => (
                  <tr key={e.id} className="hover:bg-secondary/50">
                    <Td className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(e.createdAt)}</Td>
                    <Td className="text-xs"><Badge tone="slate">{TYPE_LABEL[e.type] ?? e.type}</Badge></Td>
                    <Td className="text-xs"><Badge tone={e.direction === 'inflow' ? 'green' : e.direction === 'outflow' ? 'amber' : 'slate'}>{e.direction === 'inflow' ? '入' : e.direction === 'outflow' ? '出' : '—'}</Badge></Td>
                    <Td className="text-xs">{formatJpy(toNumber(e.amount))}</Td>
                    <Td className="text-xs text-muted-foreground">{e.dueAt ? formatDateTime(e.dueAt) : '-'}</Td>
                    <Td className="text-xs">{e.status}</Td>
                    <Td className="text-xs text-muted-foreground">{e.description}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
