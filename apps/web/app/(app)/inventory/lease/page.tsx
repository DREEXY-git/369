import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Badge, EmptyState } from '@/components/ui';
import { hasReservationConflict, formatDate, type ReservationWindow } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function LeasePage() {
  const user = await requireUser();
  const reservations = await prisma.leaseReservation.findMany({
    where: { tenantId: user.tenantId },
    include: { lines: { include: { asset: true } } },
    orderBy: { startAt: 'asc' },
  });

  // 予約重複チェック（資産ごと）
  const windows: (ReservationWindow & { reservationId: string; assetName: string; stock: number })[] = [];
  for (const r of reservations) {
    for (const l of r.lines) {
      windows.push({
        assetId: l.assetId,
        quantity: l.quantity,
        startAt: r.startAt,
        endAt: r.endAt,
        reservationId: r.id,
        assetName: l.asset.name,
        stock: l.asset.quantity,
      });
    }
  }
  const conflicts = new Set<string>();
  for (const w of windows) {
    const others = windows.filter((o) => o !== w);
    if (hasReservationConflict({ assetId: w.assetId, quantity: w.quantity, startAt: w.startAt, endAt: w.endAt }, others, w.stock)) {
      conflicts.add(`${w.reservationId}:${w.assetId}`);
    }
  }

  return (
    <div>
      <PageHeader title="リース・貸出管理" description="貸出・返却・配送・設営の予定と、在庫の予約重複を管理します。" />

      {conflicts.size > 0 ? (
        <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          ⚠️ 在庫を超える予約重複を {conflicts.size} 件検知しました。商品不足アラートとして対応が必要です。
        </div>
      ) : null}

      <div className="space-y-3">
        {reservations.length === 0 ? (
          <Card><CardContent className="pt-6"><EmptyState title="予約がありません" /></CardContent></Card>
        ) : (
          reservations.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  <span>{r.eventName}</span>
                  <Badge tone="blue">{r.venue}</Badge>
                  <Badge tone="slate">{formatDate(r.startAt)} 〜 {formatDate(r.endAt)}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
                  {r.lines.map((l) => {
                    const conflict = conflicts.has(`${r.id}:${l.assetId}`);
                    return (
                      <div key={l.id} className={`rounded-md border p-2 ${conflict ? 'border-red-300 bg-red-50' : ''}`}>
                        <div className="font-medium">{l.asset.name}</div>
                        <div className="text-xs text-muted-foreground">{l.quantity} / 在庫 {l.asset.quantity}</div>
                        {conflict ? <Badge tone="red">在庫不足</Badge> : null}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>配送: {r.deliveryStaff ?? '—'}</span>
                  <span>設営: {r.setupStaff ?? '—'}</span>
                  <span>回収: {r.returnStaff ?? '—'}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
