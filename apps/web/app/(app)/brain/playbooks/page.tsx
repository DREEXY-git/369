import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, Table, Th, Td, Badge, Button, EmptyState } from '@/components/ui';
import { LABEL_BADGE } from '@hokko/shared';
import { archiveSalesPlaybookEntryAction } from './actions';

export const dynamic = 'force-dynamic';

// Company Brain（会社の頭脳）Phase 2-B-4: 営業プレイブックの一覧＋作成・編集・アーカイブ導線。
// 変更系は knowledge:create / knowledge:update を持つ人間のみ（AIロールは actions 側で一律拒否）。
// 物理削除なし（アーカイブ=archivedAt のソフト処理のみ）。tenantId スコープ必須。

const PLAYBOOK_TYPE_LABEL: Record<string, string> = {
  approach: '切り口',
  objection: '反論対応',
  preparation: '提案準備',
  talk_track: 'トーク',
};

export default async function BrainPlaybooksPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  if (!hasPermission(user, 'knowledge', 'read')) {
    return (
      <div>
        <PageHeader title="会社の頭脳（営業プレイブック）" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">閲覧権限がありません。</div>
      </div>
    );
  }

  const canCreate = hasPermission(user, 'knowledge', 'create');
  const canUpdate = hasPermission(user, 'knowledge', 'update');

  const playbooks = await prisma.salesPlaybookEntry.findMany({
    where: { tenantId: user.tenantId, archivedAt: null },
    orderBy: [{ playbookType: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      title: true,
      body: true,
      category: true,
      playbookType: true,
      targetIndustry: true,
      targetSituation: true,
      recommendedTalkTrack: true,
      doNotSay: true,
      tags: true,
      label: true,
    },
  });

  return (
    <div>
      <PageHeader title="会社の頭脳（営業プレイブック）" />
      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span>
          「売り方の型」（切り口・反論対応・提案準備・トーク）の一覧です。
          <span className="font-medium">権限がある人間ユーザーのみ作成・編集・アーカイブできます。AIは書き換えできません。</span>
          顧客名・事例・顧客の声はここには載せません（事例は別領域で扱います）。
        </span>
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
        <span className="rounded-md bg-accent px-2.5 py-1 font-medium">営業プレイブック</span>
        {canCreate ? (
          <div className="ml-auto">
            <Link
              href="/brain/playbooks/new"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              新規作成
            </Link>
          </div>
        ) : null}
      </div>

      {playbooks.length === 0 ? (
        <EmptyState title="営業プレイブックがまだ登録されていません" hint="デモデータ投入後、または新規作成すると表示されます。" />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>型</Th>
                <Th>種類</Th>
                <Th>対象</Th>
                <Th>推奨トーク / 言わないこと</Th>
                <Th>機密ラベル</Th>
                {canUpdate ? <Th>操作</Th> : null}
              </tr>
            </thead>
            <tbody>
              {playbooks.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <Td>
                    <div className="font-medium">{p.title}</div>
                    <div className="mt-0.5 line-clamp-2 max-w-md text-xs text-muted-foreground">{p.body}</div>
                    {p.tags.length > 0 ? (
                      <div className="mt-1 text-[11px] text-muted-foreground">タグ: {p.tags.join(' / ')}</div>
                    ) : null}
                  </Td>
                  <Td>
                    <Badge tone="slate">{PLAYBOOK_TYPE_LABEL[p.playbookType] ?? p.playbookType}</Badge>
                    <div className="mt-0.5 text-xs text-muted-foreground">{p.category}</div>
                  </Td>
                  <Td>
                    <div className="text-xs">
                      {p.targetIndustry ? <div>業種: {p.targetIndustry}</div> : null}
                      {p.targetSituation ? <div className="text-muted-foreground">{p.targetSituation}</div> : null}
                    </div>
                  </Td>
                  <Td>
                    <div className="max-w-sm text-xs">
                      {p.recommendedTalkTrack ? <div className="line-clamp-2">{p.recommendedTalkTrack}</div> : null}
                      {p.doNotSay ? (
                        <div className="mt-0.5 line-clamp-2 text-amber-700">言わない: {p.doNotSay}</div>
                      ) : null}
                    </div>
                  </Td>
                  <Td>
                    <Badge tone={LABEL_BADGE[p.label]?.tone ?? 'slate'}>{LABEL_BADGE[p.label]?.text ?? p.label}</Badge>
                  </Td>
                  {canUpdate ? (
                    <Td>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/brain/playbooks/${p.id}/edit`}
                          className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent/60"
                        >
                          編集
                        </Link>
                        <form action={archiveSalesPlaybookEntryAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
                            アーカイブ
                          </Button>
                        </form>
                      </div>
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
