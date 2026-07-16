import { test, expect } from '@playwright/test';
import { prisma } from '@hokko/db';
import { confirmPurchaseOrder, receivePurchaseOrder, executeApprovedPurchaseOrderIssue } from '../../lib/domains/operations/procurement';
import { approveRequest } from '../../lib/approval';

// STATE2 C2（Codex 事前監査・原子性 HIGH）の実 PostgreSQL 証拠。
// confirmPurchaseOrder は status を検証せず draft 前提の無条件 update で 'ordered' へ書き戻していたため、
// received 済み PO を 'ordered' へ差し戻し、receivePurchaseOrder の CAS（ordered→received）を再成立させて
// 在庫を二重計上できた（Wave1 で塞いだ receive 側 CAS の隣接経路。確定ボタンは UI 上 draft のみだが
// Server Action は直接 POST で到達可能）。
// 修正: 発注確定は draft からのみ許可（status!=='draft' は no-op）＋ draft→ordered/pending_approval を
// 条件付き updateMany（count===1）で claim。
// 外部作用なし（社内の在庫記録のみ）。

async function tenantId(): Promise<string> {
  const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { tenantId: true } });
  return ceo!.tenantId;
}
async function ceoUserId(): Promise<string> {
  const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { id: true } });
  return ceo!.id;
}

// draft PO（少額＝承認不要）＋入庫先資産（qty 0）を1ライン qty で用意する。
async function makeDraftPo(qty: number, unitPrice: number): Promise<{ poId: string; assetId: string }> {
  const t = await tenantId();
  const stamp = `${process.pid}-${Date.now()}`;
  const asset = await prisma.productAsset.create({
    data: { tenantId: t, code: `POC${stamp}`.slice(0, 8), name: `PO-CONF-ASSET-${stamp}`, quantity: 0, status: 'available', condition: 'good' },
  });
  const po = await prisma.purchaseOrder.create({
    data: {
      tenantId: t, orderNo: `POCONF-${stamp}`.slice(0, 20), status: 'draft', totalAmount: qty * unitPrice,
      lines: { create: [{ tenantId: t, assetId: asset.id, assetName: asset.name, quantity: qty, unitPrice, amount: qty * unitPrice }] },
    },
  });
  return { poId: po.id, assetId: asset.id };
}

// 高額 PO（承認必須）の draft fixture（totalAmount = qty*unitPrice ≥ 100,000）。
async function makeHighValueDraftPo(): Promise<{ poId: string; assetId: string }> {
  return makeDraftPo(1, 500_000);
}

async function cleanup(poId: string, assetId: string) {
  const t = await tenantId();
  const moves = await prisma.inventoryMovement.findMany({ where: { assetId }, select: { id: true } });
  await prisma.auditLog.deleteMany({ where: { entityType: 'InventoryMovement', entityId: { in: moves.map((m) => m.id) } } });
  await prisma.inventoryMovement.deleteMany({ where: { assetId } });
  // 承認申請・承認/実行監査・growth（高額経路）を掃除。
  await prisma.auditLog.deleteMany({ where: { tenantId: t, entityType: 'PurchaseOrder', entityId: poId } });
  await prisma.growthEvent.deleteMany({ where: { tenantId: t, entityType: 'PurchaseOrder', entityId: poId } });
  await prisma.approvalRequest.deleteMany({ where: { tenantId: t, entityType: 'PurchaseOrder', entityId: poId } });
  await prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: poId } });
  await prisma.purchaseOrder.deleteMany({ where: { id: poId } });
  await prisma.productAsset.deleteMany({ where: { id: assetId } });
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('C2: received 済み発注を再確定しても ordered へ差し戻さない（二重入庫できない）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const { poId, assetId } = await makeDraftPo(1, 1000);
  const actor = { tenantId: t, userId: uid };
  try {
    // draft → 確定（少額＝承認不要）→ ordered。
    const c1 = await confirmPurchaseOrder(actor, poId);
    expect(c1.found).toBe(true);
    expect(c1.requiresApproval).toBe(false);
    expect((await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { status: true } }))!.status).toBe('ordered');

    // 入庫 → received・資産 qty=1。
    expect(await receivePurchaseOrder(actor, poId)).toBe(true);
    expect((await prisma.productAsset.findUnique({ where: { id: assetId }, select: { quantity: true } }))!.quantity).toBe(1);

    // 攻撃/二度押し: received 済み PO を再確定 → 差し戻さない（no-op）。
    await confirmPurchaseOrder(actor, poId);
    expect(
      (await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { status: true } }))!.status,
      'received が ordered へ差し戻されない',
    ).toBe('received');

    // 再入庫を試みる → claim.count=0 で no-op（二重入庫なし）。
    expect(await receivePurchaseOrder(actor, poId), '再入庫は no-op').toBe(false);

    // 実測: 資産 qty は 1 のまま・入庫台帳 1 件（水増しなし）。
    expect((await prisma.productAsset.findUnique({ where: { id: assetId }, select: { quantity: true } }))!.quantity, 'qty 水増しなし').toBe(1);
    expect(await prisma.inventoryMovement.count({ where: { assetId, type: 'receive' } }), '入庫台帳 1 件のみ').toBe(1);
  } finally {
    await cleanup(poId, assetId);
  }
});

test('正常系回帰: draft→確定→ordered→入庫→received が従来どおり成立（単一入庫）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const { poId, assetId } = await makeDraftPo(3, 500);
  const actor = { tenantId: t, userId: uid };
  try {
    expect((await confirmPurchaseOrder(actor, poId)).requiresApproval).toBe(false);
    expect((await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { status: true } }))!.status).toBe('ordered');
    expect(await receivePurchaseOrder(actor, poId)).toBe(true);
    const po = await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { status: true } });
    expect(po!.status).toBe('received');
    expect((await prisma.productAsset.findUnique({ where: { id: assetId }, select: { quantity: true } }))!.quantity).toBe(3);
    expect(await prisma.inventoryMovement.count({ where: { assetId, type: 'receive' } })).toBe(1);
  } finally {
    await cleanup(poId, assetId);
  }
});

test('高額並行 confirm: 承認申請＋PO claim を単一 tx で原子化し、PENDING Approval 1・PO.approvalId 一致・孤児 0（Codex R2 #1/#3）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const { poId, assetId } = await makeHighValueDraftPo();
  const actor = { tenantId: t, userId: uid };
  try {
    // 同一 draft PO へ barrier 並行 confirm 3 本。高額なので全て requiresApproval=true。
    const results = await Promise.all([
      confirmPurchaseOrder(actor, poId),
      confirmPurchaseOrder(actor, poId),
      confirmPurchaseOrder(actor, poId),
    ]);
    for (const r of results) {
      expect(r.found).toBe(true);
      expect(r.requiresApproval, '高額は承認必須').toBe(true);
    }
    const po = await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { status: true, approvalId: true } });
    expect(po!.status, 'pending_approval へ claim').toBe('pending_approval');
    expect(po!.approvalId, 'PO.approvalId が設定される').toBeTruthy();
    // PENDING ApprovalRequest はちょうど 1（敗者側の承認申請は tx rollback で孤児化しない）。
    const approvals = await prisma.approvalRequest.findMany({ where: { tenantId: t, entityType: 'PurchaseOrder', entityId: poId } });
    expect(approvals.length, 'ApprovalRequest はちょうど 1（孤児 0）').toBe(1);
    expect(approvals[0]?.status).toBe('PENDING');
    expect(po!.approvalId, 'PO.approvalId は生存 Approval と一致').toBe(approvals[0]?.id);
    // 承認申請監査もちょうど 1（敗者側監査も rollback）。
    expect(await prisma.auditLog.count({ where: { tenantId: t, entityId: poId, action: 'approval_request' } }), '承認申請監査 1 件のみ').toBe(1);
  } finally {
    await cleanup(poId, assetId);
  }
});

test('高額承認実行: pending_approval→ordered→received、二重実行と received 後の別 approval 実行を差し戻さない（Codex R2 #2/#4）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const { poId, assetId } = await makeHighValueDraftPo();
  const actor = { tenantId: t, userId: uid };
  try {
    await confirmPurchaseOrder(actor, poId);
    const approvalId = (await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { approvalId: true } }))!.approvalId!;
    expect(approvalId).toBeTruthy();
    await approveRequest(approvalId, uid, 'ok'); // PENDING→APPROVED。

    // 承認実行 → pending_approval→ordered（status+approvalId CAS）。
    const e1 = await executeApprovedPurchaseOrderIssue(actor, approvalId, poId);
    expect(e1.executed, '承認実行は成功').toBe(true);
    expect((await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { status: true } }))!.status).toBe('ordered');

    // 二重 submit（同一 approval の再実行）→ executedAt claim で弾く（二重 ordered 化しない）。
    const e2 = await executeApprovedPurchaseOrderIssue(actor, approvalId, poId);
    expect(e2.executed, '二重実行は弾く').toBe(false);
    expect(e2.reason).toBe('already-executed');

    // 入庫 → received・qty=1。
    expect(await receivePurchaseOrder(actor, poId)).toBe(true);
    expect((await prisma.productAsset.findUnique({ where: { id: assetId }, select: { quantity: true } }))!.quantity).toBe(1);

    // received 後に **別（stale/偽造）approval** を APPROVED として実行 → status CAS（pending_approval AND approvalId）
    // が count=0 で弾き、received→ordered へ差し戻さない（二重入庫の再開を構造的に不可能に）。
    const stale = await prisma.approvalRequest.create({
      data: { tenantId: t, type: 'purchase_order_issue', requestedForAction: 'purchase_order_issue', title: 'stale', summary: '', entityType: 'PurchaseOrder', entityId: poId, riskLevel: 'MEDIUM', status: 'APPROVED', reason: '' },
    });
    const e3 = await executeApprovedPurchaseOrderIssue(actor, stale.id, poId);
    expect(e3.executed, 'stale approval は差し戻さず fail-closed').toBe(false);
    expect(e3.reason).toBe('po-not-claimable');
    expect((await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { status: true } }))!.status, 'received 維持（差し戻しなし）').toBe('received');

    // 再入庫も no-op（qty 水増しなし・台帳 1 件）。
    expect(await receivePurchaseOrder(actor, poId), '再入庫は no-op').toBe(false);
    expect((await prisma.productAsset.findUnique({ where: { id: assetId }, select: { quantity: true } }))!.quantity, 'qty 水増しなし').toBe(1);
    expect(await prisma.inventoryMovement.count({ where: { assetId, type: 'receive' } }), '入庫台帳 1 件のみ').toBe(1);
  } finally {
    await cleanup(poId, assetId);
  }
});

test('存在しない/別状態: 未確定でない発注の再確定は found=true の no-op（差し戻し・二重生成なし）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const { poId, assetId } = await makeDraftPo(1, 1000);
  const actor = { tenantId: t, userId: uid };
  try {
    // cancelled へ直接遷移させ、再確定しても ordered へ動かないことを確認。
    await prisma.purchaseOrder.update({ where: { id: poId }, data: { status: 'cancelled' } });
    const res = await confirmPurchaseOrder(actor, poId);
    expect(res.found).toBe(true);
    expect((await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { status: true } }))!.status).toBe('cancelled');
  } finally {
    await cleanup(poId, assetId);
  }
});
