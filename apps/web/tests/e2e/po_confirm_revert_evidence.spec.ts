import { test, expect } from '@playwright/test';
import { prisma } from '@hokko/db';
import { makeIdempotencyKey } from '@hokko/shared';
import { confirmPurchaseOrder, receivePurchaseOrder, executeApprovedPurchaseOrderIssue } from '../../lib/domains/operations/procurement';
import { approveRequest } from '../../lib/approval';
import { decidePurchaseOrderIssueCore, type PoIssueBridgeDb } from '../../lib/purchase-order-issue-bridge';

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
  // 承認申請・承認/実行監査・growth・domain/outbox（高額経路）を掃除。
  const evs = await prisma.domainEvent.findMany({ where: { tenantId: t, aggregateId: poId }, select: { id: true } });
  await prisma.outboxMessage.deleteMany({ where: { tenantId: t, eventId: { in: evs.map((e) => e.id) } } });
  await prisma.growthEvent.deleteMany({ where: { tenantId: t, entityType: 'PurchaseOrder', entityId: poId } });
  await prisma.domainEvent.deleteMany({ where: { tenantId: t, aggregateId: poId } });
  await prisma.auditLog.deleteMany({ where: { tenantId: t, entityType: 'PurchaseOrder', entityId: poId } });
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
  const actor = { tenantId: t, userId: uid, roles: ['OWNER' as const], sessionIsAi: false };
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
  const actor = { tenantId: t, userId: uid, roles: ['OWNER' as const], sessionIsAi: false };
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
  const actor = { tenantId: t, userId: uid, roles: ['OWNER' as const], sessionIsAi: false };
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
  const actor = { tenantId: t, userId: uid, roles: ['OWNER' as const], sessionIsAi: false };
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

test('AI/mixed-role fail-closed: confirm/receive/承認実行は actorIsAi で DB 接触前に拒否し行不変（Codex R3 P2-1）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const { poId, assetId } = await makeHighValueDraftPo();
  const aiActor = { tenantId: t, userId: uid, roles: ['AI_AGENT' as const], sessionIsAi: true };
  try {
    // confirm: AI は forbidden・PO は draft のまま・Approval も作られない（孤児 0）。
    const c = await confirmPurchaseOrder(aiActor, poId);
    expect(c.forbidden, 'AI confirm は forbidden').toBe(true);
    expect((await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { status: true } }))!.status, 'PO は draft 不変').toBe('draft');
    expect(await prisma.approvalRequest.count({ where: { tenantId: t, entityType: 'PurchaseOrder', entityId: poId } }), 'ApprovalRequest 0').toBe(0);

    // 人間が pending_approval → 承認まで進めた状態を作る。
    const human = { tenantId: t, userId: uid, roles: ['OWNER' as const], sessionIsAi: false };
    await confirmPurchaseOrder(human, poId);
    const approvalId = (await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { approvalId: true } }))!.approvalId!;
    await approveRequest(approvalId, uid, 'ok');
    // execute: AI は forbidden・PO は pending_approval 不変（ordered 化しない）。
    const e = await executeApprovedPurchaseOrderIssue(aiActor, approvalId, poId);
    expect(e.executed, 'AI execute は不可').toBe(false);
    expect(e.reason).toBe('forbidden');
    expect((await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { status: true } }))!.status, 'PO は pending_approval 不変').toBe('pending_approval');

    // 人間が execute → ordered。receive: AI は no-op・在庫移動 0・PO は ordered 不変。
    await executeApprovedPurchaseOrderIssue(human, approvalId, poId);
    const aiReceive = await receivePurchaseOrder(aiActor, poId);
    expect(aiReceive, 'AI receive は no-op').toBe(false);
    expect(await prisma.inventoryMovement.count({ where: { assetId, type: 'receive' } }), 'AI 経由の入庫 0').toBe(0);
    expect((await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { status: true } }))!.status, 'PO は ordered 不変').toBe('ordered');
  } finally {
    await cleanup(poId, assetId);
  }
});

test('reject bridge: 却下で PO を draft へ差し戻し approvalId 解除・dangling pending_approval 0・再申請可能（Codex R3 P2-2）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const { poId, assetId } = await makeHighValueDraftPo();
  const human = { tenantId: t, userId: uid, roles: ['OWNER' as const], sessionIsAi: false };
  try {
    await confirmPurchaseOrder(human, poId);
    const approvalId = (await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { approvalId: true } }))!.approvalId!;
    // 却下（専用 bridge）: ApprovalRequest REJECTED＋PO draft/approvalId=null＋監査を単一 tx で確定。
    const r = await decidePurchaseOrderIssueCore(prisma as unknown as PoIssueBridgeDb, {
      tenantId: t, approvalId, purchaseOrderId: poId, decision: 'reject', decidedById: uid, note: 'no', approvalTitle: 'x', decidedByRoles: ['OWNER' as const], decidedBySessionIsAi: false,
    });
    expect(r.outcome).toBe('decided');
    const po = await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { status: true, approvalId: true } });
    expect(po!.status, 'PO は draft へ差し戻し').toBe('draft');
    expect(po!.approvalId, 'approvalId 解除').toBeNull();
    expect((await prisma.approvalRequest.findUnique({ where: { id: approvalId }, select: { status: true } }))!.status).toBe('REJECTED');
    // dangling pending_approval 0（この PO を指す pending_approval の Approval が残らない）。
    expect(await prisma.purchaseOrder.count({ where: { id: poId, status: 'pending_approval' } }), 'dangling pending_approval 0').toBe(0);
    // 再申請可能: draft から再度 confirm できる（新しい approval で pending_approval）。
    const re = await confirmPurchaseOrder(human, poId);
    expect(re.requiresApproval, '却下後に再申請できる').toBe(true);
    expect((await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { status: true } }))!.status).toBe('pending_approval');
  } finally {
    await cleanup(poId, assetId);
  }
});

test('decision 競合/整合: approve/reject 並行は勝者1本・approve target mismatch は rollback・cross-tenant 無効（Codex R3 P2-2）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const { poId, assetId } = await makeHighValueDraftPo();
  const human = { tenantId: t, userId: uid, roles: ['OWNER' as const], sessionIsAi: false };
  const foreignTenant = await prisma.tenant.create({ data: { name: `POR3-FOREIGN-${process.pid}-${Date.now()}` } });
  try {
    await confirmPurchaseOrder(human, poId);
    const approvalId = (await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { approvalId: true } }))!.approvalId!;

    // cross-tenant: 別 tenant からの決定は ApprovalRequest（PENDING 限定 tenant scoped CAS）に当たらず 'already'・PO 不変。
    const foreign = await decidePurchaseOrderIssueCore(prisma as unknown as PoIssueBridgeDb, {
      tenantId: foreignTenant.id, approvalId, purchaseOrderId: poId, decision: 'reject', decidedById: uid, note: '', approvalTitle: 'x', decidedByRoles: ['OWNER' as const], decidedBySessionIsAi: false,
    });
    expect(foreign.outcome, 'cross-tenant は決定できない').toBe('already');
    expect((await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { status: true } }))!.status).toBe('pending_approval');

    // approve/reject 並行 → PENDING 限定 CAS で勝者ちょうど 1・敗者 'already'。
    const [a, b] = await Promise.all([
      decidePurchaseOrderIssueCore(prisma as unknown as PoIssueBridgeDb, { tenantId: t, approvalId, purchaseOrderId: poId, decision: 'approve', decidedById: uid, note: '', approvalTitle: 'x', decidedByRoles: ['OWNER' as const], decidedBySessionIsAi: false }),
      decidePurchaseOrderIssueCore(prisma as unknown as PoIssueBridgeDb, { tenantId: t, approvalId, purchaseOrderId: poId, decision: 'reject', decidedById: uid, note: '', approvalTitle: 'x', decidedByRoles: ['OWNER' as const], decidedBySessionIsAi: false }),
    ]);
    const decided = [a, b].filter((x) => x.outcome === 'decided');
    const already = [a, b].filter((x) => x.outcome === 'already');
    expect(decided.length, '勝者ちょうど 1').toBe(1);
    expect(already.length, '敗者は already').toBe(1);
    // ApprovalRequest はいずれか一方の decision に確定（PENDING ではない）。
    expect((await prisma.approvalRequest.findUnique({ where: { id: approvalId }, select: { status: true } }))!.status).not.toBe('PENDING');
  } finally {
    await prisma.tenant.deleteMany({ where: { id: foreignTenant.id } });
    await cleanup(poId, assetId);
  }
});

test('approve target mismatch: 別 PO/approvalId 不一致の approve は rollback し ApprovalRequest は PENDING のまま（Codex R3 P2-2）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const { poId, assetId } = await makeHighValueDraftPo();
  const human = { tenantId: t, userId: uid, roles: ['OWNER' as const], sessionIsAi: false };
  try {
    await confirmPurchaseOrder(human, poId);
    const approvalId = (await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { approvalId: true } }))!.approvalId!;
    // 存在しない PO を指して approve → PO 整合確認 count!==1 → throw で決定ごと rollback。
    let threw = false;
    try {
      await decidePurchaseOrderIssueCore(prisma as unknown as PoIssueBridgeDb, {
        tenantId: t, approvalId, purchaseOrderId: 'po_does_not_exist_000', decision: 'approve', decidedById: uid, note: '', approvalTitle: 'x', decidedByRoles: ['OWNER' as const], decidedBySessionIsAi: false,
      });
    } catch {
      threw = true;
    }
    expect(threw, 'target mismatch は throw').toBe(true);
    // rollback により ApprovalRequest は PENDING のまま（人間が再判断できる）・PO も pending_approval 不変。
    expect((await prisma.approvalRequest.findUnique({ where: { id: approvalId }, select: { status: true } }))!.status, 'ApprovalRequest PENDING のまま').toBe('PENDING');
    expect((await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { status: true } }))!.status).toBe('pending_approval');
  } finally {
    await cleanup(poId, assetId);
  }
});

// 承認実行の all-or-nothing（Codex R3 P2→R4）: PO CAS→Audit→Domain/Outbox/Growth を単一 tx にし、
// 途中 fault で PO=ordered だが Audit/Growth 欠落 の半確定を残さない。fault 後の retry で 1 lineage へ収束。
async function confirmApprovePendingPo(t: string, uid: string): Promise<{ poId: string; assetId: string; approvalId: string }> {
  const { poId, assetId } = await makeHighValueDraftPo();
  const human = { tenantId: t, userId: uid, roles: ['OWNER' as const], sessionIsAi: false };
  await confirmPurchaseOrder(human, poId);
  const approvalId = (await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { approvalId: true } }))!.approvalId!;
  await approveRequest(approvalId, uid, 'ok');
  return { poId, assetId, approvalId };
}
async function assertPoExecutedOnce(t: string, poId: string, approvalId?: string) {
  expect((await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { status: true } }))!.status, 'PO ordered').toBe('ordered');
  expect(await prisma.auditLog.count({ where: { tenantId: t, entityType: 'PurchaseOrder', entityId: poId, action: 'purchase_order_issue' } }), 'Audit 1').toBe(1);
  const evs = await prisma.domainEvent.findMany({ where: { tenantId: t, aggregateId: poId, eventType: 'PURCHASE_ORDER_APPROVED' }, select: { id: true } });
  expect(evs.length, 'DomainEvent 1').toBe(1);
  expect(await prisma.outboxMessage.count({ where: { tenantId: t, eventId: { in: evs.map((e) => e.id) } } }), 'Outbox 1').toBe(1);
  expect(await prisma.growthEvent.count({ where: { tenantId: t, entityType: 'PurchaseOrder', entityId: poId, type: 'inventory.purchase_order.created' } }), 'Growth 1').toBe(1);
  // Approval も同一 tx で executed へ終端収束している（Codex R5: claim〜終端が業務 tx と原子確定）。
  if (approvalId) {
    const a = await prisma.approvalRequest.findUnique({ where: { id: approvalId }, select: { executionStatus: true, executedAt: true } });
    expect(a!.executionStatus, 'Approval executed').toBe('executed');
    expect(a!.executedAt, 'Approval executedAt が確定').not.toBeNull();
  }
}

// R5: fault 後は Approval が claim を含め全 rollback され、APPROVED・executedAt=null・executionStatus 非 executed/
// executing に戻る（PO pending_approval・Evidence 0）。「PO=ordered なのに Approval だけ収束しない」半確定を残さない。
async function assertFullyRolledBack(t: string, poId: string, approvalId: string) {
  expect((await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { status: true } }))!.status, 'PO は pending_approval 不変').toBe('pending_approval');
  expect(await prisma.auditLog.count({ where: { tenantId: t, entityType: 'PurchaseOrder', entityId: poId, action: 'purchase_order_issue' } }), 'Audit 0').toBe(0);
  expect(await prisma.domainEvent.count({ where: { tenantId: t, aggregateId: poId } }), 'DomainEvent 0').toBe(0);
  expect(await prisma.outboxMessage.count({ where: { tenantId: t, eventId: { in: (await prisma.domainEvent.findMany({ where: { tenantId: t, aggregateId: poId }, select: { id: true } })).map((e) => e.id) } } }), 'Outbox 0').toBe(0);
  expect(await prisma.growthEvent.count({ where: { tenantId: t, entityType: 'PurchaseOrder', entityId: poId } }), 'Growth 0').toBe(0);
  const a = await prisma.approvalRequest.findUnique({ where: { id: approvalId }, select: { status: true, executedAt: true, executionStatus: true } });
  expect(a!.status, 'Approval は APPROVED のまま').toBe('APPROVED');
  expect(a!.executedAt, 'Approval executedAt は claim ごと rollback で null').toBeNull();
  expect(a!.executionStatus, 'Approval は executed/executing に半確定しない').not.toBe('executed');
}

test('承認実行 all-or-nothing: PO CAS 後の Audit fault で PO=ordered を含め全 rollback→retry で 1 lineage へ収束（Codex R4）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const { poId, assetId, approvalId } = await confirmApprovePendingPo(t, uid);
  const human = { tenantId: t, userId: uid, roles: ['OWNER' as const], sessionIsAi: false };
  try {
    // PO CAS 後・Audit 前に fault → 単一 tx なので PO=ordered ごと rollback（半確定なし）。
    let threw = false;
    try {
      await executeApprovedPurchaseOrderIssue(human, approvalId, poId, { __faultAfterCasForTest: () => { throw new Error('injected-after-cas'); } });
    } catch { threw = true; }
    expect(threw).toBe(true);
    // rollback: PO は pending_approval 不変・Audit/DomainEvent/Growth 0（半確定を残さない）。
    expect((await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { status: true } }))!.status, 'PO は pending_approval 不変').toBe('pending_approval');
    expect(await prisma.auditLog.count({ where: { tenantId: t, entityType: 'PurchaseOrder', entityId: poId, action: 'purchase_order_issue' } }), 'Audit 0').toBe(0);
    expect(await prisma.domainEvent.count({ where: { tenantId: t, aggregateId: poId } }), 'DomainEvent 0').toBe(0);
    expect(await prisma.growthEvent.count({ where: { tenantId: t, entityType: 'PurchaseOrder', entityId: poId } }), 'Growth 0').toBe(0);
    // 単一 tx なので Approval claim も rollback され executedAt=null → retry 可能 → 正常 retry で 1 lineage へ収束。
    const r = await executeApprovedPurchaseOrderIssue(human, approvalId, poId);
    expect(r.executed).toBe(true);
    await assertPoExecutedOnce(t, poId, approvalId);
  } finally {
    await cleanup(poId, assetId);
  }
});

test('承認実行 all-or-nothing: DomainEvent 作成後・GrowthEvent 作成時 fault で全 rollback→retry で 1 lineage へ収束（Codex R4）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const { poId, assetId, approvalId } = await confirmApprovePendingPo(t, uid);
  const human = { tenantId: t, userId: uid, roles: ['OWNER' as const], sessionIsAi: false };
  try {
    // DomainEvent/Outbox 作成後・GrowthEvent 作成時に fault → 全 rollback（PO=ordered / DomainEvent / Outbox も残さない）。
    let threw = false;
    try {
      await executeApprovedPurchaseOrderIssue(human, approvalId, poId, { __faultAfterEventsForTest: () => { throw new Error('injected-after-events'); } });
    } catch { threw = true; }
    expect(threw).toBe(true);
    expect((await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { status: true } }))!.status, 'PO は pending_approval 不変').toBe('pending_approval');
    expect(await prisma.domainEvent.count({ where: { tenantId: t, aggregateId: poId } }), 'DomainEvent 孤児 0').toBe(0);
    expect(await prisma.growthEvent.count({ where: { tenantId: t, entityType: 'PurchaseOrder', entityId: poId } }), 'Growth 孤児 0').toBe(0);
    // retry → PO=ordered・Audit/DomainEvent/Outbox/Growth 各 1（欠落補完ではなく 1 lineage で確定）。
    const r = await executeApprovedPurchaseOrderIssue(human, approvalId, poId);
    expect(r.executed).toBe(true);
    await assertPoExecutedOnce(t, poId, approvalId);
  } finally {
    await cleanup(poId, assetId);
  }
});

test('承認実行 R5: Approval claim 直後の fault で claim ごと全 rollback（Approval 半確定なし）→retry で exactly-once（Codex R5 #3）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const { poId, assetId, approvalId } = await confirmApprovePendingPo(t, uid);
  const human = { tenantId: t, userId: uid, roles: ['OWNER' as const], sessionIsAi: false };
  try {
    // Approval を executedAt へ claim した直後・PO CAS 前に fault → 単一 tx なので Approval claim ごと全 rollback。
    let threw = false;
    try {
      await executeApprovedPurchaseOrderIssue(human, approvalId, poId, { __faultAfterApprovalClaimForTest: () => { throw new Error('injected-after-approval-claim'); } });
    } catch { threw = true; }
    expect(threw).toBe(true);
    // Approval は APPROVED・executedAt=null・executing/executed へ半確定しない。PO/Evidence も不変。
    await assertFullyRolledBack(t, poId, approvalId);
    // retry → PO/Audit/Domain/Outbox/Growth 各 1・Approval exactly-once executed。
    const r = await executeApprovedPurchaseOrderIssue(human, approvalId, poId);
    expect(r.executed).toBe(true);
    await assertPoExecutedOnce(t, poId, approvalId);
  } finally {
    await cleanup(poId, assetId);
  }
});

test('承認実行 R5: 全 Evidence 作成後・Approval 終端化前の fault で全 rollback（PO/Evidence/Approval claim すべて）→retry で exactly-once（Codex R5 #3）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const { poId, assetId, approvalId } = await confirmApprovePendingPo(t, uid);
  const human = { tenantId: t, userId: uid, roles: ['OWNER' as const], sessionIsAi: false };
  try {
    // PO CAS・Audit・DomainEvent(+Outbox)・GrowthEvent まで作成した後、Approval の executed 終端化の直前に fault。
    // 旧実装（executor commit と Approval 終端更新が別 commit）ではここで PO=ordered・Evidence 済み・Approval だけ
    // 未終端の恒久分離が起きたが、単一 tx 化により Approval claim を含め全 rollback される。
    let threw = false;
    try {
      await executeApprovedPurchaseOrderIssue(human, approvalId, poId, { __faultBeforeApprovalTerminalForTest: () => { throw new Error('injected-before-approval-terminal'); } });
    } catch { threw = true; }
    expect(threw).toBe(true);
    await assertFullyRolledBack(t, poId, approvalId);
    // retry → 1 lineage・Approval exactly-once executed（欠落 Evidence 補完ではなく再実行で 1 組確定）。
    const r = await executeApprovedPurchaseOrderIssue(human, approvalId, poId);
    expect(r.executed).toBe(true);
    await assertPoExecutedOnce(t, poId, approvalId);
  } finally {
    await cleanup(poId, assetId);
  }
});

// 決定論的 lock 競合観測（Codex R6 #2）: winner の backend PID に直接 block されている
// ApprovalRequest 更新（loser の claim updateMany）waiter を pg_blocking_pids で観測する。
async function waitForApprovalWaiterBlockedBy(winnerPid: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const rows = await prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT count(*) AS n FROM pg_stat_activity
      WHERE pid <> ${winnerPid}
        AND pg_blocking_pids(pid) @> ARRAY[${winnerPid}::int]
        AND query LIKE '%UPDATE%ApprovalRequest%'`;
    if (Number(rows[0]?.n ?? 0) >= 1) return;
    if (Date.now() > deadline) throw new Error(`winner(pid=${winnerPid}) に block された ApprovalRequest waiter を ${timeoutMs}ms 以内に観測できなかった`);
    await new Promise((r) => setTimeout(r, 40));
  }
}

test('承認実行 R5/R6: 同一 approval 2 並列は winner claim 保持中の loser blocking を実観測し、1 executed / 1 already-executed（Codex R5 #4 / R6 #2）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const { poId, assetId, approvalId } = await confirmApprovePendingPo(t, uid);
  const human = { tenantId: t, userId: uid, roles: ['OWNER' as const], sessionIsAi: false };
  try {
    // Codex R6 #2: 単なる Promise.all は自然逐次化でも green になるため、winner を Approval claim 直後・
    // PO CAS 前の test-only gate で停止し（ready signal に backend PID）、loser がその claim 行ロックに
    // block されたことを pg_blocking_pids で一意観測してから release する。
    let releaseGate!: () => void;
    const gateReleased = new Promise<void>((res) => { releaseGate = res; });
    let winnerPidResolve!: (pid: number) => void;
    const winnerReady = new Promise<number>((res) => { winnerPidResolve = res; });
    const winner = executeApprovedPurchaseOrderIssue(human, approvalId, poId, {
      __gateAfterApprovalClaimForTest: async (pid) => {
        winnerPidResolve(pid); // claim 済み・row lock 保持を PID 付きで固定
        await gateReleased;
      },
    });
    const winnerPid = await winnerReady; // winner が claim を保持したことを確定してから loser を開始
    const loser = executeApprovedPurchaseOrderIssue(human, approvalId, poId);
    try {
      // loser の claim updateMany が winner の ApprovalRequest 行ロックで pending になったことを
      // 「winner PID に直接 block された waiter」として観測（global count ではなく winner scope）。
      await waitForApprovalWaiterBlockedBy(winnerPid, 15000);
    } finally {
      releaseGate(); // 観測失敗時も必ず release（deadlock/cleanup 詰まり防止）
    }
    const [wr, lr] = await Promise.all([winner, loser]);
    expect(wr.executed, 'winner は実行成功').toBe(true);
    expect(lr.executed, 'loser は成功扱いしない').toBe(false);
    expect(lr.reason, 'loser は already-executed で fail-closed').toBe('already-executed');
    // PO/Audit/Domain/Outbox/Growth 各 1・Approval exactly-once executed（二重 lineage なし）。
    await assertPoExecutedOnce(t, poId, approvalId);
  } finally {
    await cleanup(poId, assetId);
  }
});

// ---- Codex R6 #1: 旧 3-commit 経路（main）が残す legacy 半確定の upgrade 収束 ----
// 状態の構築: 新経路で正常実行（PO=ordered＋全 Evidence＋Approval executed）した後、Approval だけを
// 旧経路の残骸状態へ巻き戻す（state1: failed/executedAt=null、state2: executing/executedAt!=null）。
// これは「PO と全 Evidence は commit 済みだが Approval が終端していない」という Codex 提示の
// 永続状態と同一の DB 形状になる。

async function makeLegacyHalfCommitted(t: string, uid: string, state: 'failed-null' | 'executing-set'): Promise<{ poId: string; assetId: string; approvalId: string }> {
  const { poId, assetId, approvalId } = await confirmApprovePendingPo(t, uid);
  const r = await executeApprovedPurchaseOrderIssue({ tenantId: t, userId: uid, roles: ['OWNER' as const], sessionIsAi: false }, approvalId, poId);
  expect(r.executed).toBe(true);
  // Approval を legacy 残骸状態へ巻き戻す（PO=ordered・Evidence 各 1 は残る）。
  await prisma.approvalRequest.update({
    where: { id: approvalId },
    data: state === 'failed-null'
      ? { executionStatus: 'failed', executedAt: null }
      : { executionStatus: 'executing', executedAt: new Date() },
  });
  return { poId, assetId, approvalId };
}

test('R6 legacy state1 収束: PO=ordered+全Evidence+Approval failed/executedAt=null を完全lineage照合で executed へ収束（Codex R6 #1）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const { poId, assetId, approvalId } = await makeLegacyHalfCommitted(t, uid, 'failed-null');
  const human = { tenantId: t, userId: uid, roles: ['OWNER' as const], sessionIsAi: false };
  try {
    // retry: claim は成功（executedAt=null）→ PO CAS count=0 → legacy lineage 完全 → executed へ終端（reconcile）。
    const r = await executeApprovedPurchaseOrderIssue(human, approvalId, poId);
    expect(r.executed, 'reconcile は成功として収束').toBe(true);
    expect(r.reconciled, 'legacy reconcile 経路').toBe(true);
    await assertPoExecutedOnce(t, poId, approvalId); // PO/Audit/Domain/Outbox/Growth 各 1・Approval executed/executedAt!=null
    // 再実行は already-executed（exactly-once）。
    const r2 = await executeApprovedPurchaseOrderIssue(human, approvalId, poId);
    expect(r2.executed).toBe(false);
    expect(r2.reason).toBe('already-executed');
  } finally {
    await cleanup(poId, assetId);
  }
});

test('R6 legacy state2 収束: PO=ordered+全Evidence+Approval executing/executedAt!=null を executed へ終端CASで収束（Codex R6 #1）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const { poId, assetId, approvalId } = await makeLegacyHalfCommitted(t, uid, 'executing-set');
  const human = { tenantId: t, userId: uid, roles: ['OWNER' as const], sessionIsAi: false };
  try {
    // retry: claim は失敗（executedAt!=null）→ executionStatus!=executed ＋ legacy lineage 完全 → 終端 CAS で収束。
    const r = await executeApprovedPurchaseOrderIssue(human, approvalId, poId);
    expect(r.executed, 'reconcile は成功として収束').toBe(true);
    expect(r.reconciled).toBe(true);
    await assertPoExecutedOnce(t, poId, approvalId);
    const r2 = await executeApprovedPurchaseOrderIssue(human, approvalId, poId);
    expect(r2.executed).toBe(false);
    expect(r2.reason).toBe('already-executed');
  } finally {
    await cleanup(poId, assetId);
  }
});

test('R6 partial HOLD: Evidence が欠落した legacy state は誤 terminalize せず明示 HOLD（fail-closed・Codex R6 #1）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const { poId, assetId, approvalId } = await makeLegacyHalfCommitted(t, uid, 'failed-null');
  const human = { tenantId: t, userId: uid, roles: ['OWNER' as const], sessionIsAi: false };
  try {
    // GrowthEvent を欠落させ「部分 Evidence の legacy state」を作る。
    await prisma.growthEvent.deleteMany({ where: { tenantId: t, entityType: 'PurchaseOrder', entityId: poId, type: 'inventory.purchase_order.created' } });
    // state1 経路（claim 成功→PO CAS 0）で partial → 明示 HOLD・claim ごと rollback（Approval は不変のまま）。
    const r1 = await executeApprovedPurchaseOrderIssue(human, approvalId, poId);
    expect(r1.executed).toBe(false);
    expect(r1.reason, '部分 Evidence は明示 HOLD').toBe('legacy-partial-evidence-hold');
    const a1 = await prisma.approvalRequest.findUnique({ where: { id: approvalId }, select: { executionStatus: true, executedAt: true } });
    expect(a1!.executionStatus, 'Approval を誤 terminalize しない').not.toBe('executed');
    expect(a1!.executedAt, 'claim は rollback され executedAt=null のまま').toBeNull();
    // state2 経路（executedAt!=null）でも partial → 明示 HOLD・不変。
    await prisma.approvalRequest.update({ where: { id: approvalId }, data: { executionStatus: 'executing', executedAt: new Date() } });
    const r2 = await executeApprovedPurchaseOrderIssue(human, approvalId, poId);
    expect(r2.executed).toBe(false);
    expect(r2.reason).toBe('legacy-partial-evidence-hold');
    const a2 = await prisma.approvalRequest.findUnique({ where: { id: approvalId }, select: { executionStatus: true } });
    expect(a2!.executionStatus).not.toBe('executed');
    // PO は不変（ordered のまま差し戻し/再確定なし）・新規 Evidence も作られない。
    expect((await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { status: true } }))!.status).toBe('ordered');
    expect(await prisma.growthEvent.count({ where: { tenantId: t, entityType: 'PurchaseOrder', entityId: poId } }), '欠落 Evidence を勝手に補完しない').toBe(0);
    expect(await prisma.auditLog.count({ where: { tenantId: t, entityType: 'PurchaseOrder', entityId: poId, action: 'purchase_order_issue' } }), 'Audit 二重作成なし').toBe(1);
  } finally {
    await cleanup(poId, assetId);
  }
});

test('存在しない/別状態: 未確定でない発注の再確定は found=true の no-op（差し戻し・二重生成なし）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const { poId, assetId } = await makeDraftPo(1, 1000);
  const actor = { tenantId: t, userId: uid, roles: ['OWNER' as const], sessionIsAi: false };
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

// ============================================================================
// Codex V90 R7: legacy reconcile の Evidence lineage 結合（発注作成時 Growth の誤カウント封鎖）
// 旧 main の通常 UI 発注作成は、承認前から同じ type（inventory.purchase_order.created）の Growth を
// PURCHASE_ORDER_CREATED event に結合して作る。旧 3-commit 実行経路が承認実行 Growth の create 前に
// fault した場合、作成時 Growth だけが残る「現実的な混在 lineage」になる。reconcile はこれを完全
// lineage と誤認してはならない（Growth は PURCHASE_ORDER_APPROVED event への domainEventId 結合を必須化）。
// ============================================================================

// 旧経路の混在 lineage を DB 直 seed で再現する（新 atomic 経路を完走させない・Codex R7）。
async function makeMixedLegacyLineage(
  t: string,
  uid: string,
  state: 'failed-null' | 'executing-set',
  withApprovalGrowth: boolean,
): Promise<{ poId: string; assetId: string; approvalId: string; approvedEvId: string }> {
  const stamp = `${process.pid}-${Date.now()}-${Math.floor(performance.now())}`;
  const { poId, assetId } = await makeHighValueDraftPo();
  const approval = await prisma.approvalRequest.create({
    data: {
      tenantId: t, type: 'purchase_order_issue', requestedForAction: 'purchase_order_issue',
      title: `legacy-${stamp}`, summary: '', entityType: 'PurchaseOrder', entityId: poId,
      riskLevel: 'MEDIUM', status: 'APPROVED', reason: '', requestedById: uid,
      payloadAfter: { purchaseOrderId: poId },
      ...(state === 'failed-null'
        ? { executionStatus: 'failed', executedAt: null }
        : { executionStatus: 'executing', executedAt: new Date(), executedById: uid }),
    },
  });
  // 旧経路で PO は ordered＋approvalId 到達済み。
  await prisma.purchaseOrder.update({ where: { id: poId }, data: { status: 'ordered', approvalId: approval.id } });
  // --- UI 発注作成相当の lineage（承認前から存在する・Codex R7 が要求する現実的混在）---
  const createdEv = await prisma.domainEvent.create({
    data: { tenantId: t, eventType: 'PURCHASE_ORDER_CREATED', aggregateType: 'PurchaseOrder', aggregateId: poId, actorId: uid, actorType: 'user', idempotencyKey: `PURCHASE_ORDER_CREATED:legacy-${stamp}`, status: 'pending' },
  });
  await prisma.outboxMessage.create({ data: { tenantId: t, eventId: createdEv.id, eventType: 'PURCHASE_ORDER_CREATED', status: 'pending' } });
  await prisma.growthEvent.create({
    data: { tenantId: t, type: 'inventory.purchase_order.created', category: 'operations', title: `発注作成: ${poId}`, description: '', actorId: uid, actorType: 'user', entityType: 'PurchaseOrder', entityId: poId, domainEventId: createdEv.id },
  });
  // --- 旧 3-commit 実行経路の部分 lineage: Audit（approval 結合）＋ APPROVED DomainEvent/Outbox まで。
  //     承認実行用 Growth は create 前 fault で欠落（withApprovalGrowth=true の肯定対照のみ追加）---
  await prisma.auditLog.create({
    data: { tenantId: t, actorId: uid, actorType: 'user', action: 'purchase_order_issue', entityType: 'PurchaseOrder', entityId: poId, summary: `高額発注を承認確定: legacy（approval=${approval.id}）` },
  });
  const approvedEv = await prisma.domainEvent.create({
    data: { tenantId: t, eventType: 'PURCHASE_ORDER_APPROVED', aggregateType: 'PurchaseOrder', aggregateId: poId, actorId: uid, actorType: 'user', payload: { growthType: 'inventory.purchase_order.created' }, idempotencyKey: `PURCHASE_ORDER_APPROVED:legacy-${stamp}`, status: 'pending' },
  });
  await prisma.outboxMessage.create({ data: { tenantId: t, eventId: approvedEv.id, eventType: 'PURCHASE_ORDER_APPROVED', status: 'pending' } });
  if (withApprovalGrowth) {
    await prisma.growthEvent.create({
      data: { tenantId: t, type: 'inventory.purchase_order.created', category: 'operations', title: `発注確定: ${poId}`, description: '', actorId: uid, actorType: 'user', entityType: 'PurchaseOrder', entityId: poId, domainEventId: approvedEv.id },
    });
  }
  return { poId, assetId, approvalId: approval.id, approvedEvId: approvedEv.id };
}

for (const state of ['failed-null', 'executing-set'] as const) {
  test(`R7: 混在lineage（作成時Growthあり・承認実行Growth欠落）の legacy ${state} は HOLD（誤terminalizeしない）`, async () => {
    const t = await tenantId();
    const uid = await ceoUserId();
    const { poId, assetId, approvalId } = await makeMixedLegacyLineage(t, uid, state, false);
    try {
      const r = await executeApprovedPurchaseOrderIssue({ tenantId: t, userId: uid, roles: ['OWNER' as const], sessionIsAi: false }, approvalId, poId);
      expect(r.executed, `${state}: 部分 Evidence は収束させない`).toBe(false);
      expect(r.reason, `${state}: 明示 HOLD`).toBe('legacy-partial-evidence-hold');
      // Approval は不変（terminalize されない・claim も rollback 済み）。
      const a = await prisma.approvalRequest.findUnique({ where: { id: approvalId }, select: { executionStatus: true, executedAt: true, status: true } });
      expect(a!.status).toBe('APPROVED');
      expect(a!.executionStatus, `${state}: executed へ収束しない`).not.toBe('executed');
      if (state === 'failed-null') {
        expect(a!.executionStatus).toBe('failed');
        expect(a!.executedAt, 'claim は rollback 済み').toBeNull();
      } else {
        expect(a!.executionStatus).toBe('executing');
      }
      // 承認実行用 Growth を自動創作しない（作成時 Growth 1 件のみのまま）。
      expect(await prisma.growthEvent.count({ where: { tenantId: t, entityType: 'PurchaseOrder', entityId: poId, type: 'inventory.purchase_order.created' } }), '作成時 Growth 1 件のみ').toBe(1);
    } finally {
      await cleanup(poId, assetId);
    }
  });
}

test('R7 肯定対照: 同じ混在lineageへ APPROVED event に結合した Growth を追加すると安全に executed へ収束する', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const { poId, assetId, approvalId, approvedEvId } = await makeMixedLegacyLineage(t, uid, 'failed-null', true);
  try {
    const r = await executeApprovedPurchaseOrderIssue({ tenantId: t, userId: uid, roles: ['OWNER' as const], sessionIsAi: false }, approvalId, poId);
    expect(r.executed, '完全 lineage（Growth が APPROVED event 結合）は収束').toBe(true);
    expect(r.reconciled).toBe(true);
    const a = await prisma.approvalRequest.findUnique({ where: { id: approvalId }, select: { executionStatus: true } });
    expect(a!.executionStatus).toBe('executed');
    // Growth は APPROVED event 結合の 1 件＋作成時 1 件（自動創作なし）。
    expect(await prisma.growthEvent.count({ where: { tenantId: t, entityType: 'PurchaseOrder', entityId: poId, domainEventId: approvedEvId } })).toBe(1);
    expect(await prisma.growthEvent.count({ where: { tenantId: t, entityType: 'PurchaseOrder', entityId: poId, type: 'inventory.purchase_order.created' } })).toBe(2);
  } finally {
    await cleanup(poId, assetId);
  }
});

// ============================================================================
// Codex V90 R8: role-derived human gate（domain/core・direct）。
// Actor.roles は必須。AI_AGENT / AI_ASSISTANT / AI+OWNER 混在 / 空 roles / roles 省略 は
// confirm / receive / 承認実行 / 決定 core すべてで DB 接触前に fail-closed。
// ============================================================================

test('R8/R10 domain: AIロール/混在/空/省略 roles・session信号の true/省略/null は confirm・receive・承認実行・決定core すべて fail-closed（行不変）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const { poId, assetId } = await makeHighValueDraftPo();
  const nonHumanRoles: Array<{ label: string; roles: unknown; sessionIsAi: unknown }> = [
    { label: 'AI_AGENT', roles: ['AI_AGENT'], sessionIsAi: false },
    { label: 'AI_ASSISTANT', roles: ['AI_ASSISTANT'], sessionIsAi: false },
    { label: 'AI_AGENT+OWNER 混在', roles: ['AI_AGENT', 'OWNER'], sessionIsAi: false },
    { label: 'AI_ASSISTANT+OWNER 混在', roles: ['AI_ASSISTANT', 'OWNER'], sessionIsAi: false },
    { label: '空 roles', roles: [], sessionIsAi: false },
    { label: 'roles 省略', roles: undefined, sessionIsAi: false },
    // Codex R9 #1: 逆向き不整合（DB由来 isAiAgent=true が session isAi に載るが roles は OWNER のみ）。
    { label: 'sessionIsAi=true + OWNER（逆向き mismatch）', roles: ['OWNER'], sessionIsAi: true },
    // Codex R10: 必須 session 信号の欠落/null は人間扱いしない（厳密 === false のみ通す fail-closed）。
    { label: 'sessionIsAi 省略 + OWNER（malformed runtime）', roles: ['OWNER'], sessionIsAi: undefined },
    { label: 'sessionIsAi=null + OWNER（malformed runtime）', roles: ['OWNER'], sessionIsAi: null },
  ];
  try {
    for (const { label, roles, sessionIsAi } of nonHumanRoles) {
      const actor = { tenantId: t, userId: uid, roles, sessionIsAi } as unknown as Parameters<typeof confirmPurchaseOrder>[0];
      const c = await confirmPurchaseOrder(actor, poId);
      expect(c.forbidden, `${label}: confirm forbidden`).toBe(true);
      expect(await receivePurchaseOrder(actor, poId), `${label}: receive false`).toBe(false);
      const e = await executeApprovedPurchaseOrderIssue(actor, 'approval-x', poId);
      expect(e.executed, `${label}: execute forbidden`).toBe(false);
      expect(e.reason).toBe('forbidden');
      const d = await decidePurchaseOrderIssueCore(prisma as unknown as PoIssueBridgeDb, {
        tenantId: t, approvalId: 'approval-x', purchaseOrderId: poId, decision: 'approve', decidedById: uid, note: '', approvalTitle: 'x',
        decidedByRoles: roles as never, decidedBySessionIsAi: sessionIsAi as never,
      });
      expect(d.outcome, `${label}: decision core forbidden`).toBe('forbidden');
    }
    // 行不変: PO は draft のまま・ApprovalRequest/InventoryMovement/Audit/Domain/Outbox/Growth 0。
    const po = await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { status: true, approvalId: true } });
    expect(po!.status).toBe('draft');
    expect(po!.approvalId).toBeNull();
    expect(await prisma.approvalRequest.count({ where: { tenantId: t, entityType: 'PurchaseOrder', entityId: poId } }), 'ApprovalRequest 0').toBe(0);
    expect(await prisma.inventoryMovement.count({ where: { assetId } }), 'InventoryMovement 0').toBe(0);
    expect(await prisma.auditLog.count({ where: { tenantId: t, entityType: 'PurchaseOrder', entityId: poId } }), 'Audit 0').toBe(0);
    const evs = await prisma.domainEvent.findMany({ where: { tenantId: t, aggregateId: poId }, select: { id: true } });
    expect(evs.length, 'DomainEvent 0').toBe(0);
    expect(await prisma.outboxMessage.count({ where: { eventId: { in: evs.map((ev) => ev.id) } } }), 'Outbox 0').toBe(0);
    expect(await prisma.growthEvent.count({ where: { tenantId: t, entityType: 'PurchaseOrder', entityId: poId } }), 'Growth 0').toBe(0);
    // 肯定対照: OWNER は同じ PO を確定できる（高額→承認申請）。
    const ok = await confirmPurchaseOrder({ tenantId: t, userId: uid, roles: ['OWNER' as const], sessionIsAi: false }, poId);
    expect(ok.requiresApproval).toBe(true);
    expect(await prisma.approvalRequest.count({ where: { tenantId: t, entityType: 'PurchaseOrder', entityId: poId, status: 'PENDING' } })).toBe(1);
  } finally {
    await cleanup(poId, assetId);
  }
});

// ============================================================================
// Codex V90 R9 #2: APPROVED DomainEvent の current-approval 結合。
// 旧 emitGrowthEvent の event は approval identity を保存しない（payload={growthType}・dedupe省略）。
// 別 approval A の完全 event lineage が同じ PO に残っている場合、B の Audit/PO 到達と寄せ集めて
// B を誤 terminalize してはならない。approval が複数ある PO の legacy event は帰属不能 → HOLD。
// ============================================================================

// A（旧approval・完全lineage）＋ B（current・半確定/Audit のみ・B event/growth なし）の混在を DB 直 seed。
async function makeTwoApprovalMixedLineage(
  t: string,
  uid: string,
  state: 'failed-null' | 'executing-set',
): Promise<{ poId: string; assetId: string; approvalAId: string; approvalBId: string }> {
  const stamp = `${process.pid}-${Date.now()}-${Math.floor(performance.now())}`;
  const { poId, assetId } = await makeHighValueDraftPo();
  const mkApproval = async (suffix: string, data: Record<string, unknown>) =>
    prisma.approvalRequest.create({
      data: {
        tenantId: t, type: 'purchase_order_issue', requestedForAction: 'purchase_order_issue',
        title: `legacy-${suffix}-${stamp}`, summary: '', entityType: 'PurchaseOrder', entityId: poId,
        riskLevel: 'MEDIUM', reason: '', requestedById: uid, payloadAfter: { purchaseOrderId: poId },
        ...data,
      } as never,
    });
  // A: 旧 approval（完了済み）。A の完全 lineage（Audit A / APPROVED event / Outbox / Growth→event 結合）。
  const A = await mkApproval('A', { status: 'APPROVED', executionStatus: 'executed', executedAt: new Date(Date.now() - 3600_000), executedById: uid });
  await prisma.auditLog.create({
    data: { tenantId: t, actorId: uid, actorType: 'user', action: 'purchase_order_issue', entityType: 'PurchaseOrder', entityId: poId, summary: `高額発注を承認確定: legacy（approval=${A.id}）` },
  });
  const evA = await prisma.domainEvent.create({
    data: { tenantId: t, eventType: 'PURCHASE_ORDER_APPROVED', aggregateType: 'PurchaseOrder', aggregateId: poId, actorId: uid, actorType: 'user', payload: { growthType: 'inventory.purchase_order.created' }, idempotencyKey: `PURCHASE_ORDER_APPROVED:legacyA-${stamp}`, status: 'pending' },
  });
  await prisma.outboxMessage.create({ data: { tenantId: t, eventId: evA.id, eventType: 'PURCHASE_ORDER_APPROVED', status: 'pending' } });
  await prisma.growthEvent.create({
    data: { tenantId: t, type: 'inventory.purchase_order.created', category: 'operations', title: `発注確定A: ${poId}`, description: '', actorId: uid, actorType: 'user', entityType: 'PurchaseOrder', entityId: poId, domainEventId: evA.id },
  });
  // B: current approval（半確定 state1/state2）。B の Audit と PO 到達（approvalId=B）まで・B の event/growth なし。
  const B = await mkApproval('B', state === 'failed-null'
    ? { status: 'APPROVED', executionStatus: 'failed', executedAt: null }
    : { status: 'APPROVED', executionStatus: 'executing', executedAt: new Date(), executedById: uid });
  await prisma.purchaseOrder.update({ where: { id: poId }, data: { status: 'ordered', approvalId: B.id } });
  await prisma.auditLog.create({
    data: { tenantId: t, actorId: uid, actorType: 'user', action: 'purchase_order_issue', entityType: 'PurchaseOrder', entityId: poId, summary: `高額発注を承認確定: legacy（approval=${B.id}）` },
  });
  return { poId, assetId, approvalAId: A.id, approvalBId: B.id };
}

for (const state of ['failed-null', 'executing-set'] as const) {
  test(`R9 #2: 別approval A の完全event lineage が残る PO で、current B（${state}・B event/growth なし）は HOLD（Aの寄せ集めで誤terminalizeしない）`, async () => {
    const t = await tenantId();
    const uid = await ceoUserId();
    const { poId, assetId, approvalBId } = await makeTwoApprovalMixedLineage(t, uid, state);
    try {
      const r = await executeApprovedPurchaseOrderIssue({ tenantId: t, userId: uid, roles: ['OWNER' as const], sessionIsAi: false }, approvalBId, poId);
      expect(r.executed, `${state}: A の event/growth を B の Evidence にしない`).toBe(false);
      expect(r.reason).toBe('legacy-partial-evidence-hold');
      const b = await prisma.approvalRequest.findUnique({ where: { id: approvalBId }, select: { executionStatus: true, status: true } });
      expect(b!.status).toBe('APPROVED');
      expect(b!.executionStatus, `${state}: B は非 terminal のまま`).not.toBe('executed');
    } finally {
      await cleanup(poId, assetId);
    }
  });
}

test('R9 #2 肯定対照: B へ明示結合（canonical key + domainEventId）した event/growth を加えると B は安全に executed へ収束する', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const { poId, assetId, approvalBId } = await makeTwoApprovalMixedLineage(t, uid, 'failed-null');
  try {
    // B へ無損失に結合した Evidence（canonical key の dedupe=approvalB・Growth は event へ domainEventId 結合）。
    const keyB = makeIdempotencyKey({ tenantId: t, eventType: 'PURCHASE_ORDER_APPROVED', aggregateId: poId, dedupe: approvalBId });
    const evB = await prisma.domainEvent.create({
      data: { tenantId: t, eventType: 'PURCHASE_ORDER_APPROVED', aggregateType: 'PurchaseOrder', aggregateId: poId, actorId: uid, actorType: 'user', payload: { growthType: 'inventory.purchase_order.created' }, idempotencyKey: keyB, status: 'pending' },
    });
    await prisma.outboxMessage.create({ data: { tenantId: t, eventId: evB.id, eventType: 'PURCHASE_ORDER_APPROVED', status: 'pending' } });
    await prisma.growthEvent.create({
      data: { tenantId: t, type: 'inventory.purchase_order.created', category: 'operations', title: `発注確定B: ${poId}`, description: '', actorId: uid, actorType: 'user', entityType: 'PurchaseOrder', entityId: poId, domainEventId: evB.id },
    });
    const r = await executeApprovedPurchaseOrderIssue({ tenantId: t, userId: uid, roles: ['OWNER' as const], sessionIsAi: false }, approvalBId, poId);
    expect(r.executed, 'B 結合の完全 lineage は収束').toBe(true);
    expect(r.reconciled).toBe(true);
    const b = await prisma.approvalRequest.findUnique({ where: { id: approvalBId }, select: { executionStatus: true } });
    expect(b!.executionStatus).toBe('executed');
  } finally {
    await cleanup(poId, assetId);
  }
});
