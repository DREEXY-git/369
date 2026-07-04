import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, Table, Th, Td, Badge, EmptyState } from '@/components/ui';
import { LABEL_BADGE } from '@hokko/shared';

export const dynamic = 'force-dynamic';

// Company Brain（会社の頭脳）Phase 2-C-3: 顧客事例（Case Study）の閲覧専用一覧。
// この画面は read-only。作成・編集・アーカイブ・削除・Server Action は存在しない（書き込みは 2-C-4 の別承認）。
// AI参照も未接続（2-C-5 の別承認）。externalAiAllowed を true にする UI は作らない。
// 顧客名・取引先名・成果数値・顧客の声は許諾なしに扱わない（doc71 §6-1）。表示対象は非公開（publishStatus='private'）
// かつ NORMAL / INTERNAL のみ。tenantId スコープ必須・archivedAt: null。

const CONSENT_STATUS_LABEL: Record<string, string> = {
  none: '許諾なし（匿名のみ）',
  requested: '許諾依頼中',
  granted: '許諾あり',
  revoked: '許諾取下げ',
};

export default async function BrainCaseStudiesPage() {
  const user = await requireUser();
  if (!hasPermission(user, 'knowledge', 'read')) {
    return (
      <div>
        <PageHeader title="会社の頭脳（顧客事例）" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">閲覧権限がありません。</div>
      </div>
    );
  }

  const caseStudies = await prisma.caseStudy.findMany({
    where: {
      tenantId: user.tenantId,
      archivedAt: null,
      publishStatus: 'private',
      label: { in: ['NORMAL', 'INTERNAL'] },
    },
    orderBy: [{ industry: 'asc' }, { createdAt: 'asc' }],
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
      publishStatus: true,
      tags: true,
      label: true,
    },
  });

  return (
    <div>
      <PageHeader title="会社の頭脳（顧客事例）" />
      <div className="mb-3 space-y-1 text-xs text-muted-foreground">
        <p>
          顧客事例（Case Study）の一覧です。<span className="font-medium">この画面は社内参照専用の閲覧のみ（read-only）です。</span>
          現在表示されているのはすべて<span className="font-medium">架空デモデータ</span>です。
        </p>
        <p>
          <span className="font-medium">外部に公開しない・外部AI送信禁止</span>。
          顧客名・取引先名・成果数値・顧客の声は<span className="font-medium">許諾なしに扱わない</span>運用です（許諾が記録されるまで匿名・架空のみ）。
          作成・編集・アーカイブ機能はまだありません（次の段の個別承認から）。
        </p>
      </div>
      <div className="mb-4 flex items-center gap-2 text-sm">
        <Link href="/brain/policies" className="rounded-md px-2.5 py-1 text-muted-foreground hover:bg-accent/60">
          ← 会社方針
        </Link>
        <Link href="/brain/catalog" className="rounded-md px-2.5 py-1 text-muted-foreground hover:bg-accent/60">
          商品カタログ
        </Link>
        <Link href="/brain/playbooks" className="rounded-md px-2.5 py-1 text-muted-foreground hover:bg-accent/60">
          営業プレイブック
        </Link>
        <span className="rounded-md bg-accent px-2.5 py-1 font-medium">顧客事例</span>
      </div>

      {caseStudies.length === 0 ? (
        <EmptyState title="顧客事例がまだ登録されていません" hint="デモデータ投入後に表示されます（この段階では閲覧のみ）。" />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>事例</Th>
                <Th>業種 / 課題</Th>
                <Th>提供内容 / 結果（定性的）</Th>
                <Th>匿名化・許諾・公開状態</Th>
                <Th>機密ラベル</Th>
              </tr>
            </thead>
            <tbody>
              {caseStudies.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <Td>
                    <div className="font-medium">{c.title}</div>
                    <div className="mt-0.5 line-clamp-2 max-w-md text-xs text-muted-foreground">{c.body}</div>
                    {c.tags.length > 0 ? (
                      <div className="mt-1 text-[11px] text-muted-foreground">タグ: {c.tags.join(' / ')}</div>
                    ) : null}
                  </Td>
                  <Td>
                    <div className="max-w-xs text-xs">
                      {c.industry ? <div>業種: {c.industry}</div> : null}
                      {c.challenge ? <div className="mt-0.5 text-muted-foreground">{c.challenge}</div> : null}
                    </div>
                  </Td>
                  <Td>
                    <div className="max-w-sm text-xs">
                      {c.solution ? <div className="line-clamp-2">{c.solution}</div> : null}
                      {c.outcome ? <div className="mt-0.5 line-clamp-2 text-muted-foreground">{c.outcome}</div> : null}
                    </div>
                  </Td>
                  <Td>
                    <div className="flex flex-col gap-1 text-xs">
                      <Badge tone={c.anonymized ? 'slate' : 'amber'}>{c.anonymized ? '匿名化済み' : '要確認'}</Badge>
                      <Badge tone="slate">{CONSENT_STATUS_LABEL[c.consentStatus] ?? c.consentStatus}</Badge>
                      <Badge tone="slate">{c.publishStatus === 'private' ? '非公開' : c.publishStatus}</Badge>
                    </div>
                  </Td>
                  <Td>
                    <Badge tone={LABEL_BADGE[c.label]?.tone ?? 'slate'}>{LABEL_BADGE[c.label]?.text ?? c.label}</Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
