import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, Button, Input, Select, Textarea } from '@/components/ui';
import { AccessDenied } from '@/components/access-denied';
import { createCustomerAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function NewCustomerPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  // WIP1（roadmap61）: 作成フォームは customer:create を持つ人にのみ表示する（action 側の既存チェックと二重防御）。
  if (!hasPermission(user, 'customer', 'create')) {
    return (
      <AccessDenied
        title="顧客を追加"
        reason="顧客の作成には顧客情報の作成権限（customer:create）が必要です"
        breadcrumb={[{ label: '顧客', href: '/customers' }]}
      />
    );
  }
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="顧客を追加" breadcrumb={[{ label: '顧客', href: '/customers' }, { label: '新規', href: '/customers/new' }]} />
      <Card>
        <CardContent className="pt-4">
          {sp.error === 'name' ? <div className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">会社名を入力してください。</div> : null}
          <form action={createCustomerAction} className="space-y-3">
            <Field label="会社名 *"><Input name="name" required /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="業種"><Input name="industry" placeholder="美容室 / 飲食店 など" /></Field>
              <Field label="顧客ランク">
                <Select name="rank" defaultValue="B"><option>A</option><option>B</option><option>C</option><option>D</option></Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="電話"><Input name="phone" /></Field>
              <Field label="メール"><Input name="email" type="email" /></Field>
            </div>
            <Field label="住所"><Input name="address" /></Field>
            <Field label="メモ"><Textarea name="notes" rows={3} /></Field>
            <Button type="submit" className="w-full">登録</Button>
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
