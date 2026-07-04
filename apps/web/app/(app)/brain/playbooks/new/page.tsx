import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, Button, Input, Textarea, Select } from '@/components/ui';
import { createSalesPlaybookEntryAction } from '../actions';

export const dynamic = 'force-dynamic';

// Company Brain（営業プレイブック）新規作成（Phase 2-B-4）。
// externalAiAllowed はこの画面では変更できない（常に false で作成される）。

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

export default async function NewSalesPlaybookEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  if (!hasPermission(user, 'knowledge', 'create')) {
    return (
      <div>
        <PageHeader title="営業プレイブックの新規作成" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">作成権限がありません。</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="営業プレイブックの新規作成" />
      <div className="mb-3 space-y-1 text-xs text-muted-foreground">
        <p className="font-medium text-amber-700">
          ・顧客名・会社名・個人名・成果数値・口コミ・顧客の声を書かないでください（事例は Case Study 領域で扱います）。
        </p>
        <p>・営業プレイブックは社内ナレッジであり、外部公開素材ではありません。</p>
        <p>・実価格・請求・見積・課金に接続する金額を書かないでください。</p>
        <p>・外部AI送信はこの画面では許可できません（常に「禁止」で作成されます）。</p>
      </div>
      {sp.error ? (
        <div className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
          {ERROR_MESSAGES[sp.error] ?? '入力内容を確認してください。'}
        </div>
      ) : null}
      <Card>
        <CardContent className="pt-4">
          <form action={createSalesPlaybookEntryAction} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="title" className="text-sm font-medium">タイトル（必須・120文字まで）</label>
              <Input id="title" name="title" required maxLength={120} placeholder="例: 美容室向け・予約導線の切り口" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="body" className="text-sm font-medium">本文（必須・5000文字まで）</label>
              <Textarea id="body" name="body" required rows={8} maxLength={5000} placeholder="売り方の型・手順・考え方を記入します（顧客名や成果数値は書かない）。" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="category" className="text-sm font-medium">分類（必須・80文字まで）</label>
                <Input id="category" name="category" required maxLength={80} placeholder="例: 切り口 / 反論対応 / 提案準備 / トーク" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="playbookType" className="text-sm font-medium">型の種類</label>
                <Select id="playbookType" name="playbookType" defaultValue="approach">
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
                <Input id="targetIndustry" name="targetIndustry" maxLength={80} placeholder="例: 美容室 / イベント主催" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="targetSituation" className="text-sm font-medium">使う場面（任意・120文字まで）</label>
                <Input id="targetSituation" name="targetSituation" maxLength={120} placeholder="例: 初回訪問 / 見積提示後" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="objection" className="text-sm font-medium">想定される反論（任意・500文字まで）</label>
              <Textarea id="objection" name="objection" rows={2} maxLength={500} placeholder="反論対応の型のとき: 例「料金が高い」" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="recommendedTalkTrack" className="text-sm font-medium">推奨トーク（任意・500文字まで）</label>
              <Textarea id="recommendedTalkTrack" name="recommendedTalkTrack" rows={2} maxLength={500} placeholder="言い回しの骨子（顧客名・実価格は入れない）。" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="doNotSay" className="text-sm font-medium">言わないこと（任意・500文字まで）</label>
              <Textarea id="doNotSay" name="doNotSay" rows={2} maxLength={500} placeholder="例: No.1表記を使わない。効果保証をしない。誇大広告表現を避ける。" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="label" className="text-sm font-medium">機密ラベル</label>
                <Select id="label" name="label" defaultValue="INTERNAL">
                  <option value="NORMAL">通常</option>
                  <option value="INTERNAL">社内限</option>
                </Select>
                <p className="text-xs text-muted-foreground">高機密ラベルは扱いません。</p>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="tags" className="text-sm font-medium">タグ（任意・カンマ区切り・最大10件）</label>
                <Input id="tags" name="tags" placeholder="例: 予約,導線" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="sourceNote" className="text-sm font-medium">出典メモ（任意・200文字まで）</label>
              <Input id="sourceNote" name="sourceNote" maxLength={200} placeholder="例: 営業定例での共有内容" />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button type="submit">作成する</Button>
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
