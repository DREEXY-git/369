import { test, expect } from '@playwright/test';
import { prisma } from '@hokko/db';
import {
  bridgePurchaseOrderToFinance,
  bridgeDamageChargeToInvoiceCandidate,
  type Actor,
} from '../../lib/domains/finance/finance-bridge';

// M1-b E-02（Operations→Finance ブリッジの冪等 barrier）の実 PostgreSQL 証拠。
// 旧実装は `findFirst → 複数 create` の TOCTOU で、同一 source を並行 bridge すると台帳を重複/片欠けにできた。
// 修正は (tenantId, sourceType, sourceId) 単位の **advisory xact lock** ＋ 単一 transaction。本 spec は
// production-shared core を実 DB で直接叩き、Prisma を mock せず最終行数を re-fetch して検証する。
// 並行は sleep ではなく実 advisory-lock 直列化で観測する（同一 source の 4 並行 bridge が台帳 1 組へ収束）。
//
// E-02 oracle:
//  - PurchaseOrder を 4 並行 bridge → purchase_order/payment_expected/cashflow_expected/JournalCandidate/
//    Audit/Growth/DomainEvent/Outbox が契約件数 1 組。
//  - DamageLossRecord を 4 並行 bridge → InvoiceCandidate 1・JournalCandidate 1・FinanceEvent 群 1 組。
//  - 各 downstream create の fault で全行 0、retry で 1 組。
//  - 同一 source を別 tenant で bridge しても barrier を跨がず各自 1 組（PK が globally-unique な cuid のため
//    「同一 source ID の別 tenant」は物理的に作れない＝別 source ＋別 tenant で非干渉を実証する）。
//
// fixture/cleanup は本テストが作成した source ID に限定（seed・共有データを広域 delete しない）。

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

async function getActor(): Promise<Actor & { userId: string; tenantId: string }> {
  const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { id: true, tenantId: true } });
  expect(ceo, 'seed の CEO ユーザーが存在する').not.toBeNull();
  return { tenantId: ceo!.tenantId, userId: ceo!.id };
}

async function makePo(tenantId: string, amount = 200000) {
  const s = stamp();
  return prisma.purchaseOrder.create({
    data: { tenantId, orderNo: `M1B-PO-${s}`, status: 'ordered', totalAmount: amount, expectedAt: new Date('2031-04-30T00:00:00Z') },
    select: { id: true, orderNo: true },
  });
}

async function makeDamage(tenantId: string, cost = 50000) {
  const s = stamp();
  return prisma.damageLossRecord.create({
    data: { tenantId, type: 'damage', cost, note: `M1B-DMG-${s}` },
    select: { id: true, note: true },
  });
}

async function poBridgeCounts(tenantId: string, poId: string) {
  const fe = await prisma.financeEvent.findMany({ where: { tenantId, sourceType: 'PurchaseOrder', sourceId: poId }, select: { type: true } });
  const byType: Record<string, number> = {};
  for (const e of fe) byType[e.type] = (byType[e.type] ?? 0) + 1;
  const events = await prisma.domainEvent.findMany({ where: { tenantId, aggregateType: 'PurchaseOrder', aggregateId: poId, eventType: 'PURCHASE_ORDER_FINANCE_BRIDGED' }, select: { id: true } });
  return {
    purchaseOrder: byType['purchase_order'] ?? 0,
    paymentExpected: byType['payment_expected'] ?? 0,
    cashflowExpected: byType['cashflow_expected'] ?? 0,
    journal: await prisma.journalCandidate.count({ where: { tenantId, sourceType: 'PurchaseOrder', sourceId: poId } }),
    audit: await prisma.auditLog.count({ where: { tenantId, entityType: 'PurchaseOrder', entityId: poId, action: 'finance_bridge' } }),
    bridgeGrowth: await prisma.growthEvent.count({ where: { tenantId, type: 'finance.purchase_order.bridged', entityType: 'PurchaseOrder', entityId: poId } }),
    domainEvent: events.length,
    outbox: await prisma.outboxMessage.count({ where: { eventId: { in: events.map((e) => e.id) } } }),
  };
}

async function damageBridgeCounts(tenantId: string, damageId: string) {
  const ics = await prisma.invoiceCandidate.findMany({ where: { tenantId, sourceType: 'DamageLossRecord', sourceId: damageId }, select: { id: true } });
  const icIds = ics.map((i) => i.id);
  const events = await prisma.domainEvent.findMany({ where: { tenantId, aggregateType: 'DamageLossRecord', aggregateId: damageId, eventType: 'DAMAGE_CHARGE_FINANCE_BRIDGED' }, select: { id: true } });
  return {
    invoiceCandidate: ics.length,
    journal: await prisma.journalCandidate.count({ where: { tenantId, sourceType: 'DamageLossRecord', sourceId: damageId } }),
    damageCharge: await prisma.financeEvent.count({ where: { tenantId, sourceType: 'DamageLossRecord', sourceId: damageId, type: 'damage_charge' } }),
    invoiceCandidateEvent: await prisma.financeEvent.count({ where: { tenantId, sourceType: 'InvoiceCandidate', sourceId: { in: icIds }, type: 'invoice_candidate' } }),
    cashflowExpected: await prisma.financeEvent.count({ where: { tenantId, sourceType: 'InvoiceCandidate', sourceId: { in: icIds }, type: 'cashflow_expected' } }),
    audit: await prisma.auditLog.count({ where: { tenantId, entityType: 'DamageLossRecord', entityId: damageId, action: 'finance_bridge' } }),
    bridgeGrowth: await prisma.growthEvent.count({ where: { tenantId, type: 'finance.damage_charge.bridged', entityType: 'DamageLossRecord', entityId: damageId } }),
    domainEvent: events.length,
    outbox: await prisma.outboxMessage.count({ where: { eventId: { in: events.map((e) => e.id) } } }),
  };
}

async function cleanupPo(tenantId: string, poIds: string[]) {
  const events = await prisma.domainEvent.findMany({ where: { tenantId, aggregateType: 'PurchaseOrder', aggregateId: { in: poIds } }, select: { id: true } });
  await prisma.outboxMessage.deleteMany({ where: { eventId: { in: events.map((e) => e.id) } } });
  await prisma.domainEvent.deleteMany({ where: { id: { in: events.map((e) => e.id) } } });
  const fes = await prisma.financeEvent.findMany({ where: { tenantId, sourceType: 'PurchaseOrder', sourceId: { in: poIds } }, select: { id: true } });
  const jcs = await prisma.journalCandidate.findMany({ where: { tenantId, sourceType: 'PurchaseOrder', sourceId: { in: poIds } }, select: { id: true } });
  await prisma.growthEvent.deleteMany({ where: { tenantId, entityId: { in: [...poIds, ...fes.map((f) => f.id), ...jcs.map((j) => j.id)] } } });
  await prisma.journalCandidate.deleteMany({ where: { id: { in: jcs.map((j) => j.id) } } });
  await prisma.auditLog.deleteMany({ where: { tenantId, entityType: 'PurchaseOrder', entityId: { in: poIds } } });
  await prisma.financeEvent.deleteMany({ where: { id: { in: fes.map((f) => f.id) } } });
  await prisma.purchaseOrder.deleteMany({ where: { id: { in: poIds } } });
}

async function cleanupDamage(tenantId: string, damageIds: string[]) {
  const ics = await prisma.invoiceCandidate.findMany({ where: { tenantId, sourceType: 'DamageLossRecord', sourceId: { in: damageIds } }, select: { id: true } });
  const icIds = ics.map((i) => i.id);
  const events = await prisma.domainEvent.findMany({ where: { tenantId, aggregateType: 'DamageLossRecord', aggregateId: { in: damageIds } }, select: { id: true } });
  await prisma.outboxMessage.deleteMany({ where: { eventId: { in: events.map((e) => e.id) } } });
  await prisma.domainEvent.deleteMany({ where: { id: { in: events.map((e) => e.id) } } });
  const feDmg = await prisma.financeEvent.findMany({ where: { tenantId, sourceType: 'DamageLossRecord', sourceId: { in: damageIds } }, select: { id: true } });
  const feIc = await prisma.financeEvent.findMany({ where: { tenantId, sourceType: 'InvoiceCandidate', sourceId: { in: icIds } }, select: { id: true } });
  const jcs = await prisma.journalCandidate.findMany({ where: { tenantId, sourceType: 'DamageLossRecord', sourceId: { in: damageIds } }, select: { id: true } });
  await prisma.growthEvent.deleteMany({ where: { tenantId, entityId: { in: [...damageIds, ...icIds, ...feDmg.map((f) => f.id), ...feIc.map((f) => f.id), ...jcs.map((j) => j.id)] } } });
  await prisma.journalCandidate.deleteMany({ where: { id: { in: jcs.map((j) => j.id) } } });
  await prisma.auditLog.deleteMany({ where: { tenantId, entityType: 'DamageLossRecord', entityId: { in: damageIds } } });
  await prisma.financeEvent.deleteMany({ where: { id: { in: [...feDmg.map((f) => f.id), ...feIc.map((f) => f.id)] } } });
  await prisma.invoiceCandidate.deleteMany({ where: { id: { in: icIds } } });
  await prisma.damageLossRecord.deleteMany({ where: { id: { in: damageIds } } });
}

test.describe('M1-b finance bridge 冪等 barrier 証拠（E-02）', () => {
  test.beforeAll(() => {
    assertLocalDatabaseUrl();
  });
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test('E-02 PO: 同一 PO の並行4 bridge は advisory barrier で直列化され台帳はちょうど1組', async () => {
    const actor = await getActor();
    const po = await makePo(actor.tenantId);
    try {
      await Promise.all(Array.from({ length: 4 }, () => bridgePurchaseOrderToFinance(actor, po.id)));
      const c = await poBridgeCounts(actor.tenantId, po.id);
      expect(c.purchaseOrder, 'purchase_order FinanceEvent は1').toBe(1);
      expect(c.paymentExpected, 'payment_expected（支払予定）は1').toBe(1);
      expect(c.cashflowExpected, 'cashflow_expected は1').toBe(1);
      expect(c.journal, 'JournalCandidate は1').toBe(1);
      expect(c.audit, 'finance_bridge Audit は1').toBe(1);
      expect(c.bridgeGrowth, 'bridge GrowthEvent は1').toBe(1);
      expect(c.domainEvent, 'PURCHASE_ORDER_FINANCE_BRIDGED DomainEvent は1').toBe(1);
      expect(c.outbox, 'OutboxMessage は1').toBe(1);
    } finally {
      await cleanupPo(actor.tenantId, [po.id]);
    }
  });

  test('E-02 PO: downstream fault で全台帳 rollback（全0）→ retry でちょうど1組', async () => {
    const actor = await getActor();
    const po = await makePo(actor.tenantId);
    try {
      await expect(
        bridgePurchaseOrderToFinance(actor, po.id, {
          __faultDuringBridgeForTest: (step) => {
            if (step === 'after-journal') throw new Error('injected:po-fault');
          },
        }),
      ).rejects.toThrow('injected:po-fault');
      let c = await poBridgeCounts(actor.tenantId, po.id);
      const total = c.purchaseOrder + c.paymentExpected + c.cashflowExpected + c.journal + c.audit + c.bridgeGrowth + c.domainEvent + c.outbox;
      expect(total, 'fault は tx 全体を rollback（片欠けなし・全台帳0）').toBe(0);

      await bridgePurchaseOrderToFinance(actor, po.id);
      c = await poBridgeCounts(actor.tenantId, po.id);
      expect(c.purchaseOrder).toBe(1);
      expect(c.paymentExpected).toBe(1);
      expect(c.cashflowExpected).toBe(1);
      expect(c.journal).toBe(1);
      expect(c.audit).toBe(1);
      expect(c.bridgeGrowth).toBe(1);
      expect(c.domainEvent).toBe(1);
      expect(c.outbox).toBe(1);
    } finally {
      await cleanupPo(actor.tenantId, [po.id]);
    }
  });

  test('E-02 Damage: 同一破損記録の並行4 bridge で InvoiceCandidate1・JournalCandidate1・FinanceEvent群1組', async () => {
    const actor = await getActor();
    const dmg = await makeDamage(actor.tenantId);
    try {
      await Promise.all(Array.from({ length: 4 }, () => bridgeDamageChargeToInvoiceCandidate(actor, dmg.id)));
      const c = await damageBridgeCounts(actor.tenantId, dmg.id);
      expect(c.invoiceCandidate, 'InvoiceCandidate は1').toBe(1);
      expect(c.journal, 'JournalCandidate は1').toBe(1);
      expect(c.damageCharge, 'damage_charge FinanceEvent は1').toBe(1);
      expect(c.invoiceCandidateEvent, 'invoice_candidate FinanceEvent は1').toBe(1);
      expect(c.cashflowExpected, 'cashflow_expected は1').toBe(1);
      expect(c.audit).toBe(1);
      expect(c.bridgeGrowth).toBe(1);
      expect(c.domainEvent, 'DAMAGE_CHARGE_FINANCE_BRIDGED DomainEvent は1').toBe(1);
      expect(c.outbox).toBe(1);
    } finally {
      await cleanupDamage(actor.tenantId, [dmg.id]);
    }
  });

  test('E-02 Damage: InvoiceCandidate 作成後の fault で全 rollback（全0）→ retry でちょうど1組', async () => {
    const actor = await getActor();
    const dmg = await makeDamage(actor.tenantId);
    try {
      await expect(
        bridgeDamageChargeToInvoiceCandidate(actor, dmg.id, {
          __faultDuringBridgeForTest: (step) => {
            if (step === 'after-invoice-candidate') throw new Error('injected:dmg-fault');
          },
        }),
      ).rejects.toThrow('injected:dmg-fault');
      let c = await damageBridgeCounts(actor.tenantId, dmg.id);
      const total = c.invoiceCandidate + c.journal + c.damageCharge + c.invoiceCandidateEvent + c.cashflowExpected + c.audit + c.bridgeGrowth + c.domainEvent + c.outbox;
      expect(total, 'fault は tx 全体を rollback（全台帳0）').toBe(0);

      await bridgeDamageChargeToInvoiceCandidate(actor, dmg.id);
      c = await damageBridgeCounts(actor.tenantId, dmg.id);
      expect(c.invoiceCandidate).toBe(1);
      expect(c.journal).toBe(1);
      expect(c.damageCharge).toBe(1);
      expect(c.invoiceCandidateEvent).toBe(1);
      expect(c.cashflowExpected).toBe(1);
      expect(c.domainEvent).toBe(1);
    } finally {
      await cleanupDamage(actor.tenantId, [dmg.id]);
    }
  });

  test('E-02 tenant 独立: 別 tenant の PO bridge は barrier を跨がず各自1組', async () => {
    const actor = await getActor();
    const s = stamp();
    const foreign = await prisma.tenant.create({ data: { name: `m1b-bridge-foreign-${s}` } });
    const poA = await makePo(actor.tenantId);
    const poB = await makePo(foreign.id);
    const foreignActor: Actor = { tenantId: foreign.id, userId: actor.userId };
    try {
      await Promise.all([
        bridgePurchaseOrderToFinance(actor, poA.id),
        bridgePurchaseOrderToFinance(foreignActor, poB.id),
      ]);
      const cA = await poBridgeCounts(actor.tenantId, poA.id);
      const cB = await poBridgeCounts(foreign.id, poB.id);
      expect(cA.purchaseOrder, 'tenant A: purchase_order 1').toBe(1);
      expect(cA.domainEvent, 'tenant A: DomainEvent 1').toBe(1);
      expect(cB.purchaseOrder, 'tenant B: purchase_order 1').toBe(1);
      expect(cB.domainEvent, 'tenant B: DomainEvent 1').toBe(1);
    } finally {
      await cleanupPo(actor.tenantId, [poA.id]);
      await cleanupPo(foreign.id, [poB.id]);
      await prisma.tenant.deleteMany({ where: { id: foreign.id } });
    }
  });
});
