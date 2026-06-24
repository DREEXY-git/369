import Link from 'next/link';
import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Stat, Badge, Button, EmptyState } from '@/components/ui';
import { BarList } from '@/components/charts';
import { formatJpy, dxMonetaryImpact, type Difficulty } from '@hokko/shared';

export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, string> = { identified: 'slate', planned: 'blue', in_progress: 'amber', done: 'green', dropped: 'red' };

export default async function DXHomePage() {
  const user = await requireUser();
  const t = user.tenantId;
  const [assessments, opportunities, doneCount] = await Promise.all([
    prisma.dXAssessment.count({ where: { tenantId: t } }),
    prisma.dXOpportunity.findMany({ where: { tenantId: t }, orderBy: { priority: 'desc' }, take: 8 }),
    prisma.dXOpportunity.count({ where: { tenantId: t, status: 'done' } }),
  ]);
  const all = await prisma.dXOpportunity.findMany({ where: { tenantId: t } });
  const totalImpact = all.reduce((s, o) => s + dxMonetaryImpact({ estimatedTimeSavingMinutes: o.estimatedTimeSavingMinutes, estimatedCostSaving: toNumber(o.estimatedCostSaving), estimatedRevenueImpact: toNumber(o.estimatedRevenueImpact), difficulty: o.difficulty as Difficulty }), 0);
  const totalTime = all.reduce((s, o) => s + o.estimatedTimeSavingMinutes, 0);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="DX OS"
        description="業務の非効率・属人化・紙/Excel依存を診断し、AI化・自動化の改善機会を金額換算で可視化します。"
        action={<Link href="/dx/assessments/new"><Button>DX診断を作成</Button></Link>}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="DX診断" value={assessments} tone="blue" />
        <Stat label="改善機会" value={all.length} tone="purple" />
        <Stat label="推定効果(月)" value={formatJpy(totalImpact)} tone="emerald" sub={`工数 ${totalTime}分/月`} />
        <Stat label="完了" value={doneCount} tone="green" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>優先度の高い改善機会</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {opportunities.length === 0 ? (
              <EmptyState title="改善機会がありません" hint="DX診断から改善機会を登録しましょう。" />
            ) : (
              opportunities.map((o) => (
                <Link key={o.id} href={`/dx/opportunities/${o.id}`} className="flex items-center justify-between rounded-md border p-3 hover:bg-secondary">
                  <span className="flex min-w-0 items-center gap-2">
                    <Badge tone={o.priority >= 60 ? 'red' : o.priority >= 35 ? 'amber' : 'slate'}>優先{o.priority}</Badge>
                    <span className="truncate font-medium">{o.title}</span>
                  </span>
                  <Badge tone={STATUS_TONE[o.status] ?? 'slate'}>{o.status}</Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>改善機会の推定効果(月・上位)</CardTitle></CardHeader>
          <CardContent>
            <BarList
              data={opportunities.slice(0, 6).map((o) => ({ label: o.title, value: dxMonetaryImpact({ estimatedTimeSavingMinutes: o.estimatedTimeSavingMinutes, estimatedCostSaving: toNumber(o.estimatedCostSaving), estimatedRevenueImpact: toNumber(o.estimatedRevenueImpact), difficulty: o.difficulty as Difficulty }) }))}
              valueFormat={(v) => formatJpy(v)}
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 flex gap-2 text-sm">
        <Link href="/dx/assessments" className="rounded-md border px-3 py-2 hover:bg-secondary">DX診断一覧</Link>
        <Link href="/dx/opportunities" className="rounded-md border px-3 py-2 hover:bg-secondary">改善機会一覧</Link>
        <Link href="/growth" className="rounded-md border px-3 py-2 hover:bg-secondary">Growth ダッシュボード</Link>
      </div>
    </div>
  );
}
