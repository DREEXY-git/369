import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { assertCanViewConfidential, PolicyDenied } from '@/lib/security/policy';
import { AccessDenied } from '@/components/access-denied';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Stat, Badge } from '@/components/ui';
import { formatJpy } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function FinancePage() {
  const user = await requireUser();
  if (!hasPermission(user, 'finance', 'read')) {
    return <div><PageHeader title="財務" /><div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">財務情報の閲覧権限がありません。</div></div>;
  }
  // ABAC: 財務は機密ラベル。閲覧可否を判定し機密参照ログを記録。
  try {
    await assertCanViewConfidential(user, {
      dataType: 'finance',
      label: 'FINANCIAL_CONFIDENTIAL',
      entityType: 'Finance',
      entityId: 'summary',
      purpose: '財務サマリーの閲覧',
    });
  } catch (e) {
    if (e instanceof PolicyDenied) {
      return <AccessDenied title="財務" reason={e.decision.reason} needsReason={e.decision.requiredSensitiveAccessReason} />;
    }
    throw e;
  }
  const t = user.tenantId;
  const [cash, expenses, receivables, loans, dealSum, invoices] = await Promise.all([
    prisma.cashAccount.aggregate({ where: { tenantId: t }, _sum: { balance: true } }),
    prisma.expense.findMany({ where: { tenantId: t }, orderBy: { date: 'desc' }, take: 8 }),
    prisma.receivable.findMany({ where: { tenantId: t } }),
    prisma.loan.aggregate({ where: { tenantId: t }, _sum: { balance: true } }),
    prisma.deal.aggregate({ where: { tenantId: t, stage: { not: 'LOST' } }, _sum: { amount: true } }),
    prisma.invoice.findMany({ where: { tenantId: t } }),
  ]);

  const ar = receivables.reduce((s, r) => s + toNumber(r.amount), 0);
  const overdue = receivables.filter((r) => r.status === 'overdue').reduce((s, r) => s + toNumber(r.amount), 0);
  const unpaidInvoices = invoices.filter((i) => i.status !== 'PAID' && i.status !== 'VOID').reduce((s, i) => s + toNumber(i.total), 0);

  return (
    <div>
      <PageHeader title="会計・財務サマリー" description="現預金・売掛・借入・経費・資金繰りを集計します（会計ソフト連携前提）。" />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="現預金残高" value={formatJpy(toNumber(cash._sum.balance))} />
        <Stat label="売掛金" value={formatJpy(ar)} sub={overdue ? `延滞 ${formatJpy(overdue)}` : '延滞なし'} tone={overdue ? 'red' : 'green'} />
        <Stat label="借入金残高" value={formatJpy(toNumber(loans._sum.balance))} />
        <Stat label="パイプライン" value={formatJpy(toNumber(dealSum._sum.amount))} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>経費（直近）</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {expenses.map((e) => (
              <div key={e.id} className="flex items-center justify-between">
                <span>{e.category} <span className="text-xs text-muted-foreground">{e.vendor}</span> {e.anomaly ? <Badge tone="red">異常</Badge> : null}</span>
                <span className="font-medium">{formatJpy(toNumber(e.amount))}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>未回収・未請求</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><span>未払い請求合計</span><span className="font-medium">{formatJpy(unpaidInvoices)}</span></div>
            <div className="flex items-center justify-between"><span>延滞売掛</span><Badge tone={overdue ? 'red' : 'green'}>{formatJpy(overdue)}</Badge></div>
            <div className="flex gap-3 pt-2 text-xs">
              <Link href="/finance/cashflow" className="text-primary hover:underline">資金繰り →</Link>
              <Link href="/finance/profit-leaks" className="text-primary hover:underline">利益漏れ →</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
