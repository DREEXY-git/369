import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, Button, Input, Textarea } from '@/components/ui';
import { CASE_STUDY_CONSENT_PURPOSE_LABEL } from '../purpose-labels';
import { createCaseStudyConsentAction } from '../actions';

export const dynamic = 'force-dynamic';

// CaseStudyConsent（許諾台帳）新規登録（doc86 §5 準拠）。
// - 登録できるのは knowledge:update を持つ人間のみ（AIロールは actions 側で一律拒否）。
// - status は granted 固定（画面から変更不可）。取り消しは一覧/詳細の revoke から。
// - customerId の入力欄は無い（Customer picker は作らない・CaseStudy.customerId を自動反映・PII 非複製）。
// - evidence は証跡の所在説明のみ。原本本文・メール本文・個人情報を貼らない（下のガイドを参照）。
// - expiresAt は必須（期限なし許諾は認めない）。

const PURPOSE_OPTIONS = ['internal_view', 'ai_reference', 'external_publish', 'pr', 'seo', 'customer_voice'] as const;

const ERROR_MESSAGES: Record<string, string> = {
  purpose: '用途を1つ以上選択してください（用途の記載がない許諾は登録できません）。',
  evidence: '証跡の所在説明を1〜1000文字で入力してください（原本や個人情報は貼らないでください）。',
  grantedAt: '許諾日を入力してください。',
  expiresAt: '有効期限を入力してください（期限なし許諾は登録できません）。',
  expiresBeforeGranted: '有効期限は許諾日より後の日付にしてください。',
  note: '補足は500文字以内で入力してください。',
};

export default async function NewCaseStudyConsentPage({
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
        <PageHeader title="許諾の登録" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">登録権限がありません。</div>
      </div>
    );
  }

  const caseStudy = await prisma.caseStudy.findFirst({
    where: { id, tenantId: user.tenantId, archivedAt: null, publishStatus: 'private' },
    select: { id: true, title: true, customerId: true },
  });
  if (!caseStudy) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="許諾の登録" />
      <div className="mb-3 space-y-1 text-xs text-muted-foreground">
        <p>
          顧客事例「<span className="font-medium">{caseStudy.title}</span>」への許諾を記録します。登録すると監査ログに残ります。
        </p>
        <p className="font-medium text-amber-700">
          ・証跡欄には所在説明のみを書いてください（例: 2026-07-01 受領の許諾書面・保管場所メモ）。原本の本文・メール本文・個人情報（氏名/メール/電話）は貼らないでください。
        </p>
        <p>・顧客の氏名等はこの台帳に複製しません（事例に顧客IDが登録されていれば自動で紐づきます）。</p>
        <p>・この登録によって AI が読める範囲は変わりません（匿名化済みの事例のみのまま）。外部公開も始まりません。</p>
      </div>
      {sp.error ? (
        <div className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
          {ERROR_MESSAGES[sp.error] ?? '入力内容を確認してください。'}
        </div>
      ) : null}
      <Card>
        <CardContent className="pt-4">
          <form action={createCaseStudyConsentAction} className="space-y-4">
            <input type="hidden" name="caseStudyId" value={caseStudy.id} />
            <div className="space-y-1.5">
              <p className="text-sm font-medium">許諾された用途（必須・1つ以上）</p>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {PURPOSE_OPTIONS.map((p) => (
                  <label key={p} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="purpose" value={p} className="h-4 w-4" />
                    {CASE_STUDY_CONSENT_PURPOSE_LABEL[p]}（{p}）
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                チェックした用途だけが「許諾済み」として記録されます（書いていない用途は不許可のまま）。外部公開・PR・SEO・顧客の声掲載は、記録しても実施には別途の人間承認が必要です。
              </p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="evidence" className="text-sm font-medium">証跡の所在説明（必須・1000文字まで）</label>
              <Textarea id="evidence" name="evidence" required rows={3} maxLength={1000} placeholder="例: 2026-07-01 受領の許諾書面（社内共有フォルダの保管場所メモ）" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="grantedAt" className="text-sm font-medium">許諾日（必須）</label>
                <Input id="grantedAt" name="grantedAt" type="date" required />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="expiresAt" className="text-sm font-medium">有効期限（必須）</label>
                <Input id="expiresAt" name="expiresAt" type="date" required />
                <p className="text-xs text-muted-foreground">期限なし許諾は登録できません。</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="note" className="text-sm font-medium">補足（任意・500文字まで）</label>
              <Textarea id="note" name="note" rows={2} maxLength={500} placeholder="補足メモ（個人情報は書かないでください）" />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button type="submit">登録する</Button>
              <Link
                href={`/brain/case-studies/${caseStudy.id}/consents`}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent/60"
              >
                キャンセル
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
