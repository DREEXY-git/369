import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, Table, Th, Td, Badge, EmptyState, Stat } from '@/components/ui';
import { LabelBadge } from '@/components/badges';
import { formatDateTime } from '@hokko/shared';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  actorId: string | null;
  actorType: string;
  resource: string;
  action: string;
  label: string;
  decision: string;
  reason: string;
  purpose: string;
  requiredApproval: boolean;
  requiredConsent: boolean;
  requiredReason: boolean;
  createdAt: Date;
};

export default async function PolicyDecisionsPage() {
  const user = await requireUser();
  const canView = hasPermission(user, 'audit', 'read');
  if (!canView) {
    return (
      <div>
        <PageHeader title="ポリシー判定ログ" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">閲覧権限がありません。</div>
      </div>
    );
  }
  const [rows, denies] = await Promise.all([
    prisma.policyDecisionLog.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.policyDecisionLog.count({ where: { tenantId: user.tenantId, decision: 'deny' } }),
  ]);

  return (
    <div>
      <PageHeader
        title="ポリシー判定ログ（ABAC）"
        description="アクセス判定（許可/拒否）と要求事項（承認・同意・理由）の記録。"
        breadcrumb={[{ label: '管理', href: '/admin' }, { label: 'ポリシー判定', href: '#' }]}
      />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="判定総数" value={rows.length} />
        <Stat label="拒否(deny)累計" value={denies} tone={denies ? 'red' : 'slate'} />
      </div>
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>日時</Th>
              <Th>判定</Th>
              <Th>主体</Th>
              <Th>リソース</Th>
              <Th>操作</Th>
              <Th>ラベル</Th>
              <Th>理由</Th>
              <Th>要求</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <Td colSpan={8}>
                  <EmptyState title="判定ログがありません" />
                </Td>
              </tr>
            ) : (
              rows.map((r: Row) => (
                <tr key={r.id} className="hover:bg-secondary/50">
                  <Td className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</Td>
                  <Td><Badge tone={r.decision === 'allow' ? 'green' : 'red'}>{r.decision}</Badge></Td>
                  <Td className="text-xs">{r.actorType === 'ai_agent' ? '🤖 AI' : (r.actorId?.slice(0, 8) ?? '-')}</Td>
                  <Td className="text-xs">{r.resource}</Td>
                  <Td className="text-xs">{r.action}</Td>
                  <Td><LabelBadge label={r.label as any} /></Td>
                  <Td className="text-xs text-muted-foreground">{r.reason}</Td>
                  <Td className="text-xs">
                    {r.requiredApproval ? <Badge tone="amber">承認</Badge> : null}
                    {r.requiredConsent ? <Badge tone="orange">同意</Badge> : null}
                    {r.requiredReason ? <Badge tone="slate">理由</Badge> : null}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
