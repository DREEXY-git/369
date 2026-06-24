import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Table, Th, Td, Badge, Input, Select, Button, EmptyState } from '@/components/ui';
import { formatJpy } from '@hokko/shared';
import { createDXOpportunityAction } from '../actions';

export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, string> = { identified: 'slate', planned: 'blue', in_progress: 'amber', done: 'green', dropped: 'red' };

export default async function OpportunitiesPage() {
  const user = await requireUser();
  const [items, assessments] = await Promise.all([
    prisma.dXOpportunity.findMany({ where: { tenantId: user.tenantId }, orderBy: { priority: 'desc' } }),
    prisma.dXAssessment.findMany({ where: { tenantId: user.tenantId }, select: { id: true, title: true }, orderBy: { createdAt: 'desc' } }),
  ]);
  const canCreate = hasPermission(user, 'marketing', 'create');

  return (
    <div>
      <PageHeader
        title="DX改善機会"
        description="課題→改善案→推定効果→優先度。即効性の高い施策が上位に並びます。"
        breadcrumb={[{ label: 'DX OS', href: '/dx' }, { label: '改善機会', href: '#' }]}
      />

      {canCreate ? (
        <Card className="mb-4">
          <CardHeader><CardTitle>改善機会を追加</CardTitle></CardHeader>
          <CardContent>
            <form action={createDXOpportunityAction} className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <Input name="title" placeholder="タイトル（例: 請求書作成の自動化）" className="md:col-span-3" required />
              <Input name="problem" placeholder="課題" />
              <Input name="solution" placeholder="改善案" />
              <Select name="assessmentId" defaultValue="" className="w-full">
                <option value="">診断に紐付けない</option>
                {assessments.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
              </Select>
              <Input name="estimatedTimeSavingMinutes" type="number" placeholder="削減分/月" />
              <Input name="estimatedCostSaving" type="number" placeholder="削減コスト/月(円)" />
              <Input name="estimatedRevenueImpact" type="number" placeholder="売上インパクト/月(円)" />
              <Select name="difficulty" defaultValue="medium" className="w-full">
                <option value="low">難易度: 低</option><option value="medium">難易度: 中</option><option value="high">難易度: 高</option>
              </Select>
              <Button type="submit" className="md:col-span-2">追加（優先度を自動計算）</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <Table>
          <thead><tr><Th>優先</Th><Th>タイトル</Th><Th>削減(分/月)</Th><Th>削減/売上</Th><Th>難易度</Th><Th>状態</Th></tr></thead>
          <tbody>
            {items.length === 0 ? (
              <tr><Td colSpan={6}><EmptyState title="改善機会がありません" /></Td></tr>
            ) : (
              items.map((o) => (
                <tr key={o.id} className="hover:bg-secondary/50">
                  <Td><Badge tone={o.priority >= 60 ? 'red' : o.priority >= 35 ? 'amber' : 'slate'}>{o.priority}</Badge></Td>
                  <Td><Link href={`/dx/opportunities/${o.id}`} className="text-sm font-medium text-primary hover:underline">{o.title}</Link></Td>
                  <Td className="text-xs">{o.estimatedTimeSavingMinutes}</Td>
                  <Td className="text-xs">{formatJpy(toNumber(o.estimatedCostSaving))} / {formatJpy(toNumber(o.estimatedRevenueImpact))}</Td>
                  <Td className="text-xs">{o.difficulty}</Td>
                  <Td><Badge tone={STATUS_TONE[o.status] ?? 'slate'}>{o.status}</Badge></Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
