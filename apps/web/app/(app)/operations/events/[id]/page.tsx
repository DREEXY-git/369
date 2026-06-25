import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { writeConfidentialViewLog } from '@/lib/audit';
import { getEventGoldenPathStatus } from '@/lib/domains/operations/golden-path';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Table, Th, Td, Badge, Stat, Input, Select, Button, EmptyState } from '@/components/ui';
import { formatJpy, formatDate, eventProfitMargin, isHighSeverityRisk, RISK_TYPE_LABEL, LOGISTICS_TASK_LABEL, isLogisticsTaskType, type ConfidentialityLabel } from '@hokko/shared';
import {
  assignAssetToEventAction,
  recordEventCostAction,
  recordEventRevenueAction,
  calculateEventProfitabilityAction,
  completeEventProjectAction,
  createEventNextProposalAction,
  assignEventStaffAction,
  createEventRiskAction,
  updateEventRiskStatusAction,
  bridgeEventToFinanceAction,
} from '../../actions';
import { createEventLogisticsTasksAction, updateLogisticsTaskStatusAction } from '../../logistics/actions';

export const dynamic = 'force-dynamic';

// Golden Path 各ステップの状態を示す小さな点。
function StepDot({ status }: { status: 'done' | 'current' | 'todo' | 'optional' }) {
  const tone = status === 'done' ? 'bg-emerald-500' : status === 'current' ? 'bg-blue-500 ring-2 ring-blue-200' : status === 'optional' ? 'bg-slate-300' : 'bg-slate-200';
  return <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${tone}`} />;
}

export default async function EventDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const canEdit = hasPermission(user, 'inventory', 'update');
  const canViewFinance = hasPermission(user, 'finance', 'read');
  const canCreateFinance = hasPermission(user, 'finance', 'create');

  const event = await prisma.eventProject.findFirst({
    where: { id, tenantId: user.tenantId },
    include: {
      productUsages: true,
      costs: true,
      grossSnapshots: { orderBy: { createdAt: 'desc' }, take: 1 },
      nextProposals: { orderBy: { createdAt: 'desc' } },
      staffAssignments: { orderBy: { createdAt: 'desc' } },
      risks: { orderBy: { createdAt: 'desc' } },
      logisticsTasks: { orderBy: { scheduledAt: 'asc' } },
    },
  });
  if (!event) notFound();

  const revenue = toNumber(event!.revenue);
  const costLines = event!.costs.reduce((s, c) => s + toNumber(c.amount), 0);
  const cost = Math.max(toNumber(event!.cost), costLines);
  const gross = revenue - cost;
  const margin = eventProfitMargin(revenue, cost);
  const snap = event!.grossSnapshots[0];

  // 原価・粗利の閲覧は機密。財務閲覧権限で見た場合は参照ログを残す。
  if (canViewFinance) {
    await writeConfidentialViewLog({
      tenantId: user.tenantId,
      actorId: user.userId,
      entityType: 'EventProject',
      entityId: event!.id,
      label: 'CONFIDENTIAL' as ConfidentialityLabel,
      purpose: `イベント原価・粗利の閲覧: ${event!.name}`,
    });
  }

  const assets = canEdit
    ? await prisma.productAsset.findMany({ where: { tenantId: user.tenantId }, select: { id: true, name: true, status: true }, orderBy: { name: 'asc' }, take: 200 })
    : [];

  // Golden Path（現在地と次の一手）。会計連携の進捗を横断集約。
  const gp = await getEventGoldenPathStatus(user.tenantId, event!.id);

  return (
    <div>
      <PageHeader
        title={event!.name}
        description={`${event!.venue ?? '会場未定'} ／ ${event!.eventDate ? formatDate(event!.eventDate) : '日程未定'}${gp?.customerName ? ` ／ 顧客: ${gp.customerName}` : ''}`}
        breadcrumb={[{ label: 'Operations', href: '/operations' }, { label: 'イベント案件', href: '/operations/events' }, { label: event!.name, href: '#' }]}
        action={<Badge tone={event!.status === 'completed' ? 'green' : 'blue'}>{event!.status}</Badge>}
      />

      {sp.bridged === '1' ? <div className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Finance へブリッジしました（請求候補・仕訳候補・入金予定を作成）。</div> : null}
      {sp.bridged === 'already' ? <div className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">この案件は既にブリッジ済みです（重複作成は行いませんでした）。</div> : null}

      {/* Golden Path: 現在地と次の一手（プランニングホッコー業務フロー） */}
      {gp ? (
        <Card id="golden-path" className="mb-4 scroll-mt-4 border-blue-100">
          <CardHeader><CardTitle>Golden Path — 現在地と次の一手</CardTitle></CardHeader>
          <CardContent>
            <div className="mb-3 flex items-center gap-3">
              <div className="h-2 flex-1 rounded-full bg-secondary">
                <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${gp.result.percent}%` }} />
              </div>
              <span className="whitespace-nowrap text-sm font-medium">{gp.result.doneCount}/{gp.result.totalCount}（{gp.result.percent}%）</span>
            </div>

            {canViewFinance && gp.result.lowMarginWarning ? (
              <div className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">⚠️ 粗利率 {gp.result.marginPercent}% — 薄利です。原価・売上・人員配置を見直してください。</div>
            ) : null}

            {gp.result.nextActionKey ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-blue-50 px-3 py-2">
                <div className="text-sm text-blue-900">次の一手: <strong>{gp.result.nextActionLabel}</strong></div>
                <div>
                  {gp.result.nextActionKey === 'bridge' ? (
                    canCreateFinance ? (
                      <form action={bridgeEventToFinanceAction}>
                        <input type="hidden" name="eventId" value={event!.id} />
                        <Button type="submit">Finance Bridge へ進む</Button>
                      </form>
                    ) : <span className="text-xs text-muted-foreground">財務担当がブリッジを行います</span>
                  ) : gp.result.nextActionKey === 'formalize' ? (
                    canViewFinance ? <Link href="/finance/invoice-candidates"><Button variant="outline">請求候補で正式化</Button></Link> : <span className="text-xs text-muted-foreground">財務担当が請求処理を進めます</span>
                  ) : (gp.result.nextActionKey === 'send' || gp.result.nextActionKey === 'payment' || gp.result.nextActionKey === 'collected') && gp.invoiceId ? (
                    canViewFinance ? <Link href={`/invoices/${gp.invoiceId}`}><Button variant="outline">請求書を開く</Button></Link> : <span className="text-xs text-muted-foreground">財務担当が請求処理を進めます</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">下のフォームから登録してください</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">✅ Golden Path 完了 — 請求・入金・回収まで到達しました。</div>
            )}

            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 md:grid-cols-3">
              {gp.result.steps.map((s) => (
                <div key={s.key} className="flex items-center gap-1.5 text-xs">
                  <StepDot status={s.status} />
                  <span className={s.status === 'done' ? 'text-muted-foreground' : s.status === 'current' ? 'font-semibold text-blue-700' : 'text-foreground'}>
                    {s.label}{s.optional ? '（任意）' : ''}
                  </span>
                </div>
              ))}
            </div>

            {gp.bridged ? (
              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                {canViewFinance ? <Link href="/finance/invoice-candidates" className="text-primary hover:underline">請求候補を見る →</Link> : null}
                {canViewFinance && gp.invoiceId ? <Link href={`/invoices/${gp.invoiceId}`} className="text-primary hover:underline">請求書を見る →</Link> : null}
                {canViewFinance ? <Link href="/finance/cashflow" className="text-primary hover:underline">資金繰りを見る →</Link> : null}
              </div>
            ) : null}

            {/* この案件 ←→ 経営ダッシュボードの往復導線（Phase 1-12） */}
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t pt-3 text-xs">
              <span className="text-muted-foreground">経営ダッシュボードで全体を見る:</span>
              <Link href="/planning-hokko" className="text-primary hover:underline">プランニングホッコー →</Link>
              <Link href="/dashboard/ceo" className="text-primary hover:underline">社長コックピット →</Link>
              {canViewFinance ? <Link href="/finance/cashflow" className="text-primary hover:underline">資金繰り →</Link> : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* 粗利サマリー（財務権限のみ）。#finance-summary でディープリンク。 */}
      <div id="finance-summary" className="scroll-mt-4" />
      {canViewFinance ? (
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="売上" value={formatJpy(revenue)} tone="emerald" />
          <Stat label="原価" value={formatJpy(cost)} tone="amber" />
          <Stat label="粗利" value={formatJpy(gross)} tone={gross >= 0 ? 'emerald' : 'red'} />
          <Stat label="粗利率" value={`${margin}%`} tone={margin >= 30 ? 'emerald' : margin >= 10 ? 'amber' : 'red'} />
        </div>
      ) : (
        <div className="mb-4 rounded-md bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">原価・粗利は財務閲覧権限が必要です（機密情報）。</div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 使用商品 */}
        <Card>
          <CardHeader><CardTitle>使用商品・備品（{event!.productUsages.length}点）</CardTitle></CardHeader>
          <CardContent>
            {event!.productUsages.length === 0 ? <EmptyState title="まだ割り当てがありません" /> : (
              <Table>
                <thead><tr><Th>商品</Th><Th>数量</Th></tr></thead>
                <tbody>
                  {event!.productUsages.map((u) => (
                    <tr key={u.id}><Td className="text-sm">{u.assetName}</Td><Td className="text-xs">{u.quantity}</Td></tr>
                  ))}
                </tbody>
              </Table>
            )}
            {canEdit ? (
              <form action={assignAssetToEventAction} className="mt-3 flex flex-wrap items-end gap-2">
                <input type="hidden" name="eventId" value={event!.id} />
                <Select name="assetId" required className="flex-1">
                  <option value="">商品を選択</option>
                  {assets.map((a) => <option key={a.id} value={a.id}>{a.name}（{a.status}）</option>)}
                </Select>
                <Input name="quantity" type="number" min="1" defaultValue="1" className="w-20" />
                <Button type="submit" variant="outline">割当</Button>
              </form>
            ) : null}
          </CardContent>
        </Card>

        {/* 原価内訳（財務権限のみ） */}
        <Card id="costs" className="scroll-mt-4">
          <CardHeader><CardTitle>原価内訳</CardTitle></CardHeader>
          <CardContent>
            {!canViewFinance ? (
              <p className="text-sm text-muted-foreground">財務閲覧権限が必要です。</p>
            ) : event!.costs.length === 0 ? <EmptyState title="原価の記録がありません" /> : (
              <Table>
                <thead><tr><Th>区分</Th><Th>金額</Th></tr></thead>
                <tbody>
                  {event!.costs.map((c) => (
                    <tr key={c.id}><Td className="text-sm">{c.category}</Td><Td className="text-xs">{formatJpy(toNumber(c.amount))}</Td></tr>
                  ))}
                </tbody>
              </Table>
            )}
            {canEdit ? (
              <div className="mt-3 space-y-2">
                <form action={recordEventCostAction} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="eventId" value={event!.id} />
                  <Input name="category" placeholder="区分（人件費/機材/配送 等）" className="flex-1" />
                  <Input name="amount" type="number" min="0" placeholder="金額" className="w-28" />
                  <Button type="submit" variant="outline">原価を追加</Button>
                </form>
                <form action={recordEventRevenueAction} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="eventId" value={event!.id} />
                  <Input name="revenue" type="number" min="0" placeholder="売上を更新" className="flex-1" />
                  <Button type="submit" variant="outline">売上を更新</Button>
                </form>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* アクション行 */}
      {canEdit ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <form action={calculateEventProfitabilityAction}><input type="hidden" name="eventId" value={event!.id} /><Button type="submit">粗利を計算・スナップショット</Button></form>
          <form action={createEventNextProposalAction}><input type="hidden" name="eventId" value={event!.id} /><Button type="submit" variant="outline">AI次回提案を生成</Button></form>
          {event!.status !== 'completed' ? (
            <form action={completeEventProjectAction}><input type="hidden" name="eventId" value={event!.id} /><Button type="submit" variant="outline">案件を完了</Button></form>
          ) : null}
        </div>
      ) : null}

      {/* 粗利スナップショット & 次回提案 */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {canViewFinance && snap ? (
          <Card>
            <CardHeader><CardTitle>最新の粗利スナップショット</CardTitle></CardHeader>
            <CardContent className="text-sm">
              <div className="flex flex-wrap gap-4">
                <span>売上 {formatJpy(toNumber(snap.revenue))}</span>
                <span>原価 {formatJpy(toNumber(snap.cost))}</span>
                <span>粗利 {formatJpy(toNumber(snap.gross))}</span>
                <Badge tone={toNumber(snap.marginRate) >= 30 ? 'green' : 'amber'}>{toNumber(snap.marginRate)}%</Badge>
              </div>
            </CardContent>
          </Card>
        ) : null}
        <Card id="proposals" className="scroll-mt-4">
          <CardHeader><CardTitle>次回提案（AI下書き）</CardTitle></CardHeader>
          <CardContent>
            {event!.nextProposals.length === 0 ? <EmptyState title="まだありません" hint="「AI次回提案を生成」で作成します。" /> : (
              <div className="space-y-2">
                {event!.nextProposals.map((p) => (
                  <pre key={p.id} className="whitespace-pre-wrap rounded-md border bg-secondary/30 p-2 text-xs">{p.proposal}</pre>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 人員配置・リスク・物流 */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 人員配置 */}
        <Card id="staff" className="scroll-mt-4">
          <CardHeader><CardTitle>人員配置（{event!.staffAssignments.length}）</CardTitle></CardHeader>
          <CardContent>
            {event!.staffAssignments.length === 0 ? <EmptyState title="未割当" /> : (
              <div className="space-y-1">
                {event!.staffAssignments.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <span>{s.name}<span className="ml-1 text-xs text-muted-foreground">{s.role}</span></span>
                    {canViewFinance ? <Badge tone="slate">{formatJpy(toNumber(s.cost))}</Badge> : null}
                  </div>
                ))}
              </div>
            )}
            {canEdit ? (
              <form action={assignEventStaffAction} className="mt-3 space-y-2">
                <input type="hidden" name="eventId" value={event!.id} />
                <Input name="name" placeholder="氏名" />
                <div className="flex gap-2">
                  <Input name="role" placeholder="役割" className="flex-1" />
                  <Input name="cost" type="number" min="0" placeholder="人件費" className="w-28" />
                </div>
                <Button type="submit" variant="outline">割り当て</Button>
              </form>
            ) : null}
          </CardContent>
        </Card>

        {/* リスク */}
        <Card id="risks" className="scroll-mt-4">
          <CardHeader><CardTitle>リスク（{event!.risks.filter((r) => r.status !== 'resolved').length}）</CardTitle></CardHeader>
          <CardContent>
            {event!.risks.length === 0 ? <EmptyState title="リスクなし" /> : (
              <div className="space-y-1">
                {event!.risks.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">
                      <Badge tone={isHighSeverityRisk(r.severity) ? 'red' : 'amber'}>{r.severity}</Badge>
                      <span className="ml-1">{RISK_TYPE_LABEL[r.type] ?? r.type}</span>
                      {r.status === 'resolved' ? <span className="ml-1 text-xs text-emerald-600">解消</span> : null}
                    </span>
                    {canEdit && r.status !== 'resolved' ? (
                      <form action={updateEventRiskStatusAction}>
                        <input type="hidden" name="riskId" value={r.id} />
                        <input type="hidden" name="status" value="resolved" />
                        <Button type="submit" variant="ghost" className="h-6 px-2 text-xs">解消</Button>
                      </form>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
            {canEdit ? (
              <form action={createEventRiskAction} className="mt-3 space-y-2">
                <input type="hidden" name="eventId" value={event!.id} />
                <div className="flex gap-2">
                  <Select name="type" className="flex-1">{Object.entries(RISK_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
                  <Select name="severity"><option value="low">低</option><option value="medium">中</option><option value="high">高</option><option value="critical">致命</option></Select>
                </div>
                <Input name="description" placeholder="内容" />
                <Button type="submit" variant="outline">リスク登録</Button>
              </form>
            ) : null}
          </CardContent>
        </Card>

        {/* 物流 */}
        <Card id="logistics" className="scroll-mt-4">
          <CardHeader><CardTitle>物流タスク（{event!.logisticsTasks.length}）</CardTitle></CardHeader>
          <CardContent>
            {event!.logisticsTasks.length === 0 ? (
              <EmptyState title="未作成" hint="配送/設営/撤去/回収を一括作成できます。" />
            ) : (
              <div className="space-y-1">
                {event!.logisticsTasks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>{isLogisticsTaskType(t.type) ? LOGISTICS_TASK_LABEL[t.type] : t.type}</span>
                    <div className="flex items-center gap-2">
                      <Badge tone={t.status === 'done' ? 'green' : t.status === 'blocked' ? 'red' : 'blue'}>{t.status}</Badge>
                      {canEdit && (t.status === 'todo' || t.status === 'in_progress') ? (
                        <form action={updateLogisticsTaskStatusAction}>
                          <input type="hidden" name="taskId" value={t.id} />
                          <input type="hidden" name="status" value="done" />
                          <input type="hidden" name="returnToEvent" value="1" />
                          <Button type="submit" variant="ghost" className="h-6 px-2 text-xs">完了</Button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {canEdit && event!.logisticsTasks.length === 0 ? (
              <form action={createEventLogisticsTasksAction} className="mt-3">
                <input type="hidden" name="eventId" value={event!.id} />
                <Button type="submit" variant="outline">配送/設営/撤去/回収を作成</Button>
              </form>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
