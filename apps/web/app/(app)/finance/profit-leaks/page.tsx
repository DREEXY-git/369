import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, Stat, EmptyState, Badge } from '@/components/ui';
import { SeverityBadge } from '@/components/badges';
import { canSeeCustomerLabel } from '@/lib/security/customer-visibility';
import { detectProfitLeaks, formatJpy } from '@hokko/shared';

export const dynamic = 'force-dynamic';

const TYPE_LABEL: Record<string, string> = {
  low_margin: '低粗利/赤字', discount: '過大値引き', unbilled: '請求漏れ', overdue: '回収遅延', idle_asset: '眠り在庫',
};

interface LeakView {
  key: string;
  type: string;
  title: string;
  impactJpy: number;
  severity: string;
  detail: string;
  recommendation: string;
  live: boolean; // 実データからのライブ検知（未保存）か、保存済み finding か
}

export default async function ProfitLeaksPage() {
  const user = await requireUser();
  if (!hasPermission(user, 'finance', 'read')) {
    return <div><PageHeader title="利益漏れ検知" /><div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">閲覧権限がありません。</div></div>;
  }
  const t = user.tenantId;
  // 保存済み findings（worker/seed 由来）。
  const stored = await prisma.profitLeakFinding.findMany({
    where: { tenantId: t, resolved: false },
    orderBy: { impactJpy: 'desc' },
  });

  // 実データからのライブ検知（回収遅延）: overdue Receivable を tenant スコープで拾い、detectProfitLeaks の overdue 枝へ。
  // 顧客名の解決は「Receivable→Invoice→Customer」を FK 任せにせず、各段を tenantId で明示スコープ（defense-in-depth）。
  const overdueRecv = await prisma.receivable.findMany({
    where: { tenantId: t, status: 'overdue' },
    select: { id: true, amount: true, invoiceId: true },
    orderBy: { amount: 'desc' },
    take: 200,
  });
  const invIds = overdueRecv.map((r) => r.invoiceId);
  const invoices = invIds.length
    ? await prisma.invoice.findMany({ where: { tenantId: t, id: { in: invIds } }, select: { id: true, number: true, customerId: true } })
    : [];
  const custIds = invoices.map((i) => i.customerId).filter((x): x is string => !!x);
  const customers = custIds.length
    ? await prisma.customer.findMany({ where: { tenantId: t, id: { in: custIds } }, select: { id: true, name: true, label: true } })
    : [];
  const invById = new Map(invoices.map((i) => [i.id, i]));
  const custById = new Map(customers.map((c) => [c.id, c]));
  // Codex G-AI-03: 顧客名（機密ラベル対象）は customer:read ＋ ラベル可視の場合のみ実名を出す。
  // 権限外は請求番号にフォールバックし、顧客名・延滞額の対応を露出しない（売掛エイジング画面と同じ規約）。
  const canSeeNames = hasPermission(user, 'customer', 'read');

  // 請求漏れ（unbilled）: 納品済み（DELIVERY/FOLLOW_UP）なのに請求書が無い Deal を検知（detectProfitLeaks の unbilled 枝）。
  // 「請求書あり」= Invoice.dealId 直接 OR Deal の Quote 経由（Quote.dealId→Invoice.quoteId）のいずれか（誤検知を避ける両経路確認）。
  const deliveredDeals = await prisma.deal.findMany({
    where: { tenantId: t, stage: { in: ['DELIVERY', 'FOLLOW_UP'] } },
    select: { id: true, title: true, amount: true },
    orderBy: { amount: 'desc' },
    take: 200,
  });
  const dealIds = deliveredDeals.map((d) => d.id);
  const [directInvoiced, dealQuotes] = await Promise.all([
    dealIds.length ? prisma.invoice.findMany({ where: { tenantId: t, dealId: { in: dealIds } }, select: { dealId: true } }) : [],
    dealIds.length ? prisma.quote.findMany({ where: { tenantId: t, dealId: { in: dealIds } }, select: { id: true, dealId: true } }) : [],
  ]);
  const billedDealIds = new Set(directInvoiced.map((i) => i.dealId).filter((x): x is string => !!x));
  const quoteIds = dealQuotes.map((q) => q.id);
  const invoicedQuoteIds = quoteIds.length
    ? new Set((await prisma.invoice.findMany({ where: { tenantId: t, quoteId: { in: quoteIds } }, select: { quoteId: true } })).map((i) => i.quoteId).filter((x): x is string => !!x))
    : new Set<string>();
  for (const q of dealQuotes) if (q.dealId && invoicedQuoteIds.has(q.id)) billedDealIds.add(q.dealId);
  // 案件名（deal:read 保有時のみ実名・権限外は汎用文言に redact。G-AI-03 と同じ「識別情報は read 権限保有時のみ」規律）。
  const canSeeDeals = hasPermission(user, 'deal', 'read');
  const unbilledDeals = deliveredDeals
    .filter((d) => !billedDealIds.has(d.id))
    .map((d) => ({ id: d.id, title: canSeeDeals ? d.title : '（納品済みの案件）', amount: toNumber(d.amount) }));

  // 眠り在庫（idle asset）: 稼働率の低い在庫を利益漏れとして検知（detectProfitLeaks の idle_asset 枝）。
  // 廃棄済み(retired)は除外。在庫名は inventory:read 保有時のみ実名・権限外は汎用文言へ redact（同じ規律）。
  const idleAssetsRaw = await prisma.productAsset.findMany({
    where: { tenantId: t, utilizationRate: { lt: 10 }, condition: { not: 'retired' } },
    select: { id: true, name: true, utilizationRate: true, acquisitionCost: true },
    orderBy: { acquisitionCost: 'desc' },
    take: 200,
  });
  const canSeeInventory = hasPermission(user, 'inventory', 'read');
  const idleAssets = idleAssetsRaw.map((a) => ({
    id: a.id,
    name: canSeeInventory ? a.name : '（低稼働の在庫）',
    utilizationRate: toNumber(a.utilizationRate),
    acquisitionCost: toNumber(a.acquisitionCost),
  }));

  const liveFindings = detectProfitLeaks({
    overdueReceivables: overdueRecv.map((r) => {
      const inv = invById.get(r.invoiceId);
      const cust = inv?.customerId ? custById.get(inv.customerId) : null;
      const nameVisible = cust != null && canSeeNames && canSeeCustomerLabel(user.roles, cust.label);
      const label = (nameVisible ? cust!.name : null) ?? inv?.number ?? r.id;
      return { id: r.id, amount: toNumber(r.amount), customer: label };
    }),
    unbilledDeals,
    idleAssets,
  });

  const storedViews: LeakView[] = stored.map((f) => ({ key: `stored:${f.id}`, type: f.type, title: f.title, impactJpy: toNumber(f.impactJpy), severity: f.severity, detail: f.detail, recommendation: f.recommendation, live: false }));
  // 保存済みと同一（type+title）のライブ検知は重複表示しない（保存済みを優先）。
  const storedKeys = new Set(storedViews.map((v) => `${v.type}|${v.title}`));
  const liveViews: LeakView[] = liveFindings
    .filter((f) => !storedKeys.has(`${f.type}|${f.title}`))
    .map((f, i) => ({ key: `live:${f.entityId ?? i}`, type: f.type, title: f.title, impactJpy: f.impactJpy, severity: f.severity, detail: f.detail, recommendation: f.recommendation, live: true }));
  const findings = [...storedViews, ...liveViews].sort((a, b) => b.impactJpy - a.impactJpy);
  const total = findings.reduce((s, f) => s + f.impactJpy, 0);
  const liveCount = liveViews.length;

  return (
    <div>
      <PageHeader title="利益漏れ検知AI" description="原価率・値引き・請求漏れ・回収遅延・眠り在庫などをAIが検知します（回収遅延・請求漏れ・眠り在庫は実データからライブ検知）。" />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="検知件数" value={findings.length} sub={liveCount > 0 ? `うち実データ検知 ${liveCount}件` : undefined} />
        <Stat label="推定影響額" value={formatJpy(total)} tone="red" />
        <Stat label="最優先" value={findings[0] ? TYPE_LABEL[findings[0].type] ?? findings[0].type : '—'} />
      </div>
      <Card>
        <CardContent className="space-y-2 pt-4">
          {findings.length === 0 ? <EmptyState title="利益漏れは検知されていません" /> : findings.map((f) => (
            <div key={f.key} className="flex items-start justify-between gap-3 rounded-md border p-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={f.severity as never} />
                  <span className="font-medium">{f.title}</span>
                  {f.live ? <Badge tone="blue">実データ検知</Badge> : null}
                </div>
                <div className="text-xs text-muted-foreground">{f.detail}</div>
                <div className="mt-1 text-xs text-primary">→ {f.recommendation}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-bold text-red-600">{formatJpy(f.impactJpy)}</div>
                <div className="text-[11px] text-muted-foreground">{TYPE_LABEL[f.type] ?? f.type}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
