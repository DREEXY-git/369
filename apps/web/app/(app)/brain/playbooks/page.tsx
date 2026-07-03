import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, Table, Th, Td, Badge, EmptyState } from '@/components/ui';
import { LABEL_BADGE } from '@hokko/shared';

export const dynamic = 'force-dynamic';

// Company Brain（会社の頭脳）Phase 2-B-3: 営業プレイブックの read-only 一覧。
// 作成・編集・アーカイブ・Server Action は本画面には無い（書き込みは 2-B-4 の個別人間承認まで実装しない）。
// requireUser＋knowledge:read＋tenantId スコープ・archivedAt:null のみ表示。

const PLAYBOOK_TYPE_LABEL: Record<string, string> = {
  approach: '切り口',
  objection: '反論対応',
  preparation: '提案準備',
  talk_track: 'トーク',
};

export default async function BrainPlaybooksPage() {
  const user = await requireUser();
  if (!hasPermission(user, 'knowledge', 'read')) {
    return (
      <div>
        <PageHeader title="会社の頭脳（営業プレイブック）" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">閲覧権限がありません。</div>
      </div>
    );
  }

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
          「売り方の型」（切り口・反論対応・提案準備・トーク）の一覧です。<span className="font-medium">この画面は閲覧のみです。</span>
          顧客名・事例・顧客の声はここには載せません（事例は別領域で扱います）。
        </span>
      </div>
      <div className="mb-4 flex items-center gap-2 text-sm">
        <Link href="/brain/policies" className="rounded-md px-2.5 py-1 text-muted-foreground hover:bg-accent/60">
          ← 会社方針
        </Link>
        <Link href="/brain/catalog" className="rounded-md px-2.5 py-1 text-muted-foreground hover:bg-accent/60">
          商品カタログ
        </Link>
        <span className="rounded-md bg-accent px-2.5 py-1 font-medium">営業プレイブック</span>
      </div>

      {playbooks.length === 0 ? (
        <EmptyState title="営業プレイブックがまだ登録されていません" hint="デモデータ投入後に表示されます。" />
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
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
