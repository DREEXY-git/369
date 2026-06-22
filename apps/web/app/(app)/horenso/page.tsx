import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Badge, EmptyState } from '@/components/ui';
import { formatDate } from '@hokko/shared';

export const dynamic = 'force-dynamic';

const TOPIC_LABEL: Record<string, string> = {
  price: '価格判断', discount: '値引き判断', contract: '契約判断', complaint: 'クレーム対応', hiring: '採用判断', legal: '法務確認', finance: '財務確認',
};

export default async function HorensoPage() {
  const user = await requireUser();
  const [reports, consultations] = await Promise.all([
    prisma.dailyReport.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.consultation.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: 'desc' }, take: 10 }),
  ]);

  return (
    <div>
      <PageHeader title="報連相ダッシュボード" description="社員・AI社員の報告・連絡・相談を社長が一覧できます。" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>📋 日次報告（報告）</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {reports.length === 0 ? <EmptyState title="報告なし" /> : reports.map((r) => (
              <div key={r.id} className="rounded-md border p-2 text-sm">
                <div className="mb-1 flex items-center gap-2">
                  <Badge tone={r.isAi ? 'purple' : 'blue'}>{r.isAi ? 'AI社員' : '社員'}</Badge>
                  <span className="text-xs text-muted-foreground">{formatDate(r.date)}</span>
                </div>
                <div><span className="text-xs text-muted-foreground">完了: </span>{r.done}</div>
                <div><span className="text-xs text-muted-foreground">予定: </span>{r.todo}</div>
                {r.blockers ? <div className="text-amber-700"><span className="text-xs">詰まり: </span>{r.blockers}</div> : null}
                {r.forCeo ? <div className="text-primary"><span className="text-xs">社長確認: </span>{r.forCeo}</div> : null}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>🙋 相談（未対応を優先）</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {consultations.length === 0 ? <EmptyState title="相談なし" /> : consultations.map((c) => (
              <div key={c.id} className="rounded-md border p-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge tone="amber">{TOPIC_LABEL[c.topic] ?? c.topic}</Badge>
                  <Badge tone={c.status === 'open' ? 'red' : 'green'}>{c.status === 'open' ? '未対応' : '対応済'}</Badge>
                </div>
                <div className="mt-1">{c.question}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
