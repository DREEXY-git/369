import { notFound } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { assertCanViewConfidential, PolicyDenied } from '@/lib/security/policy';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Badge, EmptyState } from '@/components/ui';
import { AccessDenied } from '@/components/access-denied';

export const dynamic = 'force-dynamic';

export default async function CustomerInsightsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  // WIP1（roadmap61）: read ゲート＋二段階取得＋ABAC。
  if (!hasPermission(user, 'customer', 'read')) {
    return (
      <AccessDenied
        title="顧客インサイト"
        reason="顧客インサイトの閲覧には顧客情報の閲覧権限（customer:read）が必要です"
        breadcrumb={[{ label: '顧客', href: '/customers' }]}
      />
    );
  }
  const envelope = await prisma.customer.findFirst({
    where: { id, tenantId: user.tenantId },
    select: { id: true, label: true, ownerId: true },
  });
  if (!envelope) notFound();
  try {
    await assertCanViewConfidential(user, {
      dataType: 'customer',
      label: envelope.label as any,
      entityType: 'Customer',
      entityId: envelope.id,
      ownerId: envelope.ownerId,
      purpose: '顧客インサイトの閲覧',
    });
  } catch (e) {
    if (e instanceof PolicyDenied) {
      return (
        <AccessDenied
          title="顧客インサイト"
          reason={`この顧客情報の閲覧は許可されていません（理由: ${e.decision.reason}）`}
          breadcrumb={[{ label: '顧客', href: '/customers' }]}
        />
      );
    }
    throw e;
  }
  const customer = await prisma.customer.findFirst({
    where: { id, tenantId: user.tenantId, label: envelope.label },
    include: {
      insights: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
  if (!customer) notFound();

  // WIP1（roadmap61）: 保存済みインサイトの表示のみ。page render から AI を呼ばない
  // （顧客名・履歴の LLM Provider への送出経路を構造的に遮断。生成は将来の人間起点アクション・別承認）。
  const insight = customer.insights[0]
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

  return (
    <div>
      <PageHeader
        title={`${customer.name} の顧客インサイト`}
        description="AIが対話履歴からニーズ・懸念・次の提案を抽出します。"
        breadcrumb={[{ label: '顧客', href: '/customers' }, { label: customer.name, href: `/customers/${customer.id}` }, { label: 'インサイト', href: '#' }]}
      />
      {!insight ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              title="保存済みのインサイトはありません（未計測）"
              hint="このページの表示だけでは AI 生成・外部送信は行いません。インサイトの生成は人間の操作による下書き作成として今後提供予定です。"
            />
          </CardContent>
        </Card>
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
