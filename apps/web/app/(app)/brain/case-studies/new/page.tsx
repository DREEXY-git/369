import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, Button, Input, Textarea, Select } from '@/components/ui';
import { createCaseStudyAction } from '../actions';

export const dynamic = 'force-dynamic';

// Company Brain（顧客事例）新規作成（Phase 2-C-4）。
// externalAiAllowed はこの画面では変更できない（常に false で作成される）。
// publishStatus はこの画面では変更できない（常に 'private'＝非公開で作成される）。
// 匿名化を外せるのは許諾状態が「許諾あり（granted）」のときだけ（action 側でも機械拒否）。

const ERROR_MESSAGES: Record<string, string> = {
  title: 'タイトルは1〜120文字で入力してください。',
  body: '本文は1〜5000文字で入力してください。',
  label: '機密ラベルの値が不正です。',
  consentStatus: '許諾状態の値が不正です。',
  anonymized: '新規作成では匿名化を外せません。まず匿名化ありで作成し、許諾台帳に有効な行を登録したうえで、編集画面から外してください。',
  industry: '業種は80文字以内で入力してください。',
  challenge: '課題は500文字以内で入力してください。',
  solution: '提供内容は500文字以内で入力してください。',
  outcome: '結果（定性的）は500文字以内で入力してください。',
  sourceNote: '出典メモは200文字以内で入力してください。',
  tags: 'タグは最大10件・各20文字以内で入力してください。',
  // 保存条件接続（doc92）: 新規作成では台帳行を突合できないため匿名化オフは拒否される。
  ledger_createNotAllowed:
    '新規作成では匿名化を外せません。まず匿名化ありで作成し、「許諾台帳」に有効な行を登録したうえで、編集画面から匿名化を外して保存してください。',
};

export default async function NewCaseStudyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  if (!hasPermission(user, 'knowledge', 'create')) {
    return (
      <div>
        <PageHeader title="顧客事例の新規作成" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">作成権限がありません。</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="顧客事例の新規作成" />
      <div className="mb-3 space-y-1 text-xs text-muted-foreground">
        <p className="font-medium text-amber-700">
          ・顧客名・取引先名・成果数値・顧客の声は、許諾が記録されるまで書かないでください（匿名・架空の表現のみ）。
        </p>
        <p>・顧客事例は社内参照専用です。外部に公開されません（常に「非公開」で作成されます）。</p>
        <p>・新規作成では匿名化を外せません（許諾台帳に登録できるのは作成後のため）。外す場合は、作成後に許諾台帳へ登録し、編集画面で保存します。</p>
        <p>・外部AI送信はこの画面では許可できません（常に「禁止」で作成されます）。</p>
      </div>
      {sp.error ? (
        <div className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
          {ERROR_MESSAGES[sp.error] ?? '入力内容を確認してください。'}
        </div>
      ) : null}
      <Card>
        <CardContent className="pt-4">
          <form action={createCaseStudyAction} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="title" className="text-sm font-medium">タイトル（必須・120文字まで）</label>
              <Input id="title" name="title" required maxLength={120} placeholder="例: （架空）美容室の予約導線改善" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="body" className="text-sm font-medium">本文（必須・5000文字まで）</label>
              <Textarea id="body" name="body" required rows={6} maxLength={5000} placeholder="事例の概要（顧客名・成果数値・顧客の声は許諾があるまで書かない）。" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="industry" className="text-sm font-medium">業種（任意・80文字まで）</label>
                <Input id="industry" name="industry" maxLength={80} placeholder="例: 美容室 / 飲食" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="tags" className="text-sm font-medium">タグ（任意・カンマ区切り・最大10件）</label>
                <Input id="tags" name="tags" placeholder="例: 予約,導線" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="challenge" className="text-sm font-medium">課題（任意・500文字まで）</label>
              <Textarea id="challenge" name="challenge" rows={2} maxLength={500} placeholder="どんな困りごとがあったか（匿名の表現で）。" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="solution" className="text-sm font-medium">提供内容（任意・500文字まで）</label>
              <Textarea id="solution" name="solution" rows={2} maxLength={500} placeholder="何を提供したか。" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="outcome" className="text-sm font-medium">結果・定性的（任意・500文字まで）</label>
              <Textarea id="outcome" name="outcome" rows={2} maxLength={500} placeholder="定性的な変化のみ。数値は許諾のある実事例ができるまで書かない。" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="consentStatus" className="text-sm font-medium">許諾状態</label>
                <Select id="consentStatus" name="consentStatus" defaultValue="none">
                  <option value="none">許諾なし（匿名のみ）</option>
                  <option value="requested">許諾依頼中</option>
                  <option value="granted">許諾あり</option>
                  <option value="revoked">許諾取下げ</option>
                </Select>
                <p className="text-xs text-muted-foreground">許諾の取得・記録の運用は別途整備します。</p>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="label" className="text-sm font-medium">機密ラベル</label>
                <Select id="label" name="label" defaultValue="INTERNAL">
                  <option value="NORMAL">通常</option>
                  <option value="INTERNAL">社内限</option>
                </Select>
                <p className="text-xs text-muted-foreground">高機密ラベルは扱いません。</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" name="anonymized" defaultChecked className="h-4 w-4" />
                匿名化する（推奨・既定）
              </label>
              <p className="text-xs text-muted-foreground">
                新規作成ではチェックを外せません（外すと保存時に拒否されます）。作成後に許諾台帳へ登録し、編集画面で外してください。
              </p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="sourceNote" className="text-sm font-medium">出典メモ（任意・200文字まで）</label>
              <Input id="sourceNote" name="sourceNote" maxLength={200} placeholder="例: 営業定例での共有内容" />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button type="submit">作成する</Button>
              <Link href="/brain/case-studies" className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent/60">
                キャンセル
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
