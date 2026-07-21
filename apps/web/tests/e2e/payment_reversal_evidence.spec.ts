import { test, expect, type Page } from '@playwright/test';
import { prisma } from '@hokko/db';

// Wave2 入金取消（payment reversal・承認必須）の実 PostgreSQL 証拠。
// 誤記録の入金を申請→人間承認で取り消す。承認で対象 Payment を削除し、paidAmount を残り Payment の
// SUM から再導出、Invoice/Receivable ステータスを巻き戻し、相殺の FinanceEvent（outflow・posted）と
// 監査を単一 transaction＋FOR UPDATE で確定する。AI は申請も決定も不可。
// 外部送信・課金・実 LLM なし。

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

test('入金取消: 誤記録の入金を申請→承認で Payment 削除・paidAmount/売掛 巻き戻し・相殺 FinanceEvent', async ({ page }) => {
  const t = await tenantId();
  const stamp = `${process.pid}-${Date.now()}`;
  // 全額入金済み（PAID）の請求書＋Payment＋collected 売掛を用意（＝誤って全額入金を記録した状態）。
  const invoice = await prisma.invoice.create({
    data: { tenantId: t, number: `INV-REV-${stamp}`, status: 'PAID', total: 5000, paidAmount: 5000, issueDate: new Date() },
  });
  const payment = await prisma.payment.create({ data: { tenantId: t, invoiceId: invoice.id, amount: 5000, method: 'bank' } });
  await prisma.receivable.create({ data: { tenantId: t, invoiceId: invoice.id, amount: 5000, status: 'collected' } });
  try {
    await login(page, 'ceo@ikezaki.local');

    // ① 入金取消を申請（実 UI）。
    await page.goto(`/invoices/${invoice.id}`);
    await Promise.all([
      page.waitForURL(/reversal_requested=1/),
      page.getByTestId(`payment-reversal-request-${payment.id}`).click(),
    ]);
    const approval = await prisma.approvalRequest.findFirst({
      where: { tenantId: t, type: 'payment_reversal', entityId: invoice.id, status: 'PENDING' },
      select: { id: true },
    });
    expect(approval, '入金取消の承認申請が作成される（PENDING）').not.toBeNull();

    // ② /approvals で人間が承認。
    await page.goto('/approvals');
    const field = page.locator(`input[name="approvalId"][value="${approval!.id}"]`);
    await expect(field, '承認待ちに入金取消が表示される').toHaveCount(1);
    await page.locator('form').filter({ has: field }).getByRole('button', { name: '承認' }).click();
    await expect(field, '承認後は一覧から消える').toHaveCount(0, { timeout: 15000 });

    // ③ 実測: Payment 削除・paidAmount=0・Invoice=ISSUED・Receivable=open・相殺 FinanceEvent・承認 APPROVED。
    const paymentGone = await prisma.payment.findUnique({ where: { id: payment.id } });
    const finalInv = await prisma.invoice.findUnique({ where: { id: invoice.id }, select: { status: true, paidAmount: true } });
    const finalRcv = await prisma.receivable.findUnique({ where: { invoiceId: invoice.id }, select: { status: true } });
    const reversalFe = await prisma.financeEvent.findFirst({ where: { tenantId: t, sourceId: invoice.id, type: 'payment_reversal' } });
    const finalAppr = await prisma.approvalRequest.findUnique({ where: { id: approval!.id }, select: { status: true } });
    expect(paymentGone, '対象入金は取消（削除）済み').toBeNull();
    expect(Number(finalInv!.paidAmount), '入金額は 0 に巻き戻る').toBe(0);
    expect(finalInv!.status, 'Invoice は ISSUED（発行済み未入金）に戻る').toBe('ISSUED');
    expect(finalRcv!.status, '売掛は open に戻る').toBe('open');
    expect(reversalFe, '相殺の FinanceEvent（payment_reversal）が作られる').not.toBeNull();
    expect(reversalFe!.direction, '相殺は outflow').toBe('outflow');
    expect(Number(reversalFe!.amount), '相殺額は取消額と一致').toBe(5000);
    expect(finalAppr!.status, '承認は APPROVED').toBe('APPROVED');

    const audit = await prisma.auditLog.findFirst({ where: { tenantId: t, entityType: 'Invoice', entityId: invoice.id, action: 'payment_reversal' } });
    expect(audit, '入金取消の監査が記録される').not.toBeNull();
  } finally {
    await prisma.auditLog.deleteMany({ where: { tenantId: t, entityType: 'Invoice', entityId: invoice.id } });
    await prisma.approvalRequest.deleteMany({ where: { tenantId: t, entityId: invoice.id, type: 'payment_reversal' } });
    await prisma.financeEvent.deleteMany({ where: { tenantId: t, sourceId: invoice.id } });
    await prisma.receivable.deleteMany({ where: { invoiceId: invoice.id } });
    await prisma.payment.deleteMany({ where: { invoiceId: invoice.id } });
    await prisma.invoice.deleteMany({ where: { id: invoice.id } });
  }
});
