import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, Badge, Button, Stat, EmptyState } from '@/components/ui';
import { AccessDenied } from '@/components/access-denied';
import { LEAD_STAGE_LABEL } from '@/components/badges';
import { formatDate, type LeadStage } from '@hokko/shared';
import { generateOutreachAction, convertLeadToCustomerAction } from '../actions';

export const dynamic = 'force-dynamic';

// 追客（フォローアップ）ボード（M3 薄い縦切り）: LeadMap の売上の流れ
// 「送信 → 追客 → 商談化」の“追客”を1画面に。送信済みで未反応（SENT/OPENED/CLICKED）のリードを
// 最終接触からの経過日数で並べ、脈ありを商談化・停滞は追客メール再作成へ導く。
// schema 変更なし（既存 stage/lastContactAt/dealId と既存 action を再利用）。権限・監査は再利用先で担保。
const FOLLOWUP_STAGES: LeadStage[] = ['SENT', 'OPENED', 'CLICKED'];
const OVERDUE_DAYS = 5; // これ以上、最終接触から経過したら「要追客」。

function daysSince(from: Date | null, now: Date): number | null {
  if (!from) return null;
  return Math.floor((now.getTime() - new Date(from).getTime()) / 86_400_000);
}

export default async function LeadFollowupPage() {
  const user = await requireUser();
  // ページ基礎権限（leadmap:read）を fetch 前に適用（brain/catalog・WIP-4 と同型の多層防御）。
  if (!hasPermission(user, 'leadmap', 'read')) {
    return (
      <AccessDenied
        title="追客ボード"
        reason="リードの閲覧にはリードマップの閲覧権限（leadmap:read）が必要です"
        breadcrumb={[{ label: 'リードマップAI', href: '/leadmap/leads' }]}
      />
    );
  }

  const now = new Date();
  const leads = await prisma.localBusinessLead.findMany({
    where: { tenantId: user.tenantId, stage: { in: FOLLOWUP_STAGES } },
    orderBy: [{ lastContactAt: 'asc' }, { priority: 'desc' }],
    select: {
      id: true,
      name: true,
      industry: true,
      city: true,
      stage: true,
      priority: true,
      lastContactAt: true,
      // 最新の下書き状態のみ（本文は取得しない・to-many は tenantId で明示スコープ）。
      outreachDrafts: { where: { tenantId: user.tenantId }, select: { status: true }, orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  const rows = leads.map((l) => ({ ...l, days: daysSince(l.lastContactAt, now) }));
  const overdue = rows.filter((r) => r.days === null || r.days >= OVERDUE_DAYS);
  const contactedToday = rows.filter((r) => r.days === 0).length;

  // 変更系ボタンは権限保持者にのみ表示（action 側でも fail-closed 済み）。
  const canDraft = hasPermission(user, 'leadmap', 'create');
  const canConvert = hasPermission(user, 'customer', 'create') && hasPermission(user, 'deal', 'create');

  return (
    <div>
      <PageHeader
        title="追客ボード"
        description="送信済みで未反応のリードを、最終接触からの経過日数で管理。脈ありは商談化、停滞は追客メールを再作成します。"
        breadcrumb={[{ label: 'リードマップAI', href: '/leadmap/leads' }, { label: '追客ボード', href: '/leadmap/followup' }]}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="追客対象" value={`${rows.length}件`} />
        <Stat label={`要追客（${OVERDUE_DAYS}日以上）`} value={`${overdue.length}件`} tone={overdue.length > 0 ? 'red' : 'green'} />
        <Stat label="本日接触" value={`${contactedToday}件`} />
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              title="追客対象のリードはありません"
              hint="営業メールを送信すると、ここに追客対象として表示されます。まずはリード一覧から送信を進めましょう。"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const meta = LEAD_STAGE_LABEL[r.stage];
            const draftStatus = r.outreachDrafts[0]?.status;
            const overdueRow = r.days === null || r.days >= OVERDUE_DAYS;
            return (
              <Card key={r.id}>
                <CardContent className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/leadmap/leads/${r.id}`} className="truncate font-medium hover:underline">{r.name}</Link>
                      <Badge tone={meta.tone}>{meta.text}</Badge>
                      {draftStatus === 'PENDING_APPROVAL' ? <Badge tone="amber">承認待ち</Badge> : null}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span>{r.industry}{r.city ? `・${r.city}` : ''}</span>
                      <span>優先度 {r.priority}</span>
                      <span>
                        最終接触:{' '}
                        {r.days === null ? '記録なし' : r.days === 0 ? '本日' : `${r.days}日前`}
                        {r.lastContactAt ? `（${formatDate(r.lastContactAt)}）` : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {overdueRow ? <Badge tone="red">要追客</Badge> : <Badge tone="slate">追客中</Badge>}
                    {canDraft ? (
                      <form action={generateOutreachAction}>
                        <input type="hidden" name="leadId" value={r.id} />
                        <Button type="submit" variant="outline" className="h-7 px-2 text-xs">追客メール作成</Button>
                      </form>
                    ) : null}
                    {canConvert ? (
                      <form action={convertLeadToCustomerAction}>
                        <input type="hidden" name="leadId" value={r.id} />
                        <Button type="submit" className="h-7 px-2 text-xs">商談化</Button>
                      </form>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
