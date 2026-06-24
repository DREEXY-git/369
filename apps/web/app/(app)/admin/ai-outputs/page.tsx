import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, Table, Th, Td, Badge, EmptyState, Stat } from '@/components/ui';
import { formatDateTime } from '@hokko/shared';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  task: string;
  purpose: string;
  entityType: string | null;
  entityId: string | null;
  model: string;
  outputText: string;
  confidence: number;
  costEstimate: number;
  safetyFlags: string[];
  createdAt: Date;
};

export default async function AIOutputsPage() {
  const user = await requireUser();
  // AIOutput は監査閲覧権限（audit:read）でテナント内のみ閲覧可。
  if (!hasPermission(user, 'audit', 'read')) {
    return (
      <div>
        <PageHeader title="AI出力ログ" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">閲覧権限がありません。</div>
      </div>
    );
  }

  const outputs: Row[] = await prisma.aIOutput.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  const flagged = outputs.filter((o) => o.safetyFlags.length > 0).length;
  const tasks = new Set(outputs.map((o) => o.task)).size;
  const avgConfidence =
    outputs.length > 0 ? Math.round((outputs.reduce((s, o) => s + o.confidence, 0) / outputs.length) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="AI出力ログ（AIOutput）"
        description="全AIタスクの構造化出力・信頼度・コスト・安全フラグ・引用根拠を統一形式で記録します。"
        breadcrumb={[{ label: '管理', href: '/admin' }, { label: 'AI出力ログ', href: '#' }]}
      />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="AI出力数" value={outputs.length} tone="purple" />
        <Stat label="タスク種類" value={tasks} />
        <Stat label="安全フラグ付き" value={flagged} tone="amber" />
        <Stat label="平均信頼度" value={`${avgConfidence}%`} tone="blue" />
      </div>
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>日時</Th>
              <Th>タスク</Th>
              <Th>用途</Th>
              <Th>モデル</Th>
              <Th>対象</Th>
              <Th>信頼度</Th>
              <Th>安全フラグ</Th>
              <Th>出力プレビュー</Th>
            </tr>
          </thead>
          <tbody>
            {outputs.length === 0 ? (
              <tr>
                <Td colSpan={8}>
                  <EmptyState title="AI出力がありません" hint="リード分析・営業文生成・議事録要約などで自動記録されます。" />
                </Td>
              </tr>
            ) : (
              outputs.map((o) => (
                <tr key={o.id} className="hover:bg-secondary/50">
                  <Td className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</Td>
                  <Td className="text-xs"><Badge tone="purple">{o.task}</Badge></Td>
                  <Td className="text-xs text-muted-foreground">{o.purpose || '-'}</Td>
                  <Td className="text-xs">{o.model}</Td>
                  <Td className="text-xs text-muted-foreground">{o.entityType ?? '-'}</Td>
                  <Td className="text-xs">{Math.round(o.confidence * 100)}%</Td>
                  <Td className="text-xs">
                    {o.safetyFlags.length > 0 ? (
                      <span className="flex flex-wrap gap-1">
                        {o.safetyFlags.map((f) => (
                          <Badge key={f} tone={f.startsWith('injection') ? 'red' : 'amber'}>{f}</Badge>
                        ))}
                      </span>
                    ) : (
                      <Badge tone="green">なし</Badge>
                    )}
                  </Td>
                  <Td className="max-w-xs truncate text-xs text-muted-foreground">{o.outputText?.slice(0, 80) || '-'}</Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
