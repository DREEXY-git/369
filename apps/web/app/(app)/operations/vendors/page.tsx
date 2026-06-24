import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Table, Th, Td, EmptyState, Input, Button } from '@/components/ui';
import { createVendorAction } from '../purchase-orders/actions';

export const dynamic = 'force-dynamic';

export default async function VendorsPage() {
  const user = await requireUser();
  const canCreate = hasPermission(user, 'inventory', 'create');
  // 仕入先の連絡先・単価は機密。財務閲覧権限でのみ詳細を表示。
  const canViewConfidential = hasPermission(user, 'finance', 'read');
  const vendors = await prisma.vendor.findMany({
    where: { tenantId: user.tenantId },
    include: { _count: { select: { purchaseOrders: true, reorderRules: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <PageHeader
        title="発注先・協力会社"
        description="仕入先/協力会社の管理。連絡先・単価は機密（財務閲覧権限のみ）。"
        breadcrumb={[{ label: 'Operations', href: '/operations' }, { label: '発注先', href: '#' }]}
      />
      {canCreate ? (
        <Card className="mb-4">
          <CardHeader><CardTitle>発注先を登録</CardTitle></CardHeader>
          <CardContent>
            <form action={createVendorAction} className="flex flex-wrap items-end gap-2">
              <Input name="name" required placeholder="会社名" className="flex-1" />
              <Input name="contactName" placeholder="担当者" />
              <Input name="email" type="email" placeholder="メール" />
              <Input name="phone" placeholder="電話" />
              <Button type="submit">登録</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <Table>
          <thead><tr><Th>会社名</Th>{canViewConfidential ? <><Th>担当</Th><Th>連絡先</Th></> : null}<Th>発注</Th><Th>発注点</Th></tr></thead>
          <tbody>
            {vendors.length === 0 ? (
              <tr><Td colSpan={canViewConfidential ? 5 : 3}><EmptyState title="発注先がありません" /></Td></tr>
            ) : vendors.map((v) => (
              <tr key={v.id} className="hover:bg-secondary/50">
                <Td className="text-sm">{v.name}</Td>
                {canViewConfidential ? (
                  <>
                    <Td className="text-xs text-muted-foreground">{v.contactName ?? '-'}</Td>
                    <Td className="text-xs text-muted-foreground">{v.email ?? v.phone ?? '-'}</Td>
                  </>
                ) : null}
                <Td className="text-xs">{v._count.purchaseOrders}</Td>
                <Td className="text-xs">{v._count.reorderRules}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
