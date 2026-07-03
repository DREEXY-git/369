import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, Table, Th, Td, Badge, Button, EmptyState } from '@/components/ui';
import { LABEL_BADGE } from '@hokko/shared';
import { archiveProductCatalogItemAction } from './actions';

export const dynamic = 'force-dynamic';

// Company Brain（商品カタログ）Phase 2-A-3b-2: 一覧＋作成・編集・アーカイブ導線。
// 変更系は knowledge:create / knowledge:update を持つ人間のみ（AI は actions 側で一律拒否）。
// 物理削除なし（アーカイブ=archivedAt のソフト処理のみ）。tenantId スコープ必須。
// priceNote は説明テキストのみで、価格計算・請求・課金には使わない。

export default async function BrainCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  if (!hasPermission(user, 'knowledge', 'read')) {
    return (
      <div>
        <PageHeader title="会社の頭脳（商品カタログ）" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">閲覧権限がありません。</div>
      </div>
    );
  }

  const canCreate = hasPermission(user, 'knowledge', 'create');
  const canUpdate = hasPermission(user, 'knowledge', 'update');

  const items = await prisma.productCatalogItem.findMany({
    where: { tenantId: user.tenantId, archivedAt: null },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      targetPain: true,
      strengths: true,
      priceNote: true,
      status: true,
      label: true,
      externalAiAllowed: true,
    },
  });

  return (
    <div>
      <PageHeader title="会社の頭脳（商品カタログ）" />
      <div className="mb-3 text-xs text-muted-foreground">
        営業提案でAIが参照する「商品・サービスの説明」の一覧です。
        {canCreate || canUpdate ? (
          <span>権限に応じて作成・編集・アーカイブができます（外部AI送信の許可はこの画面では変更できません）。</span>
        ) : (
          <span className="font-medium">あなたの権限では閲覧のみ可能です。</span>
        )}
        価格メモは説明文であり、請求・課金には使いません。
      </div>
      {sp.denied ? (
        <div className="mb-3 rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">この操作を行う権限がありません。</div>
      ) : null}
      <div className="mb-4 flex items-center gap-2 text-sm">
        <Link href="/brain/policies" className="rounded-md px-2.5 py-1 text-muted-foreground hover:bg-accent/60">
          ← 会社方針
        </Link>
        <span className="rounded-md bg-accent px-2.5 py-1 font-medium">商品カタログ</span>
        {canCreate ? (
          <div className="ml-auto">
            <Link
              href="/brain/catalog/new"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              新規作成
            </Link>
          </div>
        ) : null}
      </div>

      {items.length === 0 ? (
        <EmptyState title="商品カタログがまだ登録されていません" hint="デモデータ投入後、または新規作成すると表示されます。" />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>商品・サービス</Th>
                <Th>分類</Th>
                <Th>解決する課題</Th>
                <Th>価格メモ</Th>
                <Th>機密ラベル</Th>
                <Th>外部AI送信可否</Th>
                {canUpdate ? <Th>操作</Th> : null}
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t border-border">
                  <Td>
                    <div className="font-medium">{it.name}</div>
                    <div className="mt-0.5 line-clamp-2 max-w-md text-xs text-muted-foreground">{it.description}</div>
                  </Td>
                  <Td>{it.category}</Td>
                  <Td>
                    <div className="max-w-xs text-xs">{it.targetPain ?? '—'}</div>
                  </Td>
                  <Td>
                    <div className="max-w-[180px] text-xs text-muted-foreground">{it.priceNote ?? '—'}</div>
                  </Td>
                  <Td>
                    <Badge tone={LABEL_BADGE[it.label]?.tone ?? 'slate'}>{LABEL_BADGE[it.label]?.text ?? it.label}</Badge>
                  </Td>
                  <Td>
                    <Badge tone={it.externalAiAllowed ? 'amber' : 'slate'}>
                      {it.externalAiAllowed ? '許可（マスキング必須）' : '禁止'}
                    </Badge>
                  </Td>
                  {canUpdate ? (
                    <Td>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/brain/catalog/${it.id}/edit`}
                          className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent/60"
                        >
                          編集
                        </Link>
                        <form action={archiveProductCatalogItemAction}>
                          <input type="hidden" name="id" value={it.id} />
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
