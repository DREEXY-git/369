import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { prisma, upsertObligationForEvent } from '@hokko/db';
import { bridgePurchaseOrderToFinance } from '../../lib/domains/finance/finance-bridge';
import { finalizeInvoiceCandidate } from '../../lib/domains/finance/formalize';
import { recordInvoicePayment } from '../../lib/domains/finance/payments';

// P5-FIN-002 producer convergence の実 PostgreSQL 証拠（実 producer 経路）。
//  (1) PO を実 bridge（bridgePurchaseOrderToFinance）に通すと、payment_expected と cashflow_expected の
//      2 event が 1 つの CashflowObligation（po/poId）へ収束し、両 event が link される。
//  (2) 実 finalize（finalizeInvoiceCandidate）で candidate の cashflow_expected obligation に inv alias が
//      付与され preferred が inv になり、実 recordInvoicePayment の全額入金で obligation が settled になる。
// FIN-01 identity・既存 reader・legacy FinanceEvent の挙動は変えない。外部送信・実 LLM・課金は一切なし。

const mkToken = () => `c${randomUUID().replace(/-/g, '').slice(0, 24)}`;

async function seedTenantId(): Promise<string> {
  const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { tenantId: true } });
  return ceo!.tenantId;
}
async function ceoUserId(): Promise<string> {
  const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { id: true } });
  return ceo!.id;
}

/** テストが作った source（poId/candId/invoiceId）に紐づく行だけを FK 安全順で削除する。 */
async function cleanupSources(tenant: string, sourceIds: string[]): Promise<void> {
  if (sourceIds.length === 0) return;
  // sourceId に紐づく alias → obligation を特定（この spec は po/cand/inv のみで evt を作らない）。
  const aliases = await prisma.cashflowObligationAlias.findMany({
    where: { tenantId: tenant, sourceId: { in: sourceIds } },
    select: { obligationId: true },
  });
  const obligationIds = Array.from(new Set(aliases.map((a) => a.obligationId)));
  // FinanceEvent は obligation を NO ACTION 参照するので先に削除（source 直・link 経由の両方）。
  await prisma.financeEvent.deleteMany({ where: { tenantId: tenant, sourceId: { in: sourceIds } } });
  if (obligationIds.length > 0) {
    await prisma.financeEvent.deleteMany({ where: { tenantId: tenant, cashflowObligationId: { in: obligationIds } } });
    await prisma.cashflowObligationAlias.deleteMany({ where: { tenantId: tenant, obligationId: { in: obligationIds } } });
    await prisma.cashflowObligation.deleteMany({ where: { tenantId: tenant, id: { in: obligationIds } } });
  }
  await prisma.journalCandidate.deleteMany({ where: { tenantId: tenant, sourceId: { in: sourceIds } } });
  await prisma.growthEvent.deleteMany({ where: { tenantId: tenant, entityId: { in: sourceIds } } });
  await prisma.domainEvent.deleteMany({ where: { tenantId: tenant, aggregateId: { in: sourceIds } } });
  await prisma.auditLog.deleteMany({ where: { tenantId: tenant, entityId: { in: sourceIds } } });
  await prisma.payment.deleteMany({ where: { invoiceId: { in: sourceIds } } });
  await prisma.receivable.deleteMany({ where: { invoiceId: { in: sourceIds } } });
  await prisma.invoice.deleteMany({ where: { tenantId: tenant, id: { in: sourceIds } } });
  await prisma.invoiceCandidate.deleteMany({ where: { tenantId: tenant, id: { in: sourceIds } } });
  await prisma.purchaseOrder.deleteMany({ where: { tenantId: tenant, id: { in: sourceIds } } });
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('(1) PO bridge: payment_expected + cashflow_expected が 1 つの canonical obligation（po）へ収束し両 event が link される', async () => {
  const t = await seedTenantId();
  const uid = await ceoUserId();
  const po = await prisma.purchaseOrder.create({
    data: { tenantId: t, orderNo: `PO-FIN02-${process.pid}-${Date.now()}`.slice(0, 40), status: 'ordered', totalAmount: 5000, expectedAt: new Date('2026-09-01T00:00:00Z') },
  });
  const sources = [po.id];
  try {
    await bridgePurchaseOrderToFinance({ tenantId: t, userId: uid }, po.id);

    const expected = await prisma.financeEvent.findMany({
      where: { tenantId: t, sourceType: 'PurchaseOrder', sourceId: po.id, type: { in: ['payment_expected', 'cashflow_expected'] } },
      select: { id: true, type: true, cashflowObligationId: true },
    });
    expect(expected).toHaveLength(2);
    // 両 event が同一 obligation に link されている（二重計上しない）。
    const oblIds = new Set(expected.map((e) => e.cashflowObligationId));
    expect(oblIds.size).toBe(1);
    const oblId = expected[0]!.cashflowObligationId;
    expect(oblId).not.toBeNull();

    const obl = await prisma.cashflowObligation.findUniqueOrThrow({ where: { id: oblId! } });
    expect(obl.tenantId).toBe(t);
    expect(obl.namespace).toBe('po');
    expect(obl.direction).toBe('outflow');
    expect(Number(obl.scheduledAmount)).toBe(5000);
    expect(obl.lifecycleStatus).toBe('open');

    const aliases = await prisma.cashflowObligationAlias.findMany({ where: { tenantId: t, obligationId: oblId! } });
    expect(aliases).toHaveLength(1);
    expect(aliases[0]!.namespace).toBe('po');
    expect(aliases[0]!.sourceId).toBe(po.id);
  } finally {
    await cleanupSources(t, sources);
  }
});

test('(2) finalize + 入金: candidate の cashflow_expected obligation に inv alias が付与され、全額入金で settled になる', async () => {
  const t = await seedTenantId();
  const uid = await ceoUserId();
  const cand = await prisma.invoiceCandidate.create({
    data: { tenantId: t, title: 'FIN02 e2e candidate', subtotal: 8000, taxAmount: 0, total: 8000, status: 'draft', dueAt: new Date('2026-09-01T00:00:00Z') },
  });
  // bridge 相当: candidate の cashflow_expected を実 service で obligation 化（producer と同一 service）。
  const candEvt = await prisma.financeEvent.create({
    data: { tenantId: t, type: 'cashflow_expected', sourceType: 'InvoiceCandidate', sourceId: cand.id, direction: 'inflow', amount: 8000, dueAt: new Date('2026-09-01T00:00:00Z'), description: '入金予定: FIN02 e2e' },
  });
  await prisma.$transaction((tx) =>
    upsertObligationForEvent(tx, {
      tenantId: t,
      eventId: candEvt.id,
      type: 'cashflow_expected',
      sourceType: 'InvoiceCandidate',
      sourceId: cand.id,
      direction: 'inflow',
      amount: 8000,
      dueAt: new Date('2026-09-01T00:00:00Z'),
      description: '入金予定: FIN02 e2e',
    }),
  );
  const sources: string[] = [cand.id];
  let invoiceId = '';
  try {
    // 実 finalize（Invoice 作成 + convergence）。
    const res = await finalizeInvoiceCandidate({ tenantId: t, userId: uid }, cand.id);
    expect(res.ok).toBe(true);
    expect(res.invoiceId).toBeTruthy();
    if (!res.ok || !res.invoiceId) return;
    invoiceId = res.invoiceId;
    sources.push(invoiceId);

    // candidate obligation に inv alias が付与され preferred が inv になった。
    const candAlias = await prisma.cashflowObligationAlias.findFirstOrThrow({ where: { tenantId: t, sourceId: cand.id, namespace: 'cand' } });
    const obl = await prisma.cashflowObligation.findUniqueOrThrow({ where: { id: candAlias.obligationId } });
    expect(obl.namespace).toBe('inv');
    const invAlias = await prisma.cashflowObligationAlias.findFirst({ where: { tenantId: t, obligationId: obl.id, namespace: 'inv' } });
    expect(invAlias).not.toBeNull();
    expect(invAlias!.sourceId).toBe(invoiceId);
    // 旧 cand alias は履歴として保持されている（2 alias）。
    expect(await prisma.cashflowObligationAlias.count({ where: { tenantId: t, obligationId: obl.id } })).toBe(2);

    // 実 recordInvoicePayment で全額入金 → obligation が settled、残額 0。
    const pay = await recordInvoicePayment({ tenantId: t, userId: uid }, invoiceId, 8000, 'bank', { idempotencyKey: mkToken() });
    expect(pay.ok).toBe(true);
    const settled = await prisma.cashflowObligation.findUniqueOrThrow({ where: { id: obl.id } });
    expect(settled.lifecycleStatus).toBe('settled');
    expect(Number(settled.remainingAmount)).toBe(0);
  } finally {
    await cleanupSources(t, sources);
  }
});
