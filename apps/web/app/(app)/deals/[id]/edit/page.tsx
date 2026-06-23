import { notFound } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, Button, Input, Textarea } from '@/components/ui';
import { updateDealAction } from '../../actions';

export const dynamic = 'force-dynamic';

function dateInput(d: Date | null): string {
  if (!d) return '';
  return new Date(d).toISOString().slice(0, 10);
}

export default async function EditDealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const deal = await prisma.deal.findFirst({ where: { id, tenantId: user.tenantId }, include: { customer: true } });
  if (!deal) notFound();
  const canEdit = hasPermission(user, 'deal', 'update');

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="案件の編集"
        description={deal.customer.name}
        breadcrumb={[
          { label: '案件', href: '/deals' },
          { label: deal.title, href: `/deals/${deal.id}` },
          { label: '編集', href: '#' },
        ]}
      />
      <Card>
        <CardContent className="pt-4">
          {!canEdit ? (
            <div className="mb-3 rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">編集権限がありません（閲覧のみ）。</div>
          ) : null}
          <form action={updateDealAction} className="space-y-3">
            <input type="hidden" name="id" value={deal.id} />
            <Field label="案件名 *"><Input name="title" defaultValue={deal.title} required disabled={!canEdit} /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="金額(円)"><Input name="amount" type="number" defaultValue={toNumber(deal.amount)} disabled={!canEdit} /></Field>
              <Field label="原価(円)"><Input name="cost" type="number" defaultValue={toNumber(deal.cost)} disabled={!canEdit} /></Field>
              <Field label="受注確度(%)"><Input name="probability" type="number" min={0} max={100} defaultValue={deal.probability} disabled={!canEdit} /></Field>
            </div>
            <Field label="次アクション"><Input name="nextAction" defaultValue={deal.nextAction} disabled={!canEdit} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="次アクション期限"><Input name="nextActionAt" type="date" defaultValue={dateInput(deal.nextActionAt)} disabled={!canEdit} /></Field>
              <Field label="競合"><Input name="competitor" defaultValue={deal.competitor ?? ''} disabled={!canEdit} /></Field>
            </div>
            <div className="rounded-md bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
              ステージ変更は案件詳細から行えます（ステージ履歴に記録されます）。
            </div>
            <Button type="submit" className="w-full" disabled={!canEdit}>保存</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
