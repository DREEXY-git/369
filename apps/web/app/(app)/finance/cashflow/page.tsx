import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Table, Th, Td, Badge, Stat, EmptyState } from '@/components/ui';
import { formatJpy, formatDate, formatDateTime } from '@hokko/shared';
import { getCashflowBridgeData, getCashflowUnifiedData, getTenantScopedCashflowForecast, getCashflowShortageProjection, SHORTAGE_PROJECTION_LIMIT } from '@/lib/domains/finance/cashflow';

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
  // 資金ショート予兆（実データからのライブ予測）: 現在の現預金 + 今日以降の予定入出金 → running balance。
  const proj = await getCashflowShortageProjection(user.tenantId);
  const projLines = proj.result.lines.slice(0, 14);

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

      {/* 資金ショート予兆（実データからのライブ予測）: 現在の現預金＋今日以降の予定入出金の running balance。既存の静的予測とは別カード。 */}
      <Card className="mb-4 border-2">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            資金ショート予兆（実データ・ライブ予測）
            {proj.currentlyNegative || proj.result.shortageDate ? <Badge tone="red">要対応</Badge> : proj.truncated ? <Badge tone="amber">一部予定は未反映</Badge> : proj.lineCount > 0 ? <Badge tone="green">予測期間内 ショートなし</Badge> : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="現在の現預金" value={formatJpy(proj.opening)} tone={proj.currentlyNegative ? 'red' : 'slate'} />
            <Stat label="予測 最低残高" value={formatJpy(proj.result.minBalance)} tone={proj.result.minBalance < 0 ? 'red' : proj.result.minBalance < 1_500_000 ? 'amber' : 'emerald'} />
            <Stat label="資金ショート予測日" value={proj.currentlyNegative ? '現在マイナス' : proj.result.shortageDate ? formatDate(proj.result.shortageDate) : 'なし'} tone={proj.currentlyNegative || proj.result.shortageDate ? 'red' : 'emerald'} />
            <Stat label="対象の予定" value={`${proj.lineCount}件`} sub={proj.truncated ? '上限500件で打切り' : '今日以降・確定日'} tone={proj.truncated ? 'amber' : 'slate'} />
          </div>
          {/* Codex B-CF-02: opening が既にマイナス＝現時点で資金ショート中。将来予兆と別に最優先で警告。 */}
          {proj.currentlyNegative ? (
            <div className="mb-3 rounded-md border border-red-400 bg-red-50 p-3 text-sm text-red-900">
              🚨 現在の現預金が <span className="font-bold">マイナス（{formatJpy(proj.opening)}）</span> です。すでに資金ショート状態の可能性があります。至急、資金手当て（入金前倒し・借入枠の確認など）をご検討ください。
            </div>
          ) : proj.result.shortageDate ? (
            <div className="mb-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
              ⚠️ このままだと <span className="font-bold">{formatDate(proj.result.shortageDate)}</span> ごろに現預金がマイナスになる見込みです（現在の現預金＋今日以降の予定入出金ベース）。入金の前倒し・支払の繰延・短期借入などの手当てを早めに検討してください。
            </div>
          ) : null}
          {/* Codex B-CF-03: take 上限で後続予定が未反映。「ショートなし」を断定せずカバレッジ不足を明示。 */}
          {proj.truncated ? (
            <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              予定入出金が多く、先頭{SHORTAGE_PROJECTION_LIMIT}件までで試算しています。それ以降の予定は反映していないため、「ショートなし」と断定できません（後続の大きな支払いがある場合は別途ご確認ください）。
            </div>
          ) : null}
          {proj.lineCount === 0 ? (
            <p className="text-sm text-muted-foreground">今日以降の予定入出金（Finance Bridge の入金/支払予定）がまだありません。予定が登録されると、現預金からのライブな資金ショート予測が表示されます。</p>
          ) : (
            <Table>
              <thead><tr><Th>予定日</Th><Th>入金</Th><Th>支払</Th><Th>残高（予測）</Th></tr></thead>
              <tbody>
                {projLines.map((l, i) => {
                  const d = typeof l.date === 'string' ? l.date : formatDate(l.date);
                  return (
                    <tr key={i}>
                      <Td className="whitespace-nowrap">{d}</Td>
                      <Td className="text-emerald-600">{l.inflow > 0 ? formatJpy(l.inflow) : '—'}</Td>
                      <Td className="text-red-600">{l.outflow > 0 ? formatJpy(l.outflow) : '—'}</Td>
                      <Td className={`font-medium ${l.balance < 0 ? 'text-red-600' : ''}`}>{formatJpy(l.balance)} {l.shortage ? <Badge tone="red">ショート</Badge> : null}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
          {proj.lineCount > projLines.length ? <p className="pt-2 text-xs text-muted-foreground">先頭{projLines.length}件を表示（全{proj.lineCount}件の予定を予測に反映）。</p> : null}
          <p className="pt-2 text-[11px] text-muted-foreground">※ 予定入出金ベースの機械計算による見込みです（確定ではありません）。実際の入出金・借入枠は別途ご確認ください。</p>
        </CardContent>
      </Card>

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
