import Link from 'next/link';
import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, Badge, Button, Stat, EmptyState, Select } from '@/components/ui';
import { ingestMockMessagesAction } from '../actions';
import { formatDateTime } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function CommunicationsInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ ingested?: string; review?: string; discarded?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const [threads, reviewCount] = await Promise.all([
    prisma.communicationThread.findMany({
      where: { tenantId: user.tenantId, relevance: 'relevant' },
      include: { messages: { orderBy: { sentAt: 'desc' }, take: 1 }, _count: { select: { messages: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.temporaryIngestionItem.count({ where: { tenantId: user.tenantId, status: 'review' } }),
  ]);

  return (
    <div>
      <PageHeader
        title="コミュニケーション受信箱"
        description="Gmail/LINE/Slack等を業務関連性AIで判定し、二段階保存（自動保存/確認待ち/非保存）で取り込みます。"
        action={
          <form action={ingestMockMessagesAction} className="flex items-end gap-2">
            <Select name="provider" defaultValue="gmail" className="h-9">
              <option value="gmail">Gmail</option>
              <option value="line">LINE</option>
              <option value="slack">Slack</option>
              <option value="chatwork">Chatwork</option>
            </Select>
            <Button type="submit">Mockコネクタから取り込む</Button>
          </form>
        }
      />

      {sp.ingested !== undefined ? (
        <div className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          🤖 取り込み完了: 自動保存 {sp.ingested} 件 / 確認待ち {sp.review} 件 / 非保存（私的等）{sp.discarded} 件
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="業務スレッド" value={threads.length} />
        <Stat label="確認待ち" value={reviewCount} tone={reviewCount ? 'amber' : 'slate'} />
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">確認待ちの処理</div>
          <Link href="/communications/temp" className="mt-1 block text-sm text-primary hover:underline">一時保管エリアへ →</Link>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-2 pt-4">
          {threads.length === 0 ? (
            <EmptyState title="業務スレッドがありません" hint="「Mockコネクタから取り込む」で業務メールを取り込めます。" />
          ) : (
            threads.map((t) => (
              <Link key={t.id} href={`/communications/threads/${t.id}`} className="flex items-center justify-between gap-2 rounded-md border p-3 hover:bg-secondary">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge tone="blue">{t.channel}</Badge>
                    <span className="truncate font-medium">{t.subject}</span>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{t.messages[0]?.body ?? `${t._count.messages} 件のメッセージ`}</div>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(t.createdAt)}</span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
