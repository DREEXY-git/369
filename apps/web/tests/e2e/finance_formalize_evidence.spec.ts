import { test, expect, type Page } from '@playwright/test';
import { prisma } from '@hokko/db';

// P3-Q2C/会計 formalize hardening の実 PostgreSQL 証拠。
// 候補→正式化（finalizeJournalCandidate / finalizeInvoiceCandidate）の単一 transaction 原子性・
// 候補 status CAS による二重確定防止を、実 UI の承認実行フロー越しに実 DB 最終状態で検証する。
// 承認判断そのものは対象外のため DB で APPROVED にし、実行（正式化）だけを UI から実コードで走らせる。
// 外部送信・実支払・課金は一切なし。

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

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('仕訳確定: 申請→承認→正式仕訳化で JournalEntry(2行)・候補posted・監査が原子的に作られ、二重実行しても1件', async ({ page }) => {
  const t = await tenantId();
  const desc = `formalize-jc-e2e ${process.pid}-${Date.now()}`;
  const jc = await prisma.journalCandidate.create({
    data: { tenantId: t, sourceType: 'finance_bridge', debitAccount: '現金', creditAccount: '売上高', amount: 55000, description: desc, status: 'draft' },
  });
  let entryId: string | null = null;
  try {
    await login(page, 'ceo@ikezaki.local');
    await page.goto('/finance/journal-candidates');
    const row = page.locator('tr').filter({ hasText: desc });
    await expect(row).toHaveCount(1);
    // 確定申請 → ApprovalRequest(PENDING)。
    await row.getByRole('button', { name: '確定申請' }).click();
    await page.waitForURL(/journal-candidates\?requested=1/);

    // 人間承認は対象外のため DB で APPROVED にする（実行＝正式化コードを次で実 UI から走らせる）。
    const appr = await prisma.approvalRequest.findFirst({ where: { tenantId: t, requestedForAction: 'journal_finalize', entityId: jc.id }, orderBy: { createdAt: 'desc' } });
    expect(appr, '確定申請で ApprovalRequest が作られる').not.toBeNull();
    await prisma.approvalRequest.update({ where: { id: appr!.id }, data: { status: 'APPROVED' } });

    // 正式仕訳化（executeApprovedJournalFinalizeAction → finalizeJournalCandidate）。実行 POST を捕捉して
    // 後の二重実行 replay に使う。
    await page.goto('/finance/journal-candidates');
    const row2 = page.locator('tr').filter({ hasText: desc });
    const [execReq] = await Promise.all([
      page.waitForRequest((r) => r.method() === 'POST' && r.url().includes('/finance/journal-candidates')),
      row2.getByRole('button', { name: '正式仕訳化' }).click(),
    ]);
    await page.waitForURL(/journal-candidates\?posted=1/);

    // 原子性: 候補 posted＋journalEntryId、JournalEntry 1件＋明細2行（借貸）、監査 journal_finalize 1件。
    const posted = await prisma.journalCandidate.findUnique({ where: { id: jc.id }, select: { status: true, journalEntryId: true } });
    expect(posted!.status).toBe('posted');
    expect(posted!.journalEntryId).toBeTruthy();
    entryId = posted!.journalEntryId;
    expect(await prisma.journalEntry.count({ where: { id: entryId! } })).toBe(1);
    expect(await prisma.journalEntryLine.count({ where: { entryId: entryId! } })).toBe(2);
    expect(await prisma.auditLog.count({ where: { tenantId: t, entityId: entryId!, action: 'journal_finalize' } })).toBe(1);

    // 二重実行防止: 同一実行 POST（同一承認）を replay しても JournalEntry は増えない
    // （承認 CAS executedAt ＋ 候補 status CAS の二重防御）。
    const headers = { ...execReq.headers() };
    delete headers['content-length'];
    const replay = await page.request.post(execReq.url(), { headers, data: execReq.postDataBuffer()! });
    expect(replay.status(), '再実行は HTTP 的には受理（アプリ層で冪等）').toBeLessThan(500);
    expect(await prisma.journalEntry.count({ where: { id: entryId! } }), '二重実行しても JournalEntry は増えない').toBe(1);
    expect(await prisma.auditLog.count({ where: { tenantId: t, entityId: entryId!, action: 'journal_finalize' } }), '監査も増えない').toBe(1);
  } finally {
    if (entryId) {
      await prisma.auditLog.deleteMany({ where: { tenantId: t, entityId: entryId } });
      await prisma.journalEntryLine.deleteMany({ where: { entryId } });
      await prisma.journalEntry.deleteMany({ where: { id: entryId } });
    }
    const apprs = await prisma.approvalRequest.findMany({ where: { tenantId: t, requestedForAction: 'journal_finalize', entityId: jc.id }, select: { id: true } });
    await prisma.auditLog.deleteMany({ where: { entityId: { in: apprs.map((a) => a.id) } } });
    await prisma.approvalRequest.deleteMany({ where: { id: { in: apprs.map((a) => a.id) } } });
    await prisma.journalCandidate.deleteMany({ where: { id: jc.id } });
  }
});

test('請求確定: 申請→承認→正式請求書化で Invoice＋Receivable＋候補sent＋監査が原子的に作られる', async ({ page }) => {
  const t = await tenantId();
  const title = `formalize-ic-e2e ${process.pid}-${Date.now()}`;
  const ic = await prisma.invoiceCandidate.create({
    data: { tenantId: t, sourceType: 'finance_bridge', title, subtotal: 80000, taxAmount: 8000, total: 88000, dueAt: new Date(Date.now() + 30 * 86400000), status: 'draft' },
  });
  let invoiceId: string | null = null;
  try {
    await login(page, 'ceo@ikezaki.local');
    await page.goto('/finance/invoice-candidates');
    const row = page.locator('tr').filter({ hasText: title });
    await expect(row).toHaveCount(1);
    await row.getByRole('button', { name: '送信申請' }).click();
    await page.waitForURL(/invoice-candidates\?requested=1/);

    const appr = await prisma.approvalRequest.findFirst({ where: { tenantId: t, entityType: 'InvoiceCandidate', entityId: ic.id }, orderBy: { createdAt: 'desc' } });
    expect(appr).not.toBeNull();
    await prisma.approvalRequest.update({ where: { id: appr!.id }, data: { status: 'APPROVED' } });

    await page.goto('/finance/invoice-candidates');
    const row2 = page.locator('tr').filter({ hasText: title });
    await row2.getByRole('button', { name: '正式請求書化' }).click();
    await page.waitForURL(/invoice-candidates\?formalized=1/);

    const sent = await prisma.invoiceCandidate.findUnique({ where: { id: ic.id }, select: { status: true, invoiceId: true } });
    expect(sent!.status).toBe('sent');
    expect(sent!.invoiceId).toBeTruthy();
    invoiceId = sent!.invoiceId;
    // 原子性: Invoice(ISSUED)＋lineItem＋Receivable(open)＋監査 invoice_finalize が揃う。
    const inv = await prisma.invoice.findUnique({ where: { id: invoiceId! }, select: { status: true, total: true } });
    expect(inv!.status).toBe('ISSUED');
    expect(Number(inv!.total)).toBe(88000);
    expect(await prisma.invoiceLineItem.count({ where: { invoiceId: invoiceId! } })).toBe(1);
    expect(await prisma.receivable.count({ where: { invoiceId: invoiceId!, status: 'open' } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { tenantId: t, entityId: invoiceId!, action: 'invoice_finalize' } })).toBe(1);
  } finally {
    if (invoiceId) {
      await prisma.auditLog.deleteMany({ where: { tenantId: t, entityId: invoiceId } });
      await prisma.receivable.deleteMany({ where: { invoiceId } });
      await prisma.invoiceLineItem.deleteMany({ where: { invoiceId } });
      await prisma.invoice.deleteMany({ where: { id: invoiceId } });
    }
    const apprs = await prisma.approvalRequest.findMany({ where: { tenantId: t, entityType: 'InvoiceCandidate', entityId: ic.id }, select: { id: true } });
    await prisma.auditLog.deleteMany({ where: { entityId: { in: apprs.map((a) => a.id) } } });
    await prisma.approvalRequest.deleteMany({ where: { id: { in: apprs.map((a) => a.id) } } });
    await prisma.invoiceCandidate.deleteMany({ where: { id: ic.id } });
  }
});
