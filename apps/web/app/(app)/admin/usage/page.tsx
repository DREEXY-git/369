import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, Table, Th, Td, Badge, EmptyState } from '@/components/ui';
import { formatDate } from '@hokko/shared';
import { toNumber } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// この画面は「非課金 UsageEvent の利用量サマリー（監査）」です。
// 表示するのは eventType / category / 日別の「件数」と「quantity 合計」のみ。
// raw metadata / sourceId / idempotencyKey / actorId / 本文 / 顧客情報 / 金額 / secret は一切表示しません。
// billing=usage_only は「非課金記録」であり、請求額ではありません。

// Prisma Client が未生成のビルド環境でも型が一意に決まるよう、画面用に明示定義する。
type EventTypeGroup = { eventType: string; _count: number; _sum: { quantity: unknown } };
type CategoryGroup = { category: string; _count: number; _sum: { quantity: unknown } };
type DailyRow = { occurredAt: Date; quantity: unknown };

const WINDOW_DAYS = 30;

export default async function UsagePage() {
  const user = await requireUser();
  const canView = hasPermission(user, 'audit', 'read');
  if (!canView) {
    return (
      <div>
        <PageHeader title="利用量監査（非課金 UsageEvent 集計）" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">閲覧権限がありません。</div>
      </div>
    );
  }

  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const where = { tenantId: user.tenantId, occurredAt: { gte: since } };

  // すべて tenantId 必須・直近30日。既存 index（[tenantId, occurredAt] / [tenantId, eventType] / [tenantId, category]）で効く。
  const [byEventType, byCategory, dailyRows] = await Promise.all([
    prisma.usageEvent.groupBy({
      by: ['eventType'],
      where,
      _count: true,
      _sum: { quantity: true },
      orderBy: { eventType: 'asc' },
    }),
    prisma.usageEvent.groupBy({
      by: ['category'],
      where,
      _count: true,
      _sum: { quantity: true },
      orderBy: { category: 'asc' },
    }),
    // 日別集計用に非PIIの2列（occurredAt / quantity）のみ取得し、サーバ側で日付バケツ化する。
    prisma.usageEvent.findMany({
      where,
      select: { occurredAt: true, quantity: true },
      orderBy: { occurredAt: 'desc' },
    }),
  ]);

  const eventTypeGroups = byEventType as EventTypeGroup[];
  const categoryGroups = byCategory as CategoryGroup[];
  const rows = dailyRows as DailyRow[];

  // 日別（YYYY-MM-DD 単位）に件数と quantity 合計を集計。
  const dailyMap = new Map<string, { count: number; quantity: number }>();
  for (const r of rows) {
    const key = formatDate(r.occurredAt);
    const cur = dailyMap.get(key) ?? { count: 0, quantity: 0 };
    cur.count += 1;
    cur.quantity += toNumber(r.quantity);
    dailyMap.set(key, cur);
  }
  const daily = Array.from(dailyMap.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));

  const totalCount = rows.length;

  return (
    <div>
      <PageHeader
        title="利用量監査（非課金 UsageEvent 集計）"
        description={`直近${WINDOW_DAYS}日の利用量を種類別・日別に集計します。会社（テナント）ごとに分離して表示します。`}
        breadcrumb={[{ label: '管理', href: '/admin' }, { label: '利用量監査', href: '#' }]}
      />

      <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
        <p className="font-medium">この画面は請求額を示すものではありません。</p>
        <p className="text-xs text-blue-800">
          利用量（AI出力・外部送信・エクスポート・Webhook 等）の<strong>件数と数量のみ</strong>を記録した「非課金記録（usage_only）」です。
          本文・顧客情報・金額・secret・保存先パスは表示しません。
        </p>
      </div>

      <h2 className="mb-2 text-sm font-semibold">種類別（eventType）</h2>
      <Card className="mb-4">
        <Table>
          <thead><tr><Th>eventType</Th><Th>件数</Th><Th>数量合計（quantity）</Th></tr></thead>
          <tbody>
            {eventTypeGroups.length === 0 ? (
              <tr><Td colSpan={3}><EmptyState title="記録がありません" /></Td></tr>
            ) : (
              eventTypeGroups.map((g) => (
                <tr key={g.eventType} className="hover:bg-secondary/50">
                  <Td className="text-xs"><Badge tone="slate">{g.eventType}</Badge></Td>
                  <Td className="text-xs">{g._count}</Td>
                  <Td className="text-xs">{toNumber(g._sum.quantity)}</Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>

      <h2 className="mb-2 text-sm font-semibold">カテゴリ別（category）</h2>
      <Card className="mb-4">
        <Table>
          <thead><tr><Th>category</Th><Th>件数</Th><Th>数量合計（quantity）</Th></tr></thead>
          <tbody>
            {categoryGroups.length === 0 ? (
              <tr><Td colSpan={3}><EmptyState title="記録がありません" /></Td></tr>
            ) : (
              categoryGroups.map((g) => (
                <tr key={g.category} className="hover:bg-secondary/50">
                  <Td className="text-xs"><Badge tone="blue">{g.category}</Badge></Td>
                  <Td className="text-xs">{g._count}</Td>
                  <Td className="text-xs">{toNumber(g._sum.quantity)}</Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>

      <h2 className="mb-2 text-sm font-semibold">日別（直近{WINDOW_DAYS}日・合計{totalCount}件）</h2>
      <Card>
        <Table>
          <thead><tr><Th>日付</Th><Th>件数</Th><Th>数量合計（quantity）</Th></tr></thead>
          <tbody>
            {daily.length === 0 ? (
              <tr><Td colSpan={3}><EmptyState title="記録がありません" /></Td></tr>
            ) : (
              daily.map(([date, v]) => (
                <tr key={date} className="hover:bg-secondary/50">
                  <Td className="whitespace-nowrap text-xs text-muted-foreground">{date}</Td>
                  <Td className="text-xs">{v.count}</Td>
                  <Td className="text-xs">{v.quantity}</Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
