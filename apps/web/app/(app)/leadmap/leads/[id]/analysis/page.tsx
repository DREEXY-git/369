import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/current-user';
import { prisma, writeDataAccess } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, EmptyState } from '@/components/ui';
import { analyzeLeadAction, generateOutreachAction } from '../../../actions';
import { fakeReviewAnalysis } from '@hokko/ai';

export const dynamic = 'force-dynamic';

export default async function LeadAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const lead = await prisma.localBusinessLead.findFirst({
    where: { id, tenantId: user.tenantId },
    include: {
      campaign: true,
      reviews: true,
      insights: { orderBy: { createdAt: 'desc' }, take: 1 },
      websiteScans: { include: { findings: true }, orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
  if (!lead) notFound();

  await writeDataAccess({
    tenantId: user.tenantId,
    actorId: user.userId,
    entityType: 'LocalBusinessLead',
    entityId: lead.id,
    purpose: 'AI分析の閲覧',
  });

  const insight = lead.insights[0];
  const scan = lead.websiteScans[0];
  const reviewAnalysis = lead.reviews.length
    ? fakeReviewAnalysis(lead.reviews.map((r) => ({ rating: r.rating, text: r.text })))
    : null;

  return (
    <div>
      <PageHeader
        title={`AI分析: ${lead.name}`}
        description="口コミ・Web・SNS・業種・地域から、強み・改善余地・営業切り口をAIが分析します。"
        breadcrumb={[
          { label: 'リード', href: '/leadmap/leads' },
          { label: lead.name, href: `/leadmap/leads/${lead.id}` },
          { label: 'AI分析', href: `/leadmap/leads/${lead.id}/analysis` },
        ]}
        action={
          <form action={generateOutreachAction}>
            <input type="hidden" name="leadId" value={lead.id} />
            <input type="hidden" name="salesType" value={lead.campaign.forSalesType} />
            <Button>この分析から営業メールを生成 →</Button>
          </form>
        }
      />

      {!insight ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <EmptyState title="まだ分析されていません" hint="下のボタンでAI分析を実行できます。" />
            <form action={analyzeLeadAction} className="mt-3 inline-block">
              <input type="hidden" name="leadId" value={lead.id} />
              <input type="hidden" name="salesType" value={lead.campaign.forSalesType} />
              <Button type="submit">🔍 AI分析を実行</Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>💡 営業切り口（{lead.campaign.forSalesType}）</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-primary">{insight.angle}</p>
              <p className="mt-2 text-xs text-muted-foreground">{insight.reasoning}</p>
              <div className="mt-2"><Badge tone="blue">信頼度 {Math.round(insight.confidence * 100)}%</Badge> <Badge tone="purple">{insight.generatedBy}</Badge></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>✅ 評価されている点</CardTitle></CardHeader>
            <CardContent>
              <ul className="list-inside list-disc space-y-1 text-sm">
                {insight.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>🚀 改善余地・営業チャンス</CardTitle></CardHeader>
            <CardContent>
              <ul className="list-inside list-disc space-y-1 text-sm">
                {insight.opportunities.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </CardContent>
          </Card>

          {reviewAnalysis ? (
            <Card>
              <CardHeader><CardTitle>⭐ 口コミ分析</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><span className="text-muted-foreground">評価されている点: </span>{reviewAnalysis.praised.join('・') || '—'}</div>
                <div><span className="text-muted-foreground">繰り返し出る課題: </span>{reviewAnalysis.recurring.join('・') || '—'}</div>
                <div className="rounded-md bg-emerald-50 p-2 text-emerald-800">{reviewAnalysis.positiveReframe}</div>
              </CardContent>
            </Card>
          ) : null}

          {scan ? (
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>🌐 Webサイト解析</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
                  {scan.findings.map((f) => (
                    <div key={f.id} className="flex items-center gap-2 text-sm">
                      <Badge tone={f.positive ? 'green' : 'amber'}>{f.positive ? '良' : '改善余地'}</Badge>
                      <span>{f.detail}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        ※ 分析は相手を批判するためではなく、前向きな改善提案に変換する目的で行います。
        <Link href={`/leadmap/leads/${lead.id}`} className="ml-2 text-primary hover:underline">リード詳細へ戻る</Link>
      </p>
    </div>
  );
}
