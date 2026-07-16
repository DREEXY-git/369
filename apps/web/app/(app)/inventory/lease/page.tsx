import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Input, Select, Button, Badge, EmptyState } from '@/components/ui';
import { hasReservationConflict, formatDate, type ReservationWindow } from '@hokko/shared';
import {
  createLeaseReservationAction,
  addAssetToLeaseReservationAction,
  confirmLeaseReservationAction,
  dispatchLeaseReservationAction,
  returnLeaseReservationAction,
  convertLeaseReservationToEventProjectAction,
} from '../../operations/actions';

export const dynamic = 'force-dynamic';

const MSG: Record<string, string> = {
  created: 'リース予約を作成しました。',
  added: '商品を予約に追加しました。',
  confirmed: '予約を確定しました。',
  dispatched: '出庫しました。',
  returned: '返却しました。',
  damaged: '破損を記録しました。',
};

export default async function LeasePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const canEdit = hasPermission(user, 'inventory', 'update');

  const [reservations, assets] = await Promise.all([
    prisma.leaseReservation.findMany({
      where: { tenantId: user.tenantId },
      include: { lines: { include: { asset: true } } },
      orderBy: { startAt: 'asc' },
    }),
    prisma.productAsset.findMany({ where: { tenantId: user.tenantId }, select: { id: true, name: true, quantity: true, status: true }, orderBy: { name: 'asc' }, take: 200 }),
  ]);

  // 予約重複チェック（資産ごと）
  const windows: (ReservationWindow & { reservationId: string })[] = [];
  for (const r of reservations) {
    for (const l of r.lines) {
      windows.push({ assetId: l.assetId, quantity: l.quantity, startAt: r.startAt, endAt: r.endAt, reservationId: r.id });
    }
  }
  const conflicts = new Set<string>();
  for (const w of windows) {
    const others = windows.filter((o) => o !== w);
    const stock = assets.find((a) => a.id === w.assetId)?.quantity ?? 0;
    if (hasReservationConflict({ assetId: w.assetId, quantity: w.quantity, startAt: w.startAt, endAt: w.endAt }, others, stock)) {
      conflicts.add(`${w.reservationId}:${w.assetId}`);
    }
  }

  return (
    <div>
      <PageHeader
        title="リース・貸出管理"
        description="貸出・返却・配送・設営の予定と在庫の予約重複を管理します。予約→確定→出庫→返却→案件化まで。"
        action={<Link href="/operations"><Button variant="outline">Operations OS</Button></Link>}
      />

      {sp.error === 'conflict' ? (
        <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">⚠️ 「{sp.asset}」は在庫を超えるため追加できません（予約重複）。</div>
      ) : null}
      {sp.pending === 'release' ? (
        <div className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">予約済み在庫の強制解除は承認申請を作成しました（承認後に解除されます）。</div>
      ) : null}
      {Object.keys(MSG).filter((k) => sp[k] !== undefined).map((k) => (
        <div key={k} className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{MSG[k]}</div>
      ))}

      {conflicts.size > 0 ? (
        <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          ⚠️ 在庫を超える予約重複を {conflicts.size} 件検知しました。商品不足アラートとして対応が必要です。
        </div>
      ) : null}

      {canEdit ? (
        <Card className="mb-4">
          <CardHeader><CardTitle>リース予約を作成</CardTitle></CardHeader>
          <CardContent>
            <form action={createLeaseReservationAction} className="flex flex-wrap items-end gap-2">
              <div className="flex-1"><label className="mb-1 block text-xs">案件名</label><Input name="eventName" required placeholder="例: 〇〇株式会社 周年式典" /></div>
              <div><label className="mb-1 block text-xs">会場</label><Input name="venue" placeholder="会場" /></div>
              <div><label className="mb-1 block text-xs">開始</label><Input name="startAt" type="date" required /></div>
              <div><label className="mb-1 block text-xs">終了</label><Input name="endAt" type="date" required /></div>
              <Button type="submit">作成</Button>
            </form>
          </CardContent>
        </Card>
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
                  {r.venue ? <Badge tone="blue">{r.venue}</Badge> : null}
                  <Badge tone="slate">{formatDate(r.startAt)} 〜 {formatDate(r.endAt)}</Badge>
                  <Badge tone={r.status === 'returned' ? 'green' : r.status === 'dispatched' ? 'amber' : 'blue'}>{r.status}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
                  {r.lines.length === 0 ? <span className="text-xs text-muted-foreground">商品未割当</span> : r.lines.map((l) => {
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

                {canEdit ? (
                  <div className="mt-3 space-y-2 border-t pt-3">
                    <form action={addAssetToLeaseReservationAction} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="reservationId" value={r.id} />
                      <Select name="assetId" required className="flex-1"><option value="">商品を追加</option>{assets.map((a) => <option key={a.id} value={a.id}>{a.name}（在庫{a.quantity}）</option>)}</Select>
                      <Input name="quantity" type="number" min="1" defaultValue="1" className="w-20" />
                      <Button type="submit" variant="outline">追加</Button>
                    </form>
                    <div className="flex flex-wrap gap-2">
                      {/* lifecycle は reserved→confirmed→dispatched→returned の CAS（P3-INV-2）。
                          現在状態から遷移可能なボタンのみ表示（server 側でも CAS で fail-closed）。 */}
                      {r.status === 'reserved' ? (
                        <form action={confirmLeaseReservationAction}><input type="hidden" name="reservationId" value={r.id} /><Button type="submit" variant="outline">確定</Button></form>
                      ) : null}
                      {r.status === 'confirmed' ? (
                        <form action={dispatchLeaseReservationAction}><input type="hidden" name="reservationId" value={r.id} /><Button type="submit" variant="outline">出庫</Button></form>
                      ) : null}
                      {r.status === 'dispatched' ? (
                        <form action={returnLeaseReservationAction}><input type="hidden" name="reservationId" value={r.id} /><Button type="submit" variant="outline">返却</Button></form>
                      ) : null}
                      <form action={convertLeaseReservationToEventProjectAction}><input type="hidden" name="reservationId" value={r.id} /><Button type="submit" variant="outline">イベント案件化</Button></form>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
