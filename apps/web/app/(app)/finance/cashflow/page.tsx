import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, Table, Th, Td, Badge, Stat, EmptyState } from '@/components/ui';
import { formatJpy, formatDate } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function CashflowPage() {
  const user = await requireUser();
  if (!hasPermission(user, 'finance', 'read')) {
    return <div><PageHeader title="資金繰り" /><div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">閲覧権限がありません。</div></div>;
  }
  const forecast = await prisma.cashflowForecast.findFirst({
    where: { tenantId: user.tenantId },
    include: { lines: { orderBy: { date: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });
  const lines = forecast?.lines ?? [];
  const minBalance = lines.length ? Math.min(...lines.map((l) => toNumber(l.balance))) : 0;
  const shortage = lines.find((l) => toNumber(l.balance) < 0);
  const maxBalance = lines.length ? Math.max(...lines.map((l) => toNumber(l.balance)), 1) : 1;

  return (
    <div>
      <PageHeader title="資金繰り予測" description="3か月先までの資金繰り見込みと資金ショート予測（AI CFO）。" />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="最低残高見込み" value={formatJpy(minBalance)} tone={minBalance < 1_500_000 ? 'red' : 'green'} />
        <Stat label="資金ショート" value={shortage ? formatDate(shortage.date) : 'なし'} tone={shortage ? 'red' : 'green'} />
        <Stat label="予測期間" value={`${lines.length} 週`} />
      </div>

      {minBalance < 1_500_000 ? (
        <div className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          🤖 AI CFO: 残高が薄くなる時期があります。入金前倒し交渉・支払サイト調整・短期借入の検討を推奨します。
        </div>
      ) : null}

      <Card>
        <CardContent className="pt-4">
          {lines.length === 0 ? <EmptyState title="予測データがありません" /> : (
            <Table>
              <thead><tr><Th>日付</Th><Th>入金</Th><Th>出金</Th><Th>残高</Th><Th>推移</Th></tr></thead>
              <tbody>
                {lines.map((l) => {
                  const bal = toNumber(l.balance);
                  const width = Math.max(2, Math.round((Math.abs(bal) / maxBalance) * 100));
                  return (
                    <tr key={l.id}>
                      <Td className="whitespace-nowrap">{formatDate(l.date)}</Td>
                      <Td className="text-emerald-600">{formatJpy(toNumber(l.inflow))}</Td>
                      <Td className="text-red-600">{formatJpy(toNumber(l.outflow))}</Td>
                      <Td className={`font-medium ${bal < 0 ? 'text-red-600' : ''}`}>{formatJpy(bal)} {bal < 0 ? <Badge tone="red">ショート</Badge> : null}</Td>
                      <Td className="w-40">
                        <div className="h-2 w-full rounded-full bg-secondary">
                          <div className={`h-2 rounded-full ${bal < 0 ? 'bg-red-500' : bal < 1_500_000 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${width}%` }} />
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
