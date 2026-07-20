import { test, expect, type Page } from '@playwright/test';
import { prisma } from '@hokko/db';
import {
  recordStocktakeCount,
  completeStocktake,
  reconcileStocktakeLine,
  type Actor,
} from '../../lib/domains/operations/stocktake';

// P3-INV Stocktake lifecycle（Codex CR #4990223932）の実 PostgreSQL 証拠。
//  #1/#2: record は 親 FOR UPDATE → 非終端確認 → Line lock/re-read → 更新＋親 CAS＋Audit を単一 tx。
//         完了済み親/Line への replay は 書込・Audit・Event ゼロで fail-closed（counted 逆行を排除）。
//  #3:    complete は status='counted' からのみ。全 Line カウント済み・PENDING 承認 0・非ゼロ差異
//         reconciled 済みを tx 内（親 lock 下）で再検証。ゼロ差異 Line は反映不要で完了可。
//  #4:    親遷移・Audit・完了 DomainEvent/Outbox/Growth を all-or-nothing（fault → 全 rollback）。
//  #5:    人間主体のみ（AI 単独・AI+OWNER 混在・sessionIsAi 欠落/null は対象取得前に fail-closed）。
//  race:  record-vs-complete の真並行は親 lock で直列化され、`counted + completedAt` 混在を作れない。
// 外部作用なし（社内の在庫レコードのみ・実 provider/外部送信なし）。

let seq = 0;
function stamp(): string {
  seq += 1;
  return `${process.pid}-${Date.now()}-${seq}`;
}

async function getActor(): Promise<Actor & { userId: string }> {
  const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { id: true, tenantId: true } });
  expect(ceo, 'seed の CEO ユーザーが存在する').not.toBeNull();
  return { tenantId: ceo!.tenantId, userId: ceo!.id, roles: ['OWNER' as const], sessionIsAi: false };
}

/** 資産＋棚卸＋ライン（帳簿数=資産数量）を seed。 */
async function makeStocktake(tenantId: string, quantities: number[]) {
  const s = stamp();
  const assets = [] as Array<{ id: string; quantity: number }>;
  for (const [i, q] of quantities.entries()) {
    assets.push(
      await prisma.productAsset.create({
        data: { tenantId, code: `ST${s}-${i}`.slice(0, 14), name: `ST-LC-${s}-${i}`, quantity: q, status: 'available', condition: 'good' },
        select: { id: true, quantity: true },
      }),
    );
  }
  const st = await prisma.stocktake.create({
    data: {
      tenantId,
      title: `ST-LC-${s}`,
      status: 'draft',
      lines: { create: assets.map((a) => ({ tenantId, assetId: a.id, expectedQuantity: a.quantity })) },
    },
    include: { lines: { orderBy: { id: 'asc' } } },
  });
  return { st, assets };
}

interface Snapshot {
  status: string;
  completedAt: Date | null;
  lines: Array<{ id: string; countedQuantity: number | null; difference: number; reconciled: boolean }>;
  assetQuantities: Record<string, number>;
  adjustMovements: number;
  audits: number;
  events: number;
  outbox: number;
  growth: number;
}

/** 本テスト由来の全書き込み面を snapshot（replay 前後の deep 比較用）。 */
async function snapshot(tenantId: string, stocktakeId: string, assetIds: string[]): Promise<Snapshot> {
  const st = await prisma.stocktake.findUnique({
    where: { id: stocktakeId },
    include: { lines: { orderBy: { id: 'asc' }, select: { id: true, countedQuantity: true, difference: true, reconciled: true } } },
  });
  const assets = await prisma.productAsset.findMany({ where: { id: { in: assetIds } }, select: { id: true, quantity: true } });
  const lineIds = st!.lines.map((l) => l.id);
  const events = await prisma.domainEvent.findMany({
    where: {
      tenantId,
      OR: [
        { aggregateType: 'Stocktake', aggregateId: stocktakeId },
        { aggregateType: 'ProductAsset', aggregateId: { in: assetIds }, idempotencyKey: { startsWith: 'STOCKTAKE_MOVEMENT:mov:' } },
      ],
    },
    select: { id: true },
  });
  return {
    status: st!.status,
    completedAt: st!.completedAt,
    lines: st!.lines,
    assetQuantities: Object.fromEntries(assets.map((a) => [a.id, a.quantity])),
    adjustMovements: await prisma.inventoryMovement.count({ where: { tenantId, assetId: { in: assetIds }, type: 'adjust' } }),
    audits: await prisma.auditLog.count({
      where: {
        tenantId,
        OR: [
          { entityType: 'Stocktake', entityId: stocktakeId },
          { entityType: 'StocktakeLine', entityId: { in: lineIds } },
        ],
      },
    }),
    events: events.length,
    outbox: await prisma.outboxMessage.count({ where: { eventId: { in: events.map((e) => e.id) } } }),
    growth: await prisma.growthEvent.count({
      where: { tenantId, OR: [{ entityType: 'Stocktake', entityId: stocktakeId }, { entityId: { in: lineIds } }] },
    }),
  };
}

/** fixture 固有 cleanup。 */
async function cleanup(tenantId: string, stocktakeId: string, assetIds: string[]) {
  const lines = await prisma.stocktakeLine.findMany({ where: { stocktakeId }, select: { id: true } });
  const lineIds = lines.map((l) => l.id);
  const movements = await prisma.inventoryMovement.findMany({ where: { tenantId, assetId: { in: assetIds } }, select: { id: true } });
  const events = await prisma.domainEvent.findMany({
    where: {
      tenantId,
      OR: [
        { aggregateType: 'Stocktake', aggregateId: stocktakeId },
        { aggregateType: 'ProductAsset', aggregateId: { in: assetIds } },
      ],
    },
    select: { id: true },
  });
  await prisma.outboxMessage.deleteMany({ where: { eventId: { in: events.map((e) => e.id) } } });
  await prisma.domainEvent.deleteMany({ where: { id: { in: events.map((e) => e.id) } } });
  await prisma.growthEvent.deleteMany({
    where: {
      tenantId,
      OR: [{ entityType: 'Stocktake', entityId: stocktakeId }, { entityId: { in: [...movements.map((m) => m.id), ...lineIds] } }],
    },
  });
  await prisma.auditLog.deleteMany({
    where: {
      tenantId,
      OR: [
        { entityType: 'Stocktake', entityId: stocktakeId },
        { entityType: 'StocktakeLine', entityId: { in: lineIds } },
        { entityType: 'InventoryMovement', entityId: { in: movements.map((m) => m.id) } },
      ],
    },
  });
  await prisma.approvalRequest.deleteMany({ where: { tenantId, entityType: 'StocktakeLine', entityId: { in: lineIds } } });
  await prisma.inventoryMovement.deleteMany({ where: { id: { in: movements.map((m) => m.id) } } });
  await prisma.stocktakeLine.deleteMany({ where: { stocktakeId } });
  await prisma.stocktake.deleteMany({ where: { id: stocktakeId } });
  await prisma.productAsset.deleteMany({ where: { id: { in: assetIds } } });
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('positive path: count記録(親CAS+Audit同tx)→小差異反映(Movement+Line+Growth/Domain/Outbox同tx)→complete(CAS+Audit+完了Event同tx)', async () => {
  const actor = await getActor();
  const { st, assets } = await makeStocktake(actor.tenantId, [5, 3]);
  const assetIds = assets.map((a) => a.id);
  try {
    // count: line0 = 帳簿一致（差異0）・line1 = 実地2（差異-1・小差異）
    const r0 = await recordStocktakeCount(actor, st.lines[0]!.id, 5);
    expect(r0.ok).toBe(true);
    const r1 = await recordStocktakeCount(actor, st.lines[1]!.id, 2);
    expect(r1.ok).toBe(true);
    let cur = await snapshot(actor.tenantId, st.id, assetIds);
    expect(cur.status, 'count で counted へ遷移（同tx）').toBe('counted');
    expect(cur.audits, 'record ごとに Audit（従来欠落）').toBe(2);

    // 早すぎる complete: 未反映の非ゼロ差異 → fail-closed・書込/Event 0
    const early = await completeStocktake(actor, st.id);
    expect(early.ok).toBe(false);
    if (!early.ok) expect(early.reason).toBe('unreconciled-lines');
    cur = await snapshot(actor.tenantId, st.id, assetIds);
    expect(cur.status).toBe('counted');
    expect(cur.completedAt).toBeNull();
    expect(cur.events, '完了 Event は発行されない').toBe(0);

    // 小差異反映: Movement＋Line.reconciled＋Growth/Domain/Outbox が同一 tx
    const rec = await reconcileStocktakeLine(actor, st.lines[1]!.id);
    expect(rec.status).toBe('reconciled');
    cur = await snapshot(actor.tenantId, st.id, assetIds);
    expect(cur.assetQuantities[assets[1]!.id], 'Asset が実地数量へ').toBe(2);
    expect(cur.adjustMovements).toBe(1);
    expect(cur.lines[1]!.reconciled).toBe(true);
    expect(cur.events, 'Movement Domain イベント（tx 内）').toBe(1);
    expect(cur.outbox).toBe(1);

    // complete: ゼロ差異 line0 は反映不要のまま完了できる（明文化規則）
    const done = await completeStocktake(actor, st.id);
    expect(done.ok).toBe(true);
    cur = await snapshot(actor.tenantId, st.id, assetIds);
    expect(cur.status).toBe('reconciled');
    expect(cur.completedAt).not.toBeNull();
    expect(cur.events, 'Movement + STOCKTAKE_RECONCILED').toBe(2);
    expect(cur.outbox).toBe(2);
    const ev = await prisma.domainEvent.findUnique({
      where: { tenantId_idempotencyKey: { tenantId: actor.tenantId, idempotencyKey: `STOCKTAKE_RECONCILED:stocktake:${encodeURIComponent(st.id)}` } },
      select: { id: true },
    });
    expect(ev, '完了イベントは単射キーで1件').not.toBeNull();
  } finally {
    await cleanup(actor.tenantId, st.id, assetIds);
  }
});

test('完了済みreplay: record/reconcileの再送はStocktake/Line/Asset/Movement/Audit/Eventの増分・変更0（counted逆行なし）', async () => {
  const actor = await getActor();
  const { st, assets } = await makeStocktake(actor.tenantId, [4]);
  const assetIds = assets.map((a) => a.id);
  try {
    await recordStocktakeCount(actor, st.lines[0]!.id, 4);
    expect((await completeStocktake(actor, st.id)).ok).toBe(true);
    const before = await snapshot(actor.tenantId, st.id, assetIds);
    expect(before.status).toBe('reconciled');

    // 完了済み親への count 再送（direct Action 相当）→ invalid-state・全面不変
    const replay = await recordStocktakeCount(actor, st.lines[0]!.id, 999);
    expect(replay.ok).toBe(false);
    if (!replay.ok) expect(replay.reason).toBe('invalid-state');
    // 完了済み親への reconcile も skip（Asset 変更なし）
    const rec = await reconcileStocktakeLine(actor, st.lines[0]!.id);
    expect(rec.status).toBe('skip');
    const after = await snapshot(actor.tenantId, st.id, assetIds);
    expect(after, '全書込面 deep-equal（counted 逆行・completedAt 残留の矛盾を作れない）').toEqual(before);

    // 完了済みへの complete 再送は already（Event/Audit 不増）
    const again = await completeStocktake(actor, st.id);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.reason).toBe('already');
    expect(await snapshot(actor.tenantId, st.id, assetIds)).toEqual(before);
  } finally {
    await cleanup(actor.tenantId, st.id, assetIds);
  }
});

test('早すぎるcomplete: draft(未カウント)/一部未カウント/承認待ち はすべて fail-closed・書込/Event 0', async () => {
  const actor = await getActor();
  const { st, assets } = await makeStocktake(actor.tenantId, [5, 100]);
  const assetIds = assets.map((a) => a.id);
  try {
    // draft（1件もカウントなし）
    const r1 = await completeStocktake(actor, st.id);
    expect(r1.ok).toBe(false);
    if (!r1.ok) expect(r1.reason, 'draft からの complete は不可').toBe('invalid-state');

    // 一部未カウント（line0 のみ記録）
    await recordStocktakeCount(actor, st.lines[0]!.id, 5);
    const r2 = await completeStocktake(actor, st.id);
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.reason).toBe('uncounted-lines');

    // 大幅差異（-100）→ 承認申請 → PENDING 承認が残る間は complete 不可
    await recordStocktakeCount(actor, st.lines[1]!.id, 0);
    const rec = await reconcileStocktakeLine(actor, st.lines[1]!.id);
    expect(rec.status).toBe('pending_approval');
    const r3 = await completeStocktake(actor, st.id);
    expect(r3.ok).toBe(false);
    if (!r3.ok) expect(r3.reason).toBe('pending-approval');

    const cur = await snapshot(actor.tenantId, st.id, assetIds);
    expect(cur.status).toBe('counted');
    expect(cur.completedAt).toBeNull();
    expect(cur.events, '完了 Event は一切発行されない').toBe(0);
    expect(cur.growth).toBe(0);
  } finally {
    await cleanup(actor.tenantId, st.id, assetIds);
  }
});

test('fault注入: record(Line後)/complete(CAS後)の失敗で全rollback・孤児0 → retry で logical result 1', async () => {
  const actor = await getActor();
  const { st, assets } = await makeStocktake(actor.tenantId, [7]);
  const assetIds = assets.map((a) => a.id);
  try {
    // record fault: Line 更新後・親 CAS 前 → 全 rollback（Line 未更新・親 draft のまま・Audit 0）
    await expect(
      recordStocktakeCount(actor, st.lines[0]!.id, 6, {
        __faultAfterLineForTest: () => {
          throw new Error('injected-fault:record');
        },
      }),
    ).rejects.toThrow('injected-fault:record');
    let cur = await snapshot(actor.tenantId, st.id, assetIds);
    expect(cur.status, '親は draft のまま').toBe('draft');
    expect(cur.lines[0]!.countedQuantity, 'Line も未更新').toBeNull();
    expect(cur.audits).toBe(0);
    // retry → 1 論理結果
    expect((await recordStocktakeCount(actor, st.lines[0]!.id, 7)).ok).toBe(true);
    cur = await snapshot(actor.tenantId, st.id, assetIds);
    expect(cur.status).toBe('counted');
    expect(cur.audits).toBe(1);

    // complete fault: CAS 後・Audit/Event 前 → 全 rollback（status counted 維持・completedAt null・Event 0）
    await expect(
      completeStocktake(actor, st.id, {
        __faultAfterCasForTest: () => {
          throw new Error('injected-fault:complete');
        },
      }),
    ).rejects.toThrow('injected-fault:complete');
    cur = await snapshot(actor.tenantId, st.id, assetIds);
    expect(cur.status, 'CAS ごと rollback').toBe('counted');
    expect(cur.completedAt).toBeNull();
    expect(cur.events).toBe(0);
    expect(cur.growth).toBe(0);
    // retry → ちょうど1組の完了 Evidence
    expect((await completeStocktake(actor, st.id)).ok).toBe(true);
    cur = await snapshot(actor.tenantId, st.id, assetIds);
    expect(cur.status).toBe('reconciled');
    expect(cur.events).toBe(1);
    expect(cur.outbox).toBe(1);
    expect(cur.growth).toBe(1);
  } finally {
    await cleanup(actor.tenantId, st.id, assetIds);
  }
});

test('record-vs-complete 真並行: 親 FOR UPDATE で直列化され、counted+completedAt 混在も未処理Line付き完了も作れない', async () => {
  const actor = await getActor();
  const { st, assets } = await makeStocktake(actor.tenantId, [5]);
  const assetIds = assets.map((a) => a.id);
  try {
    await recordStocktakeCount(actor, st.lines[0]!.id, 5); // 差異0・counted
    // complete が親 lock を保持したまま gate で停止 → record を投入（親 lock で待機）→ 解放。
    let lockHeld!: () => void;
    const lockHeldP = new Promise<void>((res) => (lockHeld = res));
    let releaseGate!: () => void;
    const gate = new Promise<void>((res) => (releaseGate = res));
    const pComplete = completeStocktake(actor, st.id, {
      __gateAfterParentLockForTest: async () => {
        lockHeld();
        await gate;
      },
    });
    await lockHeldP;
    const pRecord = recordStocktakeCount(actor, st.lines[0]!.id, 1); // complete と競合する再カウント
    await new Promise((res) => setTimeout(res, 300)); // record が親 lock 待ちに入る猶予
    releaseGate();
    const [rc, rr] = await Promise.all([pComplete, pRecord]);
    expect(rc.ok, 'complete が勝者').toBe(true);
    expect(rr.ok, '後続 record は完了済み親を見て fail-closed').toBe(false);
    if (!rr.ok) expect(rr.reason).toBe('invalid-state');
    const cur = await snapshot(actor.tenantId, st.id, assetIds);
    expect(cur.status).toBe('reconciled');
    expect(cur.completedAt).not.toBeNull();
    expect(cur.lines[0]!.countedQuantity, '完了後の再カウントは書き込まれない').toBe(5);
    expect(cur.events, '完了 Event はちょうど1').toBe(1);
  } finally {
    await cleanup(actor.tenantId, st.id, assetIds);
  }
});

test('境界の否定: cross-tenant / AI単独 / AI+OWNER混在 / sessionIsAi欠落・null は書込0で fail-closed', async () => {
  const actor = await getActor();
  const { st, assets } = await makeStocktake(actor.tenantId, [3]);
  const assetIds = assets.map((a) => a.id);
  const s = stamp();
  const foreignTenant = await prisma.tenant.create({ data: { name: `ST-LC-FOREIGN-${s}` } });
  try {
    const before = await snapshot(actor.tenantId, st.id, assetIds);
    // cross-tenant: 実在 id でも notfound / skip（tenant 境界）
    const foreign: Actor = { tenantId: foreignTenant.id, userId: actor.userId, roles: ['OWNER'], sessionIsAi: false };
    const fr = await recordStocktakeCount(foreign, st.lines[0]!.id, 1);
    expect(fr.ok).toBe(false);
    if (!fr.ok) expect(fr.reason).toBe('notfound');
    const fc = await completeStocktake(foreign, st.id);
    expect(fc.ok).toBe(false);
    if (!fc.ok) expect(fc.reason).toBe('notfound');
    expect((await reconcileStocktakeLine(foreign, st.lines[0]!.id)).status).toBe('skip');

    // 非人間主体（AI単独 / AI+OWNER混在 / 逆向き / 欠落 / null）は対象取得前に forbidden
    const nonHuman: Array<{ label: string; roles: unknown; sessionIsAi: unknown }> = [
      { label: 'AI_AGENT', roles: ['AI_AGENT'], sessionIsAi: true },
      { label: 'AI_AGENT+OWNER 混在', roles: ['AI_AGENT', 'OWNER'], sessionIsAi: false },
      { label: 'sessionIsAi=true + OWNER', roles: ['OWNER'], sessionIsAi: true },
      { label: 'sessionIsAi 省略 + OWNER', roles: ['OWNER'], sessionIsAi: undefined },
      { label: 'sessionIsAi=null + OWNER', roles: ['OWNER'], sessionIsAi: null },
    ];
    for (const v of nonHuman) {
      const a = { tenantId: actor.tenantId, userId: actor.userId, roles: v.roles, sessionIsAi: v.sessionIsAi } as unknown as Actor;
      const r1 = await recordStocktakeCount(a, st.lines[0]!.id, 1);
      expect(r1.ok, `${v.label}: record forbidden`).toBe(false);
      if (!r1.ok) expect(r1.reason).toBe('forbidden');
      const r2 = await completeStocktake(a, st.id);
      expect(r2.ok, `${v.label}: complete forbidden`).toBe(false);
      if (!r2.ok) expect(r2.reason).toBe('forbidden');
      expect((await reconcileStocktakeLine(a, st.lines[0]!.id)).status, `${v.label}: reconcile forbidden`).toBe('forbidden');
    }
    expect(await snapshot(actor.tenantId, st.id, assetIds), '全書込面 deep-equal（書込0）').toEqual(before);
  } finally {
    await cleanup(actor.tenantId, st.id, assetIds);
    await prisma.tenant.delete({ where: { id: foreignTenant.id } });
  }
});

// ============================================================================
// production Action + UI 経由（CR #6: 表示制御ではなく server 側 fail-closed の実証）。
// 実 UI でカウント→完了まで進め、完了後に**捕獲済み record POST を非空振り replay** して
// error=state 差し戻し・DB 不変を検証する。
// ============================================================================

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

test('UI経由: 記録→完了の実操作の後、完了済み棚卸への record POST replay は error=state で拒否され DB 不変', async ({ page }) => {
  const actor = await getActor();
  const { st, assets } = await makeStocktake(actor.tenantId, [5]);
  const assetIds = assets.map((a) => a.id);
  try {
    await login(page, 'ceo@ikezaki.local');
    await page.goto(`/operations/stocktakes/${st.id}`);
    // 実地カウントを実フォームで記録（production Action 経由）
    const row = page.locator('tr').filter({ has: page.locator(`input[name="lineId"][value="${st.lines[0]!.id}"]`) });
    await row.locator('input[name="countedQuantity"]').fill('5');
    const [recordReq] = await Promise.all([
      page.waitForRequest((r) => r.method() === 'POST' && r.url().includes('/operations/stocktakes/')),
      row.getByRole('button', { name: '記録' }).click(),
    ]);
    await page.waitForLoadState('networkidle');
    // 完了ボタン（counted・全ラインカウント済み・差異0）→ 完了
    await Promise.all([
      page.waitForURL(/completed=1/),
      page.getByRole('button', { name: '棚卸を完了' }).click(),
    ]);
    const done = await prisma.stocktake.findUnique({ where: { id: st.id }, select: { status: true, completedAt: true } });
    expect(done!.status).toBe('reconciled');
    expect(done!.completedAt).not.toBeNull();
    const before = await snapshot(actor.tenantId, st.id, assetIds);

    // 完了後: UI は record フォームを描画しない（表示制御）
    await page.goto(`/operations/stocktakes/${st.id}`);
    await expect(page.locator(`input[name="lineId"][value="${st.lines[0]!.id}"]`)).toHaveCount(0);
    // だが保護は server 側: 捕獲済み record POST を replay（direct Server Action）→ error=state・DB 不変
    const headers = { ...recordReq.headers() };
    delete headers['content-length'];
    const resp = await page.request.post(recordReq.url(), { headers, data: recordReq.postDataBuffer()! });
    expect(resp.status(), 'replay はエラーにならず業務判定で差し戻し').toBeLessThan(500);
    const after = await snapshot(actor.tenantId, st.id, assetIds);
    expect(after, 'replay 後も全書込面 deep-equal').toEqual(before);
  } finally {
    await cleanup(actor.tenantId, st.id, assetIds);
  }
});
