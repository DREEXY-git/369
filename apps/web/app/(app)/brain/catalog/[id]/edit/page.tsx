import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, Button, Input, Textarea, Select } from '@/components/ui';
import { updateProductCatalogItemAction } from '../../actions';

export const dynamic = 'force-dynamic';

// Company Brain（商品カタログ）編集（Phase 2-A-3b-2）。
// externalAiAllowed はこの画面では変更できない（現在値のまま維持される）。
// priceNote は説明テキストのみで、価格計算・請求・課金には使わない。

const ERROR_MESSAGES: Record<string, string> = {
  name: '商品・サービス名は1〜120文字で入力してください。',
  description: '説明は1〜5000文字で入力してください。',
  category: '分類は1〜80文字で入力してください。',
  status: '状態の値が不正です。',
  label: '機密ラベルの値が不正です。',
  targetPain: '解決する課題は1000文字以内で入力してください。',
  strengths: '強みは1000文字以内で入力してください。',
  priceNote: '価格メモは1000文字以内で入力してください。',
  tags: 'タグは最大10件・各20文字以内で入力してください。',
};

export default async function EditProductCatalogItemPage({
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
        <PageHeader title="商品カタログの編集" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">編集権限がありません。</div>
      </div>
    );
  }

  const item = await prisma.productCatalogItem.findFirst({
    where: { id, tenantId: user.tenantId, archivedAt: null },
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      targetPain: true,
      strengths: true,
      priceNote: true,
      status: true,
      label: true,
      tags: true,
      externalAiAllowed: true,
    },
  });
  if (item && item.label !== 'NORMAL' && item.label !== 'INTERNAL') {
    return (
      <div>
        <PageHeader title="商品カタログの編集" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          高機密ラベルの商品はこの画面では編集できません（機密参照ログ対応後に扱えるようになります）。
        </div>
        <div className="mt-3">
          <Link href="/brain/catalog" className="text-sm text-muted-foreground underline">一覧へ戻る</Link>
        </div>
      </div>
    );
  }
  if (!item) {
    return (
      <div>
        <PageHeader title="商品カタログの編集" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          対象の商品が見つかりません（アーカイブ済みの可能性があります）。
        </div>
        <div className="mt-3">
          <Link href="/brain/catalog" className="text-sm text-muted-foreground underline">一覧へ戻る</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="商品カタログの編集" />
      <div className="mb-3 space-y-1 text-xs text-muted-foreground">
        <p>・外部AI送信はこの画面では許可できません（現在の設定: {item.externalAiAllowed ? '許可（マスキング必須）' : '禁止'}・この画面では変更されません）。</p>
        <p>・PII / secret / 実顧客の機微情報を入れないでください。</p>
        <p>・価格メモは営業説明用のテキストで、価格計算・請求・課金には使いません。</p>
      </div>
      {sp.error ? (
        <div className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
          {ERROR_MESSAGES[sp.error] ?? '入力内容を確認してください。'}
        </div>
      ) : null}
      <Card>
        <CardContent className="pt-4">
          <form action={updateProductCatalogItemAction} className="space-y-4">
            <input type="hidden" name="id" value={item.id} />
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium">商品・サービス名（必須・120文字まで）</label>
              <Input id="name" name="name" required maxLength={120} defaultValue={item.name} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="description" className="text-sm font-medium">説明（必須・5000文字まで）</label>
              <Textarea id="description" name="description" required rows={6} maxLength={5000} defaultValue={item.description} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="category" className="text-sm font-medium">分類（必須・80文字まで）</label>
              <Input id="category" name="category" required maxLength={80} defaultValue={item.category} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="targetPain" className="text-sm font-medium">解決する課題（任意・1000文字まで）</label>
              <Textarea id="targetPain" name="targetPain" rows={3} maxLength={1000} defaultValue={item.targetPain ?? ''} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="strengths" className="text-sm font-medium">強み（任意・1000文字まで）</label>
              <Textarea id="strengths" name="strengths" rows={3} maxLength={1000} defaultValue={item.strengths ?? ''} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="priceNote" className="text-sm font-medium">価格メモ（任意・1000文字まで・説明のみ）</label>
              <Input id="priceNote" name="priceNote" maxLength={1000} defaultValue={item.priceNote ?? ''} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="status" className="text-sm font-medium">状態</label>
                <Select id="status" name="status" defaultValue={item.status === 'draft' ? 'draft' : 'active'}>
                  <option value="active">有効</option>
                  <option value="draft">下書き</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="label" className="text-sm font-medium">機密ラベル</label>
                <Select id="label" name="label" defaultValue={item.label}>
                  <option value="NORMAL">通常</option>
                  <option value="INTERNAL">社内限</option>
                </Select>
                <p className="text-xs text-muted-foreground">高機密ラベルは機密参照ログ対応後に扱えるようになります。</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="tags" className="text-sm font-medium">タグ（任意・カンマ区切り・最大10件）</label>
              <Input id="tags" name="tags" defaultValue={item.tags.join(',')} />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button type="submit">保存する</Button>
              <Link href="/brain/catalog" className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent/60">
                キャンセル
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
