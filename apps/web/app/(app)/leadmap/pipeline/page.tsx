import Link from 'next/link';
import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui';
import { LEAD_STAGE_LABEL } from '@/components/badges';
import type { LeadStage } from '@hokko/shared';

export const dynamic = 'force-dynamic';

const COLUMNS: LeadStage[] = [
  'NEW',
  'ANALYZED',
  'DRAFTED',
  'PENDING_APPROVAL',
  'SENT',
  'REPLIED',
  'APPOINTMENT',
  'WON',
  'LOST',
];

export default async function LeadPipelinePage() {
  const user = await requireUser();
  const leads = await prisma.localBusinessLead.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { priority: 'desc' },
    select: { id: true, name: true, stage: true, priority: true, industry: true, city: true },
  });

  const byStage = new Map<string, typeof leads>();
  for (const s of COLUMNS) byStage.set(s, []);
  for (const l of leads) {
    if (!byStage.has(l.stage)) byStage.set(l.stage, []);
    byStage.get(l.stage)!.push(l);
  }

  return (
    <div>
      <PageHeader title="営業パイプライン" description="リードをステージ別に管理。AIが各ステージの停滞を検知します。" />
      <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-2">
        {COLUMNS.map((stage) => {
          const items = byStage.get(stage) ?? [];
          const meta = LEAD_STAGE_LABEL[stage];
          return (
            <div key={stage} className="w-64 shrink-0">
              <div className="mb-2 flex items-center justify-between rounded-md border bg-card px-2.5 py-1.5">
                <span className="text-sm font-medium">{meta.text}</span>
                <Badge tone={meta.tone}>{items.length}</Badge>
              </div>
              <div className="space-y-2">
                {items.slice(0, 20).map((l) => (
                  <Link key={l.id} href={`/leadmap/leads/${l.id}`} className="block rounded-md border bg-card p-2 text-sm shadow-sm hover:bg-secondary">
                    <div className="truncate font-medium">{l.name}</div>
                    <div className="mt-0.5 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{l.industry}</span>
                      <Badge tone={l.priority >= 75 ? 'red' : l.priority >= 55 ? 'amber' : 'slate'}>{l.priority}</Badge>
                    </div>
                  </Link>
                ))}
                {items.length === 0 ? <div className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">なし</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
