import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Table, Th, Td, Badge, Button, Input, Select, EmptyState } from '@/components/ui';
import { AccessDenied } from '@/components/access-denied';
import { formatJpy, formatDateTime, GROWTH_EVENT_TYPES } from '@hokko/shared';
import { createGrowthEventAction } from '../actions';

export const dynamic = 'force-dynamic';

const CAT_LABEL: Record<string, string> = { marketing: 'マーケ', sales: '営業', finance: '財務', dx: 'DX', ai: 'AI', management: '経営', customer: '顧客' };

export default async function GrowthEventsPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const user = await requireUser();
  // WIP-3（roadmap64）: ページ基礎権限を明示（dashboard:read）。
  if (!hasPermission(user, 'dashboard', 'read')) {
    return (
      <AccessDenied
        title="成長イベント台帳"
        reason="成長イベント台帳の閲覧にはダッシュボードの閲覧権限（dashboard:read）が必要です"
        breadcrumb={[{ label: 'Growth OS', href: '/growth' }, { label: '成長台帳', href: '#' }]}
      />
    );
  }
  const sp = await searchParams;
  // WIP-3: 金額列は finance:read 保持者のみ取得・表示。非財務閲覧者には finance カテゴリの行自体を
  // 取得しない（title 経由の請求・入金情報の露出も遮断）。cat=finance の直接指定も無効化する。
  const canViewFinance = hasPermission(user, 'finance', 'read');
  const requestedCat = sp.cat && (canViewFinance || sp.cat !== 'finance') ? sp.cat : undefined;
  const where = {
    tenantId: user.tenantId,
    ...(requestedCat ? { category: requestedCat } : canViewFinance ? {} : { category: { not: 'finance' } }),
  };
  const events = await prisma.growthEvent.findMany({
    where,
    orderBy: { occurredAt: 'desc' },
    take: 200,
    // payload/description は表示に不要のため常に取得しない（over-fetch の解消）。
    select: canViewFinance
      ? { id: true, category: true, type: true, title: true, occurredAt: true, revenueImpact: true, costSaving: true, timeSavingMinutes: true }
      : { id: true, category: true, type: true, title: true, occurredAt: true, timeSavingMinutes: true },
  });
  const canCreate = hasPermission(user, 'marketing', 'create');

  return (
    <div>
      <PageHeader
        title="成長イベント台帳（Growth Event Ledger）"
        description="会社の出来事を経営データとして記録します。DomainEvent（システム）とは別の、経営成長の台帳です。"
        breadcrumb={[{ label: 'Growth OS', href: '/growth' }, { label: '成長台帳', href: '#' }]}
      />

      {canCreate ? (
        <Card className="mb-4">
          <CardHeader><CardTitle>成長イベントを記録</CardTitle></CardHeader>
          <CardContent>
            <form action={createGrowthEventAction} className="grid grid-cols-1 gap-2 md:grid-cols-6">
              <Select name="type" defaultValue="management.decision.recorded" className="md:col-span-2">
                {GROWTH_EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
              <Input name="title" placeholder="タイトル" className="md:col-span-2" required />
              <Input name="description" placeholder="説明（任意）" />
              <Button type="submit">記録</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader><CardTitle>イベント一覧（{events.length}）</CardTitle></CardHeader>
        <CardContent>
          {!canViewFinance ? (
            <p className="mb-2 text-xs text-muted-foreground">
              金額の列は財務閲覧権限のある人にのみ表示されます。財務カテゴリのイベントは財務閲覧権限のある人の一覧にのみ含まれます。
            </p>
          ) : null}
          <Table>
            <thead>
              <tr>
                <Th>日時</Th><Th>カテゴリ</Th><Th>種別</Th><Th>タイトル</Th>
                {canViewFinance ? <Th>売上影響</Th> : null}
                <Th>削減</Th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr><Td colSpan={canViewFinance ? 6 : 5}><EmptyState title="成長イベントがありません" /></Td></tr>
              ) : (
                events.map((e) => (
                  <tr key={e.id} className="hover:bg-secondary/50">
                    <Td className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(e.occurredAt)}</Td>
                    <Td><Badge tone="purple">{CAT_LABEL[e.category] ?? e.category}</Badge></Td>
                    <Td className="text-xs text-muted-foreground">{e.type}</Td>
                    <Td className="text-xs">{e.title}</Td>
                    {canViewFinance && 'revenueImpact' in e ? (
                      <Td className="text-xs text-emerald-600">{e.revenueImpact ? formatJpy(toNumber(e.revenueImpact)) : '-'}</Td>
                    ) : null}
                    <Td className="text-xs text-blue-600">
                      {canViewFinance && 'costSaving' in e && e.costSaving ? formatJpy(toNumber(e.costSaving)) : ''}
                      {e.timeSavingMinutes ? ` ${e.timeSavingMinutes}分` : ''}
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
