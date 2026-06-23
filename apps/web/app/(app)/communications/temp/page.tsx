import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, EmptyState } from '@/components/ui';
import { decideTempItemAction } from '../actions';
import { formatDateTime } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function TempIngestionPage() {
  const user = await requireUser();
  const items = await prisma.temporaryIngestionItem.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: 'desc' },
    take: 80,
  });
  const review = items.filter((i) => i.status === 'review');
  const decided = items.filter((i) => i.status !== 'review');

  return (
    <div>
      <PageHeader
        title="一時保管エリア（二段階保存）"
        description="業務関連性の判断が難しいものは確認待ちに、私的内容は保存しません。確認のうえ保存/破棄します。"
        breadcrumb={[{ label: 'コミュニケーション', href: '/communications/inbox' }, { label: '一時保管', href: '#' }]}
      />

      <Card className="mb-4">
        <CardHeader><CardTitle>確認待ち（{review.length}）</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {review.length === 0 ? (
            <EmptyState title="確認待ちはありません" />
          ) : (
            review.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-2 rounded-md border p-3">
                <div className="min-w-0">
                  <Badge tone="amber">{i.channel}</Badge>
                  <span className="ml-2 text-sm">{i.preview}</span>
                </div>
                <form action={decideTempItemAction} className="flex shrink-0 gap-2">
                  <input type="hidden" name="itemId" value={i.id} />
                  <Button type="submit" name="decision" value="save" variant="secondary">保存</Button>
                  <Button type="submit" name="decision" value="discard" variant="ghost">破棄</Button>
                </form>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>処理済み</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {decided.length === 0 ? (
            <EmptyState title="処理済みはありません" />
          ) : (
            decided.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{i.preview}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={i.status === 'saved' ? 'green' : 'slate'}>{i.status === 'saved' ? '保存済' : '非保存'}</Badge>
                  <span className="text-xs text-muted-foreground">{formatDateTime(i.createdAt)}</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
