import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, Badge, Button } from '@/components/ui';
import { CASE_STUDY_CONSENT_PURPOSE_LABEL, formatConsentDate } from '../purpose-labels';
import { revokeCaseStudyConsentAction } from '../actions';

export const dynamic = 'force-dynamic';

// CaseStudyConsent（許諾台帳）詳細（doc86 §5 準拠）。
// - 表示は台帳情報のみ。Customer の氏名・メール・電話は表示しない（customerId の ID までに留める・PII 非複製）。
// - revoke できるのは knowledge:update を持つ人間のみ・未取り消しの行だけ（行は削除しない）。

export default async function CaseStudyConsentDetailPage({
  params,
}: {
  params: Promise<{ id: string; consentId: string }>;
}) {
  const user = await requireUser();
  const { id, consentId } = await params;
  if (!hasPermission(user, 'knowledge', 'read')) {
    return (
      <div>
        <PageHeader title="許諾の詳細" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">閲覧権限がありません。</div>
      </div>
    );
  }

  const caseStudy = await prisma.caseStudy.findFirst({
    where: { id, tenantId: user.tenantId, archivedAt: null, publishStatus: 'private' },
    select: { id: true, title: true },
  });
  if (!caseStudy) notFound();

  const consent = await prisma.caseStudyConsent.findFirst({
    where: { id: consentId, tenantId: user.tenantId, caseStudyId: caseStudy.id },
  });
  if (!consent) notFound();

  const canUpdate = hasPermission(user, 'knowledge', 'update');
  const isRevoked = consent.revokedAt !== null;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="許諾の詳細" />
      <div className="mb-3 text-xs text-muted-foreground">
        顧客事例「<span className="font-medium">{caseStudy.title}</span>」の許諾記録です。行の削除はできません（取り消しても履歴として残ります）。
      </div>
      <Card>
        <CardContent className="space-y-3 pt-4 text-sm">
          <div className="flex items-center gap-2">
            <Badge tone={isRevoked ? 'amber' : 'slate'}>{isRevoked ? '取り消し済み' : '有効（登録済み）'}</Badge>
            {isRevoked && consent.revokedAt ? (
              <span className="text-xs text-muted-foreground">取り消し日: {formatConsentDate(consent.revokedAt)}</span>
            ) : null}
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">用途</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {consent.purpose.map((p) => (
                <Badge key={p} tone="slate">{CASE_STUDY_CONSENT_PURPOSE_LABEL[p] ?? p}</Badge>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">証跡（所在説明のみ）</div>
            <p className="mt-1 whitespace-pre-wrap text-sm">{consent.evidence}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs font-medium text-muted-foreground">許諾日</div>
              <div>{formatConsentDate(consent.grantedAt)}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">有効期限</div>
              <div>{formatConsentDate(consent.expiresAt)}</div>
            </div>
          </div>
          {consent.note ? (
            <div>
              <div className="text-xs font-medium text-muted-foreground">補足</div>
              <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{consent.note}</p>
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-3 text-xs text-muted-foreground sm:grid-cols-2">
            <div>事例ID: {consent.caseStudyId}</div>
            <div>顧客ID: {consent.customerId ?? '（未紐づけ）'}</div>
            <div>登録: {formatConsentDate(consent.createdAt)}</div>
            <div>更新: {formatConsentDate(consent.updatedAt)}</div>
          </div>
          <div className="flex items-center gap-2 border-t border-border pt-3">
            <Link
              href={`/brain/case-studies/${caseStudy.id}/consents`}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent/60"
            >
              ← 許諾台帳へ戻る
            </Link>
            {canUpdate && !isRevoked ? (
              <form action={revokeCaseStudyConsentAction} className="ml-auto">
                <input type="hidden" name="consentId" value={consent.id} />
                <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
                  取り消す
                </Button>
              </form>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
