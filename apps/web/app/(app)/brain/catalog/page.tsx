import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, Table, Th, Td, Badge, EmptyState } from '@/components/ui';
import { LABEL_BADGE } from '@hokko/shared';

export const dynamic = 'force-dynamic';

// Company Brain（会社の頭脳）Phase 2-A-3a: read-only 一覧のみ。
// priceNote は営業説明用のテキストであり、価格計算・請求・課金には使わない。
// 作成・編集・削除・Server Action はまだ実装しない（Phase 2-A-3b・別承認）。

export default async function BrainCatalogPage() {
  const user = await requireUser();
  if (!hasPermission(user, 'knowledge', 'read')) {
    return (
      <div>
        <PageHeader title="会社の頭脳（商品カタログ）" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">閲覧権限がありません。</div>
      </div>
    );
  }

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
        この画面は Company Brain の read-only 確認用です。営業提案でAIが参照する「商品・サービスの説明」の一覧で、
        <span className="font-medium">作成・編集はまだできません</span>。価格メモは説明文であり、請求・課金には使いません。
      </div>
      <div className="mb-4 flex gap-2 text-sm">
        <Link href="/brain/policies" className="rounded-md px-2.5 py-1 text-muted-foreground hover:bg-accent/60">
          ← 会社方針
        </Link>
        <span className="rounded-md bg-accent px-2.5 py-1 font-medium">商品カタログ</span>
      </div>

      {items.length === 0 ? (
        <EmptyState title="商品カタログがまだ登録されていません" hint="デモデータ投入後に表示されます。" />
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
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
