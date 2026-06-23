import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Table, Th, Td, Badge, Button, Input, Select, EmptyState } from '@/components/ui';
import { formatDateTime, isConsentValid } from '@hokko/shared';
import { grantConsentAction, withdrawConsentAction } from './actions';

export const dynamic = 'force-dynamic';

const PURPOSE_LABEL: Record<string, string> = {
  location_tracking: '位置情報取得',
  recording: '録音',
  external_llm: '外部LLM送信',
  expert_share: '士業共有',
  email_marketing: 'メール配信',
  sms: 'SMS配信',
  line: 'LINE配信',
  call_center: 'AIコールセンター対応',
  ai_reference: 'AI参照',
};

type GrantRow = {
  id: string;
  subjectType: string;
  subjectLabel: string;
  subjectUserId: string | null;
  customerId: string | null;
  purpose: string;
  status: string;
  grantedAt: Date;
  withdrawnAt: Date | null;
  expiresAt: Date | null;
};

export default async function ConsentsPage() {
  const user = await requireUser();
  const canManage = hasPermission(user, 'admin', 'update');
  if (!hasPermission(user, 'audit', 'read') && !canManage) {
    return (
      <div>
        <PageHeader title="同意管理" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">閲覧権限がありません。</div>
      </div>
    );
  }
  const grants = await prisma.consentGrant.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  const now = new Date();

  return (
    <div>
      <PageHeader
        title="同意管理（コンプラ基盤）"
        description="位置情報・録音・外部LLM・士業共有・各種配信などの目的別同意を記録・撤回します。"
        breadcrumb={[{ label: '管理', href: '/admin' }, { label: '同意管理', href: '#' }]}
      />

      {canManage ? (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>同意を登録</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={grantConsentAction} className="grid grid-cols-1 gap-2 md:grid-cols-6">
              <Select name="purpose" defaultValue="location_tracking" className="md:col-span-2">
                {Object.entries(PURPOSE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
              <Select name="subjectType" defaultValue="employee">
                <option value="employee">従業員</option>
                <option value="customer">顧客</option>
              </Select>
              <Input name="subjectId" placeholder="対象ID（userId/customerId）" required />
              <Input name="subjectLabel" placeholder="表示名（任意）" />
              <Button type="submit">登録</Button>
              <input type="hidden" name="note" value="管理画面から登録" />
            </form>
            <p className="mt-2 text-[11px] text-muted-foreground">
              ※同意は取得目的を明示し、保存期間ポリシーに従って管理してください。撤回後は当該目的のアクセスがブロックされます。
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>登録日時</Th>
              <Th>目的</Th>
              <Th>対象</Th>
              <Th>状態</Th>
              <Th>有効</Th>
              <Th>失効</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {grants.length === 0 ? (
              <tr>
                <Td colSpan={7}>
                  <EmptyState title="同意記録がありません" />
                </Td>
              </tr>
            ) : (
              grants.map((g: GrantRow) => {
                const valid = isConsentValid(
                  { purpose: g.purpose as any, status: g.status as any, withdrawnAt: g.withdrawnAt, expiresAt: g.expiresAt },
                  now,
                );
                return (
                  <tr key={g.id} className="hover:bg-secondary/50">
                    <Td className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(g.grantedAt)}</Td>
                    <Td className="text-xs">{PURPOSE_LABEL[g.purpose] ?? g.purpose}</Td>
                    <Td className="text-xs">
                      <Badge tone="slate">{g.subjectType === 'customer' ? '顧客' : '従業員'}</Badge>
                      <span className="ml-1">{g.subjectLabel || g.subjectUserId || g.customerId}</span>
                    </Td>
                    <Td><Badge tone={g.status === 'granted' ? 'green' : 'red'}>{g.status === 'granted' ? '同意' : '撤回'}</Badge></Td>
                    <Td>{valid ? <Badge tone="green">有効</Badge> : <Badge tone="slate">無効</Badge>}</Td>
                    <Td className="text-xs text-muted-foreground">{g.expiresAt ? formatDateTime(g.expiresAt) : '-'}</Td>
                    <Td>
                      {canManage && g.status === 'granted' ? (
                        <form action={withdrawConsentAction}>
                          <input type="hidden" name="grantId" value={g.id} />
                          <Button type="submit" size="sm" variant="ghost">撤回</Button>
                        </form>
                      ) : null}
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
