import { test, expect } from '@playwright/test';
import { prisma } from '@hokko/db';
import type { EmailProvider, SendEmailParams, SendResult } from '@hokko/integrations';
import { executeInvoiceExternalSend, issueInvoiceCore, type Actor } from '../../lib/domains/finance/invoice-send';

// M1-b E-01（invoice 外部送信 exactly-once）／E-03（invoice 発行 CAS + rollback）の実 PostgreSQL 証拠。
// production-shared core（executeInvoiceExternalSend / issueInvoiceCore）を実 DB で直接叩き、Prisma を
// mock せず最終行を re-fetch して検証する。並行は sleep ではなく Invoice 行 FOR UPDATE / status CAS の
// 実 row-lock 直列化で観測する。外部送信は instrumented な fake EmailProvider（ネットワーク送信なし）で
// 呼び出し回数を数え、exactly-once（provider call が retry/並行でも 1）を実測する。実 SMTP/LLM/Secrets は不使用。
//
// E-01 oracle: 並行2実行で provider call 1・SENT 1・payment_expected 1・Audit 1／provider 後 fault の retry で
//   provider call が2にならず payment_expected を失わない／finalize tx 内 fault は全 rollback・retry で1組。
// E-03 oracle: DRAFT→ISSUED の並行4で winner 1・Receivable 1・Audit 1／Receivable 起票後 fault で全 rollback。
//
// fixture/cleanup は本テストが作成した Invoice ID に限定（seed・共有データを広域 delete しない）。

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

/** 送信回数を数える instrumented な fake EmailProvider（実ネットワーク送信なし）。 */
class CountingEmailProvider implements EmailProvider {
  readonly name = 'test-counting';
  readonly calls: SendEmailParams[] = [];
  async send(params: SendEmailParams): Promise<SendResult> {
    this.calls.push(params);
    return { status: 'sent', provider: this.name, id: `test_${this.calls.length}` };
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

async function makeInvoice(tenantId: string, status: 'DRAFT' | 'ISSUED', total = 120000) {
  const s = stamp();
  return prisma.invoice.create({
    data: {
      tenantId,
      number: `M1B-INV-${s}`,
      status,
      dueDate: new Date('2031-03-31T00:00:00Z'),
      subtotal: total,
      taxAmount: 0,
      total,
      paidAmount: 0,
    },
    select: { id: true, number: true, status: true },
  });
}

async function sendCounts(tenantId: string, invoiceId: string) {
  return {
    sentInvoices: await prisma.invoice.count({ where: { id: invoiceId, tenantId, status: 'SENT' } }),
    paymentExpected: await prisma.financeEvent.count({ where: { tenantId, sourceType: 'Invoice', sourceId: invoiceId, type: 'payment_expected' } }),
    paymentExpectedApproved: await prisma.financeEvent.count({ where: { tenantId, sourceType: 'Invoice', sourceId: invoiceId, type: 'payment_expected', status: 'approved' } }),
    sendAudit: await prisma.auditLog.count({ where: { tenantId, entityType: 'Invoice', entityId: invoiceId, action: 'invoice_send' } }),
    sentDomainEvents: await prisma.domainEvent.count({ where: { tenantId, aggregateType: 'Invoice', aggregateId: invoiceId, eventType: 'INVOICE_SENT' } }),
    usage: await prisma.usageEvent.count({ where: { tenantId, sourceType: 'Invoice', sourceId: invoiceId, eventType: 'external_send.invoice' } }),
  };
}

async function issueCounts(tenantId: string, invoiceId: string) {
  return {
    issued: await prisma.invoice.count({ where: { id: invoiceId, tenantId, status: 'ISSUED' } }),
    receivable: await prisma.receivable.count({ where: { tenantId, invoiceId } }),
    issueAudit: await prisma.auditLog.count({ where: { tenantId, entityType: 'Invoice', entityId: invoiceId, action: 'update' } }),
  };
}

/** 作成 Invoice ID に限定した cleanup（seed・他テストのデータへ広域条件を使わない）。 */
async function cleanup(tenantId: string, invoiceIds: string[]) {
  const events = await prisma.domainEvent.findMany({ where: { tenantId, aggregateType: 'Invoice', aggregateId: { in: invoiceIds } }, select: { id: true } });
  const eventIds = events.map((e) => e.id);
  await prisma.outboxMessage.deleteMany({ where: { eventId: { in: eventIds } } });
  await prisma.domainEvent.deleteMany({ where: { id: { in: eventIds } } });
  await prisma.usageEvent.deleteMany({ where: { tenantId, sourceType: 'Invoice', sourceId: { in: invoiceIds } } });
  await prisma.growthEvent.deleteMany({ where: { tenantId, entityType: 'Invoice', entityId: { in: invoiceIds } } });
  await prisma.aISafetyLog.deleteMany({ where: { tenantId, entityType: 'Invoice', entityId: { in: invoiceIds } } });
  await prisma.auditLog.deleteMany({ where: { tenantId, entityType: 'Invoice', entityId: { in: invoiceIds } } });
  await prisma.financeEvent.deleteMany({ where: { tenantId, sourceType: 'Invoice', sourceId: { in: invoiceIds } } });
  await prisma.receivable.deleteMany({ where: { tenantId, invoiceId: { in: invoiceIds } } });
  await prisma.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
}

test.describe('M1-b invoice lifecycle 証拠（E-01 送信 exactly-once / E-03 発行 CAS）', () => {
  test.beforeAll(() => {
    assertLocalDatabaseUrl();
  });
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test('E-01 送信: 同一 Invoice の並行2実行で provider 呼び出し1・SENT1・payment_expected1・Audit1', async () => {
    const actor = await getActor();
    const inv = await makeInvoice(actor.tenantId, 'ISSUED');
    const provider = new CountingEmailProvider();
    try {
      const [r1, r2] = await Promise.all([
        executeInvoiceExternalSend(actor, inv.id, { __emailProviderForTest: provider }),
        executeInvoiceExternalSend(actor, inv.id, { __emailProviderForTest: provider }),
      ]);
      expect(r1.ok && r2.ok, '両実行とも冪等に成功で返る').toBe(true);
      expect(provider.calls.length, 'provider は正確に1回だけ呼ばれる（外部送信は exactly-once）').toBe(1);
      const c = await sendCounts(actor.tenantId, inv.id);
      expect(c.sentInvoices, 'Invoice は SENT が1').toBe(1);
      expect(c.paymentExpected, 'payment_expected は1件だけ（write-ahead claim の二重生成なし）').toBe(1);
      expect(c.paymentExpectedApproved, 'finalize で approved 化され cashflow 予定へ計上').toBe(1);
      expect(c.sendAudit, 'invoice_send Audit は1（CAS 勝者のみ）').toBe(1);
      expect(c.sentDomainEvents, 'INVOICE_SENT DomainEvent は1').toBe(1);
      expect(c.usage, '非課金 UsageEvent は1（idempotencyKey で収束）').toBe(1);
    } finally {
      await cleanup(actor.tenantId, [inv.id]);
    }
  });

  test('E-01 送信: provider 成功直後・finalize 前の fault → retry で provider を再送せず payment_expected も失わない', async () => {
    const actor = await getActor();
    const inv = await makeInvoice(actor.tenantId, 'ISSUED');
    const provider = new CountingEmailProvider();
    try {
      await expect(
        executeInvoiceExternalSend(actor, inv.id, {
          __emailProviderForTest: provider,
          __faultAfterProviderForTest: () => {
            throw new Error('injected:after-provider');
          },
        }),
      ).rejects.toThrow('injected:after-provider');
      expect(provider.calls.length, 'provider は1回呼ばれた').toBe(1);
      // provider 後・finalize 前の fault: SENT 未確定だが write-ahead claim(pending_send) は残る（payment_expected 消失なし）。
      let c = await sendCounts(actor.tenantId, inv.id);
      expect(c.sentInvoices, 'まだ SENT ではない').toBe(0);
      expect(c.paymentExpected, 'write-ahead claim は durable に残っている').toBe(1);
      expect(c.paymentExpectedApproved, 'まだ approved 化されていない').toBe(0);
      expect(c.sendAudit).toBe(0);

      // retry: 既存 claim を引き継ぎ provider を再送しない → finalize がちょうど1組を確定。
      const r = await executeInvoiceExternalSend(actor, inv.id, { __emailProviderForTest: provider });
      expect(r.ok).toBe(true);
      expect(provider.calls.length, 'retry は provider を再送しない（exactly-once）').toBe(1);
      c = await sendCounts(actor.tenantId, inv.id);
      expect(c.sentInvoices).toBe(1);
      expect(c.paymentExpected).toBe(1);
      expect(c.paymentExpectedApproved).toBe(1);
      expect(c.sendAudit).toBe(1);
      expect(c.sentDomainEvents).toBe(1);
      expect(c.usage).toBe(1);
    } finally {
      await cleanup(actor.tenantId, [inv.id]);
    }
  });

  test('E-01 送信: finalize tx 内 fault で全 rollback（SENT/approved/Audit なし）→ retry で provider 再送せず1組', async () => {
    const actor = await getActor();
    const inv = await makeInvoice(actor.tenantId, 'ISSUED');
    const provider = new CountingEmailProvider();
    try {
      await expect(
        executeInvoiceExternalSend(actor, inv.id, {
          __emailProviderForTest: provider,
          __faultBetweenWritesForTest: () => {
            throw new Error('injected:between-writes');
          },
        }),
      ).rejects.toThrow('injected:between-writes');
      expect(provider.calls.length).toBe(1);
      let c = await sendCounts(actor.tenantId, inv.id);
      expect(c.sentInvoices, 'finalize は all-or-nothing rollback（SENT なし）').toBe(0);
      expect(c.paymentExpectedApproved, 'approved 化も rollback').toBe(0);
      expect(c.paymentExpected, 'ただし Phase1 の write-ahead claim(pending_send) は確定済み').toBe(1);
      expect(c.sendAudit).toBe(0);

      const r = await executeInvoiceExternalSend(actor, inv.id, { __emailProviderForTest: provider });
      expect(r.ok).toBe(true);
      expect(provider.calls.length, 'retry で provider 再送なし').toBe(1);
      c = await sendCounts(actor.tenantId, inv.id);
      expect(c.sentInvoices).toBe(1);
      expect(c.paymentExpectedApproved).toBe(1);
      expect(c.sendAudit).toBe(1);
      expect(c.sentDomainEvents).toBe(1);
      expect(c.usage).toBe(1);
    } finally {
      await cleanup(actor.tenantId, [inv.id]);
    }
  });

  test('E-01 tenant 独立: 別 tenant の同時送信は互いに干渉しない（各 provider1・各 SENT1）', async () => {
    const actor = await getActor();
    const s = stamp();
    const foreign = await prisma.tenant.create({ data: { name: `m1b-inv-foreign-${s}` } });
    const invA = await makeInvoice(actor.tenantId, 'ISSUED');
    const invB = await makeInvoice(foreign.id, 'ISSUED');
    const providerA = new CountingEmailProvider();
    const providerB = new CountingEmailProvider();
    const foreignActor: Actor = { tenantId: foreign.id, userId: actor.userId };
    try {
      await Promise.all([
        executeInvoiceExternalSend(actor, invA.id, { __emailProviderForTest: providerA }),
        executeInvoiceExternalSend(foreignActor, invB.id, { __emailProviderForTest: providerB }),
      ]);
      expect(providerA.calls.length, 'tenant A は provider 1').toBe(1);
      expect(providerB.calls.length, 'tenant B は provider 1').toBe(1);
      expect((await sendCounts(actor.tenantId, invA.id)).sentInvoices).toBe(1);
      expect((await sendCounts(foreign.id, invB.id)).sentInvoices).toBe(1);
    } finally {
      await cleanup(actor.tenantId, [invA.id]);
      await cleanup(foreign.id, [invB.id]);
      await prisma.tenant.deleteMany({ where: { id: foreign.id } });
    }
  });

  test('E-03 発行: DRAFT→ISSUED の並行4実行で winner1・Receivable1・Audit1', async () => {
    const actor = await getActor();
    const inv = await makeInvoice(actor.tenantId, 'DRAFT');
    try {
      const results = await Promise.all(Array.from({ length: 4 }, () => issueInvoiceCore(actor, inv.id)));
      expect(results.filter((r) => r.ok).length, 'CAS winner はちょうど1本').toBe(1);
      for (const r of results) {
        if (!r.ok) expect(['lost', 'invalid-state'], '敗者は書き込みゼロ（lost / invalid-state）').toContain(r.reason);
      }
      const c = await issueCounts(actor.tenantId, inv.id);
      expect(c.issued, 'ISSUED は1').toBe(1);
      expect(c.receivable, 'Receivable は1件だけ').toBe(1);
      expect(c.issueAudit, '発行 Audit は1').toBe(1);
    } finally {
      await cleanup(actor.tenantId, [inv.id]);
    }
  });

  test('E-03 発行: Receivable 起票後・Audit 前の fault で全 rollback（DRAFT 維持）→ retry で1組', async () => {
    const actor = await getActor();
    const inv = await makeInvoice(actor.tenantId, 'DRAFT');
    try {
      await expect(
        issueInvoiceCore(actor, inv.id, {
          __faultBetweenWritesForTest: () => {
            throw new Error('injected:issue-fault');
          },
        }),
      ).rejects.toThrow('injected:issue-fault');
      let c = await issueCounts(actor.tenantId, inv.id);
      expect(c.issued, 'CAS ごと rollback で DRAFT のまま').toBe(0);
      expect(c.receivable, 'Receivable も rollback').toBe(0);
      expect(c.issueAudit).toBe(0);
      expect((await prisma.invoice.findUnique({ where: { id: inv.id }, select: { status: true } }))!.status).toBe('DRAFT');

      const r = await issueInvoiceCore(actor, inv.id);
      expect(r.ok, 'retry はちょうど1回成功').toBe(true);
      c = await issueCounts(actor.tenantId, inv.id);
      expect(c.issued).toBe(1);
      expect(c.receivable).toBe(1);
      expect(c.issueAudit).toBe(1);
    } finally {
      await cleanup(actor.tenantId, [inv.id]);
    }
  });
});
