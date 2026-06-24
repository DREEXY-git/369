import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Table, Th, Td, Badge, Button, Input, Select, EmptyState } from '@/components/ui';
import { generateMarketingAssetDraftAction, requestMarketingAssetApprovalAction } from '../actions';
import { MARKETING_ASSET_KIND_LABEL } from '@/lib/ai-generate';

export const dynamic = 'force-dynamic';

const APPROVAL_TONE: Record<string, string> = { none: 'slate', pending: 'amber', approved: 'green', rejected: 'red' };

export default async function MarketingAssetsPage({ searchParams }: { searchParams: Promise<{ generated?: string; blocked?: string; requested?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const canManage = hasPermission(user, 'marketing', 'create');
  const assets = await prisma.contentAsset.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: 'desc' }, take: 100 });

  return (
    <div>
      <PageHeader
        title="マーケティング資産（AI生成）"
        description="AIが下書きを生成。外部公開・配信は必ず承認申請を通します（直接送信しません）。"
        breadcrumb={[{ label: 'Marketing OS', href: '/marketing' }, { label: 'AI資産', href: '#' }]}
      />

      {sp.blocked ? <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">安全チェックで生成を中止しました（{decodeURIComponent(sp.blocked)}）。命令注入の疑いがあります。</div> : null}
      {sp.generated ? <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">AI資産を生成しました（下書き）。内容を確認し、外部公開は承認申請してください。</div> : null}
      {sp.requested ? <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">外部公開の承認申請を作成しました。<a className="ml-1 underline" href="/approvals">承認センター →</a></div> : null}

      {canManage ? (
        <Card className="mb-4">
          <CardHeader><CardTitle>AIで資産を生成（外部送信なし）</CardTitle></CardHeader>
          <CardContent>
            <form action={generateMarketingAssetDraftAction} className="grid grid-cols-1 gap-2 md:grid-cols-5">
              <Select name="kind" defaultValue="sns">
                {Object.entries(MARKETING_ASSET_KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
              <Input name="campaignName" placeholder="キャンペーン名" />
              <Input name="audience" placeholder="ターゲット" />
              <Input name="instruction" placeholder="指示" />
              <Button type="submit">🤖 生成</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <Table>
          <thead><tr><Th>種別</Th><Th>タイトル</Th><Th>生成</Th><Th>安全</Th><Th>承認</Th><Th>操作</Th></tr></thead>
          <tbody>
            {assets.length === 0 ? (
              <tr><Td colSpan={6}><EmptyState title="資産がありません" hint="上のフォームから生成できます。" /></Td></tr>
            ) : (
              assets.map((a) => (
                <tr key={a.id} className="hover:bg-secondary/50 align-top">
                  <Td className="text-xs">{MARKETING_ASSET_KIND_LABEL[a.type as keyof typeof MARKETING_ASSET_KIND_LABEL] ?? a.type}</Td>
                  <Td className="text-xs">
                    <div className="font-medium">{a.title}</div>
                    <div className="mt-0.5 max-w-md whitespace-pre-wrap text-[11px] text-muted-foreground line-clamp-3">{a.body.slice(0, 160)}</div>
                  </Td>
                  <Td>{a.generatedByAi ? <Badge tone="purple">AI</Badge> : <Badge tone="slate">手動</Badge>}</Td>
                  <Td>{a.safetyFlag ? <Badge tone="amber">要注意</Badge> : <Badge tone="green">OK</Badge>}</Td>
                  <Td><Badge tone={APPROVAL_TONE[a.approvalStatus] ?? 'slate'}>{a.approvalStatus}</Badge></Td>
                  <Td>
                    {canManage && a.approvalStatus === 'none' ? (
                      <form action={requestMarketingAssetApprovalAction}>
                        <input type="hidden" name="assetId" value={a.id} />
                        <Button type="submit" size="sm" variant="outline">外部公開を承認申請</Button>
                      </form>
                    ) : a.approvalStatus === 'pending' ? (
                      <span className="text-xs text-muted-foreground">承認待ち</span>
                    ) : null}
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
