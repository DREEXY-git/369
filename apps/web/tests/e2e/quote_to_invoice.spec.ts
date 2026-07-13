import { test, expect, type Page } from '@playwright/test';
import { prisma } from '@hokko/db';

// P3-Q2C 見積→請求 変換の実 UI E2E（実 PostgreSQL）。
// 対象: ①quote_issue 承認で Quote が pending_approval→approved に遷移（従来の dangling half-slice の修正）、
//       ②approved 見積から DRAFT 請求書を生成し Invoice.quoteId で双方向リンク、③冪等（1見積→1請求）、
//       ④却下は変換不可、⑤権限境界（invoice:create/finance:read なし＝STAFF はボタン非表示）。
// 外部送信・実支払・課金・実 LLM は一切伴わない（生成物は DRAFT 請求書の下書き）。

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

// pending_approval の見積＋quote_issue 承認申請を実 DB に用意し、id を返す。
async function createPendingQuote(title: string) {
  const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { tenantId: true, id: true } });
  if (!ceo) throw new Error('seed ceo not found');
  const tenantId = ceo.tenantId;
  const count = await prisma.quote.count({ where: { tenantId } });
  const quote = await prisma.quote.create({
    data: {
      tenantId,
      // createdAt を過去に固定し、/quotes（createdAt desc）で本 fixture が先頭に来ないようにする
      // ＝ 他 spec の「先頭 Q- リンクをクリック」（quotes_boundary 等）と衝突しない（test 分離）。
      createdAt: new Date('2020-01-01T00:00:00Z'),
      number: `Q-E2E-${Date.now()}-${count}`,
      title,
      status: 'pending_approval',
      subtotal: 100000,
      cost: 65000,
      discountRate: 20,
      taxRate: 10,
      total: 88000, // 値引き20%後 80000 + 税10% 8000
      grossMargin: 15000,
      grossMarginRate: 18.75,
      lineItems: {
        create: [
          { tenantId, name: '会場設営・機材一式', quantity: 1, unitPrice: 70000, unitCost: 45000, amount: 70000 },
          { tenantId, name: '配送・設営・撤去', quantity: 1, unitPrice: 30000, unitCost: 20000, amount: 30000 },
        ],
      },
    },
  });
  const approval = await prisma.approvalRequest.create({
    data: {
      tenantId,
      type: 'quote_issue',
      title: `見積発行承認: ${title}`,
      summary: '値引き20%・E2E fixture',
      entityType: 'Quote',
      entityId: quote.id,
      requestedById: ceo.id,
      riskLevel: 'MEDIUM',
      status: 'PENDING',
    },
  });
  return { tenantId, quoteId: quote.id, approvalId: approval.id, title };
}

async function cleanup(quoteId: string) {
  await prisma.invoiceLineItem.deleteMany({ where: { invoice: { quoteId } } });
  await prisma.invoice.deleteMany({ where: { quoteId } });
  await prisma.approvalRequest.deleteMany({ where: { entityType: 'Quote', entityId: quoteId } });
  await prisma.quoteLineItem.deleteMany({ where: { quoteId } });
  await prisma.quote.deleteMany({ where: { id: quoteId } });
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('approve→請求書化→逆リンク→冪等バッジ: 見積発行承認で approved になり、DRAFT 請求書を生成し双方向リンクする', async ({ page }) => {
  const { quoteId } = await createPendingQuote(`E2E 承認→変換 ${Date.now()}`);
  try {
    await login(page, 'ceo@ikezaki.local');

    // 承認前: 変換ボタンは出ない（pending_approval）。
    await page.goto(`/quotes/${quoteId}`);
    await expect(page.getByTestId('quote-convert-to-invoice')).toHaveCount(0);

    // /approvals で見積発行承認を承認（Quote pending_approval→approved）。
    await page.goto('/approvals');
    const item = page.locator('.rounded-md.border.p-3').filter({ has: page.getByTestId(`approval-quote-deeplink-${quoteId}`) });
    await item.getByRole('button', { name: '承認' }).click();
    // 同一 URL 決定 race 対策: 当該 PENDING 項目が一覧から消えるのを待つ。
    await expect(page.getByTestId(`approval-quote-deeplink-${quoteId}`)).toHaveCount(0);

    // 承認後: approved・変換ボタンが出る。
    await page.goto(`/quotes/${quoteId}`);
    await expect(page.getByText('approved', { exact: false }).first()).toBeVisible();
    const convert = page.getByTestId('quote-convert-to-invoice');
    await expect(convert).toBeVisible();

    // 請求書化 → 請求書詳細（DRAFT・逆リンク・合計一致）。
    await convert.click();
    await page.waitForURL(/\/invoices\/[^/]+\?from_quote=1/);
    await expect(page.getByTestId('invoice-source-quote-link')).toBeVisible();
    // 明細合計は値引き20%後（80000）＋税（8000）＝88000。
    await expect(page.getByText('¥88,000').first()).toBeVisible();

    // 元見積に戻ると「請求書化済み」バッジ＋リンク、変換ボタンは消える（冪等）。
    await page.goto(`/quotes/${quoteId}`);
    await expect(page.getByTestId(`quote-linked-invoice-${quoteId}`)).toBeVisible();
    await expect(page.getByTestId('quote-convert-to-invoice')).toHaveCount(0);

    // DB 実測: quoteId を持つ請求書はちょうど1件・DRAFT・quote は approved。
    const invoices = await prisma.invoice.findMany({ where: { quoteId } });
    expect(invoices).toHaveLength(1);
    expect(invoices[0]!.status).toBe('DRAFT');
    expect(Number(invoices[0]!.total)).toBe(88000);
    const q = await prisma.quote.findUnique({ where: { id: quoteId } });
    expect(q?.status).toBe('approved');
  } finally {
    await cleanup(quoteId);
  }
});

test('reject: 却下すると Quote は rejected になり、変換ボタンは出ず請求書も生成されない', async ({ page }) => {
  const { quoteId } = await createPendingQuote(`E2E 却下 ${Date.now()}`);
  try {
    await login(page, 'ceo@ikezaki.local');
    await page.goto('/approvals');
    const item = page.locator('.rounded-md.border.p-3').filter({ has: page.getByTestId(`approval-quote-deeplink-${quoteId}`) });
    await item.getByRole('button', { name: '却下' }).click();
    await expect(page.getByTestId(`approval-quote-deeplink-${quoteId}`)).toHaveCount(0);

    await page.goto(`/quotes/${quoteId}`);
    await expect(page.getByText('rejected', { exact: false }).first()).toBeVisible();
    await expect(page.getByTestId('quote-convert-to-invoice')).toHaveCount(0);

    const q = await prisma.quote.findUnique({ where: { id: quoteId } });
    expect(q?.status).toBe('rejected');
    expect(await prisma.invoice.count({ where: { quoteId } })).toBe(0);
  } finally {
    await cleanup(quoteId);
  }
});

test('tenant境界（Codex V75 Q2C P2-3）: 別 tenant の顧客を指す見積を変換しても、請求書に foreign 顧客は複製されない', async ({ page }) => {
  const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { tenantId: true } });
  const tenantId = ceo!.tenantId;
  // 別 tenant＋その顧客を用意し、ceo tenant の見積に foreign customerId を仕込む（データ不整合/越境参照の想定）。
  const foreignTenant = await prisma.tenant.create({ data: { name: `q2c-p23-foreign-${Date.now()}` } });
  const foreignCustomer = await prisma.customer.create({ data: { tenantId: foreignTenant.id, name: 'FOREIGN-CUST-SENTINEL' } });
  const quote = await prisma.quote.create({
    data: {
      tenantId,
      createdAt: new Date('2020-01-01T00:00:00Z'),
      number: `Q-E2E-P23-${Date.now()}`,
      title: `E2E tenant境界 ${Date.now()}`,
      status: 'approved',
      customerId: foreignCustomer.id, // 越境参照（本来ありえないが fail-closed を証明）
      subtotal: 100000, cost: 65000, discountRate: 20, taxRate: 10, total: 88000, grossMargin: 15000, grossMarginRate: 18.75,
      lineItems: { create: [{ tenantId, name: 'A', quantity: 1, unitPrice: 70000, unitCost: 45000, amount: 70000 }] },
    },
  });
  try {
    await login(page, 'ceo@ikezaki.local');
    await page.goto(`/quotes/${quote.id}`);
    await page.getByTestId('quote-convert-to-invoice').click();
    await page.waitForURL(/\/invoices\/[^/]+\?from_quote=1/);
    // 生成された請求書に foreign 顧客は複製されない（customerId=null・foreign sentinel は DOM にも出ない）。
    const invoices = await prisma.invoice.findMany({ where: { quoteId: quote.id } });
    expect(invoices).toHaveLength(1);
    expect(invoices[0]!.customerId).toBeNull();
    await expect(page.getByText('FOREIGN-CUST-SENTINEL')).toHaveCount(0);
  } finally {
    await prisma.invoiceLineItem.deleteMany({ where: { invoice: { quoteId: quote.id } } });
    await prisma.invoice.deleteMany({ where: { quoteId: quote.id } });
    await prisma.quoteLineItem.deleteMany({ where: { quoteId: quote.id } });
    await prisma.quote.deleteMany({ where: { id: quote.id } });
    await prisma.customer.deleteMany({ where: { id: foreignCustomer.id } });
    await prisma.tenant.deleteMany({ where: { id: foreignTenant.id } });
  }
});

test('権限境界: STAFF（finance:read なし）は approved 見積を閲覧できても請求書化ボタンは出ない', async ({ page }) => {
  const { quoteId, approvalId } = await createPendingQuote(`E2E 権限 ${Date.now()}`);
  try {
    // 先に ceo で承認し approved・未変換にする。
    await prisma.approvalRequest.update({ where: { id: approvalId }, data: { status: 'APPROVED' } });
    await prisma.quote.update({ where: { id: quoteId }, data: { status: 'approved' } });

    await login(page, 'sales@ikezaki.local'); // STAFF: quote:read あり・invoice:create/finance:read なし
    await page.goto(`/quotes/${quoteId}`);
    // 見積詳細自体は閲覧できる（quote:read）。
    await expect(page.getByText('approved', { exact: false }).first()).toBeVisible();
    // だが請求書化ボタンは server 側の権限判定で描画されない。
    await expect(page.getByTestId('quote-convert-to-invoice')).toHaveCount(0);
    // 変換されていない（請求書ゼロ）。
    expect(await prisma.invoice.count({ where: { quoteId } })).toBe(0);
  } finally {
    await cleanup(quoteId);
  }
});
