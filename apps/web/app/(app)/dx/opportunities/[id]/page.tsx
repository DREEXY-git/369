import { notFound } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeDataAccess } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Stat, Badge, Select, Button, EmptyState } from '@/components/ui';
import { AccessDenied } from '@/components/access-denied';
import { formatJpy, formatDateTime, dxMonetaryImpact, type Difficulty } from '@hokko/shared';
import { updateDXOpportunityStatusAction, recordDXImpactAction } from '../../actions';

export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, string> = { identified: 'slate', planned: 'blue', in_progress: 'amber', done: 'green', dropped: 'red' };

export default async function OpportunityDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ impact?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  // WIP-3（roadmap64 追補）: 推定金額は担当者入力のドメインデータ。データ取得前にページ基礎権限を適用。
  if (!hasPermission(user, 'marketing', 'read')) {
    return (
      <AccessDenied
        title="DX改善機会"
        reason="DX改善機会の閲覧にはマーケティングの閲覧権限（marketing:read）が必要です"
        breadcrumb={[{ label: 'DX OS', href: '/dx' }, { label: '改善機会', href: '/dx/opportunities' }]}
      />
    );
  }
  const o = await prisma.dXOpportunity.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!o) notFound();
  await writeDataAccess({ tenantId: user.tenantId, actorId: user.userId, entityType: 'DXOpportunity', entityId: o.id, label: 'INTERNAL', action: 'read', purpose: 'DX改善機会の閲覧' });

  const growth = await prisma.growthEvent.findMany({ where: { tenantId: user.tenantId, entityType: 'DXOpportunity', entityId: id }, orderBy: { occurredAt: 'desc' }, take: 10 });
  const impact = dxMonetaryImpact({ estimatedTimeSavingMinutes: o.estimatedTimeSavingMinutes, estimatedCostSaving: toNumber(o.estimatedCostSaving), estimatedRevenueImpact: toNumber(o.estimatedRevenueImpact), difficulty: o.difficulty as Difficulty });
  const canManage = hasPermission(user, 'marketing', 'update');

  return (
    <div>
      <PageHeader
        title={o.title}
        description={o.problem}
        breadcrumb={[{ label: 'DX OS', href: '/dx' }, { label: '改善機会', href: '/dx/opportunities' }, { label: o.title, href: '#' }]}
        action={<Badge tone={STATUS_TONE[o.status] ?? 'slate'}>{o.status}</Badge>}
      />
      {sp.impact ? <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">DX効果を成長台帳に記録しました（Growth ダッシュボードに反映）。</div> : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="優先度" value={o.priority} tone={o.priority >= 60 ? 'red' : 'blue'} />
        <Stat label="推定効果(月)" value={formatJpy(impact)} tone="emerald" />
        <Stat label="削減工数(月)" value={`${o.estimatedTimeSavingMinutes}分`} />
        <Stat label="難易度" value={o.difficulty} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>課題と改善案</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><div className="text-xs font-semibold text-muted-foreground">課題</div>{o.problem || '-'}</div>
            <div><div className="text-xs font-semibold text-muted-foreground">改善案</div>{o.solution || '-'}</div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>削減コスト: {formatJpy(toNumber(o.estimatedCostSaving))}/月</span>
              <span>売上インパクト: {formatJpy(toNumber(o.estimatedRevenueImpact))}/月</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>ステータス・効果記録</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {canManage ? (
              <>
                <form action={updateDXOpportunityStatusAction} className="flex gap-2">
                  <input type="hidden" name="id" value={o.id} />
                  <Select name="status" defaultValue={o.status} className="flex-1">
                    <option value="identified">特定</option><option value="planned">計画</option><option value="in_progress">実施中</option><option value="done">完了</option><option value="dropped">見送り</option>
                  </Select>
                  <Button type="submit" variant="outline">更新</Button>
                </form>
                <form action={recordDXImpactAction}>
                  <input type="hidden" name="id" value={o.id} />
                  <Button type="submit" className="w-full">✅ DX効果を記録（成長台帳へ）</Button>
                </form>
                <p className="text-[11px] text-muted-foreground">効果記録で dx.automation.completed イベントを発火し、削減コスト・工数が経営ダッシュボードに反映されます。</p>
              </>
            ) : <div className="text-sm text-muted-foreground">編集権限がありません。</div>}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>関連成長イベント</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {growth.length === 0 ? <EmptyState title="まだ効果が記録されていません" /> : growth.map((g) => (
            <div key={g.id} className="flex items-center justify-between text-sm">
              <span className="truncate">{g.title}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(g.occurredAt)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
