import { notFound } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { assertCanViewConfidential, PolicyDenied } from '@/lib/security/policy';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, Button, Input, Select, Textarea } from '@/components/ui';
import { AccessDenied } from '@/components/access-denied';
import { updateCustomerAction } from '../../actions';

export const dynamic = 'force-dynamic';

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  // WIP1（roadmap61）: 編集フォームも顧客 PII を含むため、read ゲート＋二段階取得＋ABAC を通す。
  if (!hasPermission(user, 'customer', 'read')) {
    return (
      <AccessDenied
        title="顧客情報の編集"
        reason="顧客情報の閲覧には顧客情報の閲覧権限（customer:read）が必要です"
        breadcrumb={[{ label: '顧客', href: '/customers' }]}
      />
    );
  }
  const envelope = await prisma.customer.findFirst({
    where: { id, tenantId: user.tenantId },
    select: { id: true, label: true, ownerId: true },
  });
  if (!envelope) notFound();
  try {
    await assertCanViewConfidential(user, {
      dataType: 'customer',
      label: envelope.label as any,
      entityType: 'Customer',
      entityId: envelope.id,
      ownerId: envelope.ownerId,
      purpose: '顧客情報の編集画面の閲覧',
    });
  } catch (e) {
    if (e instanceof PolicyDenied) {
      return (
        <AccessDenied
          title="顧客情報の編集"
          reason={`この顧客情報の閲覧は許可されていません（理由: ${e.decision.reason}）`}
          breadcrumb={[{ label: '顧客', href: '/customers' }]}
        />
      );
    }
    throw e;
  }
  const customer = await prisma.customer.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!customer) notFound();
  const canEdit = hasPermission(user, 'customer', 'update');

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="顧客情報の編集"
        breadcrumb={[
          { label: '顧客', href: '/customers' },
          { label: customer.name, href: `/customers/${customer.id}` },
          { label: '編集', href: '#' },
        ]}
      />
      <Card>
        <CardContent className="pt-4">
          {!canEdit ? (
            <div className="mb-3 rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">編集権限がありません（閲覧のみ）。</div>
          ) : null}
          <form action={updateCustomerAction} className="space-y-3">
            <input type="hidden" name="id" value={customer.id} />
            <Field label="会社名 *"><Input name="name" defaultValue={customer.name} required disabled={!canEdit} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="業種"><Input name="industry" defaultValue={customer.industry ?? ''} disabled={!canEdit} /></Field>
              <Field label="顧客ランク">
                <Select name="rank" defaultValue={customer.rank} disabled={!canEdit}>
                  <option>A</option><option>B</option><option>C</option><option>D</option>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="電話"><Input name="phone" defaultValue={customer.phone ?? ''} disabled={!canEdit} /></Field>
              <Field label="メール"><Input name="email" type="email" defaultValue={customer.email ?? ''} disabled={!canEdit} /></Field>
            </div>
            <Field label="住所"><Input name="address" defaultValue={customer.address ?? ''} disabled={!canEdit} /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="ステータス">
                <Select name="status" defaultValue={customer.status} disabled={!canEdit}>
                  <option value="active">取引中</option>
                  <option value="prospect">見込み</option>
                  <option value="dormant">休眠</option>
                  <option value="churned">失注/離反</option>
                </Select>
              </Field>
              <Field label="満足度(0-100)"><Input name="satisfaction" type="number" min={0} max={100} defaultValue={customer.satisfaction ?? ''} disabled={!canEdit} /></Field>
              <Field label="離反リスク(0-100)"><Input name="churnRisk" type="number" min={0} max={100} defaultValue={customer.churnRisk ?? ''} disabled={!canEdit} /></Field>
            </div>
            <Field label="メモ"><Textarea name="notes" rows={3} defaultValue={customer.notes} disabled={!canEdit} /></Field>
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
