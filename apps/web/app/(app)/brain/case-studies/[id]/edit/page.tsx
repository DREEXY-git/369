import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, Button, Input, Textarea, Select } from '@/components/ui';
import { updateCaseStudyAction } from '../../actions';

export const dynamic = 'force-dynamic';

// Company Brain（顧客事例）編集（Phase 2-C-4）。
// externalAiAllowed はこの画面では変更できない（現在値のまま維持される）。
// publishStatus はこの画面では変更できない（'private'＝非公開のまま維持される）。
// 匿名化を外せるのは許諾状態が「許諾あり（granted）」のときだけ（action 側でも機械拒否）。

const ERROR_MESSAGES: Record<string, string> = {
  title: 'タイトルは1〜120文字で入力してください。',
  body: '本文は1〜5000文字で入力してください。',
  label: '機密ラベルの値が不正です。',
  consentStatus: '許諾状態の値が不正です。',
  anonymized: '許諾が「許諾あり」でない場合、匿名化は外せません（許諾なしに顧客情報を扱わないため）。',
  industry: '業種は80文字以内で入力してください。',
  challenge: '課題は500文字以内で入力してください。',
  solution: '提供内容は500文字以内で入力してください。',
  outcome: '結果（定性的）は500文字以内で入力してください。',
  sourceNote: '出典メモは200文字以内で入力してください。',
  tags: 'タグは最大10件・各20文字以内で入力してください。',
};

// 保存条件接続（doc92）: 匿名化を外す保存が許諾台帳との突合で拒否されたときの表示文言。
// reason コードは query（error=ledger_〜）に載るが、画面には PII・証跡本文・抑止詳細を出さない。
const LEDGER_ERROR_MESSAGES: Record<string, string> = {
  noConsentRecord: '許諾台帳に登録がありません。匿名化を外して保存するには、先に「許諾台帳」から有効な行を登録してください。',
  tenantMismatch: '許諾台帳に有効な行がありません。「許諾台帳」の登録内容をご確認ください。',
  caseStudyMismatch: '許諾台帳に有効な行がありません。「許諾台帳」の登録内容をご確認ください。',
  revoked: '許諾が取り消されています。匿名化を外して保存するには、有効な許諾の再登録が必要です。',
  expired: '許諾の期限が切れています。匿名化を外して保存するには、有効な許諾の再登録が必要です。',
  purposeEmpty: '社内閲覧（internal_view）の用途を含む有効な許諾の登録が必要です。',
  unknownPurposeInLedger: '社内閲覧（internal_view）の用途を含む有効な許諾の登録が必要です。',
  purposeMismatch: '社内閲覧（internal_view）の用途を含む有効な許諾の登録が必要です。',
};
// suppressed 等の上記以外の理由は、詳細を出さずこの一般文言に丸める（doc92 §5-4）。
const LEDGER_ERROR_FALLBACK = '有効な許諾条件を満たしていません。匿名化を外して保存することはできません。';

export default async function EditCaseStudyPage({
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
        <PageHeader title="顧客事例の編集" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">編集権限がありません。</div>
      </div>
    );
  }

  const cs = await prisma.caseStudy.findFirst({
    where: { id, tenantId: user.tenantId, archivedAt: null },
    select: {
      id: true,
      title: true,
      body: true,
      industry: true,
      challenge: true,
      solution: true,
      outcome: true,
      anonymized: true,
      consentStatus: true,
      tags: true,
      label: true,
      sourceNote: true,
      externalAiAllowed: true,
    },
  });
  if (!cs) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="顧客事例の編集" />
      <div className="mb-3 space-y-1 text-xs text-muted-foreground">
        <p className="font-medium text-amber-700">
          ・顧客名・取引先名・成果数値・顧客の声は、許諾が記録されるまで書かないでください（匿名・架空の表現のみ）。
        </p>
        <p>・非公開（社内参照専用）のまま維持されます。公開機能はありません。</p>
        <p>・外部AI送信はこの画面では許可できません（現在の設定: {cs.externalAiAllowed ? '許可（マスキング必須）' : '禁止'}・この画面では変更されません）。</p>
      </div>
      {sp.error ? (
        <div className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
          {sp.error.startsWith('ledger_')
            ? (LEDGER_ERROR_MESSAGES[sp.error.slice('ledger_'.length)] ?? LEDGER_ERROR_FALLBACK)
            : (ERROR_MESSAGES[sp.error] ?? '入力内容を確認してください。')}
        </div>
      ) : null}
      <Card>
        <CardContent className="pt-4">
          <form action={updateCaseStudyAction} className="space-y-4">
            <input type="hidden" name="id" value={cs.id} />
            <div className="space-y-1.5">
              <label htmlFor="title" className="text-sm font-medium">タイトル（必須・120文字まで）</label>
              <Input id="title" name="title" required maxLength={120} defaultValue={cs.title} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="body" className="text-sm font-medium">本文（必須・5000文字まで）</label>
              <Textarea id="body" name="body" required rows={6} maxLength={5000} defaultValue={cs.body} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="industry" className="text-sm font-medium">業種（任意・80文字まで）</label>
                <Input id="industry" name="industry" maxLength={80} defaultValue={cs.industry ?? ''} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="tags" className="text-sm font-medium">タグ（任意・カンマ区切り・最大10件）</label>
                <Input id="tags" name="tags" defaultValue={cs.tags.join(',')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="challenge" className="text-sm font-medium">課題（任意・500文字まで）</label>
              <Textarea id="challenge" name="challenge" rows={2} maxLength={500} defaultValue={cs.challenge ?? ''} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="solution" className="text-sm font-medium">提供内容（任意・500文字まで）</label>
              <Textarea id="solution" name="solution" rows={2} maxLength={500} defaultValue={cs.solution ?? ''} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="outcome" className="text-sm font-medium">結果・定性的（任意・500文字まで）</label>
              <Textarea id="outcome" name="outcome" rows={2} maxLength={500} defaultValue={cs.outcome ?? ''} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="consentStatus" className="text-sm font-medium">許諾状態</label>
                <Select id="consentStatus" name="consentStatus" defaultValue={cs.consentStatus}>
                  <option value="none">許諾なし（匿名のみ）</option>
                  <option value="requested">許諾依頼中</option>
                  <option value="granted">許諾あり</option>
                  <option value="revoked">許諾取下げ</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="label" className="text-sm font-medium">機密ラベル</label>
                <Select id="label" name="label" defaultValue={cs.label === 'NORMAL' ? 'NORMAL' : 'INTERNAL'}>
                  <option value="NORMAL">通常</option>
                  <option value="INTERNAL">社内限</option>
                </Select>
                <p className="text-xs text-muted-foreground">高機密ラベルは扱いません。</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" name="anonymized" defaultChecked={cs.anonymized} className="h-4 w-4" />
                匿名化する（推奨・既定）
              </label>
              <p className="text-xs text-muted-foreground">
                チェックを外せるのは、許諾状態が「許諾あり」で、かつ許諾台帳に有効な行（社内閲覧の用途・期限内・取り消しなし）があるときだけです（保存時に機械確認されます）。
              </p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="sourceNote" className="text-sm font-medium">出典メモ（任意・200文字まで）</label>
              <Input id="sourceNote" name="sourceNote" maxLength={200} defaultValue={cs.sourceNote ?? ''} />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button type="submit">保存する</Button>
              <Link href="/brain/case-studies" className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent/60">
                キャンセル
              </Link>
              <Link
                href={`/brain/case-studies/${cs.id}/consents`}
                className="ml-auto rounded-md border border-border px-3 py-2 text-sm hover:bg-accent/60"
              >
                許諾台帳
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
