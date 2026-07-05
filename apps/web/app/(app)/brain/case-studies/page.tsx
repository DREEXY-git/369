import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, Table, Th, Td, Badge, Button, EmptyState } from '@/components/ui';
import { LABEL_BADGE } from '@hokko/shared';
import { archiveCaseStudyAction } from './actions';

export const dynamic = 'force-dynamic';

// Company Brain（会社の頭脳）Phase 2-C-4: 顧客事例の一覧＋作成・編集・アーカイブ導線。
// 変更系は knowledge:create / knowledge:update を持つ人間のみ（AIロールは actions 側で一律拒否）。
// 物理削除なし（アーカイブ=archivedAt のソフト処理のみ）。tenantId スコープ必須。
// AI参照は未接続（2-C-5 の別承認）。externalAiAllowed を true にする UI は作らない。
// 顧客名・取引先名・成果数値・顧客の声は許諾なしに扱わない（doc71 §6-1）。表示対象は非公開（publishStatus='private'）
// かつ NORMAL / INTERNAL のみ。匿名化を外せるのは許諾あり（granted）のときだけ（actions 側で機械拒否）。
// anonymized=false（実名寄り）の本格扱い（doc95・doc94 §0）: INTERNAL_ONLY_RESTRICTED。
// - 一覧は badge_only: 実名寄り行にはバッジ（AI参照対象外・外部公開不可）のみ追加し、表示面を広げない。
// - 閲覧は knowledge_update_only: 実名寄り行のタイトル・本文断片は knowledge:update 保有者だけに表示する
//   （匿名化済み事例と通常一覧の閲覧は従来どおり）。
// - Customer マスタは join しない（title_body_only_no_customer_master_join・PII 表示面を増やさない）。

const CONSENT_STATUS_LABEL: Record<string, string> = {
  none: '許諾なし（匿名のみ）',
  requested: '許諾依頼中',
  granted: '許諾あり',
  revoked: '許諾取下げ',
};

export default async function BrainCaseStudiesPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  if (!hasPermission(user, 'knowledge', 'read')) {
    return (
      <div>
        <PageHeader title="会社の頭脳（顧客事例）" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">閲覧権限がありません。</div>
      </div>
    );
  }

  const canCreate = hasPermission(user, 'knowledge', 'create');
  const canUpdate = hasPermission(user, 'knowledge', 'update');

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
          顧客事例（Case Study）の一覧です。<span className="font-medium">この画面は社内参照専用です。権限がある人間ユーザーのみ作成・編集・アーカイブできます。AIは書き換えできません。</span>
        </p>
        <p>
          <span className="font-medium">外部に公開しない・外部AI送信禁止・非公開（private）のみ</span>。
          顧客名・取引先名・成果数値・顧客の声は<span className="font-medium">許諾なしに扱わない</span>運用です
          （匿名化を外せるのは許諾状態が「許諾あり」のときだけ・保存時に自動チェック）。
        </p>
      </div>
      {sp.denied ? (
        <div className="mb-3 rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">この操作を行う権限がありません。</div>
      ) : null}
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
        {canCreate ? (
          <div className="ml-auto">
            <Link
              href="/brain/case-studies/new"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              新規作成
            </Link>
          </div>
        ) : null}
      </div>

      {caseStudies.length === 0 ? (
        <EmptyState title="顧客事例がまだ登録されていません" hint="デモデータ投入後、または新規作成すると表示されます（匿名・架空の内容のみ）。" />
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
                {canUpdate ? <Th>操作</Th> : null}
              </tr>
            </thead>
            <tbody>
              {caseStudies.map((c) => {
                // 実名寄り（anonymized=false）の内容は knowledge:update 保有者だけに表示（knowledge_update_only・doc95）。
                const canViewRestricted = c.anonymized || canUpdate;
                return (
                <tr key={c.id} className="border-t border-border">
                  <Td>
                    {canViewRestricted ? (
                      <>
                        <div className="font-medium">{c.title}</div>
                        <div className="mt-0.5 line-clamp-2 max-w-md text-xs text-muted-foreground">{c.body}</div>
                        {c.tags.length > 0 ? (
                          <div className="mt-1 text-[11px] text-muted-foreground">タグ: {c.tags.join(' / ')}</div>
                        ) : null}
                      </>
                    ) : (
                      <div className="max-w-md text-xs text-muted-foreground">
                        <div className="font-medium text-foreground">実名寄り事例（閲覧制限）</div>
                        <div className="mt-0.5">実名寄り（匿名化オフ）の内容は、編集権限（knowledge:update）を持つ人だけが閲覧できます。</div>
                      </div>
                    )}
                  </Td>
                  <Td>
                    <div className="max-w-xs text-xs">
                      {canViewRestricted && c.industry ? <div>業種: {c.industry}</div> : null}
                      {canViewRestricted && c.challenge ? <div className="mt-0.5 text-muted-foreground">{c.challenge}</div> : null}
                    </div>
                  </Td>
                  <Td>
                    <div className="max-w-sm text-xs">
                      {canViewRestricted && c.solution ? <div className="line-clamp-2">{c.solution}</div> : null}
                      {canViewRestricted && c.outcome ? <div className="mt-0.5 line-clamp-2 text-muted-foreground">{c.outcome}</div> : null}
                    </div>
                  </Td>
                  <Td>
                    <div className="flex flex-col gap-1 text-xs">
                      <Badge tone={c.anonymized ? 'slate' : 'amber'}>{c.anonymized ? '匿名化済み' : '実名寄り（許諾あり）'}</Badge>
                      {c.anonymized ? null : (
                        <>
                          <Badge tone="slate">AI参照対象外</Badge>
                          <Badge tone="slate">外部公開不可</Badge>
                        </>
                      )}
                      <Badge tone="slate">{CONSENT_STATUS_LABEL[c.consentStatus] ?? c.consentStatus}</Badge>
                      <Badge tone="slate">{c.publishStatus === 'private' ? '非公開' : c.publishStatus}</Badge>
                    </div>
                  </Td>
                  <Td>
                    <Badge tone={LABEL_BADGE[c.label]?.tone ?? 'slate'}>{LABEL_BADGE[c.label]?.text ?? c.label}</Badge>
                  </Td>
                  {canUpdate ? (
                    <Td>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/brain/case-studies/${c.id}/edit`}
                          className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent/60"
                        >
                          編集
                        </Link>
                        <form action={archiveCaseStudyAction}>
                          <input type="hidden" name="id" value={c.id} />
                          <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
                            アーカイブ
                          </Button>
                        </form>
                      </div>
                    </Td>
                  ) : null}
                </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
