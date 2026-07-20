import { test, expect } from '@playwright/test';
import { prisma } from '@hokko/db';
import { updateDealStageCore } from '../../lib/domains/deals/deal-stage';
import { decideTempItemCore } from '../../lib/domains/communications/temp-item';

// CODEX E-03（M1-b round2）実 PostgreSQL 証拠 — CAS misc レーン（deal stage / temp item）。
// round1 で CAS＋$transaction 化された2経路の「transaction が存在する」ことでは証明できない主張を
// test-only fault 注入（本番未指定時は無作用）と実 row-lock 競合（sleep なし）で実 DB 実証する:
//  1. Deal stage: 不正 enum は DB 増分 0（任意文字列を書かない）。異なる次 stage への並行 CAS は
//     row-lock で直列化され勝者1本 → DealStageHistory/Audit 各1、最終 stage は勝者の toStage と一致。
//     History 作成後・Audit 前の fault は CAS ごと全 rollback（stage 不変）→ retry で 1 組。
//  2. Temp item: save/discard 並行は CAS で勝者1本（敗者 already・書き込み0）。save なら Thread＋Audit 1、
//     discard なら Thread 0/Audit 1。途中 fault は全 rollback（status 不変）→ retry で 1 組。
// Prisma mock は使わず最終行を re-fetch。fixture/cleanup は本テスト生成 ID に限定（seed 非削除）。
// 実行前提は他 evidence spec と同一（seed 済みローカル/CI 使い捨て PostgreSQL・retries=0）。

function assertLocalDatabaseUrl(): void {
  let host = '';
  try {
    host = new URL(process.env.DATABASE_URL ?? '').hostname;
  } catch {
    host = '';
  }
  if (host !== 'localhost' && host !== '127.0.0.1') {
    throw new Error(
      `TEST_ENVIRONMENT_APPROVAL_REQUIRED: DATABASE_URL host="${host}" は使い捨てローカル/CI service と機械確認できません`,
    );
  }
}

let seq = 0;
function stamp(): string {
  seq += 1;
  return `${process.pid}-${Date.now()}-${seq}`;
}

interface Actor {
  tenantId: string;
  userId: string;
}

async function getActor(): Promise<Actor> {
  const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { id: true, tenantId: true } });
  expect(ceo, 'seed の CEO ユーザーが存在する').not.toBeNull();
  return { tenantId: ceo!.tenantId, userId: ceo!.id };
}

async function makeCustomerDeal(tenantId: string) {
  const s = stamp();
  const customer = await prisma.customer.create({ data: { tenantId, name: `CAS-CUST-${s}` }, select: { id: true } });
  const deal = await prisma.deal.create({
    data: { tenantId, customerId: customer.id, title: `CAS-DEAL-${s}`, stage: 'CONTACT' },
    select: { id: true },
  });
  return { customerId: customer.id, dealId: deal.id };
}

async function dealCounts(tenantId: string, dealId: string) {
  return {
    history: await prisma.dealStageHistory.count({ where: { tenantId, dealId } }),
    audit: await prisma.auditLog.count({ where: { tenantId, entityType: 'Deal', entityId: dealId } }),
    stage: (await prisma.deal.findUnique({ where: { id: dealId }, select: { stage: true } }))!.stage,
  };
}

async function cleanupDeal(tenantId: string, customerId: string, dealId: string) {
  await prisma.auditLog.deleteMany({ where: { tenantId, entityType: 'Deal', entityId: dealId } });
  await prisma.dealStageHistory.deleteMany({ where: { tenantId, dealId } });
  await prisma.deal.deleteMany({ where: { id: dealId } });
  await prisma.customer.deleteMany({ where: { id: customerId } });
}

async function makeTempItem(tenantId: string) {
  const s = stamp();
  const subject = `CAS-TEMP-SUBJ-${s}`;
  const item = await prisma.temporaryIngestionItem.create({
    data: { tenantId, channel: 'gmail', preview: `${subject} — 要確認`, status: 'review' },
    select: { id: true },
  });
  return { itemId: item.id, subject };
}

async function tempCounts(tenantId: string, itemId: string, subject: string) {
  return {
    thread: await prisma.communicationThread.count({ where: { tenantId, subject } }),
    audit: await prisma.auditLog.count({ where: { tenantId, entityType: 'TemporaryIngestionItem', entityId: itemId } }),
    status: (await prisma.temporaryIngestionItem.findUnique({ where: { id: itemId }, select: { status: true } }))!.status,
  };
}

async function cleanupTemp(tenantId: string, itemId: string, subject: string) {
  await prisma.auditLog.deleteMany({ where: { tenantId, entityType: 'TemporaryIngestionItem', entityId: itemId } });
  await prisma.communicationThread.deleteMany({ where: { tenantId, subject } });
  await prisma.temporaryIngestionItem.deleteMany({ where: { id: itemId } });
}

test.beforeAll(() => {
  assertLocalDatabaseUrl();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('E-03 deal stage: 不正 enum は書き込みゼロ（History/Audit 0・stage 不変）', async () => {
  const actor = await getActor();
  const { customerId, dealId } = await makeCustomerDeal(actor.tenantId);
  try {
    const r = await updateDealStageCore(actor, { dealId, stage: 'NOT_A_REAL_STAGE' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason, '不正 enum は invalid-stage').toBe('invalid-stage');
    const c = await dealCounts(actor.tenantId, dealId);
    expect(c, '任意文字列は DB へ書かれない（増分 0・stage=CONTACT）').toEqual({ history: 0, audit: 0, stage: 'CONTACT' });
  } finally {
    await cleanupDeal(actor.tenantId, customerId, dealId);
  }
});

test('E-03 deal stage: History作成後・Audit前のfaultでCASごと全rollback（stage不変）→retryで1組', async () => {
  const actor = await getActor();
  const { customerId, dealId } = await makeCustomerDeal(actor.tenantId);
  try {
    await expect(
      updateDealStageCore(actor, { dealId, stage: 'HEARING' }, {
        __faultBetweenWritesForTest: () => {
          throw new Error('injected-fault:deal-before-audit');
        },
      }),
    ).rejects.toThrow('injected-fault:deal-before-audit');
    const mid = await dealCounts(actor.tenantId, dealId);
    expect(mid, 'fault で CAS ごと全 rollback（stage=CONTACT・History/Audit 0）').toEqual({ history: 0, audit: 0, stage: 'CONTACT' });

    // 残骸が無いため retry はちょうど 1 組で確定。
    const r = await updateDealStageCore(actor, { dealId, stage: 'HEARING' });
    expect(r.ok).toBe(true);
    const after = await dealCounts(actor.tenantId, dealId);
    expect(after, 'retry で stage=HEARING・History/Audit 各1').toEqual({ history: 1, audit: 1, stage: 'HEARING' });
  } finally {
    await cleanupDeal(actor.tenantId, customerId, dealId);
  }
});

test('E-03 deal stage: 異なる次stageへの並行CASは勝者1本（History/Audit各1・最終stageと一致）', async () => {
  const actor = await getActor();
  const { customerId, dealId } = await makeCustomerDeal(actor.tenantId);
  const targets = ['HEARING', 'PROPOSAL'] as const;
  try {
    // 両者とも stage=CONTACT から CAS。updateMany の row-lock で直列化され勝者1本（sleep 非依存の実競合）。
    const results = await Promise.all(targets.map((t) => updateDealStageCore(actor, { dealId, stage: t })));
    const winners = results.filter((r) => r.ok);
    expect(winners.length, 'CAS 勝者はちょうど1本').toBe(1);
    for (const r of results) if (!r.ok) expect(r.reason, '敗者は already（書き込み0）').toBe('already');

    const okIdx = results.findIndex((r) => r.ok);
    const c = await dealCounts(actor.tenantId, dealId);
    expect(c.history, 'History は 1（敗者は書かない）').toBe(1);
    expect(c.audit, 'Audit も 1').toBe(1);
    expect(c.stage, '最終 stage は勝者の toStage と一致').toBe(targets[okIdx]);
    const history = await prisma.dealStageHistory.findFirst({ where: { tenantId: actor.tenantId, dealId }, select: { fromStage: true, toStage: true } });
    expect(history, 'History は CONTACT→勝者stage で整合').toEqual({ fromStage: 'CONTACT', toStage: targets[okIdx] });
  } finally {
    await cleanupDeal(actor.tenantId, customerId, dealId);
  }
});

test('E-03 temp item: save 並行は勝者1本（Thread＋Audit 各1・敗者 already）', async () => {
  const actor = await getActor();
  const { itemId, subject } = await makeTempItem(actor.tenantId);
  try {
    const results = await Promise.all(Array.from({ length: 4 }, () => decideTempItemCore(actor, { itemId, decision: 'save' })));
    expect(results.filter((r) => r.ok).length, '勝者はちょうど1本').toBe(1);
    for (const r of results) if (!r.ok) expect(r.reason, '敗者は already').toBe('already');
    const c = await tempCounts(actor.tenantId, itemId, subject);
    expect(c, 'save 勝者のみ status=saved・Thread 1・Audit 1').toEqual({ thread: 1, audit: 1, status: 'saved' });
  } finally {
    await cleanupTemp(actor.tenantId, itemId, subject);
  }
});

test('E-03 temp item: discard は Thread 0/Audit 1（status=discarded）', async () => {
  const actor = await getActor();
  const { itemId, subject } = await makeTempItem(actor.tenantId);
  try {
    const r = await decideTempItemCore(actor, { itemId, decision: 'discard' });
    expect(r.ok).toBe(true);
    const c = await tempCounts(actor.tenantId, itemId, subject);
    expect(c, 'discard は Thread を作らず Audit 1・status=discarded').toEqual({ thread: 0, audit: 1, status: 'discarded' });
  } finally {
    await cleanupTemp(actor.tenantId, itemId, subject);
  }
});

test('E-03 temp item: 途中faultで全rollback（status不変・Thread/Audit 0）→retryで1組', async () => {
  const actor = await getActor();
  const { itemId, subject } = await makeTempItem(actor.tenantId);
  try {
    await expect(
      decideTempItemCore(actor, { itemId, decision: 'save' }, {
        __faultBetweenWritesForTest: () => {
          throw new Error('injected-fault:temp-before-audit');
        },
      }),
    ).rejects.toThrow('injected-fault:temp-before-audit');
    const mid = await tempCounts(actor.tenantId, itemId, subject);
    expect(mid, 'fault で全 rollback（status=review・Thread/Audit 0）').toEqual({ thread: 0, audit: 0, status: 'review' });

    const r = await decideTempItemCore(actor, { itemId, decision: 'save' });
    expect(r.ok).toBe(true);
    const after = await tempCounts(actor.tenantId, itemId, subject);
    expect(after, 'retry で status=saved・Thread/Audit 各1').toEqual({ thread: 1, audit: 1, status: 'saved' });
  } finally {
    await cleanupTemp(actor.tenantId, itemId, subject);
  }
});

test('E-03 temp item: save/discard 並行は勝者1本（status は勝者に一致・Audit 1）', async () => {
  const actor = await getActor();
  const { itemId, subject } = await makeTempItem(actor.tenantId);
  try {
    const [saveRes, discardRes] = await Promise.all([
      decideTempItemCore(actor, { itemId, decision: 'save' }),
      decideTempItemCore(actor, { itemId, decision: 'discard' }),
    ]);
    const oks = [saveRes, discardRes].filter((r) => r.ok);
    expect(oks.length, 'save/discard の CAS 勝者はちょうど1本').toBe(1);
    const c = await tempCounts(actor.tenantId, itemId, subject);
    // 勝者に応じて最終 status と Thread 件数が決まる（save→saved/Thread1・discard→discarded/Thread0）。Audit は常に1。
    if (saveRes.ok) {
      expect(c, 'save が勝者').toEqual({ thread: 1, audit: 1, status: 'saved' });
    } else {
      expect(c, 'discard が勝者').toEqual({ thread: 0, audit: 1, status: 'discarded' });
    }
  } finally {
    await cleanupTemp(actor.tenantId, itemId, subject);
  }
});
