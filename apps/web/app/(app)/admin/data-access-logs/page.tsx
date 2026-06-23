import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, Table, Th, Td, Badge, EmptyState } from '@/components/ui';
import { LabelBadge } from '@/components/badges';
import { formatDateTime } from '@hokko/shared';

export const dynamic = 'force-dynamic';

const ACTION_LABEL: Record<string, string> = {
  read: '閲覧',
  confidential_view: '機密閲覧',
  ai_reference: 'AI参照',
  location_view: '位置情報閲覧',
  recording_view: '録音閲覧',
  export: 'エクスポート',
  external_share: '外部共有',
};

type Row = {
  id: string;
  actorId: string | null;
  actorType: string;
  entityType: string;
  entityId: string | null;
  label: string;
  action: string;
  purpose: string;
  policyDecision: string | null;
  createdAt: Date;
};

export default async function DataAccessLogsPage() {
  const user = await requireUser();
  const canView = hasPermission(user, 'audit', 'read');
  if (!canView) {
    return (
      <div>
        <PageHeader title="機密参照ログ" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">閲覧権限がありません。</div>
      </div>
    );
  }
  const logs = await prisma.dataAccessLog.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return (
    <div>
      <PageHeader
        title="機密参照ログ（DataAccessLog）"
        description="顧客/契約/会計/人事/位置/録音/AI参照/外部共有/エクスポートの参照を記録します。"
        breadcrumb={[{ label: '管理', href: '/admin' }, { label: '機密参照ログ', href: '#' }]}
      />
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>日時</Th>
              <Th>操作</Th>
              <Th>参照者</Th>
              <Th>種別</Th>
              <Th>対象</Th>
              <Th>ラベル</Th>
              <Th>判定</Th>
              <Th>目的</Th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <Td colSpan={8}>
                  <EmptyState title="ログがありません" />
                </Td>
              </tr>
            ) : (
              logs.map((a: Row) => (
                <tr key={a.id} className="hover:bg-secondary/50">
                  <Td className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(a.createdAt)}</Td>
                  <Td className="text-xs">
                    <Badge tone={a.action === 'export' || a.action === 'external_share' ? 'amber' : a.action === 'ai_reference' ? 'purple' : 'blue'}>
                      {ACTION_LABEL[a.action] ?? a.action}
                    </Badge>
                  </Td>
                  <Td className="text-xs">{a.actorType === 'ai_agent' ? '🤖 AI' : (a.actorId?.slice(0, 8) ?? 'system')}</Td>
                  <Td className="text-xs">{a.entityType}</Td>
                  <Td className="text-xs text-muted-foreground">{a.entityId?.slice(0, 8) ?? '-'}</Td>
                  <Td><LabelBadge label={a.label as any} /></Td>
                  <Td className="text-xs">{a.policyDecision ? <Badge tone={a.policyDecision === 'allow' ? 'green' : 'red'}>{a.policyDecision}</Badge> : '-'}</Td>
                  <Td className="text-xs text-muted-foreground">{a.purpose}</Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
