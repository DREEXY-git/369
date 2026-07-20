import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Table, Th, Td, Badge, Stat, EmptyState } from '@/components/ui';
import { formatJpy, formatDate, formatDateTime } from '@hokko/shared';
import { getCashflowBridgeData, getCashflowUnifiedData, getTenantScopedCashflowForecast } from '@/lib/domains/finance/cashflow';

export const dynamic = 'force-dynamic';

export default async function CashflowPage() {
  const user = await requireUser();
  if (!hasPermission(user, 'finance', 'read')) {
    return <div><PageHeader title="資金繰り" /><div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">閲覧権限がありません。</div></div>;
  }
  // 明細は親子二重 tenant scope の read model 経由でのみ取得する（forecastId 単独FKの
  // 越境行を KPI/警告/表に混入させない）。V90 FIN_CASHFLOW_FORECAST_LINE_TENANT_R1。
  const { lines } = await getTenantScopedCashflowForecast(user.tenantId);
  const minBalance = lines.length ? Math.min(...lines.map((l) => toNumber(l.balance))) : 0;
  const shortage = lines.find((l) => toNumber(l.balance) < 0);
  const maxBalance = lines.length ? Math.max(...lines.map((l) => toNumber(l.balance)), 1) : 1;
  // Operations 由来の入金/支払予定（FinanceEvent cashflow_expected）を非破壊で接続。
  const bridge = await getCashflowBridgeData(user.tenantId);
  // 予定 vs 実績（入金/支払）の統合集計。
  const unified = await getCashflowUnifiedData(user.tenantId);

  return (
    <div>
      <PageHeader title="資金繰り予測" description="3か月先までの資金繰り見込みと資金ショート予測（AI CFO）。" />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="最低残高見込み" value={formatJpy(minBalance)} tone={minBalance < 1_500_000 ? 'red' : 'green'} />
        <Stat label="資金ショート" value={shortage ? formatDate(shortage.date) : 'なし'} tone={shortage ? 'red' : 'green'} />
        <Stat label="予測期間" value={`${lines.length} 週`} />
      </div>

      {minBalance < 1_500_000 ? (
        <div className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          🤖 AI CFO: 残高が薄くなる時期があります。入金前倒し交渉・支払サイト調整・短期借入の検討を推奨します。
        </div>
      ) : null}

      <Card>
        <CardContent className="pt-4">
          {lines.length === 0 ? <EmptyState title="予測データがありません" /> : (
            <Table>
              <thead><tr><Th>日付</Th><Th>入金</Th><Th>出金</Th><Th>残高</Th><Th>推移</Th></tr></thead>
              <tbody>
                {lines.map((l) => {
                  const bal = toNumber(l.balance);
                  const width = Math.max(2, Math.round((Math.abs(bal) / maxBalance) * 100));
                  return (
                    <tr key={l.id}>
                      <Td className="whitespace-nowrap">{formatDate(l.date)}</Td>
                      <Td className="text-emerald-600">{formatJpy(toNumber(l.inflow))}</Td>
                      <Td className="text-red-600">{formatJpy(toNumber(l.outflow))}</Td>
                      <Td className={`font-medium ${bal < 0 ? 'text-red-600' : ''}`}>{formatJpy(bal)} {bal < 0 ? <Badge tone="red">ショート</Badge> : null}</Td>
                      <Td className="w-40">
                        <div className="h-2 w-full rounded-full bg-secondary">
                          <div className={`h-2 rounded-full ${bal < 0 ? 'bg-red-500' : bal < 1_500_000 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${width}%` }} />
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Operations 由来の入金/支払予定（Finance Bridge）。既存予測は非破壊で並存。 */}
      <Card className="mt-4">
        <CardHeader><CardTitle>現場由来の入金・支払予定（Finance Bridge）</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-3">
            <Stat label="今月の入金予定" value={formatJpy(bridge.monthInflow)} tone="emerald" />
            <Stat label="今月の支払予定" value={formatJpy(bridge.monthOutflow)} tone="amber" />
            <Stat label="差引予定（全期間）" value={formatJpy(bridge.netExpected)} tone={bridge.netExpected >= 0 ? 'emerald' : 'red'} />
          </div>
          {bridge.events.length === 0 ? (
            <EmptyState title="Finance Bridge 由来の予定はありません" hint="/finance/bridge から案件・発注・破損請求を接続します。" />
          ) : (
            <Table>
              <thead><tr><Th>予定日</Th><Th>区分</Th><Th>金額</Th><Th>由来</Th><Th>状態</Th><Th>摘要</Th></tr></thead>
              <tbody>
                {bridge.events.map((e) => (
                  <tr key={e.id}>
                    <Td className="whitespace-nowrap text-xs">{e.dueAt ? formatDate(e.dueAt) : formatDateTime(e.createdAt)}</Td>
                    <Td className="text-xs"><Badge tone={e.direction === 'inflow' ? 'green' : 'amber'}>{e.direction === 'inflow' ? '入金' : '支払'}</Badge></Td>
                    <Td className="text-xs">{formatJpy(toNumber(e.amount))}</Td>
                    <Td className="text-xs text-muted-foreground">{e.sourceType}</Td>
                    <Td className="text-xs">{e.status}</Td>
                    <Td className="text-xs text-muted-foreground">{e.description}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 予定 vs 実績（入金/支払）。FinanceEvent の status=posted を実績として集計。 */}
      <Card className="mt-4">
        <CardHeader><CardTitle>資金繰り 予定 vs 実績</CardTitle></CardHeader>
        <CardContent>
          {unified.summary.paymentShortfallWarning ? (
            <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">⚠️ 支払予定が入金予定を上回っています。資金繰りに注意してください。</div>
          ) : null}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Stat label="入金予定" value={formatJpy(unified.summary.inflowExpected)} tone="emerald" />
            <Stat label="支払予定" value={formatJpy(unified.summary.outflowExpected)} tone="amber" />
            <Stat label="差引予定" value={formatJpy(unified.summary.netExpected)} tone={unified.summary.netExpected >= 0 ? 'emerald' : 'red'} />
            <Stat label="入金実績" value={formatJpy(unified.summary.inflowActual)} tone="emerald" sub="status=posted" />
            <Stat label="支払実績" value={formatJpy(unified.summary.outflowActual)} tone="amber" />
            <Stat label="差引実績" value={formatJpy(unified.summary.netActual)} tone={unified.summary.netActual >= 0 ? 'emerald' : 'red'} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-2">
            <Stat label="直近30日 入金実績" value={formatJpy(unified.recentInflowActual)} tone="emerald" />
            <Stat label="直近30日 支払実績" value={formatJpy(unified.recentOutflowActual)} tone="amber" />
          </div>
          <div className="mt-3">
            <h3 className="mb-1 text-sm font-semibold">直近の入出金実績</h3>
            {unified.recentActuals.length === 0 ? (
              <EmptyState title="入出金実績はまだありません" hint="請求書送付→入金記録で実績が反映されます。" />
            ) : (
              <Table>
                <thead><tr><Th>日時</Th><Th>区分</Th><Th>金額</Th><Th>摘要</Th></tr></thead>
                <tbody>
                  {unified.recentActuals.map((e) => (
                    <tr key={e.id}>
                      <Td className="whitespace-nowrap text-xs">{formatDateTime(e.occurredAt)}</Td>
                      <Td className="text-xs"><Badge tone={e.direction === 'inflow' ? 'green' : 'amber'}>{e.direction === 'inflow' ? '入金' : '支払'}</Badge></Td>
                      <Td className="text-xs">{formatJpy(toNumber(e.amount))}</Td>
                      <Td className="text-xs text-muted-foreground">{e.description}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
