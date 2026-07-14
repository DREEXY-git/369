import { test, expect, type Page } from '@playwright/test';
import { prisma } from '@hokko/db';

// Wave1 在庫原子性 hardening の実 PostgreSQL 証拠。
// applyInventoryMovement の $transaction＋FOR UPDATE により、同一資産への並列入庫で
// quantity の read-modify-write が lost update（在庫数破損）を起こさないことを実 DB 最終状態で検証する。
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

test('在庫破損防止: 同一資産への並列入庫を FOR UPDATE で直列化し、quantity=入庫回数×数量 が保たれる', async ({ page }) => {
  const t = await tenantId();
  const name = `INV-ATOM-${process.pid}-${Date.now()}`;
  const asset = await prisma.productAsset.create({
    data: { tenantId: t, code: name.slice(0, 8), name, quantity: 0, status: 'available', condition: 'good' },
  });
  try {
    await login(page, 'ceo@ikezaki.local');
    await page.goto('/operations/inventory-movements/new');
    // 入庫 1 を実 UI で送信し、その Server Action POST を捕捉する。
    // 移動フォーム（「記録する」）は在庫調整フォームと同名 select を持つためフォームにスコープする。
    const moveForm = page.locator('form').filter({ has: page.getByRole('button', { name: '記録する' }) });
    await moveForm.locator('select[name="assetId"]').selectOption(asset.id);
    await moveForm.locator('select[name="type"]').selectOption('receive');
    await moveForm.locator('input[name="quantity"]').fill('1');
    const [recvReq] = await Promise.all([
      page.waitForRequest((r) => r.method() === 'POST' && r.url().includes('/operations/inventory-movements')),
      moveForm.getByRole('button', { name: '記録する' }).click(),
    ]);
    await page.waitForURL(/inventory-movements\?moved=1/);

    // 同一入庫 POST を 5 本並列 replay（= 同一資産への同時入庫）。lost update があれば quantity < 6 になる。
    const headers = { ...recvReq.headers() };
    delete headers['content-length'];
    const body = recvReq.postDataBuffer()!;
    const resps = await Promise.all(
      Array.from({ length: 5 }, () => page.request.post(recvReq.url(), { headers, data: body })),
    );
    for (const r of resps) expect(r.status(), '並列入庫が受理される').toBeLessThan(400);

    // 実測: 入庫は計 6 回（1+5）×数量1＝quantity 6・移動台帳 6 件。FOR UPDATE 無しなら lost update で 6 未満。
    const finalAsset = await prisma.productAsset.findUnique({ where: { id: asset.id }, select: { quantity: true } });
    const moveCount = await prisma.inventoryMovement.count({ where: { assetId: asset.id, type: 'receive' } });
    expect(moveCount, '移動台帳は 6 件').toBe(6);
    expect(finalAsset!.quantity, 'quantity は入庫合計と一致（lost update なし）').toBe(6);
  } finally {
    // cleanup は本テストが作成した行だけに限定（共有 seed tenant の entityType 全削除をしない・Codex #4965315275 P2-1）。
    const moves = await prisma.inventoryMovement.findMany({ where: { assetId: asset.id }, select: { id: true } });
    await prisma.auditLog.deleteMany({ where: { entityType: 'InventoryMovement', entityId: { in: moves.map((m) => m.id) } } });
    await prisma.inventoryMovement.deleteMany({ where: { assetId: asset.id } });
    await prisma.productAsset.deleteMany({ where: { id: asset.id } });
  }
});
