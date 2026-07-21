import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Table, Th, Td, Badge, Button, EmptyState } from '@/components/ui';
import { AccessDenied } from '@/components/access-denied';
import { DEAL_STAGE_LABEL } from '@/components/badges';
import { formatJpy, formatDate, computeQuoteTotals } from '@hokko/shared';
import { canSeeCustomerLabel } from '@/lib/security/customer-visibility';

export const dynamic = 'force-dynamic';

export default async function DealsPage() {
  const user = await requireUser();
  // WIP-4（roadmap65 追補）: /quotes に quote:read を課しても、/deals が無ゲートだと
  // 案件経由で見積の粗利率・顧客名に到達できる迂回が残るため、deal:read を fetch 前に適用。
  if (!hasPermission(user, 'deal', 'read')) {
    return (
      <AccessDenied
        title="案件管理"
        reason="案件一覧の閲覧には案件の閲覧権限（deal:read）が必要です"
        breadcrumb={[{ label: '案件', href: '/deals' }]}
      />
    );
  }
  const deals = await prisma.deal.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { updatedAt: 'desc' },
    // 顧客は表示に使う name と可視判定の label のみ取得（PII over-fetch 防止）。
    include: { customer: { select: { name: true, label: true } } },
  });
  // 顧客名は CRM の閲覧境界（WIP1）に従う（deal:read はあるが顧客ラベル不可視の閲覧者には出さない）。
  const canReadCustomer = hasPermission(user, 'customer', 'read');

  // M3-3: 失注理由の傾向（学習用）。LOST 案件の lostReason を集計（一般理由＝PII非依存・deal:read 配下）。
  const lostDeals = await prisma.deal.findMany({ where: { tenantId: user.tenantId, stage: 'LOST' }, select: { lostReason: true } });
  const lostReasonCounts = new Map<string, number>();
  for (const d of lostDeals) {
    const r = d.lostReason?.trim() || '（理由未記録）';
    lostReasonCounts.set(r, (lostReasonCounts.get(r) ?? 0) + 1);
  }
  const topLostReasons = [...lostReasonCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  // M3-4: 停滞案件（受注前ステージで次アクション期限切れ）を JS 抽出（既取得の deals を再利用・追加クエリなし）。
  const now = new Date();
  const STALLED_STAGES: readonly string[] = ['CONTACT', 'HEARING', 'PROPOSAL', 'QUOTE', 'NEGOTIATION', 'INTERNAL_REVIEW'];
  const isStalled = (d: (typeof deals)[number]) => STALLED_STAGES.includes(d.stage) && d.nextActionAt !== null && new Date(d.nextActionAt) < now;
  const stalledDeals = deals.filter(isStalled);

  return (
    <div>
      <PageHeader
        title="案件管理"
        description={`${deals.length} 件の案件${stalledDeals.length > 0 ? ` ・ ⏰ 停滞 ${stalledDeals.length} 件` : ''}`}
        action={<Link href="/deals/kanban"><Button>カンバン表示</Button></Link>}
      />

      {stalledDeals.length > 0 ? (
        <Card className="mb-4 border-red-300 bg-red-50/50 dark:bg-red-950/20">
          <CardHeader><CardTitle>⏰ 停滞案件（次アクション期限切れ {stalledDeals.length}件）</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            <p className="text-xs text-muted-foreground">受注前の案件で次アクションの期限が過ぎています。放置は失注につながります。早めに対応しましょう。</p>
            {stalledDeals.slice(0, 8).map((d) => {
              const days = d.nextActionAt ? Math.floor((now.getTime() - new Date(d.nextActionAt).getTime()) / 86_400_000) : 0;
              return (
                <div key={d.id} className="flex items-center justify-between gap-2 text-sm">
                  <Link href={`/deals/${d.id}`} className="truncate hover:underline">{d.title}</Link>
                  <span className="shrink-0 text-xs text-red-600">{DEAL_STAGE_LABEL[d.stage]}・{days}日超過</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        {deals.length === 0 ? (
          <div className="p-6"><EmptyState title="案件がありません" /></div>
        ) : (
          <Table>
            <thead>
              <tr><Th>案件</Th><Th>顧客</Th><Th>ステージ</Th><Th>金額</Th><Th>粗利率</Th><Th>確度</Th><Th>次アクション</Th></tr>
            </thead>
            <tbody>
              {deals.map((d) => {
                const amount = toNumber(d.amount);
                const cost = toNumber(d.cost);
                const gm = computeQuoteTotals(amount, cost, 0, 10).grossMarginRate;
                return (
                  <tr key={d.id} className="hover:bg-secondary/50">
                    <Td><Link href={`/deals/${d.id}`} className="font-medium text-primary hover:underline">{d.title}</Link></Td>
                    <Td className="text-xs">{canReadCustomer && canSeeCustomerLabel(user.roles, d.customer.label) ? d.customer.name : ''}</Td>
                    <Td><Badge tone="blue">{DEAL_STAGE_LABEL[d.stage]}</Badge></Td>
                    <Td className="font-medium">{formatJpy(amount)}</Td>
                    <Td><Badge tone={gm < 15 ? 'red' : gm < 25 ? 'amber' : 'green'}>{gm}%</Badge></Td>
                    <Td>{d.probability}%</Td>
                    <Td className="text-xs text-muted-foreground">
                      {d.nextAction}（{formatDate(d.nextActionAt)}）
                      {isStalled(d) ? <span className="ml-1"><Badge tone="red">要対応</Badge></span> : null}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <Card className="mt-4">
        <CardHeader><CardTitle>失注理由の傾向</CardTitle></CardHeader>
        <CardContent>
          {topLostReasons.length === 0 ? (
            <p className="text-sm text-muted-foreground">失注はまだ記録されていません。案件を「失注」にする際に理由を選ぶと、ここに傾向が出ます。</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {topLostReasons.map(([reason, count]) => (
                <li key={reason} className="flex items-center justify-between">
                  <span>{reason}</span>
                  <Badge tone="slate">{count}件</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
