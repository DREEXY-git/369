import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, Table, Th, Td, Badge, Stat, EmptyState } from '@/components/ui';
import { LabelBadge } from '@/components/badges';
import { AccessDenied } from '@/components/access-denied';
import { visibleCustomerLabels } from '@/lib/security/customer-visibility';
import { classifyCustomerChurn, daysSinceContact, CHURN_TIER_LABEL, formatDate, type ChurnTier } from '@hokko/shared';

export const dynamic = 'force-dynamic';

const TIER_TONE: Record<ChurnTier, 'red' | 'amber' | 'slate' | 'green'> = {
  critical: 'red', elevated: 'amber', watch: 'slate', stable: 'green',
};

export default async function CustomerChurnPage() {
  const user = await requireUser();
  // 離反予兆は氏名・満足度・離反リスク・クレームを含む機密画面。顧客一覧と同じ customer:read をデータ取得前に適用。
  if (!hasPermission(user, 'customer', 'read')) {
    return (
      <AccessDenied
        title="顧客の離反予兆"
        reason="この画面の閲覧には顧客情報の閲覧権限（customer:read）が必要です"
        breadcrumb={[{ label: '顧客', href: '/customers' }]}
      />
    );
  }
  // 閲覧不可 label の顧客は DB クエリ段階で除外（顧客一覧と同一規約・不可視行は件数も内容も出さない）。
  const visibleLabels = visibleCustomerLabels(user.roles);
  // Codex F-CHURN-02: 取引中(active)＋休眠(dormant)を対象にする。休眠こそ長期未接触の高リスク先で、
  // active 固定だと離反予兆の主対象を取りこぼす。prospect(見込み)・churned(離反済み)は対象外。
  // 未対応クレームは子取得時も tenantId を明示（defense-in-depth）。
  const customers = await prisma.customer.findMany({
    where: { tenantId: user.tenantId, label: { in: visibleLabels }, status: { in: ['active', 'dormant'] } },
    select: {
      id: true, name: true, rank: true, satisfaction: true, churnRisk: true, lastContactAt: true, label: true,
      complaints: { where: { tenantId: user.tenantId, status: 'open' }, select: { id: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 500,
  });

  const now = new Date();
  const assessed = customers
    .map((c) => ({
      c,
      a: classifyCustomerChurn({
        churnRisk: c.churnRisk,
        satisfaction: c.satisfaction,
        daysSinceContact: daysSinceContact(c.lastContactAt, now),
        openComplaints: c.complaints.length,
      }),
    }))
    // 要対応（stable 以外）のみを、リスクの高い順→id で決定論整列。
    .filter((x) => x.a.tier !== 'stable')
    .sort((x, y) => y.a.score - x.a.score || (x.c.id < y.c.id ? -1 : x.c.id > y.c.id ? 1 : 0));

  const countBy = (t: ChurnTier) => assessed.filter((x) => x.a.tier === t).length;

  return (
    <div>
      <PageHeader
        title="顧客の離反予兆（AI）"
        description="取引中・休眠の顧客について、離反リスク・満足度・接触の間隔・未対応クレームから離れそうな先を根拠付きで検知します（read-only）。"
        breadcrumb={[{ label: '顧客', href: '/customers' }, { label: '離反予兆', href: '/customers/churn' }]}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="要対応の顧客" value={assessed.length} sub={`対象 ${customers.length} 件中（取引中・休眠）`} />
        <Stat label="離反 危険" value={countBy('critical')} tone="red" />
        <Stat label="離反 要注意" value={countBy('elevated')} tone="amber" />
        <Stat label="様子見" value={countBy('watch')} tone="slate" />
      </div>

      <Card>
        <CardContent className="pt-4">
          {assessed.length === 0 ? (
            <EmptyState title="離反予兆のある顧客はいません" hint="満足度・接触間隔・クレーム・離反リスク指標が良好です。" />
          ) : (
            <Table>
              <thead>
                <tr><Th>会社名</Th><Th>判定</Th><Th>リスク</Th><Th>根拠</Th><Th>推奨アクション</Th><Th>最終接触</Th><Th>機密</Th></tr>
              </thead>
              <tbody>
                {assessed.map(({ c, a }) => (
                  <tr key={c.id} className="align-top hover:bg-secondary/50">
                    <Td>
                      <Link href={`/customers/${c.id}`} className="font-medium text-primary hover:underline">{c.name}</Link>
                      <div className="text-[11px] text-muted-foreground">ランク {c.rank}{c.satisfaction != null ? `・満足度 ${c.satisfaction}` : ''}</div>
                    </Td>
                    <Td><Badge tone={TIER_TONE[a.tier]}>{CHURN_TIER_LABEL[a.tier]}</Badge></Td>
                    <Td className="font-bold">{a.score}</Td>
                    <Td className="text-xs text-muted-foreground">
                      {a.reasons.length ? (
                        <ul className="list-disc pl-4">{a.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
                      ) : '—'}
                    </Td>
                    <Td className="text-xs text-primary">{a.recommendation}</Td>
                    <Td className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(c.lastContactAt)}</Td>
                    <Td><LabelBadge label={c.label as never} /></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          <p className="pt-3 text-[11px] text-muted-foreground">※ 保存済みの離反リスク・満足度と接触・クレーム記録に基づく機械判定です（確定ではありません）。フォローの優先順位付けの参考にしてください。</p>
        </CardContent>
      </Card>
    </div>
  );
}
