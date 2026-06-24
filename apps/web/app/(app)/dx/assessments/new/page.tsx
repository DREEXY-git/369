import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, Input, Textarea, Button } from '@/components/ui';
import { createDXAssessmentAction } from '../../actions';

export const dynamic = 'force-dynamic';

export default async function NewAssessmentPage() {
  const user = await requireUser();
  if (!hasPermission(user, 'marketing', 'create')) {
    return <div><PageHeader title="DX診断を作成" /><div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">作成権限がありません。</div></div>;
  }
  return (
    <div>
      <PageHeader title="DX診断を作成" breadcrumb={[{ label: 'DX OS', href: '/dx' }, { label: 'DX診断', href: '/dx/assessments' }, { label: '作成', href: '#' }]} />
      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <form action={createDXAssessmentAction} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground/80">タイトル</label>
              <Input name="title" required placeholder="例: 経理業務のDX診断" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground/80">部署</label>
              <Input name="department" placeholder="例: 経営管理部" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground/80">概要</label>
              <Input name="summary" placeholder="診断の概要" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground/80">所見（1行に1つ：非効率・属人化・紙業務・Excel依存・AI化余地 など）</label>
              <Textarea name="findings" rows={6} placeholder={'請求書作成が手作業\n議事録のタスク化が属人的\n在庫確認が紙台帳'} />
            </div>
            <Button type="submit" className="w-full">診断を作成</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
