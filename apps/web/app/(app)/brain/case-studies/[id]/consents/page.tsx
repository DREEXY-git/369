import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, Table, Th, Td, Badge, Button, EmptyState } from '@/components/ui';
import { CASE_STUDY_CONSENT_PURPOSE_LABEL, formatConsentDate } from './purpose-labels';
import { revokeCaseStudyConsentAction } from './actions';

export const dynamic = 'force-dynamic';

// CaseStudyConsent（許諾台帳）一覧（doc86 §4 準拠・事例単位＝ルート案1）。
// - 閲覧は knowledge:read・tenantId スコープ。対象 CaseStudy は非公開（private）・NORMAL/INTERNAL のみ。
// - 登録・取り消しは knowledge:update を持つ人間のみ（AIロールは actions 側で一律拒否）。
// - 表示するのは所在説明・用途・期限など台帳情報のみ。Customer の氏名・メール・電話は表示しない（PII 非複製）。
// - 物理削除なし: 取り消し（revoke）でも行は残る（取り消し履歴も台帳の一部）。
// - この画面は AI 参照条件に影響しない（CaseStudyConsent は AI 文脈へ注入しない）。

export default async function CaseStudyConsentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  if (!hasPermission(user, 'knowledge', 'read')) {
    return (
      <div>
        <PageHeader title="許諾台帳" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">閲覧権限がありません。</div>
      </div>
    );
  }

  const caseStudy = await prisma.caseStudy.findFirst({
    where: {
      id,
      tenantId: user.tenantId,
      archivedAt: null,
      publishStatus: 'private',
      label: { in: ['NORMAL', 'INTERNAL'] },
    },
    select: { id: true, title: true, customerId: true },
  });
  if (!caseStudy) notFound();

  const canUpdate = hasPermission(user, 'knowledge', 'update');

  const consents = await prisma.caseStudyConsent.findMany({
    where: { tenantId: user.tenantId, caseStudyId: caseStudy.id },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <PageHeader title="許諾台帳" />
      <div className="mb-3 space-y-1 text-xs text-muted-foreground">
        <p>
          顧客事例「<span className="font-medium">{caseStudy.title}</span>」の許諾台帳です。
          <span className="font-medium">登録・取り消しは権限がある人間ユーザーのみ。AIは操作できません。すべて監査ログに記録されます。</span>
        </p>
        <p>
          証跡欄は<span className="font-medium">所在説明のみ</span>（原本・メール本文・個人情報は貼らない運用）。
          取り消しても行は消えません（取り消し履歴も台帳の一部）。
          <span className="font-medium">この台帳を登録しても、AIが読める事例は匿名化済みだけのままです（AI参照条件は変わりません）。</span>
        </p>
      </div>
      <div className="mb-4 flex items-center gap-2 text-sm">
        <Link href="/brain/case-studies" className="rounded-md px-2.5 py-1 text-muted-foreground hover:bg-accent/60">
          ← 顧客事例一覧
        </Link>
        {canUpdate ? (
          <div className="ml-auto">
            <Link
              href={`/brain/case-studies/${caseStudy.id}/consents/new`}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              許諾を登録
            </Link>
          </div>
        ) : null}
      </div>

      {consents.length === 0 ? (
        <EmptyState title="この事例の許諾はまだ登録されていません" hint="許諾が取れたら「許諾を登録」から記録します（証跡は所在説明のみ）。" />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>状態</Th>
                <Th>用途</Th>
                <Th>証跡（所在説明）</Th>
                <Th>許諾日 / 有効期限</Th>
                <Th>詳細</Th>
                {canUpdate ? <Th>操作</Th> : null}
              </tr>
            </thead>
            <tbody>
              {consents.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <Td>
                    <Badge tone={c.revokedAt ? 'amber' : 'slate'}>
                      {c.revokedAt ? '取り消し済み' : '有効（登録済み）'}
                    </Badge>
                    {c.revokedAt ? (
                      <div className="mt-1 text-[11px] text-muted-foreground">取り消し日: {formatConsentDate(c.revokedAt)}</div>
                    ) : null}
                  </Td>
                  <Td>
                    <div className="flex max-w-xs flex-wrap gap-1">
                      {c.purpose.map((p) => (
                        <Badge key={p} tone="slate">{CASE_STUDY_CONSENT_PURPOSE_LABEL[p] ?? p}</Badge>
                      ))}
                    </div>
                  </Td>
                  <Td>
                    <div className="line-clamp-2 max-w-sm text-xs text-muted-foreground">{c.evidence}</div>
                  </Td>
                  <Td>
                    <div className="text-xs">
                      <div>{formatConsentDate(c.grantedAt)}</div>
                      <div className="text-muted-foreground">期限: {formatConsentDate(c.expiresAt)}</div>
                    </div>
                  </Td>
                  <Td>
                    <Link
                      href={`/brain/case-studies/${caseStudy.id}/consents/${c.id}`}
                      className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent/60"
                    >
                      詳細
                    </Link>
                  </Td>
                  {canUpdate ? (
                    <Td>
                      {c.revokedAt ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <form action={revokeCaseStudyConsentAction}>
                          <input type="hidden" name="consentId" value={c.id} />
                          <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
                            取り消す
                          </Button>
                        </form>
                      )}
                    </Td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
