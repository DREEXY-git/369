import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { prisma } from '@hokko/db';
import {
  makeCanonicalIdempotencyKey,
  makeLegacyIdempotencyKey,
  derivePaymentRequestId,
  receivableStatusAfterPayment,
  legacyRowMatchesIdentity,
  RECEIVABLE_COLLECTED_DEDUPE,
} from '@hokko/shared';
import { emitDomainEvent } from '../../lib/events';
import { recordInvoicePayment } from '../../lib/domains/finance/payments';

// 修正版 Phase A（369-PADN-V5）: rollback 往復対称性の実 PostgreSQL 証拠。
// required_tests 3 / 4 / 10（design_verdict_D item 3/4/10・ID-1/ID-4 修正込み）。
//  - item 3: Phase B（改訂 #57 契約）commit 後状態 → Phase A rollback → 同一 token 再送で**全 7 面の増分 0**。
//  - item 4: Phase A 作成状態 → Phase B retry replica（改訂 Phase B の収束シーケンス＋reader 契約）で増分 0。
//  - item 10: Payment→FinanceEvent→Audit→Growth→DomainEvent→Outbox→Webhook 候補まで固定件数（陰性対照つき）。
// Webhook は**候補算出のみ**（processOutboxMessage の選択条件を fixture 購読 id 集合へスコープして再現）。
// 実配送・外部送信は一切なし（URL は https://example.invalid・fetch 不発生・WebhookDelivery 0 を assert）。

const mkKey = () => `c${randomUUID().replace(/-/g, '').slice(0, 24)}`;

async function tenantId(): Promise<string> {
  const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { tenantId: true } });
  return ceo!.tenantId;
}
async function ceoUserId(): Promise<string> {
  const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { id: true } });
  return ceo!.id;
}
async function makeIssuedInvoice(total: number): Promise<string> {
  const t = await tenantId();
  const inv = await prisma.invoice.create({
    data: {
      tenantId: t, number: `INV-PA2RB-${process.pid}-${Date.now()}-${Math.floor(performance.now())}`.slice(0, 40), status: 'ISSUED', issueDate: new Date(), dueDate: new Date(),
      subtotal: total, taxAmount: 0, total, paidAmount: 0,
      receivable: { create: { tenantId: t, amount: total, dueDate: new Date(), status: 'open' } },
    },
  });
  return inv.id;
}

/** 入金連鎖の全面 snapshot（invoice/token スコープの固定件数・byte 比較用）。 */
async function chainSnapshot(t: string, invId: string, subIds: string[]) {
  const evs = await prisma.domainEvent.findMany({
    where: { tenantId: t, aggregateId: invId },
    select: { id: true, eventType: true, idempotencyKey: true, status: true },
    orderBy: { idempotencyKey: 'asc' },
  });
  const evIds = evs.map((e) => e.id);
  const outbox = await prisma.outboxMessage.findMany({
    where: { tenantId: t, eventId: { in: evIds } },
    select: { eventId: true, eventType: true, status: true },
    orderBy: { eventType: 'asc' },
  });
  const payments = await prisma.payment.findMany({
    where: { invoiceId: invId },
    select: { id: true, tenantId: true, amount: true, method: true },
    orderBy: { id: 'asc' },
  });
  const payIds = payments.map((p) => p.id);
  // Webhook 候補: processOutboxMessage の選択条件（tenantId, active, eventType 一致 or '*'）を
  // fixture 購読 id 集合にスコープして pending outbox ごとに算出（実配送はしない）。
  let webhookCandidates = 0;
  for (const msg of outbox) {
    webhookCandidates += await prisma.webhookSubscription.count({
      where: { id: { in: subIds }, tenantId: t, active: true, OR: [{ eventType: msg.eventType }, { eventType: '*' }] },
    });
  }
  const inv = await prisma.invoice.findUnique({ where: { id: invId }, select: { status: true, paidAmount: true } });
  const recv = await prisma.receivable.findUnique({ where: { invoiceId: invId }, select: { status: true } });
  return {
    payments: payments.map((p) => ({ ...p, amount: Number(p.amount) })),
    financeEvents: await prisma.financeEvent.count({ where: { tenantId: t, sourceId: invId, type: 'payment_received' } }),
    audits: await prisma.auditLog.count({ where: { tenantId: t, entityId: invId, action: 'payment_record' } }),
    growth: await prisma.growthEvent.count({ where: { tenantId: t, entityId: { in: [invId, ...payIds] } } }),
    domainEvents: evs.map((e) => ({ eventType: e.eventType, idempotencyKey: e.idempotencyKey, status: e.status })),
    outbox,
    webhookCandidates,
    webhookDeliveries: await prisma.webhookDelivery.count({ where: { eventId: { in: evIds } } }),
    invoiceStatus: inv!.status,
    paidAmount: Number(inv!.paidAmount),
    receivableStatus: recv?.status ?? null,
  };
}

async function cleanupInvoice(id: string) {
  const t = await tenantId();
  const payIds = (await prisma.payment.findMany({ where: { invoiceId: id }, select: { id: true } })).map((p) => p.id);
  const evs = await prisma.domainEvent.findMany({ where: { tenantId: t, aggregateId: id }, select: { id: true } });
  await prisma.outboxMessage.deleteMany({ where: { tenantId: t, eventId: { in: evs.map((e) => e.id) } } });
  await prisma.growthEvent.deleteMany({ where: { tenantId: t, entityId: { in: [id, ...payIds] } } });
  await prisma.domainEvent.deleteMany({ where: { tenantId: t, aggregateId: id } });
  await prisma.auditLog.deleteMany({ where: { tenantId: t, entityId: id, action: 'payment_record' } });
  await prisma.financeEvent.deleteMany({ where: { tenantId: t, sourceId: id } });
  await prisma.payment.deleteMany({ where: { invoiceId: id } });
  await prisma.receivable.deleteMany({ where: { invoiceId: id } });
  await prisma.invoice.deleteMany({ where: { id } });
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('required_tests 3: Phase B 作成 → Phase A rollback → 同一 token 再送 2 回＋emit 再発火で全 7 面の増分 0（B→A 対称性）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const invId = await makeIssuedInvoice(10000);
  const token = mkKey();
  const derivedId = derivePaymentRequestId(t, token);
  let subId: string | null = null;
  try {
    // Phase B（改訂 #57・ID-1 conformance: Payment.id=derived ID / canonical key / payload.idem）commit 後状態を
    // 単一 $transaction で同型 insert（cda7188 payments.ts の書込集合を改訂契約で複製）。
    const prKey = makeCanonicalIdempotencyKey({ tenantId: t, eventType: 'PAYMENT_RECEIVED', aggregateId: invId, dedupe: token });
    const rcKey = makeCanonicalIdempotencyKey({ tenantId: t, eventType: 'RECEIVABLE_COLLECTED', aggregateId: invId, dedupe: RECEIVABLE_COLLECTED_DEDUPE });
    const [prEvId, rcEvId] = await prisma.$transaction(async (tx) => {
      await tx.payment.create({ data: { id: derivedId, tenantId: t, invoiceId: invId, amount: 10000, method: 'bank' } });
      await tx.invoice.update({ where: { id: invId }, data: { paidAmount: 10000, status: 'PAID' } });
      await tx.receivable.updateMany({ where: { invoiceId: invId, tenantId: t }, data: { status: receivableStatusAfterPayment(10000, 10000) } });
      await tx.financeEvent.create({
        data: { tenantId: t, type: 'payment_received', sourceType: 'Invoice', sourceId: invId, direction: 'inflow', amount: 10000, status: 'posted', occurredAt: new Date(), description: '入金: fixture' },
      });
      await tx.auditLog.create({
        data: { tenantId: t, actorId: uid, actorType: 'user', action: 'payment_record', entityType: 'Invoice', entityId: invId, summary: '入金記録 10,000円（全額入金）' },
      });
      const pr = await tx.domainEvent.create({
        data: {
          tenantId: t, eventType: 'PAYMENT_RECEIVED', aggregateType: 'Invoice', aggregateId: invId, actorId: uid, actorType: 'user',
          payload: { growthType: 'finance.payment.received', idem: { aggregateType: 'Invoice', aggregateId: invId, dedupe: token, enc: 'canonical', v: 1 } },
          idempotencyKey: prKey, status: 'pending',
        },
      });
      await tx.outboxMessage.create({ data: { tenantId: t, eventId: pr.id, eventType: 'PAYMENT_RECEIVED', payload: { growthType: 'finance.payment.received' }, status: 'pending' } });
      await tx.growthEvent.create({
        data: { tenantId: t, type: 'finance.payment.received', category: 'finance', title: '入金: fixture', description: '', actorId: uid, actorType: 'user', entityType: 'Payment', entityId: derivedId, amount: 10000, revenueImpact: 10000, domainEventId: pr.id },
      });
      const rc = await tx.domainEvent.create({
        data: {
          tenantId: t, eventType: 'RECEIVABLE_COLLECTED', aggregateType: 'Invoice', aggregateId: invId, actorId: uid, actorType: 'user',
          payload: { growthType: 'finance.receivable.collected', idem: { aggregateType: 'Invoice', aggregateId: invId, dedupe: RECEIVABLE_COLLECTED_DEDUPE, enc: 'canonical', v: 1 } },
          idempotencyKey: rcKey, status: 'pending',
        },
      });
      await tx.outboxMessage.create({ data: { tenantId: t, eventId: rc.id, eventType: 'RECEIVABLE_COLLECTED', payload: { growthType: 'finance.receivable.collected' }, status: 'pending' } });
      await tx.growthEvent.create({
        data: { tenantId: t, type: 'finance.receivable.collected', category: 'finance', title: '売掛金回収: fixture', description: '', actorId: uid, actorType: 'user', entityType: 'Receivable', entityId: invId, amount: 10000, revenueImpact: null, domainEventId: rc.id },
      });
      return [pr.id, rc.id];
    });
    const sub = await prisma.webhookSubscription.create({
      data: { tenantId: t, url: 'https://example.invalid/padn-a2-rb', secret: 'test-secret', eventType: '*', active: true },
    });
    subId = sub.id;

    const before = await chainSnapshot(t, invId, [sub.id]);
    expect(before.payments.length).toBe(1);
    expect(before.domainEvents.length).toBe(2);
    expect(before.webhookCandidates, "active '*' 購読 × pending outbox 2 = 候補 2").toBe(2);
    expect(before.webhookDeliveries, '実配送 0').toBe(0);

    // rollback 後の Phase A（本実装）で同一 token を 2 回再送 → Payment barrier で converge・書込到達 0。
    for (let i = 0; i < 2; i++) {
      const r = await recordInvoicePayment({ tenantId: t, userId: uid }, invId, 10000, 'bank', { idempotencyKey: token });
      expect(r.ok, `${i + 1}回目の再送は成功（冪等）`).toBe(true);
      expect(r.idempotent, '既存 Payment へ収束（新規作成なし）').toBe(true);
      expect(r.fullyPaid).toBe(true);
    }
    // event 層 retry も行使: Phase A reader が Phase B canonical 行を**実 dedupe**で認識する本命 oracle。
    const pr = await emitDomainEvent({ tenantId: t, eventType: 'PAYMENT_RECEIVED', aggregateType: 'Invoice', aggregateId: invId, dedupe: token });
    expect(pr.duplicated).toBe(true);
    expect(pr.eventId).toBe(prEvId);
    const rc = await emitDomainEvent({ tenantId: t, eventType: 'RECEIVABLE_COLLECTED', aggregateType: 'Invoice', aggregateId: invId, dedupe: RECEIVABLE_COLLECTED_DEDUPE });
    expect(rc.duplicated).toBe(true);
    expect(rc.eventId).toBe(rcEvId);

    const after = await chainSnapshot(t, invId, [sub.id]);
    expect(after, '全 7 面（Payment/FinanceEvent/Audit/Growth/DomainEvent/Outbox/Webhook候補）＋paidAmount が snapshot と完全一致（増分 0）').toEqual(before);
  } finally {
    if (subId) await prisma.webhookSubscription.deleteMany({ where: { id: subId } });
    await cleanupInvoice(invId);
  }
});

test('required_tests 4: Phase A 作成 → 改訂 Phase B retry replica（収束シーケンス＋reader 契約）で増分 0（A→B 対称性・ID-4）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const invId = await makeIssuedInvoice(10000);
  const token = mkKey();
  const derivedId = derivePaymentRequestId(t, token);
  try {
    // Phase A（本実装）で実際に作成した A 起源状態。
    const r1 = await recordInvoicePayment({ tenantId: t, userId: uid }, invId, 10000, 'bank', { idempotencyKey: token });
    expect(r1.ok).toBe(true);
    expect(r1.fullyPaid).toBe(true);
    const before = await chainSnapshot(t, invId, []);
    expect(before.payments.length).toBe(1);
    expect(before.payments[0]!.id, 'Payment.id は derived ID（ID-1）').toBe(derivedId);
    expect(before.domainEvents.length).toBe(2);

    // 改訂 Phase B（cda7188 の tx 収束シーケンスを ID-1 conformance＝derived ID 照合へ改訂した replica。
    // 参照: cda7188 apps/web/lib/domains/finance/payments.ts recordInvoicePayment tx 冒頭 L104-125 相当）。
    // 同一 request 再送: FOR UPDATE → status 再読込 → derived ID の Payment 完全照合 → converge（書込 0）。
    const phaseBRetryReplica = async (): Promise<'converged' | 'created'> =>
      prisma.$transaction(async (tx) => {
        const locked = await tx.$queryRaw<Array<{ status: string }>>`
        SELECT status FROM "Invoice" WHERE id = ${invId} AND "tenantId" = ${t} FOR UPDATE`;
        expect(locked.length).toBe(1);
        const dup = await tx.payment.findUnique({
          where: { id: derivedId },
          select: { tenantId: true, invoiceId: true, amount: true, method: true },
        });
        if (dup && dup.tenantId === t && dup.invoiceId === invId && Number(dup.amount) === 10000 && dup.method === 'bank') {
          return 'converged';
        }
        return 'created';
      });
    expect(await phaseBRetryReplica(), 'Phase B retry は既存 Payment へ converge（書込 0）').toBe('converged');

    // 改訂 Phase B reader 契約（ID-4: canonical-first exact ＋ payload.idem 検証付き legacy 照合）の直接検証:
    // A が書いた dedupe 付き legacy 行が、Phase B reader の照合順で**決定的に発見可能**であること。
    for (const identity of [
      { tenantId: t, eventType: 'PAYMENT_RECEIVED', aggregateType: 'Invoice', aggregateId: invId, dedupe: token },
      { tenantId: t, eventType: 'RECEIVABLE_COLLECTED', aggregateType: 'Invoice', aggregateId: invId, dedupe: RECEIVABLE_COLLECTED_DEDUPE },
    ] as const) {
      const canonicalKey = makeCanonicalIdempotencyKey(identity);
      const legacyKey = makeLegacyIdempotencyKey(identity);
      // (1) canonical exact は miss（Phase A writer は legacy encoding のまま＝人間条件4）。
      expect(
        await prisma.domainEvent.findUnique({ where: { tenantId_idempotencyKey: { tenantId: t, idempotencyKey: canonicalKey } }, select: { id: true } }),
        'canonical exact は miss（A は legacy で書く）',
      ).toBeNull();
      // (2) 検証付き legacy 照合: スカラ列 findFirst ＋ payload.idem.dedupe の完全一致 → hit。
      const legacyRow = await prisma.domainEvent.findFirst({
        where: { tenantId: t, idempotencyKey: legacyKey, eventType: identity.eventType, aggregateType: 'Invoice', aggregateId: invId },
        select: { id: true, eventType: true, aggregateType: true, aggregateId: true, payload: true },
      });
      expect(legacyRow, 'legacy 行がスカラ列で特定できる').toBeTruthy();
      expect(
        legacyRowMatchesIdentity(legacyRow!, identity),
        'payload.idem により dedupe 付き identity の legacy 照合が決定的に成立（A→B upgrade で二重化しない前提条件）',
      ).toBe(true);
      // 陰性対照: dedupe 相違 identity には一致しない（無検証収束の禁止）。
      expect(legacyRowMatchesIdentity(legacyRow!, { ...identity, dedupe: '' })).toBe(false);
    }

    const after = await chainSnapshot(t, invId, []);
    expect(after, '全面 re-fetch で増分 0').toEqual(before);
  } finally {
    await cleanupInvoice(invId);
  }
});

test('required_tests 10: Payment から Webhook 候補まで固定件数（候補算出 oracle＋陰性対照・実配送 0）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const invId = await makeIssuedInvoice(10000);
  const token = mkKey();
  const derivedId = derivePaymentRequestId(t, token);
  const subIds: string[] = [];
  try {
    // 購読 fixture 4 件（陰性対照: inactive / 無関係 eventType）。URL は example.invalid・配送は実行しない。
    const mk = (eventType: string, active: boolean) =>
      prisma.webhookSubscription.create({ data: { tenantId: t, url: 'https://example.invalid/padn-a2-ch', secret: 's', eventType, active } });
    const subActivePR = await mk('PAYMENT_RECEIVED', true);
    const subActiveStar = await mk('*', true);
    const subInactivePR = await mk('PAYMENT_RECEIVED', false);
    const subActiveDeal = await mk('DEAL_CREATED', true);
    subIds.push(subActivePR.id, subActiveStar.id, subInactivePR.id, subActiveDeal.id);

    const r = await recordInvoicePayment({ tenantId: t, userId: uid }, invId, 10000, 'bank', { idempotencyKey: token });
    expect(r.ok).toBe(true);
    expect(r.fullyPaid).toBe(true);

    // 連鎖の固定件数（DB re-fetch）。
    const payments = await prisma.payment.findMany({ where: { invoiceId: invId }, select: { id: true } });
    expect(payments.length, 'Payment 1件').toBe(1);
    expect(payments[0]!.id, 'Payment.id = derived ID').toBe(derivedId);
    expect(await prisma.financeEvent.count({ where: { tenantId: t, sourceId: invId, type: 'payment_received', status: 'posted' } }), 'FinanceEvent posted 1件').toBe(1);
    expect(await prisma.auditLog.count({ where: { tenantId: t, entityId: invId, action: 'payment_record' } }), 'Audit 1件').toBe(1);
    expect(await prisma.growthEvent.count({ where: { tenantId: t, entityId: { in: [invId, derivedId] } } }), 'Growth 2件（received+collected）').toBe(2);
    const evs = await prisma.domainEvent.findMany({
      where: { tenantId: t, aggregateId: invId },
      select: { id: true, eventType: true, status: true },
    });
    expect(evs.length, 'DomainEvent 2件').toBe(2);
    expect(evs.every((e) => e.status === 'pending'), '全て pending').toBe(true);
    expect(new Set(evs.map((e) => e.eventType))).toEqual(new Set(['PAYMENT_RECEIVED', 'RECEIVABLE_COLLECTED']));
    const outbox = await prisma.outboxMessage.findMany({
      where: { tenantId: t, eventId: { in: evs.map((e) => e.id) } },
      select: { eventType: true, status: true },
    });
    expect(outbox.length, 'Outbox 2件').toBe(2);
    expect(outbox.every((m) => m.status === 'pending')).toBe(true);

    // Webhook 候補算出 oracle（processOutboxMessage の選択条件を fixture 購読 id 集合へスコープ）。
    const candidates = async (eventType: string) =>
      prisma.webhookSubscription.count({
        where: { id: { in: subIds }, tenantId: t, active: true, OR: [{ eventType }, { eventType: '*' }] },
      });
    expect(await candidates('PAYMENT_RECEIVED'), 'PAYMENT_RECEIVED 候補 = active PR + active * = 2').toBe(2);
    expect(await candidates('RECEIVABLE_COLLECTED'), "RECEIVABLE_COLLECTED 候補 = active '*' のみ = 1").toBe(1);
    // 陰性対照: inactive / 無関係 eventType 購読が候補に混入しない。
    expect(
      await prisma.webhookSubscription.count({
        where: { id: { in: [subInactivePR.id] }, tenantId: t, active: true, OR: [{ eventType: 'PAYMENT_RECEIVED' }, { eventType: '*' }] },
      }),
      'inactive 購読は候補 0',
    ).toBe(0);
    expect(
      await prisma.webhookSubscription.count({
        where: { id: { in: [subActiveDeal.id] }, tenantId: t, active: true, OR: [{ eventType: 'PAYMENT_RECEIVED' }, { eventType: 'RECEIVABLE_COLLECTED' }, { eventType: '*' }] },
      }),
      '無関係 eventType 購読は候補 0',
    ).toBe(0);
    // 実配送 0（外部送信なし）。
    expect(await prisma.webhookDelivery.count({ where: { eventId: { in: evs.map((e) => e.id) } } }), 'WebhookDelivery 0').toBe(0);
  } finally {
    if (subIds.length > 0) await prisma.webhookSubscription.deleteMany({ where: { id: { in: subIds } } });
    await cleanupInvoice(invId);
  }
});
