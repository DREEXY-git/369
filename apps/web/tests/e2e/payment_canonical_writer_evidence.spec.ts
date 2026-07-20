import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { prisma } from '@hokko/db';
import {
  makeCanonicalIdempotencyKey,
  makeLegacyIdempotencyKey,
  readIdemMetadata,
  derivePaymentRequestId,
  classifyIdempotencyKey,
} from '@hokko/shared';
import { emitDomainEvent } from '../../lib/events';
import { recordInvoicePayment } from '../../lib/domains/finance/payments';

// 369-PADN-V5 Phase B（条件4）: canonical writer 切替の実 PostgreSQL 証拠。
//  (a) 切替後の新規 DomainEvent 行は idempotencyKey===makeCanonicalIdempotencyKey(identity) かつ
//      payload.idem.enc==='canonical'（event 経路・payment 経路の双方で実測）。
//  (b) ★cross-flip 境界（writer 切替をまたぐ二重化ゼロの本命 oracle）: pre-B 相当の legacy-key 行を
//      fixture 直接作成 → 切替後 writer で同一 identity を emit → canonical-first miss →
//      検証付き legacy fallback（payload.idem / legacyRowMatchesIdentity）で hit → converge。
//      DomainEvent/Outbox の増分 0（切替前後の行が同一論理イベントとして収束し二重化しない）。
// reader（findExistingByIdentity）と lockMaterial は不変のため、pre-B legacy 行の照合・advisory barrier・
// legacy 衝突の fail-closed はすべて維持される。外部送信・Webhook 配送・実 LLM は一切なし。

const mkKey = () => `c${randomUUID().replace(/-/g, '').slice(0, 24)}`;

// event 経路試験は seed 非依存の専用 tenant 文字列で隔離（DomainEvent.tenantId はスカラ・FK なし）。
const T = 'tenant-padn-phaseb-canonical';

async function seedTenantId(): Promise<string> {
  const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { tenantId: true } });
  return ceo!.tenantId;
}
async function ceoUserId(): Promise<string> {
  const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { id: true } });
  return ceo!.id;
}
async function makeIssuedInvoice(total: number): Promise<string> {
  const t = await seedTenantId();
  const inv = await prisma.invoice.create({
    data: {
      tenantId: t, number: `INV-PBCW-${process.pid}-${Date.now()}-${Math.floor(performance.now())}`.slice(0, 40), status: 'ISSUED', issueDate: new Date(), dueDate: new Date(),
      subtotal: total, taxAmount: 0, total, paidAmount: 0,
      receivable: { create: { tenantId: t, amount: total, dueDate: new Date(), status: 'open' } },
    },
  });
  return inv.id;
}
async function cleanupByEventIds(tenant: string, eventIds: string[]): Promise<void> {
  if (eventIds.length === 0) return;
  await prisma.outboxMessage.deleteMany({ where: { tenantId: tenant, eventId: { in: eventIds } } });
  await prisma.domainEvent.deleteMany({ where: { tenantId: tenant, id: { in: eventIds } } });
}
async function cleanupInvoice(id: string) {
  const t = await seedTenantId();
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

test('(a-event) 切替後の新規 emit 行は canonical key＋payload.idem.enc="canonical"（event 経路）', async () => {
  const identity = {
    tenantId: T,
    eventType: 'CUSTOMER_CREATED' as const,
    aggregateId: `agg-cw-${process.pid}-${Date.now()}`,
    dedupe: `d-${randomUUID().slice(0, 8)}`,
  };
  const created: string[] = [];
  try {
    const r = await emitDomainEvent({ ...identity, aggregateType: 'Customer' });
    created.push(r.eventId);
    expect(r.duplicated, '新規作成（既存なし）').toBe(false);

    const row = await prisma.domainEvent.findUnique({
      where: { id: r.eventId },
      select: { idempotencyKey: true, payload: true },
    });
    // 保存キーは canonical（identity→key 単射）。
    expect(row!.idempotencyKey, '保存 key は canonical').toBe(makeCanonicalIdempotencyKey(identity));
    expect(row!.idempotencyKey).not.toBe(makeLegacyIdempotencyKey(identity));
    expect(classifyIdempotencyKey(row!.idempotencyKey), 'classify=canonical').toBe('canonical');
    // 返却キーも canonical（新規行の保存キーと一致）。
    expect(r.idempotencyKey, 'EmitResult.idempotencyKey も canonical').toBe(makeCanonicalIdempotencyKey(identity));
    // payload.idem は enc='canonical' を刻む。
    expect(readIdemMetadata(row!.payload)).toEqual({ dedupe: identity.dedupe });
    expect((row!.payload as { idem?: { enc?: string } }).idem?.enc, 'enc=canonical').toBe('canonical');
  } finally {
    await cleanupByEventIds(T, created);
  }
});

test('(a-payment) 切替後の入金フローが書く PAYMENT_RECEIVED 行も canonical key＋enc="canonical"（Payment.id=derived）', async () => {
  const t = await seedTenantId();
  const uid = await ceoUserId();
  const invId = await makeIssuedInvoice(100000);
  const token = mkKey();
  try {
    const r = await recordInvoicePayment({ tenantId: t, userId: uid }, invId, 4000, 'bank', { idempotencyKey: token });
    expect(r.ok).toBe(true);
    const identity = { tenantId: t, eventType: 'PAYMENT_RECEIVED' as const, aggregateId: invId, dedupe: token };
    const row = await prisma.domainEvent.findFirst({
      where: { tenantId: t, aggregateId: invId, eventType: 'PAYMENT_RECEIVED' },
      select: { idempotencyKey: true, payload: true },
    });
    expect(row, 'PAYMENT_RECEIVED 行が作成される').toBeTruthy();
    expect(row!.idempotencyKey, '入金フローの保存 key も canonical').toBe(makeCanonicalIdempotencyKey(identity));
    expect(classifyIdempotencyKey(row!.idempotencyKey)).toBe('canonical');
    expect((row!.payload as { idem?: { enc?: string } }).idem?.enc, 'enc=canonical').toBe('canonical');
    expect(readIdemMetadata(row!.payload)).toEqual({ dedupe: token });
    // Payment.id は server-derived 単射 ID（ID-1・raw key を PK にしない）。
    expect(await prisma.payment.count({ where: { id: derivePaymentRequestId(t, token), tenantId: t, invoiceId: invId } })).toBe(1);
  } finally {
    await cleanupInvoice(invId);
  }
});

test('(b) cross-flip 境界: pre-B legacy-key 行 → 切替後 emit → canonical-first miss → 検証付き legacy fallback で converge・DomainEvent/Outbox 増分 0', async () => {
  // pre-B（legacy writer 時代）に保存された行を fixture として**直接**作成する: legacy キー＋payload.idem.enc='legacy'。
  const identity = {
    tenantId: T,
    eventType: 'PAYMENT_RECEIVED' as const,
    aggregateId: `agg-flip-${process.pid}-${Date.now()}`,
    dedupe: `c${randomUUID().replace(/-/g, '').slice(0, 24)}`,
  };
  const legacyKey = makeLegacyIdempotencyKey(identity);
  const canonicalKey = makeCanonicalIdempotencyKey(identity);
  expect(legacyKey, 'fixture は legacy 形式').not.toBe(canonicalKey);
  expect(classifyIdempotencyKey(legacyKey)).toBe('legacy');
  const created: string[] = [];
  try {
    const legacyRow = await prisma.domainEvent.create({
      data: {
        tenantId: T, eventType: 'PAYMENT_RECEIVED', aggregateType: 'Invoice', aggregateId: identity.aggregateId, actorType: 'user',
        payload: { idem: { aggregateType: 'Invoice', aggregateId: identity.aggregateId, dedupe: identity.dedupe, enc: 'legacy', v: 1 } },
        idempotencyKey: legacyKey, status: 'pending',
      },
    });
    created.push(legacyRow.id);
    await prisma.outboxMessage.create({
      data: { tenantId: T, eventId: legacyRow.id, eventType: 'PAYMENT_RECEIVED', status: 'pending' },
    });

    // canonical-first exact は miss（legacy fixture は canonical キーを占有していない）ことを直接確認。
    expect(
      await prisma.domainEvent.findUnique({ where: { tenantId_idempotencyKey: { tenantId: T, idempotencyKey: canonicalKey } }, select: { id: true } }),
      '切替直後 canonical exact は miss（pre-B 行は legacy キー）',
    ).toBeNull();

    // 切替後 writer で同一 identity を 2 回 emit → 検証付き legacy fallback で pre-B 行へ収束（新規 canonical 行を作らない）。
    for (let i = 0; i < 2; i++) {
      const r = await emitDomainEvent({ ...identity, aggregateType: 'Invoice' });
      if (!created.includes(r.eventId)) created.push(r.eventId);
      expect(r.duplicated, `${i + 1}回目の emit は pre-B legacy 行へ収束（cross-flip 二重化ゼロ）`).toBe(true);
      expect(r.eventId, '同一 eventId へ収束').toBe(legacyRow.id);
    }

    // 物的証拠: DomainEvent は legacy fixture 1 件のまま・Outbox も 1 件のまま（増分 0）。
    expect(await prisma.domainEvent.count({ where: { tenantId: T, aggregateId: identity.aggregateId } }), 'DomainEvent 増分 0').toBe(1);
    expect(await prisma.outboxMessage.count({ where: { tenantId: T, eventId: legacyRow.id } }), 'Outbox 増分 0').toBe(1);
    // canonical キーの行は作られていない（切替後も legacy fixture を二重化しない）。
    expect(
      await prisma.domainEvent.findUnique({ where: { tenantId_idempotencyKey: { tenantId: T, idempotencyKey: canonicalKey } }, select: { id: true } }),
      '収束後も canonical 行は新設されない',
    ).toBeNull();
    // pre-B 行は byte 不変（reader は既存行に触らない）。
    const after = await prisma.domainEvent.findUnique({ where: { id: legacyRow.id }, select: { idempotencyKey: true } });
    expect(after!.idempotencyKey, 'pre-B 行の key は legacy のまま不変').toBe(legacyKey);
  } finally {
    await cleanupByEventIds(T, created);
  }
});
