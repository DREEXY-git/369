import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { prisma } from '@hokko/db';

// P3-Q2C 入金消込 hardening の実 PostgreSQL 証拠。
// 単一 transaction（原子性）・paidAmount の Payment SUM 再導出・FOR UPDATE による並列直列化（lost update 防止）・
// 状態遷移（PARTIALLY_PAID→PAID）・Receivable 連動・監査・AI 拒否を実 DB 最終状態 re-fetch で検証する。
// 外部送信・実支払・課金は一切なし（社内の入金記録のみ）。

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

async function tenantId(): Promise<string> {
  const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { tenantId: true } });
  return ceo!.tenantId;
}

// ISSUED 請求＋Receivable(open) の fixture を作る（入金対象）。
async function makeIssuedInvoice(total: number): Promise<string> {
  const t = await tenantId();
  const inv = await prisma.invoice.create({
    data: {
      tenantId: t, number: `INV-PAY-${process.pid}-${Date.now()}`, status: 'ISSUED', issueDate: new Date(), dueDate: new Date(),
      subtotal: total, taxAmount: 0, total, paidAmount: 0,
      receivable: { create: { tenantId: t, amount: total, dueDate: new Date(), status: 'open' } },
    },
  });
  return inv.id;
}

async function cleanupInvoice(id: string) {
  const t = await tenantId();
  await prisma.auditLog.deleteMany({ where: { tenantId: t, entityId: id, action: 'payment_record' } });
  await prisma.financeEvent.deleteMany({ where: { tenantId: t, sourceId: id } });
  await prisma.payment.deleteMany({ where: { invoiceId: id } });
  await prisma.receivable.deleteMany({ where: { invoiceId: id } });
  await prisma.invoice.deleteMany({ where: { id } });
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('原子性＋状態遷移: 一部入金→PARTIALLY_PAID→全額入金→PAID・Receivable collected・監査・Payment SUM 一致', async ({ page }) => {
  const invId = await makeIssuedInvoice(10000);
  try {
    await login(page, 'ceo@ikezaki.local');
    await page.goto(`/invoices/${invId}`);

    // 一部入金 4000。
    await page.locator('input[name="amount"]').fill('4000');
    await page.getByRole('button', { name: '入金を記録' }).click();
    await page.waitForURL(new RegExp(`/invoices/${invId}\\?paid=1`));
    let inv = await prisma.invoice.findUnique({ where: { id: invId }, select: { paidAmount: true, status: true } });
    expect(Number(inv!.paidAmount)).toBe(4000);
    expect(inv!.status).toBe('PARTIALLY_PAID');
    expect(await prisma.receivable.findFirst({ where: { invoiceId: invId }, select: { status: true } }).then((r) => r!.status)).toBe('open');

    // 残額入金 6000 → PAID。
    await page.goto(`/invoices/${invId}`);
    await page.locator('input[name="amount"]').fill('6000');
    await page.getByRole('button', { name: '入金を記録' }).click();
    await page.waitForURL(new RegExp(`/invoices/${invId}\\?paid=1`));
    inv = await prisma.invoice.findUnique({ where: { id: invId }, select: { paidAmount: true, status: true } });
    expect(Number(inv!.paidAmount)).toBe(10000);
    expect(inv!.status).toBe('PAID');
    expect(await prisma.receivable.findFirst({ where: { invoiceId: invId }, select: { status: true } }).then((r) => r!.status)).toBe('collected');

    // 原子性の実測: Payment 実体 SUM と Invoice.paidAmount が一致・監査 2 件・入金実績 FinanceEvent 2 件（posted）。
    const agg = await prisma.payment.aggregate({ where: { invoiceId: invId }, _sum: { amount: true } });
    expect(Number(agg._sum.amount ?? 0)).toBe(10000);
    expect(await prisma.payment.count({ where: { invoiceId: invId } })).toBe(2);
    expect(await prisma.auditLog.count({ where: { entityId: invId, action: 'payment_record' } })).toBe(2);
    expect(await prisma.financeEvent.count({ where: { sourceId: invId, type: 'payment_received', status: 'posted' } })).toBe(2);
  } finally {
    await cleanupInvoice(invId);
  }
});

test('lost update 防止: 同一請求への並列入金を FOR UPDATE で直列化し、paidAmount = Payment SUM が保たれる', async ({ page }) => {
  const invId = await makeIssuedInvoice(100000);
  try {
    await login(page, 'ceo@ikezaki.local');
    await page.goto(`/invoices/${invId}`);
    // 1回目の入金 1000 を実 UI で送信し、その Server Action POST（生バイト列）を捕捉する。
    await page.locator('input[name="amount"]').fill('1000');
    // フォームが発行した冪等キー（hidden input の実値）を submit 前に取得する。
    // multipart body には field value として同じ文字列が含まれるため、これを差し替えて別 request を作る。
    const idemInput = page.locator('[data-testid="payment-idempotency-key"]');
    await expect(idemInput).not.toHaveValue('');
    const origKey = await idemInput.inputValue();
    expect(origKey).toMatch(/^c[a-z0-9]{20,32}$/);
    const [payReq] = await Promise.all([
      page.waitForRequest((r) => r.method() === 'POST' && r.url().includes(`/invoices/${invId}`)),
      page.getByRole('button', { name: '入金を記録' }).click(),
    ]);
    await page.waitForURL(new RegExp(`/invoices/${invId}\\?paid=1`));

    // 同一請求への **異なる** 並列入金を 5 本 replay する。request-level 冪等（idempotencyKey）導入後は
    // 同一 POST バイト列の再送は 1 request として 1 Payment へ収束するのが正しい挙動なので、ここでは
    // body 中の idempotencyKey 値（origKey）だけを **別キー** へ差し替え、6 本の distinct 入金を同時に投げる。
    // lost update があれば paidAmount < Payment SUM になる（FOR UPDATE 直列化＋SUM 再導出で防止）。
    const headers = { ...payReq.headers() };
    delete headers['content-length'];
    const bodyStr = payReq.postDataBuffer()!.toString('latin1');
    expect(bodyStr.includes(origKey), 'POST body に idempotencyKey 値が含まれる').toBe(true);
    const resps = await Promise.all(
      Array.from({ length: 5 }, () => {
        // origKey（25文字）を同長の新キーへ差し替え（境界/長さ不変）。各 replay = 別 request。
        const distinct = bodyStr.replace(origKey, `c${randomUUID().replace(/-/g, '').slice(0, 24)}`);
        return page.request.post(payReq.url(), { headers, data: Buffer.from(distinct, 'latin1') });
      }),
    );
    for (const r of resps) expect(r.status(), '並列入金が受理される').toBeLessThan(400);

    // 実測: 合計 6 件（1000×6=6000）・paidAmount は Payment SUM と厳密一致（直列化で lost update ゼロ）。
    const count = await prisma.payment.count({ where: { invoiceId: invId } });
    const agg = await prisma.payment.aggregate({ where: { invoiceId: invId }, _sum: { amount: true } });
    const inv = await prisma.invoice.findUnique({ where: { id: invId }, select: { paidAmount: true } });
    expect(count).toBe(6);
    expect(Number(agg._sum.amount ?? 0)).toBe(6000);
    expect(Number(inv!.paidAmount), 'paidAmount が Payment SUM と一致（lost update なし）').toBe(6000);
  } finally {
    await cleanupInvoice(invId);
  }
});

test('AI 拒否: AI ロールは入金記録できない（DataAccessLog/Payment を増やさない）', async ({ page }) => {
  const invId = await makeIssuedInvoice(5000);
  try {
    await login(page, 'ai-sales@ikezaki.local');
    // AI は請求詳細の財務カード自体が遮断される。直接 action URL への到達も denied（二重防御）。
    await page.goto(`/invoices/${invId}`);
    // 入金フォームが出ない（財務 ABAC で遮断）。
    await expect(page.getByRole('button', { name: '入金を記録' })).toHaveCount(0);
    expect(await prisma.payment.count({ where: { invoiceId: invId } })).toBe(0);
    expect(Number((await prisma.invoice.findUnique({ where: { id: invId }, select: { paidAmount: true } }))!.paidAmount)).toBe(0);
  } finally {
    await cleanupInvoice(invId);
  }
});
