import { test, expect, type Page } from '@playwright/test';
import { prisma } from '@hokko/db';

// Wave2 請求書VOID（未入金の誤発行の無効化・承認必須）の実 PostgreSQL 証拠。
// 申請（requestInvoiceVoidApprovalAction）→ 人間承認（decideApprovalAction の invoice_void 分岐）で、
// Invoice→VOID・Receivable→void・未実績の入金予定 FinanceEvent→ignored・監査 を単一 transaction で確定する。
// AI は申請も決定も不可（action 境界＋core の二重防御）。外部送信・課金・削除・実 LLM なし。

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

test('請求書VOID: 未入金の誤発行を申請→承認で Invoice/売掛/入金予定 が一括で無効化される', async ({ page }) => {
  const t = await tenantId();
  const stamp = `${process.pid}-${Date.now()}`;
  // 未入金（paidAmount=0）の ISSUED 請求書＋open 売掛＋未実績の入金予定 FinanceEvent を用意。
  const invoice = await prisma.invoice.create({
    data: { tenantId: t, number: `INV-VOID-${stamp}`, status: 'ISSUED', total: 5000, paidAmount: 0, issueDate: new Date() },
  });
  await prisma.receivable.create({ data: { tenantId: t, invoiceId: invoice.id, amount: 5000, status: 'open' } });
  const fe = await prisma.financeEvent.create({
    data: { tenantId: t, type: 'payment_expected', sourceType: 'Invoice', sourceId: invoice.id, direction: 'inflow', amount: 5000, status: 'approved', description: `入金予定: ${invoice.number}` },
  });
  try {
    await login(page, 'ceo@ikezaki.local');

    // ① 無効化を申請（実 UI）。
    await page.goto(`/invoices/${invoice.id}`);
    await Promise.all([
      page.waitForURL(/void_requested=1/),
      page.getByTestId('invoice-void-request').click(),
    ]);
    const approval = await prisma.approvalRequest.findFirst({
      where: { tenantId: t, type: 'invoice_void', entityId: invoice.id, status: 'PENDING' },
      select: { id: true },
    });
    expect(approval, 'VOID承認申請が作成される（PENDING）').not.toBeNull();

    // ② /approvals で人間が承認（該当申請のフォームにスコープ）。
    await page.goto('/approvals');
    const approvalField = page.locator(`input[name="approvalId"][value="${approval!.id}"]`);
    await expect(approvalField, '承認待ちに VOID 申請が表示される').toHaveCount(1);
    const form = page.locator('form').filter({ has: approvalField });
    await form.getByRole('button', { name: '承認' }).click();
    // 承認後の再描画で当該申請が一覧から消える（＝決定が確定した）ことを待つ。
    await expect(approvalField, '承認後は一覧から消える').toHaveCount(0, { timeout: 15000 });

    // ③ 実測: Invoice=VOID・Receivable=void・入金予定 FinanceEvent=ignored・承認=APPROVED。
    const finalInv = await prisma.invoice.findUnique({ where: { id: invoice.id }, select: { status: true, paidAmount: true } });
    const finalRcv = await prisma.receivable.findUnique({ where: { invoiceId: invoice.id }, select: { status: true } });
    const finalFe = await prisma.financeEvent.findUnique({ where: { id: fe.id }, select: { status: true } });
    const finalAppr = await prisma.approvalRequest.findUnique({ where: { id: approval!.id }, select: { status: true } });
    expect(finalInv!.status, 'Invoice は VOID').toBe('VOID');
    expect(Number(finalInv!.paidAmount), '入金額は 0 のまま').toBe(0);
    expect(finalRcv!.status, '売掛は void').toBe('void');
    expect(finalFe!.status, '入金予定 FinanceEvent は ignored').toBe('ignored');
    expect(finalAppr!.status, '承認は APPROVED').toBe('APPROVED');

    // 監査（invoice_void）が記録されている。
    const audit = await prisma.auditLog.findFirst({ where: { tenantId: t, entityType: 'Invoice', entityId: invoice.id, action: 'invoice_void' } });
    expect(audit, '無効化の監査が記録される').not.toBeNull();
  } finally {
    await prisma.auditLog.deleteMany({ where: { tenantId: t, entityType: 'Invoice', entityId: invoice.id } });
    await prisma.approvalRequest.deleteMany({ where: { tenantId: t, entityId: invoice.id, type: 'invoice_void' } });
    await prisma.financeEvent.deleteMany({ where: { tenantId: t, sourceId: invoice.id } });
    await prisma.receivable.deleteMany({ where: { invoiceId: invoice.id } });
    await prisma.invoice.deleteMany({ where: { id: invoice.id } });
  }
});
