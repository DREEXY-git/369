// P5-FIN-002 統合テスト（要DB）: canonical cashflow obligation の producer 収束・lifecycle・backfill を
// 実 PostgreSQL で検証する。FIN-01 identity（@hokko/shared）は変更せず、DB 正本化の挙動だけを確認する。
//
// 検証（P5-FIN-002 Acceptance より）:
//  - PO の payment_expected + cashflow_expected が 1 obligation へ収束（#6）。
//  - direct Invoice は inv alias（#8）、同額同期限の別 Invoice は別 obligation（#9）。
//  - candidate→invoice の alias 収束（#7）と、preferred identity の inv 化。
//  - partial / full / VOID / reversal(reopen) の lifecycle 遷移（#10/#11）。
//  - unknown cashflow_expected は evt（#12）、unknown payment_expected は正本化しない（#13）。
//  - tenant 分離（cross-tenant link を作らない）。
//  - producer retry 冪等（同 event の二重 upsert で obligation/alias が増えない・#14）。
//  - backfill: dry-run は DB 変更 0（#15）、execute は正本化し、再実行で追加 0（#16/#17）。
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '../client';
import {
  upsertObligationForEvent,
  convergeCandidateToInvoice,
  settleObligationForInvoice,
  voidObligationForInvoice,
  type ProducerObligationInput,
} from '../canonical-obligation';
import { runFin02Backfill } from '../fin02-canonical-obligation-backfill';

const STAMP = Date.now();
const T1 = `itest-fin02-${STAMP}-a`;
const T2 = `itest-fin02-${STAMP}-b`;
const TENANTS = [T1, T2];

async function cleanup() {
  // FinanceEvent は CashflowObligation を NO ACTION で参照するので先に消す。Alias は CASCADE だが明示削除。
  await prisma.financeEvent.deleteMany({ where: { tenantId: { in: TENANTS } } });
  await prisma.cashflowObligationAlias.deleteMany({ where: { tenantId: { in: TENANTS } } });
  await prisma.cashflowObligation.deleteMany({ where: { tenantId: { in: TENANTS } } });
  await prisma.invoiceCandidate.deleteMany({ where: { tenantId: { in: TENANTS } } });
  await prisma.invoice.deleteMany({ where: { tenantId: { in: TENANTS } } });
}

beforeEach(cleanup);
afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

interface MkEvent {
  type: string;
  sourceType?: string;
  sourceId?: string | null;
  direction: string;
  amount: number;
  dueAt?: Date | null;
  status?: string;
  description?: string;
}

async function mkEvent(tenantId: string, p: MkEvent) {
  return prisma.financeEvent.create({
    data: {
      tenantId,
      type: p.type,
      sourceType: p.sourceType ?? '',
      sourceId: p.sourceId ?? null,
      direction: p.direction,
      amount: p.amount,
      dueAt: p.dueAt ?? null,
      status: p.status ?? 'draft',
      description: p.description ?? '',
    },
  });
}

/** 既存 event に対して producer と同じ dual-write（upsert & link）を tx 内で実行する。 */
async function upsertFor(tenantId: string, e: { id: string; type: string; sourceType: string; sourceId: string | null; direction: string; amount: unknown; dueAt: Date | null; description: string }) {
  const input: ProducerObligationInput = {
    tenantId,
    eventId: e.id,
    type: e.type,
    sourceType: e.sourceType,
    sourceId: e.sourceId,
    direction: e.direction,
    amount: Number(e.amount),
    dueAt: e.dueAt,
    description: e.description,
  };
  return prisma.$transaction((tx) => upsertObligationForEvent(tx, input));
}

async function obligationOf(eventId: string): Promise<string | null> {
  const e = await prisma.financeEvent.findUnique({ where: { id: eventId }, select: { cashflowObligationId: true } });
  return e?.cashflowObligationId ?? null;
}

describe('P5-FIN-002 producer dual-write（正本収束）', () => {
  it('#6 PO の payment_expected + cashflow_expected は 1 obligation へ収束し両 event が link される', async () => {
    const pe = await mkEvent(T1, { type: 'payment_expected', sourceType: 'PurchaseOrder', sourceId: 'po1', direction: 'outflow', amount: 5000 });
    const cf = await mkEvent(T1, { type: 'cashflow_expected', sourceType: 'PurchaseOrder', sourceId: 'po1', direction: 'outflow', amount: 5000 });
    const r1 = await upsertFor(T1, pe);
    const r2 = await upsertFor(T1, cf);
    expect(r1.created).toBe(true);
    expect(r2.created).toBe(false); // 2 件目は既存 obligation に合流
    expect(r1.obligationId).toBe(r2.obligationId);
    expect(await obligationOf(pe.id)).toBe(r1.obligationId);
    expect(await obligationOf(cf.id)).toBe(r1.obligationId);
    const obligations = await prisma.cashflowObligation.count({ where: { tenantId: T1 } });
    expect(obligations).toBe(1);
    const aliases = await prisma.cashflowObligationAlias.findMany({ where: { tenantId: T1 } });
    expect(aliases).toHaveLength(1);
    expect(aliases[0]!.namespace).toBe('po');
    expect(aliases[0]!.sourceId).toBe('po1');
    const ob = await prisma.cashflowObligation.findUniqueOrThrow({ where: { id: r1.obligationId! } });
    expect(Number(ob.scheduledAmount)).toBe(5000);
    expect(Number(ob.remainingAmount)).toBe(5000);
    expect(ob.direction).toBe('outflow');
    expect(ob.lifecycleStatus).toBe('open');
  });

  it('#8/#9 direct Invoice は inv alias、同額同期限でも別 Invoice は別 obligation', async () => {
    const due = new Date('2026-08-10T00:00:00Z');
    const a = await mkEvent(T1, { type: 'payment_expected', sourceType: 'Invoice', sourceId: 'invA', direction: 'inflow', amount: 5000, dueAt: due });
    const b = await mkEvent(T1, { type: 'payment_expected', sourceType: 'Invoice', sourceId: 'invB', direction: 'inflow', amount: 5000, dueAt: due });
    const ra = await upsertFor(T1, a);
    const rb = await upsertFor(T1, b);
    expect(ra.obligationId).not.toBe(rb.obligationId);
    expect(await prisma.cashflowObligation.count({ where: { tenantId: T1 } })).toBe(2);
    const aliasA = await prisma.cashflowObligationAlias.findFirstOrThrow({ where: { tenantId: T1, sourceId: 'invA' } });
    expect(aliasA.namespace).toBe('inv');
  });

  it('#7 candidate→invoice: cand obligation に inv alias を追加し preferred を inv へ収束、後続 Invoice payment_expected も同一 obligation', async () => {
    // bridge 相当: candidate の cashflow_expected
    const candEvt = await mkEvent(T1, { type: 'cashflow_expected', sourceType: 'InvoiceCandidate', sourceId: 'cand1', direction: 'inflow', amount: 8000 });
    const rc = await upsertFor(T1, candEvt);
    expect(rc.created).toBe(true);
    // finalize 相当: convergence
    const conv = await prisma.$transaction((tx) => convergeCandidateToInvoice(tx, { tenantId: T1, candidateId: 'cand1', invoiceId: 'inv1' }));
    expect(conv.converged).toBe(true);
    expect(conv.obligationId).toBe(rc.obligationId);
    // send 相当: Invoice payment_expected → 同一 obligation へ link
    const invEvt = await mkEvent(T1, { type: 'payment_expected', sourceType: 'Invoice', sourceId: 'inv1', direction: 'inflow', amount: 8000 });
    const ri = await upsertFor(T1, invEvt);
    expect(ri.created).toBe(false);
    expect(ri.obligationId).toBe(rc.obligationId);

    expect(await prisma.cashflowObligation.count({ where: { tenantId: T1 } })).toBe(1);
    const ob = await prisma.cashflowObligation.findUniqueOrThrow({ where: { id: rc.obligationId! } });
    expect(ob.namespace).toBe('inv'); // preferred 更新済み
    const aliases = await prisma.cashflowObligationAlias.findMany({ where: { tenantId: T1, obligationId: rc.obligationId! }, orderBy: { namespace: 'asc' } });
    const nsPairs = aliases.map((a) => `${a.namespace}:${a.sourceId}`).sort();
    expect(nsPairs).toEqual(['cand:cand1', 'inv:inv1']); // 旧 cand alias を保持
  });

  it('#12/#13 unknown source: cashflow_expected は evt で残し、payment_expected は正本化しない', async () => {
    const cf = await mkEvent(T1, { type: 'cashflow_expected', sourceType: 'ManualEntry', sourceId: 'm1', direction: 'outflow', amount: 2000 });
    const pe = await mkEvent(T1, { type: 'payment_expected', sourceType: 'MysterySource', sourceId: 'x1', direction: 'inflow', amount: 7000 });
    const rcf = await upsertFor(T1, cf);
    const rpe = await upsertFor(T1, pe);
    expect(rcf.linked).toBe(true);
    const evtAlias = await prisma.cashflowObligationAlias.findFirstOrThrow({ where: { tenantId: T1 } });
    expect(evtAlias.namespace).toBe('evt');
    expect(evtAlias.sourceId).toBe(cf.id); // evt は FinanceEvent.id
    expect(rpe.linked).toBe(false);
    expect(rpe.reason).toBe('unknown-payment-expected');
    expect(await obligationOf(pe.id)).toBeNull();
    expect(await prisma.cashflowObligation.count({ where: { tenantId: T1 } })).toBe(1);
  });

  it('tenant 分離: 同一 sourceId でも別 tenant では別 obligation（cross-tenant link を作らない）', async () => {
    const e1 = await mkEvent(T1, { type: 'payment_expected', sourceType: 'Invoice', sourceId: 'inv1', direction: 'inflow', amount: 5000 });
    const e2 = await mkEvent(T2, { type: 'payment_expected', sourceType: 'Invoice', sourceId: 'inv1', direction: 'inflow', amount: 5000 });
    const r1 = await upsertFor(T1, e1);
    const r2 = await upsertFor(T2, e2);
    expect(r1.obligationId).not.toBe(r2.obligationId);
    const ob1 = await prisma.cashflowObligation.findUniqueOrThrow({ where: { id: r1.obligationId! } });
    const ob2 = await prisma.cashflowObligation.findUniqueOrThrow({ where: { id: r2.obligationId! } });
    expect(ob1.tenantId).toBe(T1);
    expect(ob2.tenantId).toBe(T2);
  });

  it('#14 producer retry 冪等: 同一 event の二重 upsert で obligation / alias / link が増えない', async () => {
    const e = await mkEvent(T1, { type: 'payment_expected', sourceType: 'Invoice', sourceId: 'inv1', direction: 'inflow', amount: 3000 });
    const first = await upsertFor(T1, e);
    const second = await upsertFor(T1, e);
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(first.obligationId).toBe(second.obligationId);
    expect(await prisma.cashflowObligation.count({ where: { tenantId: T1 } })).toBe(1);
    expect(await prisma.cashflowObligationAlias.count({ where: { tenantId: T1 } })).toBe(1);
  });
});

describe('P5-FIN-002 lifecycle 同期', () => {
  async function makeInvoiceObligation(tenantId: string, invoiceId: string, amount: number) {
    const e = await mkEvent(tenantId, { type: 'payment_expected', sourceType: 'Invoice', sourceId: invoiceId, direction: 'inflow', amount });
    const r = await upsertFor(tenantId, e);
    return r.obligationId!;
  }

  it('#10/#11 partial → full → reversal(reopen) で残額と lifecycle が正しく遷移する', async () => {
    const obId = await makeInvoiceObligation(T1, 'inv1', 10000);
    // partial 4000
    await prisma.$transaction((tx) => settleObligationForInvoice(tx, { tenantId: T1, invoiceId: 'inv1', total: 10000, paidAmount: 4000 }));
    let ob = await prisma.cashflowObligation.findUniqueOrThrow({ where: { id: obId } });
    expect(ob.lifecycleStatus).toBe('partially_settled');
    expect(Number(ob.remainingAmount)).toBe(6000);
    // full 10000
    await prisma.$transaction((tx) => settleObligationForInvoice(tx, { tenantId: T1, invoiceId: 'inv1', total: 10000, paidAmount: 10000 }));
    ob = await prisma.cashflowObligation.findUniqueOrThrow({ where: { id: obId } });
    expect(ob.lifecycleStatus).toBe('settled');
    expect(Number(ob.remainingAmount)).toBe(0);
    // reversal 全額取消 → open, remaining 全額
    await prisma.$transaction((tx) => settleObligationForInvoice(tx, { tenantId: T1, invoiceId: 'inv1', total: 10000, paidAmount: 0 }));
    ob = await prisma.cashflowObligation.findUniqueOrThrow({ where: { id: obId } });
    expect(ob.lifecycleStatus).toBe('open');
    expect(Number(ob.remainingAmount)).toBe(10000);
  });

  it('#10 VOID: obligation を void にし、その後の settle は void を復活させない', async () => {
    const obId = await makeInvoiceObligation(T1, 'inv1', 5000);
    const v = await prisma.$transaction((tx) => voidObligationForInvoice(tx, { tenantId: T1, invoiceId: 'inv1' }));
    expect(v.updated).toBe(true);
    let ob = await prisma.cashflowObligation.findUniqueOrThrow({ where: { id: obId } });
    expect(ob.lifecycleStatus).toBe('void');
    const s = await prisma.$transaction((tx) => settleObligationForInvoice(tx, { tenantId: T1, invoiceId: 'inv1', total: 5000, paidAmount: 5000 }));
    expect(s.updated).toBe(false); // void は据え置き
    ob = await prisma.cashflowObligation.findUniqueOrThrow({ where: { id: obId } });
    expect(ob.lifecycleStatus).toBe('void');
  });

  it('obligation が無い Invoice の settle / void は no-op（送付前入金など）', async () => {
    const s = await prisma.$transaction((tx) => settleObligationForInvoice(tx, { tenantId: T1, invoiceId: 'ghost', total: 1000, paidAmount: 1000 }));
    expect(s.updated).toBe(false);
    expect(s.obligationId).toBeNull();
    const v = await prisma.$transaction((tx) => voidObligationForInvoice(tx, { tenantId: T1, invoiceId: 'ghost' }));
    expect(v.updated).toBe(false);
  });
});

describe('P5-FIN-002 backfill', () => {
  async function seedTenantEvents(tenantId: string) {
    // PO dual（1 obligation へ収束すべき）
    await mkEvent(tenantId, { type: 'payment_expected', sourceType: 'PurchaseOrder', sourceId: 'po1', direction: 'outflow', amount: 5000 });
    await mkEvent(tenantId, { type: 'cashflow_expected', sourceType: 'PurchaseOrder', sourceId: 'po1', direction: 'outflow', amount: 5000 });
    // direct Invoice
    await mkEvent(tenantId, { type: 'payment_expected', sourceType: 'Invoice', sourceId: 'invD', direction: 'inflow', amount: 3000 });
    // formalized candidate（cand1 → invF）: cashflow_expected は candidate 由来
    await prisma.invoiceCandidate.create({ data: { tenantId, id: `${tenantId}-cand1`, sourceType: 'x', total: 8000, status: 'sent', invoiceId: `${tenantId}-invF` } });
    await mkEvent(tenantId, { type: 'cashflow_expected', sourceType: 'InvoiceCandidate', sourceId: `${tenantId}-cand1`, direction: 'inflow', amount: 8000 });
    // unformalized candidate
    await prisma.invoiceCandidate.create({ data: { tenantId, id: `${tenantId}-cand2`, sourceType: 'x', total: 2000, status: 'draft', invoiceId: null } });
    await mkEvent(tenantId, { type: 'cashflow_expected', sourceType: 'InvoiceCandidate', sourceId: `${tenantId}-cand2`, direction: 'inflow', amount: 2000 });
    // unknown payment_expected（正本化しない）
    await mkEvent(tenantId, { type: 'payment_expected', sourceType: 'Mystery', sourceId: 'z1', direction: 'inflow', amount: 9000 });
    // 予定外 type（対象外）
    await mkEvent(tenantId, { type: 'payment_received', sourceType: 'Invoice', sourceId: 'invD', direction: 'inflow', amount: 3000, status: 'posted' });
  }

  it('#15 dry-run は DB を一切変更しない（obligation 0・link 0）', async () => {
    await seedTenantEvents(T1);
    const report = await runFin02Backfill(prisma, { dryRun: true, tenantId: T1 });
    expect(report.dryRun).toBe(true);
    expect(report.createdObligations).toBe(0);
    expect(report.linkedEvents).toBe(0);
    // 実 DB は不変
    expect(await prisma.cashflowObligation.count({ where: { tenantId: T1 } })).toBe(0);
    const linked = await prisma.financeEvent.count({ where: { tenantId: T1, cashflowObligationId: { not: null } } });
    expect(linked).toBe(0);
    // 分類は集計される
    expect(report.byClassification.purchase_order).toBe(2);
    expect(report.byClassification.direct_invoice).toBe(1);
    expect(report.byClassification.candidate_formalized).toBe(1);
    expect(report.byClassification.candidate_unformalized).toBe(1);
    expect(report.byClassification.unknown_payment_expected).toBe(1);
    // payment_received は expected type 以外なので backfill の query（type in [cashflow_expected, payment_expected]）で
    // 除外され scan されない（分類も link もされない）。not_expected_type は driver 経由では 0。
    expect(report.byClassification.not_expected_type).toBe(0);
  });

  it('#16/#17 execute は正本化し、再実行で追加 0（idempotent / resumable）', async () => {
    await seedTenantEvents(T1);
    const run1 = await runFin02Backfill(prisma, { dryRun: false, tenantId: T1 });
    // PO(1) + direct(1) + formalized candidate(1) + unformalized candidate(1) = 4 obligations
    expect(run1.createdObligations).toBe(4);
    // link 件数: PO×2 + direct×1 + formalizedCand×1 + unformalizedCand×1 = 5（unknown payment_expected と payment_received は除外）
    expect(run1.linkedEvents).toBe(5);
    expect(await prisma.cashflowObligation.count({ where: { tenantId: T1 } })).toBe(4);

    // formalized candidate は inv obligation に cand alias も付与される
    const formalizedAliases = await prisma.cashflowObligationAlias.findMany({ where: { tenantId: T1, sourceId: { in: [`${T1}-cand1`, `${T1}-invF`] } }, orderBy: { namespace: 'asc' } });
    expect(formalizedAliases.map((a) => a.namespace).sort()).toEqual(['cand', 'inv']);

    // 非 expected type（payment_received）は query 段階で除外され、obligation に link されない。
    const notExpected = await prisma.financeEvent.findFirst({ where: { tenantId: T1, type: 'payment_received' }, select: { cashflowObligationId: true } });
    expect(notExpected?.cashflowObligationId ?? null).toBeNull();

    // 再実行: 追加 0（already_linked に収束）
    const run2 = await runFin02Backfill(prisma, { dryRun: false, tenantId: T1 });
    expect(run2.createdObligations).toBe(0);
    expect(run2.addedAliases).toBe(0);
    expect(run2.linkedEvents).toBe(0);
    expect(run2.byClassification.already_linked).toBe(5);
    expect(await prisma.cashflowObligation.count({ where: { tenantId: T1 } })).toBe(4);
    expect(await prisma.cashflowObligationAlias.count({ where: { tenantId: T1 } })).toBe(5); // po,invD,inv(cand1→invF)+cand(cand1),cand2
  });

  it('backfill は tenant を跨がない（T2 の event は T1 実行で正本化されない）', async () => {
    await seedTenantEvents(T1);
    await seedTenantEvents(T2);
    await runFin02Backfill(prisma, { dryRun: false, tenantId: T1 });
    expect(await prisma.cashflowObligation.count({ where: { tenantId: T1 } })).toBe(4);
    expect(await prisma.cashflowObligation.count({ where: { tenantId: T2 } })).toBe(0);
  });
});
