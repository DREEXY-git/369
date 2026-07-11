import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, Input, Select, Button } from '@/components/ui';
import { createEventProjectAction } from '../../actions';
import { visibleCustomerLabels } from '@/lib/security/customer-visibility';

export const dynamic = 'force-dynamic';

export default async function NewEventPage() {
  const user = await requireUser();
  if (!hasPermission(user, 'inventory', 'create')) {
    return (
      <div>
        <PageHeader title="イベント案件を作成" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">作成権限がありません。</div>
      </div>
    );
  }
  const [customers, venues] = await Promise.all([
    // WIP-4（roadmap65 追補）: 顧客ドロップダウンは CRM 一覧（WIP1）と同じ可視ラベル集合でフィルタ。
    prisma.customer.findMany({
      where: { tenantId: user.tenantId, label: { in: visibleCustomerLabels(user.roles) } },
      select: { id: true, name: true },
      take: 100,
    }),
    prisma.eventVenue.findMany({ where: { tenantId: user.tenantId }, select: { name: true }, take: 100 }),
  ]);

  return (
    <div>
      <PageHeader
        title="イベント案件を作成"
        breadcrumb={[{ label: 'Operations', href: '/operations' }, { label: 'イベント案件', href: '/operations/events' }, { label: '新規', href: '#' }]}
      />
      <Card className="max-w-2xl">
        <CardContent className="pt-4">
          <form action={createEventProjectAction} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">案件名 *</label>
              <Input name="name" required placeholder="例: 夏祭り2026 音響・照明" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">会場</label>
                <Input name="venue" list="venues" placeholder="例: 中央公園 特設ステージ" />
                <datalist id="venues">{venues.map((v) => <option key={v.name} value={v.name} />)}</datalist>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">開催日</label>
                <Input name="eventDate" type="date" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">顧客</label>
                <Select name="customerId">
                  <option value="">（未選択）</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">想定売上（円）</label>
                <Input name="revenue" type="number" min="0" placeholder="0" />
              </div>
            </div>
            <Button type="submit">案件を作成</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
