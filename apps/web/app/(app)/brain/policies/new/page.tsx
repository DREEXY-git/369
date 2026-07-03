import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, Button, Input, Textarea, Select } from '@/components/ui';
import { createCompanyPolicyAction } from '../actions';

export const dynamic = 'force-dynamic';

// Company Brain（会社方針）新規作成（Phase 2-A-3b-1）。
// externalAiAllowed はこの画面では変更できない（常に false で作成される）。

const ERROR_MESSAGES: Record<string, string> = {
  title: 'タイトルは1〜120文字で入力してください。',
  body: '本文は1〜5000文字で入力してください。',
  category: '分類は1〜80文字で入力してください。',
  status: '状態の値が不正です。',
  label: '機密ラベルの値が不正です。',
  tags: 'タグは最大10件・各20文字以内で入力してください。',
};

export default async function NewCompanyPolicyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  if (!hasPermission(user, 'knowledge', 'create')) {
    return (
      <div>
        <PageHeader title="会社方針の新規作成" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">作成権限がありません。</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="会社方針の新規作成" />
      <div className="mb-3 space-y-1 text-xs text-muted-foreground">
        <p>・外部AI送信はこの画面では許可できません（常に「禁止」で作成されます）。</p>
        <p>・作成した情報は社内ナレッジとして扱われます。</p>
        <p>・PII / secret / 実顧客の機微情報を入れないでください。</p>
      </div>
      {sp.error ? (
        <div className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
          {ERROR_MESSAGES[sp.error] ?? '入力内容を確認してください。'}
        </div>
      ) : null}
      <Card>
        <CardContent className="pt-4">
          <form action={createCompanyPolicyAction} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="title" className="text-sm font-medium">タイトル（必須・120文字まで）</label>
              <Input id="title" name="title" required maxLength={120} placeholder="例: 値引き承認ルール" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="body" className="text-sm font-medium">本文（必須・5000文字まで）</label>
              <Textarea id="body" name="body" required rows={8} maxLength={5000} placeholder="方針の内容を記入します。" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="category" className="text-sm font-medium">分類（必須・80文字まで）</label>
              <Input id="category" name="category" required maxLength={80} placeholder="例: 営業方針 / 社内ルール / 品質方針" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="status" className="text-sm font-medium">状態</label>
                <Select id="status" name="status" defaultValue="active">
                  <option value="active">有効</option>
                  <option value="draft">下書き</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="label" className="text-sm font-medium">機密ラベル</label>
                <Select id="label" name="label" defaultValue="INTERNAL">
                  <option value="NORMAL">通常</option>
                  <option value="INTERNAL">社内限</option>
                </Select>
                <p className="text-xs text-muted-foreground">高機密ラベルは機密参照ログ対応後に扱えるようになります。</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="tags" className="text-sm font-medium">タグ（任意・カンマ区切り・最大10件）</label>
              <Input id="tags" name="tags" placeholder="例: 営業,値引き,承認" />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button type="submit">作成する</Button>
              <Link href="/brain/policies" className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent/60">
                キャンセル
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
