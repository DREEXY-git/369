import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, Table, Th, Td, Badge, EmptyState } from '@/components/ui';
import { LABEL_BADGE } from '@hokko/shared';

export const dynamic = 'force-dynamic';

// Company Brain（会社の頭脳）Phase 2-A-3a: read-only 一覧のみ。
// 作成・編集・削除・Server Action はまだ実装しない（Phase 2-A-3b・別承認）。
// tenantId スコープ必須・knowledge:read 権限必須・外部AI送信可否と機密ラベルを明示する。

export default async function BrainPoliciesPage() {
  const user = await requireUser();
  if (!hasPermission(user, 'knowledge', 'read')) {
    return (
      <div>
        <PageHeader title="会社の頭脳（会社方針）" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">閲覧権限がありません。</div>
      </div>
    );
  }

  const policies = await prisma.companyPolicy.findMany({
    where: { tenantId: user.tenantId, archivedAt: null },
    orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      title: true,
      body: true,
      category: true,
      status: true,
      label: true,
      externalAiAllowed: true,
      updatedAt: true,
    },
  });

  return (
    <div>
      <PageHeader title="会社の頭脳（会社方針）" />
      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span>
          この画面は Company Brain の read-only 確認用です。会社方針を AI が「会社の文脈」として参照できるようにDB化した最初の一覧で、
          <span className="font-medium">作成・編集はまだできません</span>（次の段階で承認後に追加します）。
        </span>
      </div>
      <div className="mb-4 flex gap-2 text-sm">
        <span className="rounded-md bg-accent px-2.5 py-1 font-medium">会社方針</span>
        <Link href="/brain/catalog" className="rounded-md px-2.5 py-1 text-muted-foreground hover:bg-accent/60">
          商品カタログ →
        </Link>
      </div>

      {policies.length === 0 ? (
        <EmptyState title="会社方針がまだ登録されていません" hint="デモデータ投入後に表示されます。" />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>方針</Th>
                <Th>分類</Th>
                <Th>状態</Th>
                <Th>機密ラベル</Th>
                <Th>外部AI送信可否</Th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <Td>
                    <div className="font-medium">{p.title}</div>
                    <div className="mt-0.5 line-clamp-2 max-w-xl text-xs text-muted-foreground">{p.body}</div>
                  </Td>
                  <Td>{p.category}</Td>
                  <Td>
                    <Badge tone={p.status === 'active' ? 'green' : 'slate'}>
                      {p.status === 'active' ? '有効' : p.status}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge tone={LABEL_BADGE[p.label]?.tone ?? 'slate'}>{LABEL_BADGE[p.label]?.text ?? p.label}</Badge>
                  </Td>
                  <Td>
                    <Badge tone={p.externalAiAllowed ? 'amber' : 'slate'}>
                      {p.externalAiAllowed ? '許可（マスキング必須）' : '禁止'}
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
