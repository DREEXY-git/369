import { test, expect, type Page } from '@playwright/test';
import { prisma } from '@hokko/db';

// Codex V89 LEAD_CONVERT R2 P2-4 / addendum の実 UI 証拠（login + ブラウザ）。
// - addendum High: session.isAi（User.isAiAgent 由来）と role の不一致で商談化できる bypass を封じる。
//   `isAiAgent=false + AI_AGENT`、`isAiAgent=false + AI_AGENT+OWNER 混在`、通常 AI は Action 境界で denied・
//   Customer/Deal/Timeline/History/Audit 0・Lead 完全不変・UI ボタン非表示。通常 OWNER のみ 1 組作成。
// - addendum P2: 不整合 link（foreign / dangling / customer-only / deal-only / 別 Lead backlink）は詳細 UI が
//   検証を通り、foreign ID を href/表示に出さず「連携先の不整合」を表示する。
// 外部作用なし（社内 CRM レコードのみ）。

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
async function ceoRef() {
  return (await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { id: true, passwordHash: true, departmentId: true, tenantId: true } }))!;
}
async function roleId(t: string, key: string): Promise<string> {
  const r = await prisma.role.findFirst({ where: { tenantId: t, key: key as any }, select: { id: true } });
  return r!.id;
}
async function makeUser(t: string, email: string, roleKeys: string[], isAiAgent: boolean): Promise<string> {
  const ceo = await ceoRef();
  const u = await prisma.user.create({ data: { tenantId: t, email, name: email, passwordHash: ceo.passwordHash, isAiAgent, departmentId: ceo.departmentId } });
  for (const k of roleKeys) await prisma.userRole.create({ data: { tenantId: t, userId: u.id, roleId: await roleId(t, k) } });
  return u.id;
}
async function cleanupUser(userId: string) {
  await prisma.userRole.deleteMany({ where: { userId } });
  await prisma.dataAccessLog.deleteMany({ where: { actorId: userId } }).catch(() => {});
  await prisma.auditLog.deleteMany({ where: { actorId: userId } }).catch(() => {});
  await prisma.user.deleteMany({ where: { id: userId } });
}
async function makeLead(t: string): Promise<{ leadId: string; campaignId: string }> {
  const stamp = `${process.pid}-${Date.now()}-${Math.floor(performance.now())}`;
  const c = await prisma.leadSearchCampaign.create({ data: { tenantId: t, name: `LUI-CAMP-${stamp}`.slice(0, 40), region: '札幌市', industry: '美容室' } });
  const lead = await prisma.localBusinessLead.create({ data: { tenantId: t, campaignId: c.id, name: `LUI-LEAD-${stamp}`.slice(0, 40), industry: '美容室', stage: 'NEW', priority: 60 } });
  return { leadId: lead.id, campaignId: c.id };
}
async function cleanupLead(t: string, leadId: string, campaignId: string) {
  const lead = await prisma.localBusinessLead.findUnique({ where: { id: leadId }, select: { customerId: true } });
  await prisma.leadPipelineStageHistory.deleteMany({ where: { leadId } });
  await prisma.deal.deleteMany({ where: { tenantId: t, leadId } });
  if (lead?.customerId) {
    await prisma.customerTimelineEvent.deleteMany({ where: { customerId: lead.customerId } });
    await prisma.auditLog.deleteMany({ where: { tenantId: t, entityType: 'Customer', entityId: lead.customerId } });
    await prisma.deal.deleteMany({ where: { customerId: lead.customerId } });
    await prisma.customer.deleteMany({ where: { id: lead.customerId } });
  }
  await prisma.localBusinessLead.deleteMany({ where: { id: leadId } });
  await prisma.leadSearchCampaign.deleteMany({ where: { id: campaignId } });
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

// 認証済み ceo の商談化 POST を捕捉し、その bytes/headers を返す（別ユーザーで replay して Action 境界を検証する）。
async function captureConvertPost(page: Page, t: string): Promise<{ url: string; headers: Record<string, string>; bodyLatin1: string; throwawayLeadId: string; throwawayCampaignId: string }> {
  const { leadId, campaignId } = await makeLead(t);
  await login(page, 'ceo@ikezaki.local');
  await page.goto(`/leadmap/leads/${leadId}`);
  const [req] = await Promise.all([
    page.waitForRequest((r) => r.method() === 'POST' && r.url().includes('/leadmap/leads')),
    page.getByRole('button', { name: /商談化（顧客・案件をCRMに作成）/ }).click(),
  ]);
  await page.waitForURL(/\/customers\//);
  const headers = { ...req.headers() };
  delete headers['content-length'];
  return { url: req.url(), headers, bodyLatin1: req.postDataBuffer()!.toString('latin1'), throwawayLeadId: leadId, throwawayCampaignId: campaignId };
}

for (const [label, roleKeys, isAiAgent] of [
  ['isAiAgent=false + AI_AGENT role（mismatch bypass）', ['AI_AGENT'], false],
  ['isAiAgent=false + AI_AGENT+OWNER 混在', ['AI_AGENT', 'OWNER'], false],
  ['通常AI（isAiAgent=true + AI_AGENT）', ['AI_AGENT'], true],
] as const) {
  test(`AI/非人間 fail-closed（addendum High / R2 P2-4）: ${label} は Action 境界で denied・全モデル0・Lead不変・UI非表示`, async ({ page, browser }) => {
    const t = await tenantId();
    const cap = await captureConvertPost(page, t);
    const aiEmail = `lui-ai-${process.pid}-${Date.now()}-${Math.floor(performance.now())}@ikezaki.local`;
    const aiUserId = await makeUser(t, aiEmail, roleKeys as unknown as string[], isAiAgent);
    const target = await makeLead(t); // 未変換の被験 lead。
    const aiCtx = await browser.newContext();
    const aiPage2 = await aiCtx.newPage();
    await login(aiPage2, aiEmail);
    try {
      // ① UI: 被験 lead 詳細で商談化ボタンが出ない（role 由来 fail-closed）。
      await aiPage2.goto(`/leadmap/leads/${target.leadId}`);
      await expect(aiPage2.getByRole('button', { name: /商談化（顧客・案件をCRMに作成）/ })).toHaveCount(0);

      // ② Action 直接 replay（Codex R3 #3: 空振り・認証混入を排除した実証形）:
      //    - body に throwaway leadId が**ちょうど 1 回**存在することを事前 assert し、被験 lead へ置換済みであることも assert（空振り replay を構造排除）。
      //    - 捕捉した ceo の認証 headers（cookie/authorization）は**再利用せず**、AI context の session cookie だけで送信。
      //    - response の redirect 先が denied=1 であることを assert（Action 境界の拒否を応答でも実証）。
      const occurrences = cap.bodyLatin1.split(cap.throwawayLeadId).length - 1;
      expect(occurrences, 'POST body に leadId がちょうど 1 回存在').toBe(1);
      const body = cap.bodyLatin1.replace(cap.throwawayLeadId, target.leadId);
      expect(body.includes(target.leadId), '被験 leadId へ置換済み').toBe(true);
      expect(body.includes(cap.throwawayLeadId), '旧 leadId は body に残らない').toBe(false);
      const replayHeaders = { ...cap.headers };
      delete replayHeaders['cookie'];
      delete replayHeaders['authorization'];
      const resp = await aiCtx.request.post(cap.url, { headers: replayHeaders, data: Buffer.from(body, 'latin1'), maxRedirects: 0 });
      const redirectTarget = resp.headers()['x-action-redirect'] ?? resp.headers()['location'] ?? '';
      expect(redirectTarget, `Action 境界は denied=1 へ redirect（status=${resp.status()}）`).toContain('denied=1');
      // 全モデル 0・Lead 完全不変を実測。
      const lead = await prisma.localBusinessLead.findUnique({ where: { id: target.leadId } });
      expect(lead!.customerId, 'AI 経由で customer 未連携').toBeNull();
      expect(lead!.dealId).toBeNull();
      expect(lead!.stage, 'stage 不変').toBe('NEW');
      expect(await prisma.deal.count({ where: { tenantId: t, leadId: target.leadId } }), 'Deal 0').toBe(0);
      expect(await prisma.leadPipelineStageHistory.count({ where: { leadId: target.leadId } }), 'History 0').toBe(0);
      // 商談化（Customer 作成）の Audit を AI 主体で残さない（人間として偽装記録しない）。login 監査等は対象外。
      expect(await prisma.auditLog.count({ where: { tenantId: t, actorId: aiUserId, action: 'create', entityType: 'Customer' } }), 'AI 経由の商談化 Audit 0').toBe(0);
      // Customer 自体も作られない（この lead 由来の Customer 孤児 0）。
      expect(await prisma.customer.count({ where: { tenantId: t, name: (await prisma.localBusinessLead.findUnique({ where: { id: target.leadId }, select: { name: true } }))!.name } }), 'Customer 0').toBe(0);
    } finally {
      await aiCtx.close();
      await cleanupLead(t, target.leadId, target.campaignId);
      await cleanupLead(t, cap.throwawayLeadId, cap.throwawayCampaignId);
      await cleanupUser(aiUserId);
    }
  });
}

test('正常系（対比）: 通常 OWNER は Action で 1 組を作成し human Audit（actorType=user）を残す・UI にボタン表示', async ({ page }) => {
  const t = await tenantId();
  const { leadId, campaignId } = await makeLead(t);
  try {
    await login(page, 'ceo@ikezaki.local');
    await page.goto(`/leadmap/leads/${leadId}`);
    await expect(page.getByRole('button', { name: /商談化（顧客・案件をCRMに作成）/ }), 'OWNER にはボタン表示').toHaveCount(1);
    await page.getByRole('button', { name: /商談化（顧客・案件をCRMに作成）/ }).click();
    await page.waitForURL(/\/customers\//);
    const lead = await prisma.localBusinessLead.findUnique({ where: { id: leadId }, select: { customerId: true, dealId: true } });
    expect(lead!.customerId).toBeTruthy();
    expect(await prisma.deal.count({ where: { tenantId: t, leadId } }), 'Deal 1').toBe(1);
    const audit = await prisma.auditLog.findFirst({ where: { tenantId: t, entityType: 'Customer', entityId: lead!.customerId! }, select: { actorType: true } });
    expect(audit!.actorType, 'human Audit（actorType=user）').toBe('user');
  } finally {
    await cleanupLead(t, leadId, campaignId);
  }
});

test('addendum P2: 不整合 link は詳細 UI が検証を通り foreign ID を出さず「連携先の不整合」を表示する', async ({ page }) => {
  const t = await tenantId();
  const { leadId: leadA, campaignId } = await makeLead(t);
  const foreignTenant = await prisma.tenant.create({ data: { name: `LUI-FOREIGN-${process.pid}-${Date.now()}` } });
  const foreignCustomer = await prisma.customer.create({ data: { tenantId: foreignTenant.id, name: 'foreign-cust' } });
  const foreignDeal = await prisma.deal.create({ data: { tenantId: foreignTenant.id, customerId: foreignCustomer.id, title: 'foreign-deal' } });
  const ownCustomer = await prisma.customer.create({ data: { tenantId: t, name: 'LUI-own-cust' } });
  const backlinkDeal = await prisma.deal.create({ data: { tenantId: t, customerId: ownCustomer.id, title: 'LUI-backlink', leadId: leadA } });
  const created: string[] = [];
  const mkInc = async (data: { customerId?: string | null; dealId?: string | null }) => {
    const c = await prisma.leadSearchCampaign.create({ data: { tenantId: t, name: `LUI-INC-${process.pid}-${created.length}-${Date.now()}`.slice(0, 40), region: 'x', industry: 'y' } });
    const lead = await prisma.localBusinessLead.create({ data: { tenantId: t, campaignId: c.id, name: `LUI-INC-${created.length}`, industry: 'y', stage: 'NEW', priority: 50, customerId: data.customerId ?? null, dealId: data.dealId ?? null } });
    created.push(lead.id, c.id);
    return lead.id;
  };
  try {
    await login(page, 'ceo@ikezaki.local');
    const cases = [
      ['別tenant実在', await mkInc({ customerId: foreignCustomer.id, dealId: foreignDeal.id }), foreignCustomer.id, foreignDeal.id],
      ['dangling', await mkInc({ customerId: 'cus_missing_000000000000', dealId: 'deal_missing_0000000000' }), 'cus_missing_000000000000', 'deal_missing_0000000000'],
      ['customerのみ', await mkInc({ customerId: ownCustomer.id, dealId: null }), ownCustomer.id, null],
      ['dealのみ', await mkInc({ customerId: null, dealId: foreignDeal.id }), null, foreignDeal.id],
      ['別Lead backlink', await mkInc({ customerId: ownCustomer.id, dealId: backlinkDeal.id }), ownCustomer.id, backlinkDeal.id],
    ] as const;
    for (const [label, leadId, cid, did] of cases) {
      await page.goto(`/leadmap/leads/${leadId}`);
      await expect(page.getByText('連携先の不整合'), `${label}: 不整合表示`).toBeVisible();
      // foreign/dangling ID を href・DOM に出さない（越境参照を漏らさない）。
      const html = await page.content();
      if (cid) expect(html.includes(`/customers/${cid}`), `${label}: 顧客 link 非表示`).toBe(false);
      if (did) expect(html.includes(`/deals/${did}`), `${label}: 案件 link 非表示`).toBe(false);
      // 「商談化済み」の緑バッジは出さない。
      await expect(page.getByText('商談化済み')).toHaveCount(0);
    }
  } finally {
    for (const id of created) {
      await prisma.localBusinessLead.deleteMany({ where: { id } });
      await prisma.leadSearchCampaign.deleteMany({ where: { id } });
    }
    await prisma.deal.deleteMany({ where: { id: { in: [foreignDeal.id, backlinkDeal.id] } } });
    await prisma.customer.deleteMany({ where: { id: { in: [foreignCustomer.id, ownCustomer.id] } } });
    await prisma.tenant.deleteMany({ where: { id: foreignTenant.id } });
    await cleanupLead(t, leadA, campaignId);
  }
});

test('R3 P2: 実UIの「連携をやり直す（修復）」で不整合が修復され、商談化済み＋整合linkへ収束・修復Audit 1（Codex R3 P2）', async ({ page }) => {
  const t = await tenantId();
  const camp = await prisma.leadSearchCampaign.create({ data: { tenantId: t, name: `LUI-REP-${process.pid}-${Date.now()}`.slice(0, 40), region: 'x', industry: 'y' } });
  // dangling link を持つ不整合リード。
  const lead = await prisma.localBusinessLead.create({
    data: { tenantId: t, campaignId: camp.id, name: `LUI-REP-${process.pid}-${Date.now()}`.slice(0, 40), industry: 'y', stage: 'NEW', priority: 50, customerId: 'cus_repair_missing_00000', dealId: 'deal_repair_missing_000' },
  });
  try {
    await login(page, 'ceo@ikezaki.local');
    await page.goto(`/leadmap/leads/${lead.id}`);
    await expect(page.getByText('連携先の不整合')).toBeVisible();
    // 人間の修復ボタンを実クリック → repair action が 切離し→正規1組収束 を単一 tx で実行。
    await page.getByRole('button', { name: /連携をやり直す（修復）/ }).click();
    await page.waitForURL(new RegExp(`/leadmap/leads/${lead.id}\\?repaired=1`));
    // 修復後: 「商談化済み」表示＋自 tenant の顧客/案件 link（foreign/dangling ID は出ない）。
    await expect(page.getByText('商談化済み')).toBeVisible();
    const after = await prisma.localBusinessLead.findUnique({ where: { id: lead.id }, select: { customerId: true, dealId: true } });
    expect(after!.customerId).toBeTruthy();
    expect(after!.customerId).not.toBe('cus_repair_missing_00000');
    // 相互 backlink 一致（整合）＋修復 Audit ちょうど 1。
    expect(await prisma.deal.count({ where: { id: after!.dealId!, tenantId: t, customerId: after!.customerId!, leadId: lead.id } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { tenantId: t, entityType: 'LocalBusinessLead', entityId: lead.id, action: 'lead_link_repair' } })).toBe(1);
    const html = await page.content();
    expect(html.includes('cus_repair_missing_00000'), '旧 dangling ID を表示しない').toBe(false);
  } finally {
    const cur = await prisma.localBusinessLead.findUnique({ where: { id: lead.id }, select: { customerId: true } });
    await prisma.leadPipelineStageHistory.deleteMany({ where: { leadId: lead.id } });
    await prisma.auditLog.deleteMany({ where: { tenantId: t, entityType: 'LocalBusinessLead', entityId: lead.id } });
    await prisma.deal.deleteMany({ where: { tenantId: t, leadId: lead.id } });
    if (cur?.customerId && cur.customerId !== 'cus_repair_missing_00000') {
      await prisma.customerTimelineEvent.deleteMany({ where: { customerId: cur.customerId } });
      await prisma.auditLog.deleteMany({ where: { tenantId: t, entityType: 'Customer', entityId: cur.customerId } });
      await prisma.deal.deleteMany({ where: { customerId: cur.customerId } });
      await prisma.customer.deleteMany({ where: { id: cur.customerId } });
    }
    await prisma.localBusinessLead.deleteMany({ where: { id: lead.id } });
    await prisma.leadSearchCampaign.deleteMany({ where: { id: camp.id } });
  }
});
