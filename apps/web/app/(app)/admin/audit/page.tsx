import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, Table, Th, Td, Badge, EmptyState } from '@/components/ui';
import { LabelBadge } from '@/components/badges';
import { formatDateTime } from '@hokko/shared';

export const dynamic = 'force-dynamic';

// この画面が必要とする最小限の行の型（Prisma スキーマの対応カラムに一致）。
// Prisma Client が未生成のビルド環境でも型が一意に決まるよう、画面用に明示定義する。
type AuditRow = {
  id: string;
  actorId: string | null;
  actorType: string;
  action: string;
  entityType: string;
  summary: string;
  createdAt: Date;
};
type AccessRow = {
  id: string;
  actorId: string | null;
  actorType: string;
  entityType: string;
  label: string;
  purpose: string;
  createdAt: Date;
};
type UserRow = { id: string; name: string };

export default async function AuditPage() {
  const user = await requireUser();
  const canView = hasPermission(user, 'audit', 'read');

  const [audit, access, users] = await Promise.all([
    prisma.auditLog.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.dataAccessLog.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: 'desc' }, take: 30 }),
    prisma.user.findMany({ where: { tenantId: user.tenantId }, select: { id: true, name: true } }),
  ]);
  const userMap = new Map(users.map((u: UserRow) => [u.id, u.name] as const));

  if (!canView) {
    return (
      <div>
        <PageHeader title="監査ログ" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">監査ログの閲覧権限がありません。</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="監査ログ" description="すべての重要操作とAIの参照を記録しています。" />

      <Card className="mb-4">
        <Table>
          <thead><tr><Th>日時</Th><Th>実行者</Th><Th>種別</Th><Th>操作</Th><Th>対象</Th><Th>概要</Th></tr></thead>
          <tbody>
            {audit.length === 0 ? (
              <tr><Td colSpan={6}><EmptyState title="ログがありません" /></Td></tr>
            ) : (
              audit.map((a: AuditRow) => (
                <tr key={a.id} className="hover:bg-secondary/50">
                  <Td className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(a.createdAt)}</Td>
                  <Td className="text-xs">{a.actorId ? (userMap.get(a.actorId) ?? a.actorId.slice(0, 6)) : 'system'}</Td>
                  <Td><Badge tone={a.actorType === 'ai_agent' ? 'purple' : 'slate'}>{a.actorType}</Badge></Td>
                  <Td><Badge tone={a.action === 'approve' ? 'green' : a.action === 'reject' ? 'red' : 'blue'}>{a.action}</Badge></Td>
                  <Td className="text-xs">{a.entityType}</Td>
                  <Td className="text-xs">{a.summary}</Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>

      <h2 className="mb-2 text-sm font-semibold">機密データ参照ログ（AI参照を含む）</h2>
      <Card>
        <Table>
          <thead><tr><Th>日時</Th><Th>参照者</Th><Th>種別</Th><Th>対象</Th><Th>ラベル</Th><Th>目的</Th></tr></thead>
          <tbody>
            {access.map((a: AccessRow) => (
              <tr key={a.id}>
                <Td className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(a.createdAt)}</Td>
                <Td className="text-xs">{a.actorId ? (userMap.get(a.actorId) ?? a.actorId.slice(0, 6)) : 'system'}</Td>
                <Td><Badge tone={a.actorType === 'ai_agent' ? 'purple' : 'slate'}>{a.actorType}</Badge></Td>
                <Td className="text-xs">{a.entityType}</Td>
                <Td><LabelBadge label={a.label as any} /></Td>
                <Td className="text-xs text-muted-foreground">{a.purpose}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
