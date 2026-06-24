import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { getGoldenPathExecutiveDashboardData } from '@/lib/domains/operations/golden-path-dashboard';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Badge, EmptyState, Button } from '@/components/ui';
import { GoldenPathKpiGrid, AttentionList } from '@/components/golden-path-kpi';
import { formatJpy, formatDate } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function PlanningHokkoPage() {
  const user = await requireUser();
  // 金額（売上/原価/粗利/未回収/資金繰り）は財務閲覧権限が必要。redact は lib 側で行う。
  const canViewFinance = hasPermission(user, 'finance', 'read');

  const [events, gpDashboard] = await Promise.all([
    prisma.eventProject.findMany({
      where: { tenantId: user.tenantId },
      include: { productUsages: true, nextProposals: true },
      orderBy: { eventDate: 'asc' },
    }),
    getGoldenPathExecutiveDashboardData(user.tenantId, canViewFinance),
  ]);
  // 案件別 KPI（進捗・次の一手・低粗利等）を id で引けるよう Map 化。
  const kpiByEvent = new Map(gpDashboard.projects.map((p) => [p.id, p]));

  return (
    <div>
      <PageHeader
        title="プランニングホッコー特化"
        description="イベント・リース案件を、商品を利益に変える経営資産として一気通貫で管理します。"
        action={<Link href="/operations/events/new"><Button>イベント案件を作成</Button></Link>}
      />

      {/* 経営 KPI: 一目で「どの案件が危ないか」「次に何をすべきか」「未回収・粗利・資金繰り」 */}
      <div className="mb-5 space-y-4">
        <GoldenPathKpiGrid overall={gpDashboard.overall} financeVisible={gpDashboard.financeVisible} />
        <Card>
          <CardHeader>
            <CardTitle>🚨 今すぐ見るべき案件（優先度順）</CardTitle>
          </CardHeader>
          <CardContent>
            <AttentionList items={gpDashboard.attention} financeVisible={gpDashboard.financeVisible} />
          </CardContent>
        </Card>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">全イベント案件（{events.length}件）</h2>
        {canViewFinance ? null : <span className="text-xs text-muted-foreground">※金額は財務閲覧権限が必要</span>}
      </div>

      <div className="space-y-3">
        {events.length === 0 ? (
          <Card><CardContent className="pt-6"><EmptyState title="イベント案件がありません" /></CardContent></Card>
        ) : (
          events.map((e) => {
            const kpi = kpiByEvent.get(e.id);
            return (
              <Card key={e.id}>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    <Link href={`/operations/events/${e.id}`} className="text-primary hover:underline">{e.name}</Link>
                    {e.venue ? <Badge tone="blue">{e.venue}</Badge> : null}
                    <Badge tone="slate">{formatDate(e.eventDate)}</Badge>
                    {kpi ? <Badge tone={kpi.progressPercent >= 70 ? 'green' : 'amber'}>進捗 {kpi.progressPercent}%</Badge> : null}
                    {canViewFinance && kpi?.lowMargin ? <Badge tone="amber">低粗利 {kpi.marginPercent}%</Badge> : null}
                    {kpi?.highRiskOpen ? <Badge tone="red">高リスク</Badge> : null}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {canViewFinance ? (
                    <div className="mb-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>売上: {formatJpy(toNumber(e.revenue))}</span>
                      <span>原価: {formatJpy(toNumber(e.cost))}</span>
                      <span>粗利: {formatJpy(toNumber(e.gross))}</span>
                      {e.weatherRisk ? <span className="text-amber-700">天候リスク: {e.weatherRisk}</span> : null}
                    </div>
                  ) : (
                    <div className="mb-2 text-xs text-muted-foreground">
                      金額（売上・原価・粗利）は財務閲覧権限が必要です。{e.weatherRisk ? ` 天候リスク: ${e.weatherRisk}` : ''}
                    </div>
                  )}
                  <div className="text-xs"><span className="text-muted-foreground">使用商品: </span>{e.productUsages.map((u) => `${u.assetName}×${u.quantity}`).join('、') || '未割当'}</div>
                  {kpi?.nextActionLabel ? (
                    <div className="mt-2 text-xs text-blue-800">次の一手: <strong>{kpi.nextActionLabel}</strong></div>
                  ) : kpi ? (
                    <div className="mt-2 text-xs text-emerald-700">✅ Golden Path 完了</div>
                  ) : null}
                  {e.nextProposals.length ? (
                    <div className="mt-2 rounded-md bg-emerald-50 p-2 text-xs text-emerald-800">🤖 次回提案: {e.nextProposals[0]!.proposal}</div>
                  ) : null}
                  <div className="mt-2"><Link href={`/operations/events/${e.id}`} className="text-xs text-primary hover:underline">案件詳細・次の一手 →</Link></div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
