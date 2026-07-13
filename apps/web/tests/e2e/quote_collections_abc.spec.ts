import { test, expect, type Page } from '@playwright/test';
import { prisma } from '@hokko/db';

// P3-Q2C A/B/C の実 UI E2E。
// A 領収書: PAID 請求から発行→バッジ＋印刷・冪等・STAFF 遮断。B 売掛エイジング: バケット表示・STAFF 遮断。
// C 督促多段: 段数バッジ表示。外部送信・実支払・課金・実 LLM は一切なし。

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

// 領収書未発行の PAID 請求書 fixture。
async function makePaidInvoice(): Promise<{ id: string; total: number }> {
  const t = await tenantId();
  const total = 132000;
  const inv = await prisma.invoice.create({
    data: {
      tenantId: t, number: `INV-E2E-A-${Date.now()}`, status: 'PAID', issueDate: new Date(), dueDate: new Date(),
      subtotal: 120000, taxAmount: 12000, total, paidAmount: total,
      lineItems: { create: [{ tenantId: t, name: 'サービス一式', quantity: 1, unitPrice: 120000, amount: 120000 }] },
    },
  });
  return { id: inv.id, total };
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('A 領収書: PAID 請求から発行→バッジ＋印刷、冪等（再訪でボタンなし）、印刷に領収金額', async ({ page }) => {
  const inv = await makePaidInvoice();
  try {
    await login(page, 'ceo@ikezaki.local');
    await page.goto(`/invoices/${inv.id}`);
    const btn = page.getByTestId('invoice-issue-receipt');
    await expect(btn).toBeVisible();
    await btn.click();
    await page.waitForURL(new RegExp(`/invoices/${inv.id}\\?receipt=issued`));
    await expect(page.getByTestId('invoice-receipt')).toBeVisible();
    await expect(page.getByTestId('invoice-issue-receipt')).toHaveCount(0); // 冪等: 発行後はボタンなし

    // 印刷ページに領収金額（税込）。
    const printLink = page.getByTestId('invoice-receipt-print');
    const href = await printLink.getAttribute('href');
    await page.goto(href!);
    await expect(page.getByRole('heading', { name: '領 収 書' })).toBeVisible();
    await expect(page.getByTestId('receipt-amount')).toContainText('132,000');

    // DB 実測: 領収書はちょうど1件。
    expect(await prisma.receipt.count({ where: { invoiceId: inv.id } })).toBe(1);
  } finally {
    await prisma.receipt.deleteMany({ where: { invoiceId: inv.id } });
    await prisma.invoiceLineItem.deleteMany({ where: { invoiceId: inv.id } });
    await prisma.invoice.deleteMany({ where: { id: inv.id } });
  }
});

test('A 領収書: STAFF（finance:read なし）は領収書カード・発行ボタンが出ない', async ({ page }) => {
  const inv = await makePaidInvoice();
  try {
    await login(page, 'sales@ikezaki.local');
    await page.goto(`/invoices/${inv.id}`);
    // STAFF は請求詳細自体が財務 ABAC で遮断される（発行ボタンは当然出ない）。
    await expect(page.getByTestId('invoice-issue-receipt')).toHaveCount(0);
    expect(await prisma.receipt.count({ where: { invoiceId: inv.id } })).toBe(0);
  } finally {
    await prisma.invoiceLineItem.deleteMany({ where: { invoiceId: inv.id } });
    await prisma.invoice.deleteMany({ where: { id: inv.id } });
  }
});

test('B 売掛エイジング: ceo はバケット・未回収合計を閲覧できる', async ({ page }) => {
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/finance/receivables');
  await expect(page.getByRole('heading', { name: /売掛エイジング/ })).toBeVisible();
  await expect(page.getByTestId('aging-total')).toBeVisible();
  // 5 バケットのタイルが揃う。
  for (const key of ['current', 'd1_30', 'd31_60', 'd61_90', 'd90plus']) {
    await expect(page.getByTestId(`aging-bucket-${key}`)).toBeVisible();
  }
});

test('B 売掛エイジング: STAFF（finance:read なし）はデータ取得前に遮断', async ({ page }) => {
  await login(page, 'sales@ikezaki.local');
  await page.goto('/finance/receivables');
  await expect(page.getByText('この情報の閲覧は許可されていません').first()).toBeVisible();
  await expect(page.getByTestId('aging-total')).toHaveCount(0);
});

test('C 督促多段: 延滞請求の督促カードに段数バッジが表示される', async ({ page }) => {
  const t = await tenantId();
  const overdue = await prisma.invoice.findFirst({ where: { tenantId: t, number: 'INV-2026-202' }, select: { id: true } });
  test.skip(!overdue, 'seed の延滞請求が見つからない');
  await login(page, 'ceo@ikezaki.local');
  await page.goto(`/invoices/${overdue!.id}#dunning`);
  await expect(page.getByTestId('dunning-stage')).toBeVisible();
  await expect(page.getByTestId('dunning-stage')).toContainText('第1段');
});
