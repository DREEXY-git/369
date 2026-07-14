import { test, expect, type Page } from '@playwright/test';
import { prisma } from '@hokko/db';

// Wave1 発注入庫の冪等化（在庫水増しの根絶）の実 PostgreSQL 証拠。
// receivePurchaseOrder は status を `ordered → received` へ条件付き単一更新で claim してから入庫する。
// これにより同一 PO への二重クリック / リトライ / 並行入庫は claim.count=0 で no-op となり、
// InventoryMovement は1回だけ・ProductAsset.quantity はライン数量ぶんだけ増える（水増しなし）。
// 外部作用なし（社内の在庫記録のみ）。

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

test('二重入庫防止: 同一発注書への並列入庫を status CAS で1回に絞り、在庫が水増しされない', async ({ page }) => {
  const t = await tenantId();
  const stamp = `${process.pid}-${Date.now()}`;
  // 入庫先資産（quantity=0）と、その資産を1個入庫する ordered な発注書＋ラインを用意する。
  const asset = await prisma.productAsset.create({
    data: { tenantId: t, code: `POA${stamp}`.slice(0, 8), name: `PO-RCV-ASSET-${stamp}`, quantity: 0, status: 'available', condition: 'good' },
  });
  const po = await prisma.purchaseOrder.create({
    data: {
      tenantId: t,
      orderNo: `PORCV-${stamp}`.slice(0, 20),
      status: 'ordered',
      totalAmount: 1000,
      lines: { create: [{ tenantId: t, assetId: asset.id, assetName: asset.name, quantity: 1, unitPrice: 1000, amount: 1000 }] },
    },
  });
  try {
    await login(page, 'ceo@ikezaki.local');
    await page.goto(`/operations/purchase-orders/${po.id}`);
    // 入庫フォーム（「入庫する」）を送信し、その Server Action POST を捕捉する。
    const [recvReq] = await Promise.all([
      page.waitForRequest((r) => r.method() === 'POST' && r.url().includes('/operations/purchase-orders')),
      page.getByRole('button', { name: '入庫する' }).click(),
    ]);
    await page.waitForURL(/received=1|purchase-orders(\?|$)/);

    // 同一入庫 POST を 5 本並列 replay（= 同一発注書への二重/多重入庫）。
    // CAS が無ければ各 replay が InventoryMovement を発行し quantity が 1 を超えて水増しされる。
    const headers = { ...recvReq.headers() };
    delete headers['content-length'];
    const body = recvReq.postDataBuffer()!;
    const resps = await Promise.all(
      Array.from({ length: 5 }, () => page.request.post(recvReq.url(), { headers, data: body })),
    );
    for (const r of resps) expect(r.status(), '再入庫リクエストはエラーにならず受理（no-op）される').toBeLessThan(400);

    // 実測: 入庫は claim を勝った 1 回のみ。quantity=1（ライン数量）・移動台帳 1 件・PO status=received。
    const finalAsset = await prisma.productAsset.findUnique({ where: { id: asset.id }, select: { quantity: true } });
    const moveCount = await prisma.inventoryMovement.count({ where: { assetId: asset.id, type: 'receive' } });
    const finalPo = await prisma.purchaseOrder.findUnique({ where: { id: po.id }, select: { status: true } });
    expect(moveCount, '入庫台帳は 1 件のみ（二重入庫なし）').toBe(1);
    expect(finalAsset!.quantity, 'quantity はライン数量=1（水増しなし）').toBe(1);
    expect(finalPo!.status, 'PO は received').toBe('received');
  } finally {
    await prisma.auditLog.deleteMany({ where: { tenantId: t, entityType: 'InventoryMovement' } });
    await prisma.inventoryMovement.deleteMany({ where: { assetId: asset.id } });
    await prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: po.id } });
    await prisma.purchaseOrder.deleteMany({ where: { id: po.id } });
    await prisma.productAsset.deleteMany({ where: { id: asset.id } });
  }
});
