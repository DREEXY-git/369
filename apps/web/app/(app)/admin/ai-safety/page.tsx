import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, Table, Th, Td, Badge, EmptyState, Stat } from '@/components/ui';
import { formatDateTime } from '@hokko/shared';

export const dynamic = 'force-dynamic';

// AISafetyLog は機密度が高いため、社長・役員・管理者のみ閲覧可（スタッフ/閲覧のみは不可）。
const ADMIN_ROLES = ['OWNER', 'EXECUTIVE', 'ADMIN'];

const CHECK_LABEL: Record<string, string> = {
  injection: '命令注入検出',
  pii_mask: 'PIIマスク',
  tool_permission: 'ツール権限',
};

const SEV_TONE: Record<string, 'slate' | 'blue' | 'amber' | 'red'> = {
  none: 'slate',
  low: 'blue',
  medium: 'amber',
  high: 'red',
};

type Row = {
  id: string;
  actorId: string | null;
  actorType: string;
  purpose: string;
  check: string;
  flagged: boolean;
  severity: string;
  patterns: string[];
  detail: string;
  entityType: string | null;
  createdAt: Date;
};

export default async function AISafetyLogPage() {
  const user = await requireUser();
  const canView = user.roles.some((r) => ADMIN_ROLES.includes(r));
  if (!canView) {
    return (
      <div>
        <PageHeader title="AI安全ログ" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          閲覧権限がありません（社長・役員・管理者のみ）。
        </div>
      </div>
    );
  }

  const logs: Row[] = await prisma.aISafetyLog.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  const flaggedCount = logs.filter((l) => l.flagged).length;
  const highCount = logs.filter((l) => l.severity === 'high').length;
  const piiCount = logs.filter((l) => l.check === 'pii_mask' && l.flagged).length;

  return (
    <div>
      <PageHeader
        title="AI安全ログ（AISafetyLog）"
        description="全AI経路の命令注入検出・PIIマスク・ツール権限の判定を記録します（社長・役員・管理者のみ）。"
        breadcrumb={[{ label: '管理', href: '/admin' }, { label: 'AI安全ログ', href: '#' }]}
      />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="記録数" value={logs.length} />
        <Stat label="フラグ件数" value={flaggedCount} tone="amber" />
        <Stat label="高リスク注入" value={highCount} tone="red" />
        <Stat label="PII検出" value={piiCount} tone="blue" />
      </div>
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>日時</Th>
              <Th>種別</Th>
              <Th>結果</Th>
              <Th>重大度</Th>
              <Th>主体</Th>
              <Th>用途</Th>
              <Th>検出パターン</Th>
              <Th>対象</Th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <Td colSpan={8}>
                  <EmptyState title="AI安全ログがありません" hint="AI実行・外部送信時に自動で記録されます。" />
                </Td>
              </tr>
            ) : (
              logs.map((l) => (
                <tr key={l.id} className="hover:bg-secondary/50">
                  <Td className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(l.createdAt)}</Td>
                  <Td className="text-xs">
                    <Badge tone={l.check === 'injection' ? 'purple' : l.check === 'pii_mask' ? 'blue' : 'slate'}>
                      {CHECK_LABEL[l.check] ?? l.check}
                    </Badge>
                  </Td>
                  <Td className="text-xs">
                    {l.flagged ? <Badge tone="red">検出</Badge> : <Badge tone="green">問題なし</Badge>}
                  </Td>
                  <Td className="text-xs">
                    <Badge tone={SEV_TONE[l.severity] ?? 'slate'}>{l.severity}</Badge>
                  </Td>
                  <Td className="text-xs">{l.actorType === 'user' ? (l.actorId?.slice(0, 8) ?? 'user') : `🤖 ${l.actorType}`}</Td>
                  <Td className="text-xs text-muted-foreground">{l.purpose}</Td>
                  <Td className="text-xs text-muted-foreground">{l.patterns.length > 0 ? l.patterns.join(', ') : '-'}</Td>
                  <Td className="text-xs text-muted-foreground">{l.entityType ?? l.detail ?? '-'}</Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
