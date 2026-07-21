import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Select, Stat, EmptyState } from '@/components/ui';
import { AccessDenied } from '@/components/access-denied';
import { DEAL_STAGE_LABEL } from '@/components/badges';
import { updateDealStageAction } from '../actions';
import { formatJpy, formatDate, computeQuoteTotals, DEAL_STAGES } from '@hokko/shared';
import { canSeeCustomerLabel } from '@/lib/security/customer-visibility';

export const dynamic = 'force-dynamic';

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  // WIP-4（roadmap65 追補）: /quotes 系と同じく、案件詳細（見積の粗利率・顧客名への迂回経路）にも
  // ページ基礎権限（deal:read）を fetch 前に適用する。
  if (!hasPermission(user, 'deal', 'read')) {
    return (
      <AccessDenied
        title="案件詳細"
        reason="案件の閲覧には案件の閲覧権限（deal:read）が必要です"
        breadcrumb={[{ label: '案件', href: '/deals' }]}
      />
    );
  }
  // 見積（合計・粗利率）は quote:read 配下（roadmap65 §2-1）。権限が無い閲覧者には取得もしない。
  const canViewQuote = hasPermission(user, 'quote', 'read');
  const deal = await prisma.deal.findFirst({
    where: { id, tenantId: user.tenantId },
    include: {
      // 顧客は表示に使う name と可視判定の label のみ取得（PII over-fetch 防止）。
      customer: { select: { name: true, label: true } },
      // lineItems（unitCost 含む）は本画面で未表示のため取得しない（over-fetch の解消）。
      ...(canViewQuote ? { quotes: { select: { id: true, number: true, title: true, status: true, total: true, grossMarginRate: true } } } : {}),
      activities: { orderBy: { occurredAt: 'desc' }, take: 5 },
      stageHistory: { orderBy: { createdAt: 'desc' }, take: 8 },
    },
  });
  if (!deal) notFound();
  const quotes = canViewQuote && 'quotes' in deal ? deal.quotes : [];
  // 顧客名は CRM の閲覧境界（WIP1）に従う。
  const customerName =
    hasPermission(user, 'customer', 'read') && canSeeCustomerLabel(user.roles, deal.customer.label)
      ? deal.customer.name
      : '';

  const amount = toNumber(deal.amount);
  const cost = toNumber(deal.cost);
  const totals = computeQuoteTotals(amount, cost, 0, 10);

  return (
    <div>
      <PageHeader
        title={deal.title}
        description={customerName}
        breadcrumb={[{ label: '案件', href: '/deals' }, { label: deal.title, href: `/deals/${deal.id}` }]}
        action={<Link href={`/deals/${deal.id}/edit`}><Button variant="outline">編集</Button></Link>}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="金額" value={formatJpy(amount)} />
        <Stat label="原価" value={formatJpy(cost)} />
        <Stat label="粗利率" value={`${totals.grossMarginRate}%`} tone={totals.grossMarginRate < 15 ? 'red' : 'green'} />
        <Stat label="受注確度" value={`${deal.probability}%`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>見積</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {!canViewQuote ? (
                <p className="text-xs text-muted-foreground">見積の内容は見積の閲覧権限のある人にのみ表示されます。</p>
              ) : quotes.length === 0 ? <EmptyState title="見積なし" /> : quotes.map((q) => (
                <div key={q.id} className="rounded-md border p-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{q.number} {q.title}</span>
                    <Badge tone={q.status === 'approved' ? 'green' : 'amber'}>{q.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">合計 {formatJpy(toNumber(q.total))}・粗利率 {toNumber(q.grossMarginRate)}%</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>営業活動</CardTitle></CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              {deal.activities.map((a) => (
                <div key={a.id} className="flex items-center justify-between"><span>{a.summary}</span><span className="text-xs text-muted-foreground">{formatDate(a.occurredAt)}</span></div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>ステージ変更</CardTitle></CardHeader>
            <CardContent>
              <div className="mb-2"><Badge tone="blue">現在: {DEAL_STAGE_LABEL[deal.stage]}</Badge></div>
              <form action={updateDealStageAction} className="flex gap-2">
                <input type="hidden" name="dealId" value={deal.id} />
                {/* 画面表示時の stage を CAS 条件として送る（別担当が進めた後の古い画面からの上書きを server 側で拒否）。 */}
                <input type="hidden" name="expectedStage" value={deal.stage} />
                <Select name="stage" defaultValue={deal.stage} className="flex-1">
                  {DEAL_STAGES.map((s) => <option key={s} value={s}>{DEAL_STAGE_LABEL[s]}</option>)}
                </Select>
                <Button type="submit">変更</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>次アクション</CardTitle></CardHeader>
            <CardContent className="text-sm">
              {deal.nextAction}<div className="text-xs text-muted-foreground">期限: {formatDate(deal.nextActionAt)}</div>
              <Link href={`/customers/${deal.customerId}`} className="mt-2 block text-xs text-primary hover:underline">顧客を見る →</Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>ステージ履歴</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-xs">
              {deal.stageHistory.map((h) => (
                <div key={h.id} className="flex justify-between"><span>{DEAL_STAGE_LABEL[h.toStage]}</span><span className="text-muted-foreground">{formatDate(h.createdAt)}</span></div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
