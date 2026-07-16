import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { prisma } from '@hokko/db';

// Codex PR#58 R8（role-derived human gate）の実認証 Action 証拠（login + ブラウザ + 非空振り replay）。
// session の isAi boolean（User.isAiAgent 由来）と role は独立で整合制約がないため、
// `isAiAgent=false + AI_AGENT/AI_ASSISTANT（+OWNER 混在）` は boolean 判定を素通りできた。
// 修正後は Action / UI / domain すべてが isHumanUser({roles}) で fail-closed:
//  - confirm / receive / 承認済み execute / purchase_order_issue decision の4境界を実認証で否定。
//  - UI は確定/入庫ボタン自体を出さない。
//  - 拒否後は PO 全字段 before/after deep equality・ApprovalRequest/Movement/Audit/Domain/Outbox/Growth 0。
// 外部作用なし（社内の発注・在庫レコードのみ）。

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
async function ceoRef() {
  return (await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { id: true, passwordHash: true, departmentId: true } }))!;
}
async function roleId(t: string, key: string): Promise<string> {
  const r = await prisma.role.findFirst({ where: { tenantId: t, key: key as never }, select: { id: true } });
  return r!.id;
}
async function makeUser(t: string, email: string, roleKeys: string[], isAiAgent: boolean): Promise<string> {
  const ceo = await ceoRef();
  const u = await prisma.user.create({ data: { tenantId: t, email, name: email, passwordHash: ceo.passwordHash, isAiAgent, departmentId: ceo.departmentId } });
  for (const k of roleKeys) await prisma.userRole.create({ data: { tenantId: t, userId: u.id, roleId: await roleId(t, k) } });
  return u.id;
}
async function cleanupUser(userId: string) {
  await prisma.userRole.deleteMany({ where: { userId } });
  await prisma.auditLog.deleteMany({ where: { actorId: userId } }).catch(() => {});
  await prisma.user.deleteMany({ where: { id: userId } });
}

let poSeq = 0;
async function makePo(t: string, status: 'draft' | 'ordered' | 'pending_approval', totalAmount: number): Promise<{ poId: string; assetId: string }> {
  poSeq += 1;
  const stamp = `${process.pid}-${Date.now()}-${poSeq}`;
  const asset = await prisma.productAsset.create({
    data: { tenantId: t, code: `PRG${stamp}`.slice(0, 8), name: `PO-ROLE-ASSET-${stamp}`, quantity: 0, status: 'available', condition: 'good' },
  });
  const po = await prisma.purchaseOrder.create({
    data: {
      tenantId: t, orderNo: `POROLE-${stamp}`.slice(0, 20), status, totalAmount,
      lines: { create: [{ tenantId: t, assetId: asset.id, assetName: asset.name, quantity: 1, unitPrice: totalAmount, amount: totalAmount }] },
    },
  });
  return { poId: po.id, assetId: asset.id };
}
async function cleanupPo(t: string, poId: string, assetId: string) {
  const moves = await prisma.inventoryMovement.findMany({ where: { assetId }, select: { id: true } });
  await prisma.auditLog.deleteMany({ where: { entityType: 'InventoryMovement', entityId: { in: moves.map((m) => m.id) } } });
  await prisma.inventoryMovement.deleteMany({ where: { assetId } });
  const evs = await prisma.domainEvent.findMany({ where: { tenantId: t, aggregateId: poId }, select: { id: true } });
  await prisma.outboxMessage.deleteMany({ where: { tenantId: t, eventId: { in: evs.map((e) => e.id) } } });
  await prisma.growthEvent.deleteMany({ where: { tenantId: t, entityType: 'PurchaseOrder', entityId: poId } });
  await prisma.domainEvent.deleteMany({ where: { tenantId: t, aggregateId: poId } });
  await prisma.auditLog.deleteMany({ where: { tenantId: t, entityType: 'PurchaseOrder', entityId: poId } });
  const apps = await prisma.approvalRequest.findMany({ where: { tenantId: t, entityType: 'PurchaseOrder', entityId: poId }, select: { id: true } });
  await prisma.auditLog.deleteMany({ where: { tenantId: t, entityType: 'ApprovalRequest', entityId: { in: apps.map((a) => a.id) } } });
  await prisma.approvalRequest.deleteMany({ where: { id: { in: apps.map((a) => a.id) } } });
  await prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: poId } });
  await prisma.purchaseOrder.deleteMany({ where: { id: poId } });
  await prisma.productAsset.deleteMany({ where: { id: assetId } });
}

interface Captured {
  url: string;
  headers: Record<string, string>;
  bodyLatin1: string;
}

/** 認証済み ceo の POST を捕捉し bytes/headers を返す（AI session での非空振り replay 用）。 */
async function capturePost(page: Page, urlPart: string, click: () => Promise<void>, waitUrl: RegExp): Promise<Captured> {
  const [req] = await Promise.all([
    page.waitForRequest((r) => r.method() === 'POST' && r.url().includes(urlPart)),
    click(),
  ]);
  await page.waitForURL(waitUrl);
  const headers = { ...req.headers() };
  delete headers['content-length'];
  return { url: req.url(), headers, bodyLatin1: req.postDataBuffer()!.toString('latin1') };
}

/** 捕捉 body 中の oldId（ちょうど1回）を newId へ置換し、AI context の session だけで replay する。 */
async function replayAs(aiCtx: BrowserContext, cap: Captured, oldId: string, newId: string): Promise<string> {
  const occurrences = cap.bodyLatin1.split(oldId).length - 1;
  expect(occurrences, 'POST body に対象 ID がちょうど 1 回存在（空振り replay を構造排除）').toBe(1);
  const body = cap.bodyLatin1.replace(oldId, newId);
  expect(body.includes(newId)).toBe(true);
  expect(body.includes(oldId)).toBe(false);
  const headers = { ...cap.headers };
  delete headers['cookie'];
  delete headers['authorization'];
  const resp = await aiCtx.request.post(cap.url, { headers, data: Buffer.from(body, 'latin1'), maxRedirects: 0 });
  return resp.headers()['x-action-redirect'] ?? resp.headers()['location'] ?? '';
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

for (const [label, roleKeys, isAiAgent] of [
  ['AI_AGENT（isAiAgent=false mismatch）', ['AI_AGENT'], false],
  ['AI_ASSISTANT（isAiAgent=false mismatch）', ['AI_ASSISTANT'], false],
  ['AI_AGENT+OWNER 混在', ['AI_AGENT', 'OWNER'], false],
  ['AI_ASSISTANT+OWNER 混在', ['AI_ASSISTANT', 'OWNER'], false],
  ['空 roles（role なし user）', [], false],
  // Codex R9 #1: 逆向き mismatch（isAiAgent=true が session isAi に載るが roles は OWNER のみ）。
  ['isAiAgent=true + OWNER（逆向き mismatch）', ['OWNER'], true],
] as const) {
  test(`R8 confirm 実認証: ${label} は UI ボタン非表示・Action denied・PO 全字段不変・全書込面 0`, async ({ page, browser }) => {
    const t = await tenantId();
    // 捕捉用 throwaway（ceo=OWNER の肯定対照を兼ねる: confirm 成功で ordered へ）。
    const throwaway = await makePo(t, 'draft', 1000);
    await login(page, 'ceo@ikezaki.local');
    await page.goto(`/operations/purchase-orders/${throwaway.poId}`);
    const cap = await capturePost(page, '/operations/purchase-orders', () => page.getByRole('button', { name: '発注を確定' }).click(), /\?ordered=1/);

    const aiEmail = `porole-${process.pid}-${Date.now()}-${poSeq}@ikezaki.local`;
    const aiUserId = await makeUser(t, aiEmail, roleKeys as unknown as string[], isAiAgent);
    const target = await makePo(t, 'draft', 1000);
    const aiCtx = await browser.newContext();
    const aiPage = await aiCtx.newPage();
    try {
      await login(aiPage, aiEmail);
      // UI: 確定/入庫ボタン自体を出さない（role 由来 fail-closed）。
      await aiPage.goto(`/operations/purchase-orders/${target.poId}`);
      await expect(aiPage.getByRole('button', { name: '発注を確定' }), `${label}: 確定ボタン 0`).toHaveCount(0);
      await expect(aiPage.getByRole('button', { name: '入庫する' })).toHaveCount(0);

      const before = await prisma.purchaseOrder.findUnique({ where: { id: target.poId } });
      const redirect = await replayAs(aiCtx, cap, throwaway.poId, target.poId);
      expect(redirect, `${label}: Action は denied=1 へ redirect`).toContain('denied=1');
      const after = await prisma.purchaseOrder.findUnique({ where: { id: target.poId } });
      expect(after, 'PO 全字段 before/after deep equality').toEqual(before);
      expect(after!.status).toBe('draft');
      expect(await prisma.approvalRequest.count({ where: { tenantId: t, entityType: 'PurchaseOrder', entityId: target.poId } }), 'ApprovalRequest 0').toBe(0);
      expect(await prisma.inventoryMovement.count({ where: { assetId: target.assetId } }), 'Movement 0').toBe(0);
      expect(await prisma.auditLog.count({ where: { tenantId: t, actorId: aiUserId, entityType: 'PurchaseOrder' } }), 'AI 主体 Audit 0').toBe(0);
      expect(await prisma.domainEvent.count({ where: { tenantId: t, aggregateId: target.poId } }), 'DomainEvent 0').toBe(0);
      expect(await prisma.growthEvent.count({ where: { tenantId: t, entityType: 'PurchaseOrder', entityId: target.poId } }), 'Growth 0').toBe(0);
    } finally {
      await aiCtx.close();
      await cleanupPo(t, target.poId, target.assetId);
      await cleanupPo(t, throwaway.poId, throwaway.assetId);
      await cleanupUser(aiUserId);
    }
  });
}

test('R8 receive 実認証: AI_ASSISTANT+OWNER 混在は入庫 Action denied・ordered 不変・在庫 0', async ({ page, browser }) => {
  const t = await tenantId();
  const throwaway = await makePo(t, 'ordered', 1000);
  await login(page, 'ceo@ikezaki.local');
  await page.goto(`/operations/purchase-orders/${throwaway.poId}`);
  const cap = await capturePost(page, '/operations/purchase-orders', () => page.getByRole('button', { name: '入庫する' }).click(), /\?received=1/);

  const aiEmail = `porole-recv-${process.pid}-${Date.now()}@ikezaki.local`;
  const aiUserId = await makeUser(t, aiEmail, ['AI_ASSISTANT', 'OWNER'], false);
  const target = await makePo(t, 'ordered', 1000);
  const aiCtx = await browser.newContext();
  const aiPage = await aiCtx.newPage();
  try {
    await login(aiPage, aiEmail);
    await aiPage.goto(`/operations/purchase-orders/${target.poId}`);
    await expect(aiPage.getByRole('button', { name: '入庫する' }), '入庫ボタン 0').toHaveCount(0);
    const before = await prisma.purchaseOrder.findUnique({ where: { id: target.poId } });
    const redirect = await replayAs(aiCtx, cap, throwaway.poId, target.poId);
    expect(redirect).toContain('denied=1');
    expect(await prisma.purchaseOrder.findUnique({ where: { id: target.poId } })).toEqual(before);
    expect(await prisma.inventoryMovement.count({ where: { assetId: target.assetId } }), 'Movement 0（在庫水増しなし）').toBe(0);
    const asset = await prisma.productAsset.findUnique({ where: { id: target.assetId }, select: { quantity: true } });
    expect(asset!.quantity).toBe(0);
  } finally {
    await aiCtx.close();
    await cleanupPo(t, target.poId, target.assetId);
    await cleanupPo(t, throwaway.poId, throwaway.assetId);
    await cleanupUser(aiUserId);
  }
});

// APPROVED（未実行）承認つき pending_approval PO を DB 直 seed。
async function makeApprovedPending(t: string, uid: string): Promise<{ poId: string; assetId: string; approvalId: string }> {
  const { poId, assetId } = await makePo(t, 'pending_approval', 500_000);
  const approval = await prisma.approvalRequest.create({
    data: {
      tenantId: t, type: 'purchase_order_issue', requestedForAction: 'purchase_order_issue',
      title: `発注確定: PO-ROLE（500000円）`, summary: '', entityType: 'PurchaseOrder', entityId: poId,
      riskLevel: 'MEDIUM', status: 'APPROVED', reason: '', requestedById: uid, payloadAfter: { purchaseOrderId: poId },
    },
  });
  await prisma.purchaseOrder.update({ where: { id: poId }, data: { approvalId: approval.id } });
  return { poId, assetId, approvalId: approval.id };
}

test('R8 承認済み execute 実認証: AI_AGENT+OWNER 混在は実行 Action denied・Approval/PO 不変', async ({ page, browser }) => {
  const t = await tenantId();
  const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { id: true } });
  const throwaway = await makeApprovedPending(t, ceo!.id);
  const target = await makeApprovedPending(t, ceo!.id);
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/admin/operations-actions');
  const cap = await capturePost(
    page,
    '/admin/operations-actions',
    () => page.locator(`form:has(input[name="approvalId"][value="${throwaway.approvalId}"])`).getByRole('button', { name: '実行' }).click(),
    /executed=po/,
  );

  const aiEmail = `porole-exec-${process.pid}-${Date.now()}@ikezaki.local`;
  const aiUserId = await makeUser(t, aiEmail, ['AI_AGENT', 'OWNER'], false);
  const aiCtx = await browser.newContext();
  const aiPage = await aiCtx.newPage();
  try {
    await login(aiPage, aiEmail);
    // UI: AI role 混在には admin 実行画面自体が AccessDenied（実行ボタン 0）。
    await aiPage.goto('/admin/operations-actions');
    await expect(aiPage.getByRole('button', { name: '実行' })).toHaveCount(0);
    const beforeA = await prisma.approvalRequest.findUnique({ where: { id: target.approvalId } });
    const beforePo = await prisma.purchaseOrder.findUnique({ where: { id: target.poId } });
    const redirect = await replayAs(aiCtx, cap, throwaway.approvalId, target.approvalId);
    expect(redirect).toContain('denied=1');
    expect(await prisma.approvalRequest.findUnique({ where: { id: target.approvalId } }), 'Approval 全字段不変').toEqual(beforeA);
    expect(await prisma.purchaseOrder.findUnique({ where: { id: target.poId } }), 'PO 全字段不変').toEqual(beforePo);
    expect(await prisma.domainEvent.count({ where: { tenantId: t, aggregateId: target.poId } }), 'DomainEvent 0').toBe(0);
    expect(await prisma.growthEvent.count({ where: { tenantId: t, entityType: 'PurchaseOrder', entityId: target.poId } }), 'Growth 0').toBe(0);
  } finally {
    await aiCtx.close();
    await cleanupPo(t, target.poId, target.assetId);
    await cleanupPo(t, throwaway.poId, throwaway.assetId);
    await cleanupUser(aiUserId);
  }
});

test('R8 decision 実認証: AI_ASSISTANT は purchase_order_issue の承認/却下 Action denied・PENDING 不変', async ({ page, browser }) => {
  const t = await tenantId();
  const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { id: true } });
  // 捕捉用（ceo が実際に approve する throwaway）と被験（PENDING のまま残るべき target）。
  const mkPending = async () => {
    const { poId, assetId } = await makePo(t, 'pending_approval', 500_000);
    const approval = await prisma.approvalRequest.create({
      data: {
        tenantId: t, type: 'purchase_order_issue', requestedForAction: 'purchase_order_issue',
        title: `発注確定: PO-ROLE-DEC（500000円）`, summary: '', entityType: 'PurchaseOrder', entityId: poId,
        riskLevel: 'MEDIUM', status: 'PENDING', reason: '', requestedById: ceo!.id, payloadAfter: { purchaseOrderId: poId },
      },
    });
    await prisma.purchaseOrder.update({ where: { id: poId }, data: { approvalId: approval.id } });
    return { poId, assetId, approvalId: approval.id };
  };
  const throwaway = await mkPending();
  const target = await mkPending();
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/approvals');
  const cap = await capturePost(
    page,
    '/approvals',
    () => page.locator(`form:has(input[name="approvalId"][value="${throwaway.approvalId}"])`).getByRole('button', { name: '承認' }).click(),
    /\/approvals/,
  );

  const aiEmail = `porole-dec-${process.pid}-${Date.now()}@ikezaki.local`;
  const aiUserId = await makeUser(t, aiEmail, ['AI_ASSISTANT'], false);
  const aiCtx = await browser.newContext();
  const aiPage = await aiCtx.newPage();
  try {
    await login(aiPage, aiEmail);
    const beforeA = await prisma.approvalRequest.findUnique({ where: { id: target.approvalId } });
    const beforePo = await prisma.purchaseOrder.findUnique({ where: { id: target.poId } });
    const redirect = await replayAs(aiCtx, cap, throwaway.approvalId, target.approvalId);
    expect(redirect).toContain('denied=1');
    const afterA = await prisma.approvalRequest.findUnique({ where: { id: target.approvalId } });
    expect(afterA, 'Approval 全字段不変（PENDING のまま）').toEqual(beforeA);
    expect(afterA!.status).toBe('PENDING');
    expect(await prisma.purchaseOrder.findUnique({ where: { id: target.poId } }), 'PO 全字段不変').toEqual(beforePo);
  } finally {
    await aiCtx.close();
    await cleanupPo(t, target.poId, target.assetId);
    await cleanupPo(t, throwaway.poId, throwaway.assetId);
    await cleanupUser(aiUserId);
  }
});
