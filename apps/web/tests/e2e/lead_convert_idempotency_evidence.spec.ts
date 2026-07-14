import { test, expect, type Page } from '@playwright/test';
import { prisma } from '@hokko/db';

// Wave1 商談化の原子化＋冪等化の実 PostgreSQL 証拠。
// convertLeadToCustomerAction はリード行を FOR UPDATE でロックしてから顧客・案件・タイムライン・
// リード更新・履歴・監査を単一 $transaction で確定する。これにより同一リードへの二重クリック /
// 並行 submit は「先勝ち」で1組の顧客・案件のみを作り、重複作成されない（従来は check-then-act で
// 両方が customerId=null を読んで顧客・案件を二重作成し得た）。
// 外部作用なし（社内の CRM レコード作成のみ）。

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

let campaignId = '';
let leadId = '';

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('二重商談化防止: 同一リードへの並列「商談化」を FOR UPDATE で直列化し、顧客・案件が重複作成されない', async ({ page }) => {
  const t = await tenantId();
  const stamp = `${process.pid}-${Date.now()}`;
  const campaign = await prisma.leadSearchCampaign.create({
    data: { tenantId: t, name: `CONV-CAMP-${stamp}`, region: '札幌市', industry: '美容室' },
  });
  campaignId = campaign.id;
  const lead = await prisma.localBusinessLead.create({
    data: { tenantId: t, campaignId: campaign.id, name: `CONV-LEAD-${stamp}`, industry: '美容室', stage: 'NEW', priority: 60 },
  });
  leadId = lead.id;
  try {
    await login(page, 'ceo@ikezaki.local');
    await page.goto(`/leadmap/leads/${lead.id}`);
    // 「商談化」フォームを送信し、その Server Action POST を捕捉する。
    const [convReq] = await Promise.all([
      page.waitForRequest((r) => r.method() === 'POST' && r.url().includes('/leadmap/leads')),
      page.getByRole('button', { name: /商談化/ }).click(),
    ]);
    await page.waitForURL(/\/customers\//);

    // 同一 POST を 5 本並列 replay（= 同一リードへの二重/多重商談化）。
    // FOR UPDATE が無ければ複数が customerId=null を読んで顧客・案件を重複作成する。
    const headers = { ...convReq.headers() };
    delete headers['content-length'];
    const body = convReq.postDataBuffer()!;
    const resps = await Promise.all(
      Array.from({ length: 5 }, () => page.request.post(convReq.url(), { headers, data: body })),
    );
    for (const r of resps) expect(r.status(), '再商談化リクエストはエラーにならず受理（冪等）される').toBeLessThan(400);

    // 実測: このリード起点の顧客・案件は 1 件ずつのみ。リードは customerId/dealId が設定され stage=APPOINTMENT。
    const finalLead = await prisma.localBusinessLead.findUnique({ where: { id: lead.id }, select: { customerId: true, dealId: true, stage: true } });
    expect(finalLead!.customerId, 'リードに顧客が連携済み').toBeTruthy();
    expect(finalLead!.dealId, 'リードに案件が連携済み').toBeTruthy();
    expect(finalLead!.stage, 'stage=APPOINTMENT').toBe('APPOINTMENT');

    const dealCount = await prisma.deal.count({ where: { tenantId: t, leadId: lead.id } });
    const customerCount = await prisma.customer.count({ where: { id: finalLead!.customerId! } });
    expect(dealCount, 'このリード起点の案件は 1 件のみ（重複なし）').toBe(1);
    expect(customerCount, '連携先の顧客は 1 件のみ').toBe(1);
  } finally {
    const l = await prisma.localBusinessLead.findUnique({ where: { id: lead.id }, select: { customerId: true } });
    await prisma.leadPipelineStageHistory.deleteMany({ where: { leadId: lead.id } });
    await prisma.deal.deleteMany({ where: { tenantId: t, leadId: lead.id } });
    if (l?.customerId) {
      await prisma.customerTimelineEvent.deleteMany({ where: { customerId: l.customerId } });
      await prisma.auditLog.deleteMany({ where: { tenantId: t, entityType: 'Customer', entityId: l.customerId } });
      await prisma.customer.deleteMany({ where: { id: l.customerId } });
    }
    await prisma.localBusinessLead.deleteMany({ where: { id: lead.id } });
    await prisma.leadSearchCampaign.deleteMany({ where: { id: campaign.id } });
  }
});
