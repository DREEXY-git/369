import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Table, Th, Td, Badge, Button, Input, Select, EmptyState } from '@/components/ui';
import { formatDateTime } from '@hokko/shared';
import {
  requestExportApprovalAction,
  requestExternalSendApprovalAction,
  requestDeleteApprovalAction,
  requestPermissionChangeApprovalAction,
  requestHighConfidentialAIApprovalAction,
  executeApprovedExportAction,
} from './actions';

export const dynamic = 'force-dynamic';

const RISK_TONE: Record<string, string> = { LOW: 'slate', MEDIUM: 'blue', HIGH: 'amber', CRITICAL: 'red' };
const STATUS_TONE: Record<string, string> = { PENDING: 'amber', APPROVED: 'green', REJECTED: 'red', CANCELLED: 'slate' };

type ReqRow = {
  id: string;
  type: string;
  title: string;
  requestedForAction: string | null;
  riskLevel: string;
  status: string;
  reason: string;
  payloadAfter: any;
  createdAt: Date;
};

export default async function DangerActionsPage({ searchParams }: { searchParams: Promise<{ requested?: string; executed?: string; error?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  if (!hasPermission(user, 'admin', 'read') && !hasPermission(user, 'admin', 'update')) {
    return (
      <div>
        <PageHeader title="危険操作ゲート" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">閲覧権限がありません。</div>
      </div>
    );
  }
  const reqs = await prisma.approvalRequest.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <div>
      <PageHeader
        title="危険操作ゲート"
        description="外部送信・エクスポート・削除・権限変更・高機密AI送信は、必ず承認リクエストを経由します（直接実行不可）。"
        breadcrumb={[{ label: '管理', href: '/admin' }, { label: '危険操作ゲート', href: '#' }]}
      />

      {sp.executed ? (
        <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">承認済みエクスポートを実行しました（ExportJob: {sp.executed}）。</div>
      ) : null}
      {sp.requested ? (
        <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">承認リクエストを作成しました（承認待ち）。<a className="ml-1 underline" href="/approvals">承認センターで処理 →</a></div>
      ) : null}
      {sp.error ? (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">実行できませんでした（{sp.error}）。承認が必要、または承認が失効しています。</div>
      ) : null}

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>エクスポート申請</CardTitle></CardHeader>
          <CardContent>
            <form action={requestExportApprovalAction} className="flex gap-2">
              <Select name="scope" defaultValue="customers" className="flex-1">
                <option value="customers">顧客</option>
                <option value="invoices">請求</option>
                <option value="accounting">会計</option>
              </Select>
              <Button type="submit" variant="outline">申請</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>外部送信申請</CardTitle></CardHeader>
          <CardContent>
            <form action={requestExternalSendApprovalAction} className="flex gap-2">
              <Input name="to" placeholder="宛先メール" className="flex-1" />
              <Button type="submit" variant="outline">申請</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>削除申請</CardTitle></CardHeader>
          <CardContent>
            <form action={requestDeleteApprovalAction} className="flex gap-2">
              <Input name="target" placeholder="対象（例: Customer:xxx）" className="flex-1" />
              <Button type="submit" variant="outline">申請</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>権限変更申請</CardTitle></CardHeader>
          <CardContent>
            <form action={requestPermissionChangeApprovalAction} className="flex gap-2">
              <Input name="target" placeholder="対象ユーザーID" className="flex-1" />
              <Button type="submit" variant="outline">申請</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>高機密データのAI送信申請</CardTitle></CardHeader>
          <CardContent>
            <form action={requestHighConfidentialAIApprovalAction} className="flex gap-2">
              <Select name="dataType" defaultValue="hr" className="flex-1">
                <option value="hr">人事</option>
                <option value="accounting">会計</option>
                <option value="legal">法務</option>
              </Select>
              <Button type="submit" variant="outline">申請</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>承認リクエスト一覧</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr><Th>日時</Th><Th>操作</Th><Th>タイトル</Th><Th>リスク</Th><Th>状態</Th><Th>実行</Th></tr>
            </thead>
            <tbody>
              {reqs.length === 0 ? (
                <tr><Td colSpan={6}><EmptyState title="承認リクエストはありません" /></Td></tr>
              ) : (
                reqs.map((r: ReqRow) => (
                  <tr key={r.id} className="hover:bg-secondary/50">
                    <Td className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</Td>
                    <Td className="text-xs">{r.requestedForAction ?? r.type}</Td>
                    <Td className="text-xs">{r.title}</Td>
                    <Td><Badge tone={RISK_TONE[r.riskLevel] ?? 'slate'}>{r.riskLevel}</Badge></Td>
                    <Td><Badge tone={STATUS_TONE[r.status] ?? 'slate'}>{r.status}</Badge></Td>
                    <Td>
                      {r.requestedForAction === 'data_export' && r.status === 'APPROVED' ? (
                        <form action={executeApprovedExportAction}>
                          <input type="hidden" name="approvalId" value={r.id} />
                          <Button type="submit" size="sm">承認済を実行</Button>
                        </form>
                      ) : r.requestedForAction === 'data_export' && r.status === 'PENDING' ? (
                        <span className="text-xs text-muted-foreground">承認待ち（実行不可）</span>
                      ) : null}
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
