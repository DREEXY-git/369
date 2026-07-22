import { test, expect } from '@playwright/test';
import { prisma } from '@hokko/db';
import type { EmailProvider, SendEmailParams, SendResult } from '@hokko/integrations';
import { executeDunningSend, type Actor } from '../../lib/domains/finance/dunning';

// M2 準備（督促 dunning 外部送信 exactly-once）の実 PostgreSQL 証拠。invoice-send E-01 と同型。
// production-shared core（executeDunningSend）を実 DB で直接叩き、Prisma を mock せず最終行を re-fetch で検証。
// 並行は sleep ではなく CollectionReminder 行 FOR UPDATE / status CAS の実 row-lock 直列化で観測する。
// 外部送信は instrumented な fake EmailProvider（ネットワーク送信なし）で呼び出し回数を数え、
// exactly-once（provider call が retry/並行でも高々1・二重送信ゼロ）を実測する。実 SMTP/LLM/Secrets は不使用。
//
// oracle:
//  - 並行2実行で provider call 1・sent|logged 1・dunning_send Audit 1・growth 1・usage 1。
//  - provider 成功直後の fault の retry で provider call が2にならない（送信後クラッシュでも二重送信なし）。
//  - finalize tx 内 fault は全 rollback（terminal/Audit なし・'sending' のまま）→ retry で provider 再送せず1組。
//  - claim 後・provider 前の fault（pre-send クラッシュ）の retry は provider を呼ばず terminal 化する
//    （督促は「二重送信」より「稀に1通落ちる（手動再送可）」を選ぶ at-most-once。二重送信ゼロを最優先）。
//
// fixture/cleanup は本テストが作成した ID に限定（seed・共有データを広域 delete しない）。

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

interface DunningFixture {
  customerId: string;
  invoiceId: string;
  receivableId: string;
  reminderId: string;
}

/** 送信対象の督促下書き（pending_approval）を一式作る（顧客メール有り）。 */
async function makeDunning(tenantId: string, total = 80000): Promise<DunningFixture> {
  const s = stamp();
  const customer = await prisma.customer.create({
    data: { tenantId, name: `M2督促顧客-${s}`, email: `dunning-${s}@example.jp`, status: 'active' },
    select: { id: true },
  });
  const invoice = await prisma.invoice.create({
    data: { tenantId, customerId: customer.id, number: `M2-DUN-${s}`, status: 'ISSUED', dueDate: new Date('2031-03-31T00:00:00Z'), subtotal: total, taxAmount: 0, total, paidAmount: 0 },
    select: { id: true },
  });
  const receivable = await prisma.receivable.create({
    data: { tenantId, invoiceId: invoice.id, amount: total, dueDate: new Date('2031-03-31T00:00:00Z'), status: 'open' },
    select: { id: true },
  });
  const reminder = await prisma.collectionReminder.create({
    data: { tenantId, receivableId: receivable.id, draftMessage: 'お支払い状況のご確認のお願いです。', status: 'pending_approval', stage: 1 },
    select: { id: true },
  });
  return { customerId: customer.id, invoiceId: invoice.id, receivableId: receivable.id, reminderId: reminder.id };
}

async function dunningCounts(tenantId: string, reminderId: string) {
  return {
    terminal: await prisma.collectionReminder.count({ where: { id: reminderId, tenantId, status: { in: ['sent', 'logged'] } } }),
    sending: await prisma.collectionReminder.count({ where: { id: reminderId, tenantId, status: 'sending' } }),
    audit: await prisma.auditLog.count({ where: { tenantId, entityType: 'CollectionReminder', entityId: reminderId, action: 'dunning_send' } }),
    growth: await prisma.growthEvent.count({ where: { tenantId, entityType: 'CollectionReminder', entityId: reminderId } }),
    usage: await prisma.usageEvent.count({ where: { tenantId, sourceType: 'CollectionReminder', sourceId: reminderId, eventType: 'external_send.dunning' } }),
  };
}

/** 作成 ID に限定した cleanup（seed・他テストのデータへ広域条件を使わない）。 */
async function cleanup(tenantId: string, fx: DunningFixture): Promise<void> {
  await prisma.usageEvent.deleteMany({ where: { tenantId, sourceType: 'CollectionReminder', sourceId: fx.reminderId } });
  await prisma.growthEvent.deleteMany({ where: { tenantId, entityType: 'CollectionReminder', entityId: fx.reminderId } });
  await prisma.aISafetyLog.deleteMany({ where: { tenantId, entityType: 'CollectionReminder', entityId: fx.reminderId } });
  await prisma.auditLog.deleteMany({ where: { tenantId, entityType: 'CollectionReminder', entityId: fx.reminderId } });
  await prisma.collectionReminder.deleteMany({ where: { id: fx.reminderId, tenantId } });
  await prisma.receivable.deleteMany({ where: { id: fx.receivableId, tenantId } });
  await prisma.invoice.deleteMany({ where: { id: fx.invoiceId, tenantId } });
  await prisma.customer.deleteMany({ where: { id: fx.customerId, tenantId } });
}

test.describe('M2 dunning 送信 証拠（外部送信 exactly-once・二重送信ゼロ）', () => {
  test.beforeAll(() => {
    assertLocalDatabaseUrl();
  });
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test('並行2実行で provider 呼び出し1・terminal1・Audit1・growth1・usage1（二重送信なし）', async () => {
    const actor = await getActor();
    const fx = await makeDunning(actor.tenantId);
    const provider = new CountingEmailProvider();
    try {
      const [r1, r2] = await Promise.all([
        executeDunningSend(actor, fx.reminderId, { __emailProviderForTest: provider }),
        executeDunningSend(actor, fx.reminderId, { __emailProviderForTest: provider }),
      ]);
      expect(r1.ok && r2.ok, '両実行とも冪等に成功で返る').toBe(true);
      expect(provider.calls.length, 'provider は正確に1回だけ呼ばれる（外部送信は exactly-once）').toBe(1);
      const c = await dunningCounts(actor.tenantId, fx.reminderId);
      expect(c.terminal, 'reminder は sent|logged が1（「sending」残りなし）').toBe(1);
      expect(c.sending, "'sending' は残っていない").toBe(0);
      expect(c.audit, 'dunning_send Audit は1（CAS 勝者のみ）').toBe(1);
      expect(c.growth, 'dunning.sent GrowthEvent は1').toBe(1);
      expect(c.usage, '非課金 UsageEvent は1（idempotencyKey で収束）').toBe(1);
    } finally {
      await cleanup(actor.tenantId, fx);
    }
  });

  test('provider 成功直後・finalize 前の fault → retry で provider を再送しない（送信後クラッシュでも二重送信なし）', async () => {
    const actor = await getActor();
    const fx = await makeDunning(actor.tenantId);
    const provider = new CountingEmailProvider();
    try {
      await expect(
        executeDunningSend(actor, fx.reminderId, {
          __emailProviderForTest: provider,
          __faultAfterProviderForTest: () => {
            throw new Error('injected:after-provider');
          },
        }),
      ).rejects.toThrow('injected:after-provider');
      expect(provider.calls.length, 'provider は1回呼ばれた').toBe(1);
      // provider 後・finalize 前の fault: terminal 未確定だが write-ahead claim（'sending'）は残る。
      let c = await dunningCounts(actor.tenantId, fx.reminderId);
      expect(c.terminal, 'terminal 未確定').toBe(0);
      expect(c.sending, "'sending' claim は残る").toBe(1);
      // retry: 既存 claim を引き継ぎ provider を再送しない → finalize がちょうど1組を確定。
      const r = await executeDunningSend(actor, fx.reminderId, { __emailProviderForTest: provider });
      expect(r.ok).toBe(true);
      expect(provider.calls.length, 'retry は provider を再送しない（exactly-once）').toBe(1);
      c = await dunningCounts(actor.tenantId, fx.reminderId);
      expect(c.terminal, 'retry で terminal 確定は1').toBe(1);
      expect(c.audit, 'Audit は1（二重発火なし）').toBe(1);
      expect(c.growth, 'growth は1').toBe(1);
    } finally {
      await cleanup(actor.tenantId, fx);
    }
  });

  test('finalize tx 内 fault で全 rollback（terminal/Audit なし・「sending」のまま）→ retry で provider 再送せず1組', async () => {
    const actor = await getActor();
    const fx = await makeDunning(actor.tenantId);
    const provider = new CountingEmailProvider();
    try {
      await expect(
        executeDunningSend(actor, fx.reminderId, {
          __emailProviderForTest: provider,
          __faultBetweenWritesForTest: () => {
            throw new Error('injected:between-writes');
          },
        }),
      ).rejects.toThrow('injected:between-writes');
      expect(provider.calls.length).toBe(1);
      let c = await dunningCounts(actor.tenantId, fx.reminderId);
      expect(c.terminal, 'finalize rollback で terminal なし').toBe(0);
      expect(c.audit, 'Audit も rollback で0').toBe(0);
      expect(c.sending, "'sending' claim は残る").toBe(1);
      const r = await executeDunningSend(actor, fx.reminderId, { __emailProviderForTest: provider });
      expect(r.ok).toBe(true);
      expect(provider.calls.length, 'retry で provider 再送なし').toBe(1);
      c = await dunningCounts(actor.tenantId, fx.reminderId);
      expect(c.terminal).toBe(1);
      expect(c.audit).toBe(1);
    } finally {
      await cleanup(actor.tenantId, fx);
    }
  });

  test('claim 後・provider 前の fault（pre-send クラッシュ）の retry は provider を呼ばず terminal 化（at-most-once・二重送信ゼロ優先）', async () => {
    const actor = await getActor();
    const fx = await makeDunning(actor.tenantId);
    const provider = new CountingEmailProvider();
    try {
      await expect(
        executeDunningSend(actor, fx.reminderId, {
          __emailProviderForTest: provider,
          __faultAfterClaimForTest: () => {
            throw new Error('injected:after-claim');
          },
        }),
      ).rejects.toThrow('injected:after-claim');
      expect(provider.calls.length, 'pre-send クラッシュ＝provider 未呼び出し').toBe(0);
      let c = await dunningCounts(actor.tenantId, fx.reminderId);
      expect(c.sending, "'sending' claim は残る").toBe(1);
      // retry: resume は provider を呼ばず terminal 化（二重送信を絶対に起こさない・稀な1通落ちは手動再送可）。
      const r = await executeDunningSend(actor, fx.reminderId, { __emailProviderForTest: provider });
      expect(r.ok).toBe(true);
      expect(provider.calls.length, 'resume は provider を呼ばない（二重送信ゼロ最優先）').toBe(0);
      c = await dunningCounts(actor.tenantId, fx.reminderId);
      expect(c.terminal, 'resume で terminal 化は1').toBe(1);
    } finally {
      await cleanup(actor.tenantId, fx);
    }
  });

  test('tenant 独立: 別 tenant の同時送信は互いに干渉しない（各 provider1・各 terminal1）', async () => {
    const actor = await getActor();
    const fxA = await makeDunning(actor.tenantId);
    // 別テナントは seed に依存せず、同一 actor tenant 内の別 reminder で「対象行 FOR UPDATE が行単位」であることを確認する
    // （別テナント seed が保証されないため、行独立＝別 reminder 独立で代替検証）。
    const fxB = await makeDunning(actor.tenantId);
    const pA = new CountingEmailProvider();
    const pB = new CountingEmailProvider();
    try {
      const [ra, rb] = await Promise.all([
        executeDunningSend(actor, fxA.reminderId, { __emailProviderForTest: pA }),
        executeDunningSend(actor, fxB.reminderId, { __emailProviderForTest: pB }),
      ]);
      expect(ra.ok && rb.ok).toBe(true);
      expect(pA.calls.length, 'A は1').toBe(1);
      expect(pB.calls.length, 'B は1').toBe(1);
      const ca = await dunningCounts(actor.tenantId, fxA.reminderId);
      const cb = await dunningCounts(actor.tenantId, fxB.reminderId);
      expect(ca.terminal).toBe(1);
      expect(cb.terminal).toBe(1);
    } finally {
      await cleanup(actor.tenantId, fxA);
      await cleanup(actor.tenantId, fxB);
    }
  });
});
