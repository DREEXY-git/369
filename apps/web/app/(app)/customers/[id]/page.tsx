import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/current-user';
import { prisma, writeDataAccess } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Badge, Stat, EmptyState } from '@/components/ui';
import { LabelBadge, DEAL_STAGE_LABEL } from '@/components/badges';
import { formatJpy, formatDate } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const customer = await prisma.customer.findFirst({
    where: { id, tenantId: user.tenantId },
    include: {
      deals: { orderBy: { createdAt: 'desc' } },
      insights: { orderBy: { createdAt: 'desc' }, take: 1 },
      timelineEvents: { orderBy: { occurredAt: 'desc' }, take: 8 },
      invoices: { orderBy: { createdAt: 'desc' }, take: 5 },
      complaints: true,
    },
  });
  if (!customer) notFound();
  await writeDataAccess({ tenantId: user.tenantId, actorId: user.userId, entityType: 'Customer', entityId: customer.id, label: customer.label as any, purpose: '顧客詳細の閲覧' });

  const insight = customer.insights[0];

  return (
    <div>
      <PageHeader
        title={customer.name}
        description={`${customer.industry ?? ''} ・ ${customer.phone ?? ''}`}
        breadcrumb={[{ label: '顧客', href: '/customers' }, { label: customer.name, href: `/customers/${customer.id}` }]}
        action={<div className="flex gap-2"><Link href={`/customers/${customer.id}/timeline`} className="text-sm text-primary hover:underline">タイムライン</Link><Link href={`/customers/${customer.id}/insights`} className="text-sm text-primary hover:underline">インサイト</Link></div>}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="ランク" value={customer.rank} />
        <Stat label="満足度" value={customer.satisfaction ?? '—'} />
        <Stat label="離反リスク" value={customer.churnRisk ?? 0} tone={(customer.churnRisk ?? 0) >= 40 ? 'red' : 'green'} />
        <Stat label="機密ラベル" value={<LabelBadge label={customer.label as any} />} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>案件</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              {customer.deals.length === 0 ? <EmptyState title="案件なし" /> : customer.deals.map((d) => (
                <Link key={d.id} href={`/deals/${d.id}`} className="flex items-center justify-between rounded-md border p-2 text-sm hover:bg-secondary">
                  <span>{d.title}</span>
                  <span className="flex items-center gap-2"><Badge tone="blue">{DEAL_STAGE_LABEL[d.stage]}</Badge><span className="font-medium">{formatJpy(toNumber(d.amount))}</span></span>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>タイムライン</CardTitle></CardHeader>
            <CardContent>
              <ol className="relative space-y-3 border-l pl-4">
                {customer.timelineEvents.map((e) => (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                    <div className="flex items-center gap-2 text-sm">
                      <Badge tone="slate">{e.type}</Badge>
                      <span className="font-medium">{e.title}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{formatDate(e.occurredAt)}</span>
                    </div>
                    {e.body ? <div className="text-xs text-muted-foreground">{e.body}</div> : null}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {insight ? (
            <Card>
              <CardHeader><CardTitle>顧客インサイト（AI）</CardTitle></CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                <Row label="ニーズ" value={insight.needs} />
                <Row label="懸念" value={insight.concerns} />
                <Row label="価格反応" value={insight.priceReaction} />
                <Row label="次の提案" value={insight.nextProposal} />
                <div className="pt-1"><Badge tone={insight.churnRisk >= 40 ? 'red' : 'green'}>離反リスク {insight.churnRisk}</Badge></div>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader><CardTitle>請求</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              {customer.invoices.length === 0 ? <EmptyState title="請求なし" /> : customer.invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between">
                  <span>{inv.number}</span>
                  <Badge tone={inv.status === 'PAID' ? 'green' : inv.status === 'OVERDUE' ? 'red' : 'slate'}>{inv.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {customer.complaints.length ? (
            <Card>
              <CardHeader><CardTitle>クレーム履歴</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                {customer.complaints.map((c) => (
                  <div key={c.id} className="rounded border p-2 text-xs"><Badge tone="red">{c.severity}</Badge> {c.title}</div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div><span className="text-[11px] text-muted-foreground">{label}: </span>{value}</div>;
}
