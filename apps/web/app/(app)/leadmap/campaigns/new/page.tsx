import { requireUser } from '@/lib/auth/current-user';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, Button, Input, Select } from '@/components/ui';
import { createCampaignAction } from '../../actions';

export const dynamic = 'force-dynamic';

const INDUSTRY_PRESETS = ['美容室', '歯科医院', '飲食店', '整体院', '税理士事務所', '整骨院', '学習塾'];
const SALES_TYPES = ['Web制作', 'MEO', '広告', 'SNS', '採用支援'];

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="新規キャンペーン作成"
        description="営業したい地域と業種を指定すると、AIが営業先リードを抽出します。"
        breadcrumb={[
          { label: 'LeadMap', href: '/leadmap/campaigns' },
          { label: '新規作成', href: '/leadmap/campaigns/new' },
        ]}
      />
      <Card>
        <CardContent className="pt-4">
          {sp.error === 'industry' ? (
            <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">業種を入力してください。</div>
          ) : null}
          <form action={createCampaignAction} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">地域</label>
                <Input name="region" defaultValue="札幌市" required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">業種</label>
                <Input name="industry" defaultValue="美容室" list="industries" required />
                <datalist id="industries">
                  {INDUSTRY_PRESETS.map((i) => (
                    <option key={i} value={i} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">営業種別</label>
                <Select name="salesType" defaultValue="Web制作">
                  {SALES_TYPES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">抽出件数</label>
                <Input name="limit" type="number" defaultValue={20} min={1} max={30} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Webサイト</label>
                <Select name="hasWebsite" defaultValue="">
                  <option value="">指定なし</option>
                  <option value="yes">あり</option>
                  <option value="no">なし</option>
                </Select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">最小口コミ数（任意）</label>
              <Input name="minReviews" type="number" placeholder="例: 30" min={0} />
            </div>
            <div className="rounded-md bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
              データソースは <strong>DEMO</strong>（Google Maps APIキー未設定）。規約違反のスクレイピングは行わず、
              キーがある場合のみ公式 Places API を使用します。
            </div>
            <Button type="submit" className="w-full">営業先を抽出してキャンペーン作成</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
