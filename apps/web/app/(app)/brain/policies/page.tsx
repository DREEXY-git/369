import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, Table, Th, Td, Badge, Button, EmptyState } from '@/components/ui';
import { LABEL_BADGE } from '@hokko/shared';
import { archiveCompanyPolicyAction } from './actions';

export const dynamic = 'force-dynamic';

// Company Brain（会社の頭脳）Phase 2-A-3b-1: 一覧＋作成・編集・アーカイブ導線。
// 変更系は knowledge:create / knowledge:update を持つ人間のみ（AI は update を持たない）。
// 物理削除なし（アーカイブ=archivedAt のソフト処理のみ）。tenantId スコープ必須。

export default async function BrainPoliciesPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  if (!hasPermission(user, 'knowledge', 'read')) {
    return (
      <div>
        <PageHeader title="会社の頭脳（会社方針）" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">閲覧権限がありません。</div>
      </div>
    );
  }

  const canCreate = hasPermission(user, 'knowledge', 'create');
  const canUpdate = hasPermission(user, 'knowledge', 'update');

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
          会社方針を AI が「会社の文脈」として参照できるようにDB化した一覧です。
          {canCreate || canUpdate ? (
            <span>権限に応じて作成・編集・アーカイブができます（外部AI送信の許可はこの画面では変更できません）。</span>
          ) : (
            <span className="font-medium">あなたの権限では閲覧のみ可能です。</span>
          )}
        </span>
      </div>
      {sp.denied ? (
        <div className="mb-3 rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">この操作を行う権限がありません。</div>
      ) : null}
      <div className="mb-4 flex items-center gap-2 text-sm">
        <span className="rounded-md bg-accent px-2.5 py-1 font-medium">会社方針</span>
        <Link href="/brain/catalog" className="rounded-md px-2.5 py-1 text-muted-foreground hover:bg-accent/60">
          商品カタログ →
        </Link>
        {canCreate ? (
          <div className="ml-auto">
            <Link
              href="/brain/policies/new"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              新規作成
            </Link>
          </div>
        ) : null}
      </div>

      {policies.length === 0 ? (
        <EmptyState title="会社方針がまだ登録されていません" hint="デモデータ投入後、または新規作成すると表示されます。" />
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
                {canUpdate ? <Th>操作</Th> : null}
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
                      {p.status === 'active' ? '有効' : p.status === 'draft' ? '下書き' : p.status}
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
                  {canUpdate ? (
                    <Td>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/brain/policies/${p.id}/edit`}
                          className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent/60"
                        >
                          編集
                        </Link>
                        <form action={archiveCompanyPolicyAction}>
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
