import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { prisma, PrismaClient } from '@hokko/db';
import { recordInvoicePayment } from '../../lib/domains/finance/payments';

// 369-PADN-V5 Phase B（canonical writer 切替ブランチ）: 入金の VOID race 決定論試験の実 PostgreSQL 証拠。
// PR #57（cda7188）の payment_void_race_evidence を現 main の recordInvoicePayment API
//（opts.idempotencyKey 必須・Payment.id=derivePaymentRequestId・raw key を PK にしない）へ適合して移植。
// recordInvoicePayment は入金可否（VOID/DRAFT）を「ロック前の findFirst」で先読みするため、findFirst と
// FOR UPDATE 取得の間に確定した VOID を検出できないと、無効化済み請求書を入金で PAID/PARTIALLY_PAID へ
// 「復活」させ得る。修正実装は FOR UPDATE でロックした行の status を tx 内で再読込し、VOID/DRAFT なら
// 全 rollback する。本 spec は「ロック前は ISSUED・ロック取得時には VOID」を、別トランザクションで
// ロックを保持しつつ未コミット VOID を作ることで決定論的に再現する（pg_blocking_pids の観測ゲート方式・
// タイマー非依存・retries=0）。外部送信・実支払・課金は一切なし（社内の入金記録のみ）。

// request-level 冪等キー（^c[a-z0-9]{20,32}$）。入金記録は key 必須。
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
      tenantId: t, number: `INV-VRACE-${process.pid}-${Date.now()}-${Math.floor(performance.now())}`.slice(0, 40), status: 'ISSUED', issueDate: new Date(), dueDate: new Date(),
      subtotal: total, taxAmount: 0, total, paidAmount: 0,
      receivable: { create: { tenantId: t, amount: total, dueDate: new Date(), status: 'open' } },
    },
  });
  return inv.id;
}

// 作成行の ID に限定した cleanup（現 recordInvoicePayment は成立時 DomainEvent/Outbox/Growth も書くため掃除する）。
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

test('VOID race: findFirst 後・FOR UPDATE 前に確定した VOID を、ロック後再読込で検出し入金を拒否（VOID 復活なし・経路判別 oracle つき）', async () => {
  test.setTimeout(120000);
  const t = await tenantId();
  const uid = await ceoUserId();
  const invId = await makeIssuedInvoice(10000);
  // 経路判別 oracle 用の独立 monitor 接続（pg_stat_activity の観測はロックに干渉しない）。
  const monitor = new PrismaClient();
  let releaseHolder!: () => void;
  const holderGate = new Promise<void>((res) => (releaseHolder = res));
  let t1: Promise<void> | null = null;
  let payPromise: ReturnType<typeof recordInvoicePayment> | null = null;
  try {
    // T1: 対象請求を FOR UPDATE でロックし VOID にして、コミットを「入金 backend の block 観測」まで
    // ゲートする（＝承認済み VOID を再現）。保持時間はタイマーではなく観測で決まる（縮退実行を green にしない）。
    let holderReady!: (pid: number) => void;
    const ready = new Promise<number>((res) => (holderReady = res));
    t1 = prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${invId} AND "tenantId" = ${t} FOR UPDATE`;
        const pidRows = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid()::int AS pid`;
        await tx.invoice.update({ where: { id: invId }, data: { status: 'VOID' } });
        holderReady(pidRows[0]!.pid);
        await holderGate;
      },
      { timeout: 60000 },
    );
    const t1Pid = await ready;

    // T1 がロック保持中（VOID は未コミット）に入金を開始。findFirst は READ COMMITTED で必ず ISSUED を読み
    // （VOID が見えるのは commit 後のみ）、続く FOR UPDATE で T1 コミットまでブロックされる。
    payPromise = recordInvoicePayment({ tenantId: t, userId: uid }, invId, 5000, 'bank', { idempotencyKey: mkKey() });

    // 経路判別 oracle（縮退実行の封鎖）: 入金 backend が T1 の行ロックに block されたことを pg_blocking_pids で
    // 実測してから release する。T1 がロックする行は本テスト固有の invoice のみ（他テストは参照しない）ため、
    // T1 に block される backend は入金 tx に限られる。観測できない場合は本 expect が fail する。
    let blockedByHolder: Array<{ pid: number }> = [];
    for (let i = 0; i < 600 && blockedByHolder.length === 0; i++) {
      blockedByHolder = await monitor.$queryRaw<Array<{ pid: number }>>`
        SELECT pid::int AS pid FROM pg_stat_activity
        WHERE wait_event_type = 'Lock' AND pg_blocking_pids(pid) @> ARRAY[${t1Pid}]::int[]`;
      if (blockedByHolder.length === 0) await new Promise((r) => setTimeout(r, 50));
    }
    expect(
      blockedByHolder.length,
      '経路判別: 入金 backend が T1 の行ロックで block された（ロック競合経路の実行使を assert）',
    ).toBeGreaterThan(0);

    releaseHolder(); // 観測済み → T1 が VOID をコミットしロックを解放
    await t1;
    const res = await payPromise; // 入金 tx が lock 取得 → status 再読込 = VOID → 拒否

    expect(res.ok, 'VOID 済み請求への入金は拒否される').toBe(false);
    expect(res.reason).toBe('not-payable');

    // 実 DB 最終状態: Payment 0・status VOID のまま（復活なし）・paidAmount 0・入金 FinanceEvent/監査/イベント 0。
    expect(await prisma.payment.count({ where: { invoiceId: invId } }), 'Payment を作らない').toBe(0);
    const inv = await prisma.invoice.findUnique({ where: { id: invId }, select: { status: true, paidAmount: true } });
    expect(inv!.status, 'VOID が入金で PAID に復活しない').toBe('VOID');
    expect(Number(inv!.paidAmount)).toBe(0);
    expect(await prisma.financeEvent.count({ where: { sourceId: invId, type: 'payment_received' } }), '入金実績を作らない').toBe(0);
    expect(await prisma.auditLog.count({ where: { entityId: invId, action: 'payment_record' } }), '入金監査を残さない').toBe(0);
    expect(await prisma.domainEvent.count({ where: { tenantId: t, aggregateId: invId } }), '入金 DomainEvent を残さない').toBe(0);
  } finally {
    releaseHolder();
    await Promise.allSettled([t1, payPromise].filter(Boolean));
    await monitor.$disconnect();
    await cleanupInvoice(invId);
  }
});

test('逐次: 既に VOID の請求への入金は拒否され Payment を作らない（ロック前ガード回帰）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const invId = await makeIssuedInvoice(8000);
  try {
    await prisma.invoice.update({ where: { id: invId }, data: { status: 'VOID' } });
    const res = await recordInvoicePayment({ tenantId: t, userId: uid }, invId, 3000, 'bank', { idempotencyKey: mkKey() });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('not-payable');
    expect(await prisma.payment.count({ where: { invoiceId: invId } })).toBe(0);
    expect(Number((await prisma.invoice.findUnique({ where: { id: invId }, select: { paidAmount: true } }))!.paidAmount)).toBe(0);
  } finally {
    await cleanupInvoice(invId);
  }
});

test('正常系回帰: ISSUED 請求への入金は従来どおり成立（一部入金→PARTIALLY_PAID・Payment/監査/実績を残す）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const invId = await makeIssuedInvoice(10000);
  try {
    const res = await recordInvoicePayment({ tenantId: t, userId: uid }, invId, 4000, 'bank', { idempotencyKey: mkKey() });
    expect(res.ok).toBe(true);
    expect(res.fullyPaid).toBe(false);
    const inv = await prisma.invoice.findUnique({ where: { id: invId }, select: { status: true, paidAmount: true } });
    expect(inv!.status).toBe('PARTIALLY_PAID');
    expect(Number(inv!.paidAmount)).toBe(4000);
    expect(await prisma.payment.count({ where: { invoiceId: invId } })).toBe(1);
    expect(await prisma.financeEvent.count({ where: { sourceId: invId, type: 'payment_received', status: 'posted' } })).toBe(1);
  } finally {
    await cleanupInvoice(invId);
  }
});
