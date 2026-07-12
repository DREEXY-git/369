import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, Table, Th, Td, Badge, Button, EmptyState } from '@/components/ui';
import { AccessDenied } from '@/components/access-denied';
import { formatDate } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function AssessmentsPage() {
  const user = await requireUser();
  // WIP-3（roadmap64 追補）: DX 診断は業務ヒアリング結果（内部情報）。/dx 系と同じページ基礎権限。
  if (!hasPermission(user, 'marketing', 'read')) {
    return (
      <AccessDenied
        title="DX診断"
        reason="DX診断の閲覧にはマーケティングの閲覧権限（marketing:read）が必要です"
        breadcrumb={[{ label: 'DX OS', href: '/dx' }, { label: 'DX診断', href: '#' }]}
      />
    );
  }
  const items = await prisma.dXAssessment.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: 'desc' }, include: { _count: { select: { opportunities: true } } } });
  return (
    <div>
      <PageHeader
        title="DX診断"
        description="業務のヒアリング結果（非効率・属人化・紙/Excel依存・AI化余地）を記録します。"
        breadcrumb={[{ label: 'DX OS', href: '/dx' }, { label: 'DX診断', href: '#' }]}
        action={<Link href="/dx/assessments/new"><Button>診断を作成</Button></Link>}
      />
      <Card>
        <Table>
          <thead><tr><Th>タイトル</Th><Th>部署</Th><Th>所見数</Th><Th>改善機会</Th><Th>状態</Th><Th>作成</Th></tr></thead>
          <tbody>
            {items.length === 0 ? (
              <tr><Td colSpan={6}><EmptyState title="診断がありません" /></Td></tr>
            ) : (
              items.map((a) => (
                <tr key={a.id} className="hover:bg-secondary/50">
                  <Td className="text-sm font-medium">{a.title}</Td>
                  <Td className="text-xs text-muted-foreground">{a.department || '-'}</Td>
                  <Td className="text-xs">{Array.isArray(a.findings) ? (a.findings as unknown[]).length : 0}</Td>
                  <Td className="text-xs">{a._count.opportunities}</Td>
                  <Td><Badge tone={a.status === 'completed' ? 'green' : 'slate'}>{a.status}</Badge></Td>
                  <Td className="text-xs text-muted-foreground">{formatDate(a.createdAt)}</Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
