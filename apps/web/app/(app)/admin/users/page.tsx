import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { ROLE_LABEL } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Table, Th, Td, Badge } from '@/components/ui';
import { ROLE_PERMISSIONS, type RoleKey } from '@hokko/shared';
import { formatDateTime } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const user = await requireUser();
  // 認可ガード: ユーザー/RBAC 管理は管理職以上のみ（兄弟 admin ページと整合）。
  // STAFF / DEPARTMENT_MANAGER / AI / 外部ロールは admin:read を持たないため遮断する。
  if (!hasPermission(user, 'admin', 'read')) {
    return (
      <div>
        <PageHeader title="ユーザー・権限" description="ユーザーとロール（RBAC）を管理します。" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          閲覧権限がありません（社長・役員・管理者のみ）。
        </div>
      </div>
    );
  }
  const [users, roles] = await Promise.all([
    prisma.user.findMany({ where: { tenantId: user.tenantId }, include: { userRoles: { include: { role: true } } }, orderBy: { createdAt: 'asc' } }),
    prisma.role.findMany({ where: { tenantId: user.tenantId }, orderBy: { key: 'asc' } }),
  ]);

  return (
    <div>
      <PageHeader title="ユーザー・権限" description="ユーザーとロール（RBAC）を管理します。AIも権限を持つ主体として扱われます。" />

      <Card className="mb-4">
        <CardHeader><CardTitle>ユーザー</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <thead><tr><Th>名前</Th><Th>メール</Th><Th>ロール</Th><Th>種別</Th><Th>最終ログイン</Th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <Td className="font-medium">{u.name}</Td>
                  <Td className="font-mono text-xs">{u.email}</Td>
                  <Td>{u.userRoles.map((ur) => <Badge key={ur.id} tone={ur.role.key.startsWith('AI') ? 'purple' : 'blue'} className="mr-1">{ROLE_LABEL[ur.role.key as RoleKey]}</Badge>)}</Td>
                  <Td>{u.isAiAgent ? <Badge tone="purple">AI</Badge> : <Badge tone="slate">人間</Badge>}</Td>
                  <Td className="text-xs text-muted-foreground">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : '—'}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>ロールと権限（RBAC）</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <thead><tr><Th>ロール</Th><Th>権限数</Th><Th>主な権限</Th></tr></thead>
            <tbody>
              {roles.map((r) => {
                const perms = ROLE_PERMISSIONS[r.key as RoleKey] ?? [];
                return (
                  <tr key={r.id}>
                    <Td className="font-medium">{ROLE_LABEL[r.key as RoleKey]} <span className="text-xs text-muted-foreground">({r.key})</span></Td>
                    <Td>{perms.includes('*') ? '全権限' : perms.length}</Td>
                    <Td className="text-xs text-muted-foreground">{perms.slice(0, 6).join(', ')}{perms.length > 6 ? ' …' : ''}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
