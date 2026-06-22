import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Badge, EmptyState } from '@/components/ui';
import { extractCustomerInsights } from '@hokko/ai';

export const dynamic = 'force-dynamic';

export default async function CustomerInsightsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const customer = await prisma.customer.findFirst({
    where: { id, tenantId: user.tenantId },
    include: {
      insights: { orderBy: { createdAt: 'desc' }, take: 1 },
      timelineEvents: { orderBy: { occurredAt: 'desc' }, take: 10 },
    },
  });
  if (!customer) notFound();

  let insight = customer.insights[0]
    ? {
        needs: customer.insights[0].needs,
        concerns: customer.insights[0].concerns,
        priceReaction: customer.insights[0].priceReaction,
        nextProposal: customer.insights[0].nextProposal,
        ngWords: customer.insights[0].ngWords,
        churnRisk: customer.insights[0].churnRisk,
        confidence: customer.insights[0].confidence,
      }
    : null;

  if (!insight) {
    const history = customer.timelineEvents.map((e) => `${e.title} ${e.body}`).join(' ');
    insight = await extractCustomerInsights({ customerName: customer.name, history });
  }

  return (
    <div>
      <PageHeader
        title={`${customer.name} の顧客インサイト`}
        description="AIが対話履歴からニーズ・懸念・次の提案を抽出します。"
        breadcrumb={[{ label: '顧客', href: '/customers' }, { label: customer.name, href: `/customers/${customer.id}` }, { label: 'インサイト', href: '#' }]}
      />
      {!insight ? (
        <Card><CardContent className="pt-6"><EmptyState title="インサイトを生成できませんでした" /></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <InsightCard title="🎯 顧客が重視していること" body={insight.needs} />
          <InsightCard title="⚠️ 導入時の懸念" body={insight.concerns} />
          <InsightCard title="💰 価格への反応" body={insight.priceReaction} />
          <InsightCard title="🚀 次に刺さる提案" body={insight.nextProposal} />
          <Card className="md:col-span-2">
            <CardContent className="flex flex-wrap items-center gap-3 pt-4 text-sm">
              <Badge tone={insight.churnRisk >= 40 ? 'red' : 'green'}>離反リスク {insight.churnRisk}</Badge>
              <Badge tone="blue">信頼度 {Math.round(insight.confidence * 100)}%</Badge>
              {insight.ngWords.length ? <span>NGワード: {insight.ngWords.join('・')}</span> : null}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function InsightCard({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="text-sm">{body}</CardContent>
    </Card>
  );
}
