import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Badge, EmptyState } from '@/components/ui';
import { generateSubsidyApplicationDraft } from '@hokko/ai';
import { formatJpy, formatDate } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function SubsidyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const program = await prisma.subsidyProgram.findFirst({
    where: { id, tenantId: user.tenantId },
    include: { tasks: true, eligibilityChecks: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });
  if (!program) notFound();
  const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });

  const draft = generateSubsidyApplicationDraft({
    programName: program.name,
    company: tenant?.name ?? '当社',
    purpose: 'デジタル化による生産性向上と新規顧客開拓',
  });

  return (
    <div>
      <PageHeader
        title={program.name}
        description={`${program.authority} ・ 上限 ${formatJpy(toNumber(program.maxAmount))}`}
        breadcrumb={[{ label: '補助金', href: '/subsidies' }, { label: program.name, href: '#' }]}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>🤖 申請書ドラフト（AI・要・士業確認）</CardTitle></CardHeader>
            <CardContent><pre className="whitespace-pre-wrap font-sans text-sm">{draft}</pre></CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>申請可能性</CardTitle></CardHeader>
            <CardContent className="text-sm">
              {program.eligibilityChecks[0] ? (
                <>
                  <Badge tone={program.eligibilityChecks[0].score >= 70 ? 'green' : 'amber'}>スコア {program.eligibilityChecks[0].score}</Badge>
                  <p className="mt-1 text-xs text-muted-foreground">{program.eligibilityChecks[0].detail}</p>
                </>
              ) : <EmptyState title="未判定" />}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>必要書類</CardTitle></CardHeader>
            <CardContent className="text-sm"><ul className="list-inside list-disc">{program.documents.map((d, i) => <li key={i}>{d}</li>)}</ul></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>申請タスク</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              {program.tasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between"><span>{t.title}</span><Badge tone="slate">{formatDate(t.dueDate)}</Badge></div>
              ))}
            </CardContent>
          </Card>
          <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">締切: {formatDate(program.deadline)}。提出前に行政書士・中小企業診断士の確認を推奨します。</div>
        </div>
      </div>
    </div>
  );
}
