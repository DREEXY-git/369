import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, Button, Input, Textarea, Select } from '@/components/ui';
import { updateCompanyPolicyAction } from '../../actions';

export const dynamic = 'force-dynamic';

// Company Brain（会社方針）編集（Phase 2-A-3b-1）。
// externalAiAllowed はこの画面では変更できない（現在値のまま維持される）。

const ERROR_MESSAGES: Record<string, string> = {
  title: 'タイトルは1〜120文字で入力してください。',
  body: '本文は1〜5000文字で入力してください。',
  category: '分類は1〜80文字で入力してください。',
  status: '状態の値が不正です。',
  label: '機密ラベルの値が不正です。',
  tags: 'タグは最大10件・各20文字以内で入力してください。',
};

export default async function EditCompanyPolicyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  if (!hasPermission(user, 'knowledge', 'update')) {
    return (
      <div>
        <PageHeader title="会社方針の編集" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">編集権限がありません。</div>
      </div>
    );
  }

  const policy = await prisma.companyPolicy.findFirst({
    where: { id, tenantId: user.tenantId, archivedAt: null },
    select: { id: true, title: true, body: true, category: true, status: true, label: true, tags: true, externalAiAllowed: true },
  });
  if (!policy) {
    return (
      <div>
        <PageHeader title="会社方針の編集" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          対象の会社方針が見つかりません（アーカイブ済みの可能性があります）。
        </div>
        <div className="mt-3">
          <Link href="/brain/policies" className="text-sm text-muted-foreground underline">一覧へ戻る</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="会社方針の編集" />
      <div className="mb-3 space-y-1 text-xs text-muted-foreground">
        <p>・外部AI送信はこの画面では許可できません（現在の設定: {policy.externalAiAllowed ? '許可（マスキング必須）' : '禁止'}・この画面では変更されません）。</p>
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
          <form action={updateCompanyPolicyAction} className="space-y-4">
            <input type="hidden" name="id" value={policy.id} />
            <div className="space-y-1.5">
              <label htmlFor="title" className="text-sm font-medium">タイトル（必須・120文字まで）</label>
              <Input id="title" name="title" required maxLength={120} defaultValue={policy.title} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="body" className="text-sm font-medium">本文（必須・5000文字まで）</label>
              <Textarea id="body" name="body" required rows={8} maxLength={5000} defaultValue={policy.body} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="category" className="text-sm font-medium">分類（必須・80文字まで）</label>
              <Input id="category" name="category" required maxLength={80} defaultValue={policy.category} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="status" className="text-sm font-medium">状態</label>
                <Select id="status" name="status" defaultValue={policy.status === 'draft' ? 'draft' : 'active'}>
                  <option value="active">有効</option>
                  <option value="draft">下書き</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="label" className="text-sm font-medium">機密ラベル</label>
                <Select id="label" name="label" defaultValue={policy.label}>
                  <option value="NORMAL">通常</option>
                  <option value="INTERNAL">社内限</option>
                  <option value="CONFIDENTIAL">機密</option>
                  <option value="STRICT_SECRET">厳秘</option>
                  <option value="EXECUTIVE_ONLY">役員限</option>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="tags" className="text-sm font-medium">タグ（任意・カンマ区切り・最大10件）</label>
              <Input id="tags" name="tags" defaultValue={policy.tags.join(',')} />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button type="submit">保存する</Button>
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
