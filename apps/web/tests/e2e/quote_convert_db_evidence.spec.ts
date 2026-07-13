import { test, expect } from '@playwright/test';
import { prisma } from '@hokko/db';
import { convertQuoteToInvoiceCore, type ConvertBridgeDb } from '../../lib/quote-convert-bridge';

// P3-Q2C hardening（Codex V75 Q2C P2-2/P2-4）: 見積→請求 変換 core の **実 PostgreSQL** transaction 証拠。
// mock の呼び出し回数ではなく実 DB の最終状態を re-fetch して assert する。並行は実競合
// （Promise.allSettled・quoteId の unique 制約が直列化 barrier）。失敗注入は実 prisma.$transaction の
// tx を包む test-only wrapper（本ファイル内のみ・Server Action から到達不能）。fixture は tenant 単位で後始末。

const T_A = 'q2c-convert-evidence-tenant-A';
let tenantA = '';

function assertLocalDatabaseUrl(): void {
  let host = '';
  try {
    host = new URL(process.env.DATABASE_URL ?? '').hostname;
  } catch {
    host = '';
  }
  if (host !== 'localhost' && host !== '127.0.0.1') {
    throw new Error(`TEST_ENVIRONMENT_APPROVAL_REQUIRED: DATABASE_URL host="${host}" はローカル/CI と機械確認できません`);
  }
}

async function makeApprovedQuote(tenantId: string) {
  return prisma.quote.create({
    data: {
      tenantId,
      number: `Q-EV-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: 'convert evidence',
      status: 'approved',
      subtotal: 100000,
      cost: 65000,
      discountRate: 20,
      taxRate: 10,
      total: 88000,
      grossMargin: 15000,
      grossMarginRate: 18.75,
      lineItems: { create: [{ tenantId, name: 'A', quantity: 1, unitPrice: 56000, unitCost: 36000, amount: 56000 }] },
    },
  });
}

function convInput(tenantId: string, quote: { id: string; number: string }, invoiceNumber: string, actorIsAi = false) {
  return {
    tenantId,
    actorId: 'q2c-human',
    actorIsAi,
    quoteId: quote.id,
    quoteNumber: quote.number,
    invoiceNumber,
    customerId: null,
    dealId: null,
    dueDate: new Date('2026-08-01T00:00:00Z'),
    draft: { subtotal: 80000, taxAmount: 8000, total: 88000, lineItems: [{ name: 'A', quantity: 1, unitPrice: 56000, amount: 56000 }] },
  };
}

/** 実 prisma の transaction を使いつつ、指定モデルの create だけ故意に失敗させる test-only wrapper。 */
function failingDb(failOn: 'invoice' | 'auditLog'): ConvertBridgeDb {
  return {
    $transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
      return prisma.$transaction(async (tx) => {
        const wrapped = {
          invoice: failOn === 'invoice' ? { create: async () => { throw new Error('injected-invoice-failure'); } } : tx.invoice,
          auditLog: failOn === 'auditLog' ? { create: async () => { throw new Error('injected-auditLog-failure'); } } : tx.auditLog,
        };
        return fn(wrapped);
      });
    },
  };
}

test.describe('P3-Q2C 変換 実 PostgreSQL transaction 証拠（hardening）', () => {
  test.beforeAll(async () => {
    assertLocalDatabaseUrl();
    const a = await prisma.tenant.create({ data: { name: T_A } });
    tenantA = a.id;
  });

  test.afterAll(async () => {
    if (tenantA) {
      await prisma.auditLog.deleteMany({ where: { tenantId: tenantA } });
      await prisma.invoiceLineItem.deleteMany({ where: { tenantId: tenantA } });
      await prisma.invoice.deleteMany({ where: { tenantId: tenantA } });
      await prisma.quoteLineItem.deleteMany({ where: { tenantId: tenantA } });
      await prisma.quote.deleteMany({ where: { tenantId: tenantA } });
      await prisma.tenant.deleteMany({ where: { id: tenantA } });
    }
    await prisma.$disconnect();
  });

  test('1. 正常系: Invoice+lineItem+監査が実 DB に1件ずつ確定し quoteId で連携する', async () => {
    const q = await makeApprovedQuote(tenantA);
    const r = await convertQuoteToInvoiceCore(prisma as unknown as ConvertBridgeDb, convInput(tenantA, q, 'INV-EV-1'));
    expect(r.outcome).toBe('created');
    const invoices = await prisma.invoice.findMany({ where: { quoteId: q.id }, include: { lineItems: true } });
    expect(invoices).toHaveLength(1);
    expect(invoices[0]!.status).toBe('DRAFT');
    expect(Number(invoices[0]!.total)).toBe(88000);
    expect(invoices[0]!.lineItems).toHaveLength(1);
    const audits = await prisma.auditLog.findMany({ where: { tenantId: tenantA, action: 'invoice_create_from_quote', entityId: invoices[0]!.id } });
    expect(audits).toHaveLength(1);
  });

  test('2. 監査失敗注入 → 請求書ごと rollback（孤児 0）・実 retry で1件収束', async () => {
    const q = await makeApprovedQuote(tenantA);
    await expect(convertQuoteToInvoiceCore(failingDb('auditLog'), convInput(tenantA, q, 'INV-EV-2'))).rejects.toThrow('injected-auditLog-failure');
    // rollback: quoteId を持つ請求書・行・監査は一切残らない。
    expect(await prisma.invoice.count({ where: { quoteId: q.id } })).toBe(0);
    // 実 retry（正常 db）で1件確定。
    const r = await convertQuoteToInvoiceCore(prisma as unknown as ConvertBridgeDb, convInput(tenantA, q, 'INV-EV-2b'));
    expect(r.outcome).toBe('created');
    expect(await prisma.invoice.count({ where: { quoteId: q.id } })).toBe(1);
  });

  test('3. Invoice 作成失敗注入 → 監査も作られない（部分 commit 0）', async () => {
    const q = await makeApprovedQuote(tenantA);
    await expect(convertQuoteToInvoiceCore(failingDb('invoice'), convInput(tenantA, q, 'INV-EV-3'))).rejects.toThrow('injected-invoice-failure');
    expect(await prisma.invoice.count({ where: { quoteId: q.id } })).toBe(0);
    expect(await prisma.auditLog.count({ where: { tenantId: tenantA, metadata: { path: ['quoteId'], equals: q.id } } })).toBe(0);
  });

  test('4. 並行変換（同一 quoteId）は quoteId unique で1件に収束（勝者 created・敗者 already）', async () => {
    const q = await makeApprovedQuote(tenantA);
    const results = await Promise.allSettled([
      convertQuoteToInvoiceCore(prisma as unknown as ConvertBridgeDb, convInput(tenantA, q, 'INV-EV-4a')),
      convertQuoteToInvoiceCore(prisma as unknown as ConvertBridgeDb, convInput(tenantA, q, 'INV-EV-4b')),
    ]);
    const outcomes = results.map((r) => (r.status === 'fulfilled' ? r.value.outcome : `rejected:${(r.reason as Error).message}`));
    // 片方 created・片方 already（rejected は許容しない＝P2002 は core が already に収束）。
    expect(outcomes.filter((o) => o === 'created')).toHaveLength(1);
    expect(outcomes.filter((o) => o === 'already')).toHaveLength(1);
    expect(await prisma.invoice.count({ where: { quoteId: q.id } })).toBe(1);
  });

  test('5. 逐次 re-convert は already（実 DB で行は増えない）', async () => {
    const q = await makeApprovedQuote(tenantA);
    expect((await convertQuoteToInvoiceCore(prisma as unknown as ConvertBridgeDb, convInput(tenantA, q, 'INV-EV-5'))).outcome).toBe('created');
    expect((await convertQuoteToInvoiceCore(prisma as unknown as ConvertBridgeDb, convInput(tenantA, q, 'INV-EV-5b'))).outcome).toBe('already');
    expect(await prisma.invoice.count({ where: { quoteId: q.id } })).toBe(1);
  });

  test('6. AI 主体は DB 接触前に forbidden（行数不変）', async () => {
    const q = await makeApprovedQuote(tenantA);
    const before = await prisma.invoice.count({ where: { tenantId: tenantA } });
    const r = await convertQuoteToInvoiceCore(prisma as unknown as ConvertBridgeDb, convInput(tenantA, q, 'INV-EV-6', true));
    expect(r.outcome).toBe('forbidden');
    expect(await prisma.invoice.count({ where: { tenantId: tenantA } })).toBe(before);
  });
});
