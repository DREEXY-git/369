import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { assertCanViewConfidential, PolicyDenied } from '@/lib/security/policy';
import { canSeeCustomerLabel } from '@/lib/security/customer-visibility';
import { AccessDenied } from '@/components/access-denied';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, Table, Th, Td, Badge, Button, Stat, EmptyState } from '@/components/ui';
import { formatJpy, formatDate, isOverdue } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function InvoicesPage() {
  const user = await requireUser();
  // 請求一覧は全顧客の請求額・未収・延滞という finance 機密の俯瞰ビュー。請求詳細と同じ ABAC で保護し、
  // finance:read 非保有（STAFF 等）を遮断する（data access log も記録）。一覧用 entityId は 'invoice-list'。
  // データ取得前にガードし、権限が無いユーザーに顧客名・金額を渡さない。
  try {
    await assertCanViewConfidential(user, {
      dataType: 'invoice',
      label: 'FINANCIAL_CONFIDENTIAL',
      entityType: 'Invoice',
      entityId: 'invoice-list',
      purpose: '請求一覧の閲覧',
    });
  } catch (e) {
    if (e instanceof PolicyDenied) {
      return (
        <AccessDenied
          title="請求・回収管理"
          reason={e.decision.reason}
          needsReason={e.decision.requiredSensitiveAccessReason}
          breadcrumb={[{ label: '請求', href: '/invoices' }]}
        />
      );
    }
    throw e;
  }
  const invoices = await prisma.invoice.findMany({
    where: { tenantId: user.tenantId },
    // 顧客は表示に使う name と可視判定の label のみ取得（PII over-fetch 防止・WIP-4 追補）。
    include: { customer: { select: { name: true, label: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const canReadCustomer = hasPermission(user, 'customer', 'read');
  const overdueCount = invoices.filter((i) => isOverdue(i.dueDate, i.status)).length;
  const unpaid = invoices.filter((i) => i.status !== 'PAID' && i.status !== 'VOID').reduce((s, i) => s + toNumber(i.total), 0);

  return (
    <div>
      <PageHeader
        title="請求・回収管理"
        description="請求書・入金予定・未回収・回収リスクを管理します。"
        action={<Link href="/invoices/new"><Button>＋ 請求書作成</Button></Link>}
      />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="請求件数" value={invoices.length} />
        <Stat label="未払い合計" value={formatJpy(unpaid)} />
        <Stat label="延滞" value={overdueCount} tone={overdueCount ? 'red' : 'green'} />
      </div>
      <Card>
        {invoices.length === 0 ? <div className="p-6"><EmptyState title="請求がありません" /></div> : (
          <Table>
            <thead><tr><Th>番号</Th><Th>顧客</Th><Th>金額</Th><Th>入金</Th><Th>期日</Th><Th>状態</Th></tr></thead>
            <tbody>
              {invoices.map((i) => {
                const od = isOverdue(i.dueDate, i.status);
                return (
                  <tr key={i.id} className="hover:bg-secondary/50">
                    <Td className="font-mono text-xs"><Link href={`/invoices/${i.id}`} className="text-primary hover:underline">{i.number}</Link></Td>
                    <Td>{i.customer && canReadCustomer && canSeeCustomerLabel(user.roles, i.customer.label) ? i.customer.name : '—'}</Td>
                    <Td className="font-medium">{formatJpy(toNumber(i.total))}</Td>
                    <Td>{formatJpy(toNumber(i.paidAmount))}</Td>
                    <Td className={od ? 'text-red-600' : ''}>{formatDate(i.dueDate)}</Td>
                    <Td><Badge tone={i.status === 'PAID' ? 'green' : od || i.status === 'OVERDUE' ? 'red' : 'amber'}>{od && i.status !== 'PAID' ? 'OVERDUE' : i.status}</Badge></Td>
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
