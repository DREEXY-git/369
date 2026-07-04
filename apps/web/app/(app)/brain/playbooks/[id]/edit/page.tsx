import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, Button, Input, Textarea, Select } from '@/components/ui';
import { updateSalesPlaybookEntryAction } from '../../actions';

export const dynamic = 'force-dynamic';

// Company Brain（営業プレイブック）編集（Phase 2-B-4）。
// externalAiAllowed はこの画面では変更できない（現在値のまま維持される）。

const ERROR_MESSAGES: Record<string, string> = {
  title: 'タイトルは1〜120文字で入力してください。',
  body: '本文は1〜5000文字で入力してください。',
  category: '分類は1〜80文字で入力してください。',
  playbookType: '型の種類の値が不正です。',
  label: '機密ラベルの値が不正です。',
  targetIndustry: '対象業種は80文字以内で入力してください。',
  targetSituation: '使う場面は120文字以内で入力してください。',
  objection: '想定される反論は500文字以内で入力してください。',
  recommendedTalkTrack: '推奨トークは500文字以内で入力してください。',
  doNotSay: '言わないことは500文字以内で入力してください。',
  sourceNote: '出典メモは200文字以内で入力してください。',
  tags: 'タグは最大10件・各20文字以内で入力してください。',
};

export default async function EditSalesPlaybookEntryPage({
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
        <PageHeader title="営業プレイブックの編集" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">編集権限がありません。</div>
      </div>
    );
  }

  const entry = await prisma.salesPlaybookEntry.findFirst({
    where: { id, tenantId: user.tenantId, archivedAt: null },
    select: {
      id: true,
      title: true,
      body: true,
      category: true,
      playbookType: true,
      targetIndustry: true,
      targetSituation: true,
      objection: true,
      recommendedTalkTrack: true,
      doNotSay: true,
      sourceNote: true,
      label: true,
      tags: true,
      externalAiAllowed: true,
    },
  });
  if (entry && entry.label !== 'NORMAL' && entry.label !== 'INTERNAL') {
    return (
      <div>
        <PageHeader title="営業プレイブックの編集" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          高機密ラベルのプレイブックはこの画面では編集できません。
        </div>
        <div className="mt-3">
          <Link href="/brain/playbooks" className="text-sm text-muted-foreground underline">一覧へ戻る</Link>
        </div>
      </div>
    );
  }
  if (!entry) {
    return (
      <div>
        <PageHeader title="営業プレイブックの編集" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          対象の営業プレイブックが見つかりません（アーカイブ済みの可能性があります）。
        </div>
        <div className="mt-3">
          <Link href="/brain/playbooks" className="text-sm text-muted-foreground underline">一覧へ戻る</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="営業プレイブックの編集" />
      <div className="mb-3 space-y-1 text-xs text-muted-foreground">
        <p className="font-medium text-amber-700">
          ・顧客名・会社名・個人名・成果数値・口コミ・顧客の声を書かないでください（事例は Case Study 領域で扱います）。
        </p>
        <p>・営業プレイブックは社内ナレッジであり、外部公開素材ではありません。</p>
        <p>・外部AI送信はこの画面では許可できません（現在の設定: {entry.externalAiAllowed ? '許可（マスキング必須）' : '禁止'}・この画面では変更されません）。</p>
      </div>
      {sp.error ? (
        <div className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
          {ERROR_MESSAGES[sp.error] ?? '入力内容を確認してください。'}
        </div>
      ) : null}
      <Card>
        <CardContent className="pt-4">
          <form action={updateSalesPlaybookEntryAction} className="space-y-4">
            <input type="hidden" name="id" value={entry.id} />
            <div className="space-y-1.5">
              <label htmlFor="title" className="text-sm font-medium">タイトル（必須・120文字まで）</label>
              <Input id="title" name="title" required maxLength={120} defaultValue={entry.title} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="body" className="text-sm font-medium">本文（必須・5000文字まで）</label>
              <Textarea id="body" name="body" required rows={8} maxLength={5000} defaultValue={entry.body} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="category" className="text-sm font-medium">分類（必須・80文字まで）</label>
                <Input id="category" name="category" required maxLength={80} defaultValue={entry.category} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="playbookType" className="text-sm font-medium">型の種類</label>
                <Select id="playbookType" name="playbookType" defaultValue={entry.playbookType}>
                  <option value="approach">切り口</option>
                  <option value="objection">反論対応</option>
                  <option value="preparation">提案準備</option>
                  <option value="talk_track">トーク</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="targetIndustry" className="text-sm font-medium">対象業種（任意・80文字まで）</label>
                <Input id="targetIndustry" name="targetIndustry" maxLength={80} defaultValue={entry.targetIndustry ?? ''} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="targetSituation" className="text-sm font-medium">使う場面（任意・120文字まで）</label>
                <Input id="targetSituation" name="targetSituation" maxLength={120} defaultValue={entry.targetSituation ?? ''} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="objection" className="text-sm font-medium">想定される反論（任意・500文字まで）</label>
              <Textarea id="objection" name="objection" rows={2} maxLength={500} defaultValue={entry.objection ?? ''} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="recommendedTalkTrack" className="text-sm font-medium">推奨トーク（任意・500文字まで）</label>
              <Textarea id="recommendedTalkTrack" name="recommendedTalkTrack" rows={2} maxLength={500} defaultValue={entry.recommendedTalkTrack ?? ''} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="doNotSay" className="text-sm font-medium">言わないこと（任意・500文字まで）</label>
              <Textarea id="doNotSay" name="doNotSay" rows={2} maxLength={500} defaultValue={entry.doNotSay ?? ''} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="label" className="text-sm font-medium">機密ラベル</label>
                <Select id="label" name="label" defaultValue={entry.label}>
                  <option value="NORMAL">通常</option>
                  <option value="INTERNAL">社内限</option>
                </Select>
                <p className="text-xs text-muted-foreground">高機密ラベルは扱いません。</p>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="tags" className="text-sm font-medium">タグ（任意・カンマ区切り・最大10件）</label>
                <Input id="tags" name="tags" defaultValue={entry.tags.join(',')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="sourceNote" className="text-sm font-medium">出典メモ（任意・200文字まで）</label>
              <Input id="sourceNote" name="sourceNote" maxLength={200} defaultValue={entry.sourceNote ?? ''} />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button type="submit">保存する</Button>
              <Link href="/brain/playbooks" className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent/60">
                キャンセル
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
