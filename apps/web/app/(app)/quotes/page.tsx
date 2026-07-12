import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, Table, Th, Td, Badge, Button, EmptyState } from '@/components/ui';
import { AccessDenied } from '@/components/access-denied';
import { formatJpy, isLowMargin } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function QuotesPage() {
  const user = await requireUser();
  // WIP-4（roadmap65）: 見積の金額・粗利は quote:read 配下の業務データ（値引き承認ルールを含む
  // STAFF の見積業務フロー）。ページ基礎権限をデータ取得前に適用し、外部ロールを遮断する。
  if (!hasPermission(user, 'quote', 'read')) {
    return (
      <AccessDenied
        title="見積管理"
        reason="見積一覧の閲覧には見積の閲覧権限（quote:read）が必要です"
        breadcrumb={[{ label: '見積', href: '/quotes' }]}
      />
    );
  }
  const quotes = await prisma.quote.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: 'desc' } });
  const lowMargin = quotes.filter((q) => isLowMargin(toNumber(q.grossMarginRate))).length;

  return (
    <div>
      <PageHeader
        title="見積管理"
        description={`${quotes.length} 件。原価・粗利の自動計算と低粗利アラート付き。`}
        action={<Link href="/quotes/new"><Button>＋ 見積作成</Button></Link>}
      />
      {lowMargin > 0 ? (
        <div className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">⚠️ 低粗利の見積が {lowMargin} 件あります。値引き根拠の確認を推奨します。</div>
      ) : null}
      <Card>
        {quotes.length === 0 ? <div className="p-6"><EmptyState title="見積がありません" /></div> : (
          <Table>
            <thead><tr><Th>番号</Th><Th>件名</Th><Th>合計</Th><Th>粗利率</Th><Th>値引き</Th><Th>状態</Th></tr></thead>
            <tbody>
              {quotes.map((q) => {
                const gm = toNumber(q.grossMarginRate);
                return (
                  <tr key={q.id} className="hover:bg-secondary/50">
                    <Td className="font-mono text-xs"><Link href={`/quotes/${q.id}`} className="text-primary hover:underline">{q.number}</Link></Td>
                    <Td>{q.title}</Td>
                    <Td className="font-medium">{formatJpy(toNumber(q.total))}</Td>
                    <Td><Badge tone={gm < 0 ? 'red' : gm < 15 ? 'amber' : 'green'}>{gm}%</Badge></Td>
                    <Td>{toNumber(q.discountRate)}%</Td>
                    <Td><Badge tone={q.status === 'approved' ? 'green' : q.status === 'pending_approval' ? 'amber' : 'slate'}>{q.status}</Badge></Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
