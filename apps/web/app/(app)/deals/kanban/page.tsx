import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui';
import { AccessDenied } from '@/components/access-denied';
import { DEAL_STAGE_LABEL } from '@/components/badges';
import { formatJpy, DEAL_STAGES, type DealStage } from '@hokko/shared';
import { canSeeCustomerLabel } from '@/lib/security/customer-visibility';

export const dynamic = 'force-dynamic';

const COLUMNS = DEAL_STAGES.filter((s) => s !== 'LOST') as DealStage[];

export default async function DealKanbanPage() {
  const user = await requireUser();
  // WIP-4（roadmap65 追補）: /deals と同じページ基礎権限（deal:read）を fetch 前に適用。
  if (!hasPermission(user, 'deal', 'read')) {
    return (
      <AccessDenied
        title="営業パイプライン（カンバン）"
        reason="案件の閲覧には案件の閲覧権限（deal:read）が必要です"
        breadcrumb={[{ label: '案件', href: '/deals' }]}
      />
    );
  }
  const deals = await prisma.deal.findMany({
    where: { tenantId: user.tenantId },
    // 顧客は表示に使う name と可視判定の label のみ取得（PII over-fetch 防止）。
    include: { customer: { select: { name: true, label: true } } },
    orderBy: { amount: 'desc' },
  });
  const canReadCustomer = hasPermission(user, 'customer', 'read');

  const byStage = new Map<string, typeof deals>();
  for (const s of COLUMNS) byStage.set(s, []);
  byStage.set('LOST', []);
  for (const d of deals) byStage.get(d.stage)?.push(d);

  return (
    <div>
      <PageHeader title="営業パイプライン（カンバン）" description="案件をステージ別に管理。停滞案件はAIが検知します。" />
      <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-2">
        {COLUMNS.map((stage) => {
          const items = byStage.get(stage) ?? [];
          const total = items.reduce((s, d) => s + toNumber(d.amount), 0);
          return (
            <div key={stage} className="w-64 shrink-0">
              <div className="mb-2 rounded-md border bg-card px-2.5 py-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{DEAL_STAGE_LABEL[stage]}</span>
                  <Badge>{items.length}</Badge>
                </div>
                <div className="text-[11px] text-muted-foreground">{formatJpy(total)}</div>
              </div>
              <div className="space-y-2">
                {items.map((d) => {
                  const gm = toNumber(d.amount) > 0 ? Math.round(((toNumber(d.amount) - toNumber(d.cost)) / toNumber(d.amount)) * 100) : 0;
                  return (
                    <Link key={d.id} href={`/deals/${d.id}`} className="block rounded-md border bg-card p-2 text-sm shadow-sm hover:bg-secondary">
                      <div className="truncate font-medium">{d.title}</div>
                      <div className="truncate text-xs text-muted-foreground">{canReadCustomer && canSeeCustomerLabel(user.roles, d.customer.label) ? d.customer.name : ''}</div>
                      <div className="mt-1 flex items-center justify-between text-xs">
                        <span className="font-medium">{formatJpy(toNumber(d.amount))}</span>
                        <Badge tone={gm < 15 ? 'red' : gm < 25 ? 'amber' : 'green'}>{gm}%</Badge>
                      </div>
                    </Link>
                  );
                })}
                {items.length === 0 ? <div className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">なし</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
