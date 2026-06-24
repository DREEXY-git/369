import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, Input, Select, Button } from '@/components/ui';
import { createMarketingCampaignAction } from '../../actions';

export const dynamic = 'force-dynamic';

export default async function NewCampaignPage() {
  const user = await requireUser();
  if (!hasPermission(user, 'marketing', 'create')) {
    return <div><PageHeader title="キャンペーン作成" /><div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">作成権限がありません。</div></div>;
  }
  return (
    <div>
      <PageHeader title="キャンペーン作成" breadcrumb={[{ label: 'Marketing OS', href: '/marketing' }, { label: 'キャンペーン', href: '/marketing/campaigns' }, { label: '作成', href: '#' }]} />
      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <form action={createMarketingCampaignAction} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground/80">キャンペーン名</label>
              <Input name="name" required placeholder="例: 夏の新規開拓キャンペーン" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground/80">チャネル</label>
                <Select name="channel" defaultValue="sns" className="w-full">
                  <option value="sns">SNS</option><option value="ads">広告</option><option value="meo">MEO</option>
                  <option value="seo">SEO</option><option value="line">LINE</option><option value="mail">メール</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground/80">予算(円)</label>
                <Input name="budget" type="number" defaultValue="100000" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground/80">目的</label>
              <Input name="purpose" placeholder="例: 新規集客 / リピート促進 / 休眠掘り起こし" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground/80">ターゲット</label>
              <Input name="target" placeholder="例: 札幌市内の30-40代女性" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground/80">想定リード数</label>
                <Input name="leadsTarget" type="number" defaultValue="50" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground/80">想定CV数</label>
                <Input name="cvTarget" type="number" defaultValue="10" />
              </div>
            </div>
            <Button type="submit" className="w-full">作成する</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
