import { test, expect, type Page } from '@playwright/test';
import { prisma } from '@hokko/db';

// Wave1 リース二重引当（在庫超過）の防止の実 PostgreSQL 証拠。
// addAssetToLeaseReservationAction は重複判定と予約ライン作成を単一 $transaction で行い、
// 対象 ProductAsset を FOR UPDATE でロックしてから既存ラインを再読取する。これにより同一資産への
// 並行予約が直列化され、在庫数（=1）を超える二重引当ができない（従来は check-then-act で
// 両方が existing=[] を読み conflict=false のまま在庫超過して二重引当できた）。
// 外部作用なし（社内の在庫予約のみ）。

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

async function tenantId(): Promise<string> {
  const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { tenantId: true } });
  return ceo!.tenantId;
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('二重引当防止: 在庫1の資産への並列リース予約を FOR UPDATE で直列化し、在庫超過ラインが作られない', async ({ page }) => {
  const t = await tenantId();
  const stamp = `${process.pid}-${Date.now()}`;
  // 在庫1の資産と、それを予約できる期間を持つリース予約（ライン無し）を用意する。
  const asset = await prisma.productAsset.create({
    data: { tenantId: t, code: `LZ${stamp}`.slice(0, 8), name: `LEASE-ATOM-${stamp}`, quantity: 1, status: 'available', condition: 'good' },
  });
  const reservation = await prisma.leaseReservation.create({
    data: {
      tenantId: t,
      eventName: `LEASE-RSV-${stamp}`,
      status: 'reserved',
      startAt: new Date('2030-01-10T00:00:00Z'),
      endAt: new Date('2030-01-12T00:00:00Z'),
    },
  });
  try {
    await login(page, 'ceo@ikezaki.local');
    await page.goto('/inventory/lease');
    // 対象予約の「追加」フォームにスコープ（確定/出庫/返却フォームも同じ reservationId を持つため）。
    const addForm = page
      .locator('form')
      .filter({ has: page.locator(`input[name="reservationId"][value="${reservation.id}"]`) })
      .filter({ has: page.getByRole('button', { name: '追加' }) });
    await addForm.locator('select[name="assetId"]').selectOption(asset.id);
    await addForm.locator('input[name="quantity"]').fill('1');
    const [addReq] = await Promise.all([
      page.waitForRequest((r) => r.method() === 'POST' && r.url().includes('/inventory/lease')),
      addForm.getByRole('button', { name: '追加' }).click(),
    ]);
    await page.waitForURL(/lease\?added=1/);

    // 捕捉した POST が作ったラインを一旦削除し、existing=[] のレース初期状態へ戻す
    //（実 UI 送信は1回コミットしてしまうため、並列レースを再現するにはリセットが必要）。
    await prisma.leaseReservationLine.deleteMany({ where: { reservationId: reservation.id, assetId: asset.id } });

    // 同一 POST を 6 本並列 replay（= 在庫1への同時二重引当）。
    // FOR UPDATE が無ければ複数が existing=[] を読み、在庫1を超えて複数ラインを作れてしまう。
    const headers = { ...addReq.headers() };
    delete headers['content-length'];
    const body = addReq.postDataBuffer()!;
    const resps = await Promise.all(
      Array.from({ length: 6 }, () => page.request.post(addReq.url(), { headers, data: body })),
    );
    for (const r of resps) expect(r.status(), '予約リクエスト自体はエラーにならない（衝突は業務判定でredirect）').toBeLessThan(400);

    // 実測: 在庫1を超える引当は不可。作られたラインは高々1件（数量合計 ≤ 在庫1）。
    const lines = await prisma.leaseReservationLine.findMany({ where: { reservationId: reservation.id, assetId: asset.id }, select: { quantity: true } });
    const totalReserved = lines.reduce((s, l) => s + l.quantity, 0);
    expect(lines.length, '作成された予約ラインは高々1件（二重引当なし）').toBeLessThanOrEqual(1);
    expect(totalReserved, '引当数量合計は在庫1以下').toBeLessThanOrEqual(1);
  } finally {
    await prisma.auditLog.deleteMany({ where: { tenantId: t, entityType: 'InventoryMovement' } });
    await prisma.inventoryMovement.deleteMany({ where: { assetId: asset.id } });
    await prisma.leaseReservationLine.deleteMany({ where: { reservationId: reservation.id } });
    await prisma.leaseReservation.deleteMany({ where: { id: reservation.id } });
    await prisma.productAsset.deleteMany({ where: { id: asset.id } });
  }
});
