import { test, expect } from '@playwright/test';
import { prisma } from '@hokko/db';
import { convertLeadToCustomer, type LeadConvertFailpoint } from '../../lib/domains/crm/lead-convert';

// Codex CODEX_CHANGE_REQUEST_V80_LEAD_CONVERT_R1（PR #49）/ V89 R2（PR #60）の実 PostgreSQL 証拠（DB 直叩き）。
// - 真の barrier: 3 tx を pre-lock hook で全 ready させてから一斉に FOR UPDATE 競合させ、created 1 / already 2（R2 P2-2）。
// - 6 地点 fault: Customer/Deal/Timeline/Lead/History/Audit 各直後の fault で全 rollback→retry で 1 組収束（R2 P2-3）。
// - 既存 link 整合: 別 tenant / dangling / 片側欠落 / **同一 tenant 別 Lead backlink** を inconsistent（R2 P2-1）。
// - domain backstop の AI 拒否（authoritative な Action 境界の否定は lead_convert_ui_guard_evidence.spec.ts）。
// 外部作用なし（社内 CRM レコードのみ）。

async function tenantId(): Promise<string> {
  const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { tenantId: true } });
  return ceo!.tenantId;
}
async function ceoUserId(): Promise<string> {
  const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { id: true } });
  return ceo!.id;
}
async function makeCampaign(t: string): Promise<string> {
  const c = await prisma.leadSearchCampaign.create({ data: { tenantId: t, name: `LCG-CAMP-${process.pid}-${Date.now()}-${Math.floor(performance.now())}`.slice(0, 40), region: '札幌市', industry: '美容室' } });
  return c.id;
}
async function makeLead(t: string, campaignId: string): Promise<string> {
  const lead = await prisma.localBusinessLead.create({
    data: { tenantId: t, campaignId, name: `LCG-LEAD-${process.pid}-${Date.now()}-${Math.floor(performance.now())}`.slice(0, 40), industry: '美容室', stage: 'NEW', priority: 60 },
  });
  return lead.id;
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

/** n 本の並行タスクを「全員到達まで待ってから一斉解放」する barrier（真の同時競合を作る）。 */
function makeBarrier(n: number): () => Promise<void> {
  let count = 0;
  let release!: () => void;
  const gate = new Promise<void>((r) => { release = r; });
  return async () => {
    count += 1;
    if (count === n) release();
    await gate;
  };
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('真の barrier 並行（R2 P2-2）: pre-lock hook で 3 tx を ready 同期→一斉に FOR UPDATE 競合→created 1 / already 2・6書込各1・同一ID収束', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const campaignId = await makeCampaign(t);
  const leadId = await makeLead(t, campaignId);
  const actor = { tenantId: t, userId: uid };
  try {
    // 3 tx が **ロック取得前**まで到達したことを barrier で同期し、全員揃ってから一斉解放（真の競合）。
    const barrier = makeBarrier(3);
    const results = await Promise.all([
      convertLeadToCustomer(actor, leadId, { __beforeLockForTest: barrier }),
      convertLeadToCustomer(actor, leadId, { __beforeLockForTest: barrier }),
      convertLeadToCustomer(actor, leadId, { __beforeLockForTest: barrier }),
    ]);
    const created = results.filter((r) => r.kind === 'created');
    const already = results.filter((r) => r.kind === 'already');
    expect(created.length, 'created はちょうど 1').toBe(1);
    expect(already.length, '残りは already に収束').toBe(2);
    const cids = new Set(results.map((r) => (r.kind === 'created' || r.kind === 'already' ? r.customerId : 'x')));
    expect(cids.size, '全 request が同一 Customer に収束').toBe(1);

    const lead = await prisma.localBusinessLead.findUnique({ where: { id: leadId }, select: { customerId: true, dealId: true, stage: true } });
    expect(lead!.customerId).toBeTruthy();
    expect(lead!.dealId).toBeTruthy();
    expect(lead!.stage).toBe('APPOINTMENT');
    expect(await prisma.customer.count({ where: { id: lead!.customerId! } }), 'Customer 1').toBe(1);
    expect(await prisma.deal.count({ where: { tenantId: t, leadId } }), 'Deal 1').toBe(1);
    expect(await prisma.customerTimelineEvent.count({ where: { customerId: lead!.customerId! } }), 'Timeline 1').toBe(1);
    expect(await prisma.leadPipelineStageHistory.count({ where: { leadId } }), 'StageHistory 1').toBe(1);
    expect(await prisma.auditLog.count({ where: { tenantId: t, entityType: 'Customer', entityId: lead!.customerId! } }), 'Audit 1').toBe(1);
    const deal = await prisma.deal.findFirst({ where: { tenantId: t, leadId }, select: { customerId: true, leadId: true } });
    expect(deal!.customerId).toBe(lead!.customerId);
    expect(deal!.leadId).toBe(leadId);
  } finally {
    await cleanupLead(t, leadId, campaignId);
  }
});

const FAILPOINTS: LeadConvertFailpoint[] = ['customer', 'deal', 'timeline', 'lead', 'history', 'audit'];
for (const point of FAILPOINTS) {
  test(`6地点 fault injection（R2 P2-3）: ${point} 直後の例外で全 rollback（6書込0・lead 完全不変）→retry で 1 組収束`, async () => {
    const t = await tenantId();
    const uid = await ceoUserId();
    const campaignId = await makeCampaign(t);
    const leadId = await makeLead(t, campaignId);
    const actor = { tenantId: t, userId: uid };
    try {
      const before = await prisma.localBusinessLead.findUnique({ where: { id: leadId } });
      let threw = false;
      try {
        await convertLeadToCustomer(actor, leadId, { __faultAfterForTest: (p) => { if (p === point) throw new Error(`injected-${p}`); } });
      } catch {
        threw = true;
      }
      expect(threw, `${point} fault は伝播`).toBe(true);
      // 全 rollback: Customer/Deal/Timeline/History/Audit 0、Lead 全字段不変。
      const after = await prisma.localBusinessLead.findUnique({ where: { id: leadId } });
      expect(after!.customerId, 'lead.customerId 不変').toBeNull();
      expect(after!.dealId, 'lead.dealId 不変').toBeNull();
      expect(after!.stage, 'lead.stage 不変').toBe(before!.stage);
      expect(await prisma.deal.count({ where: { tenantId: t, leadId } }), 'Deal 0').toBe(0);
      expect(await prisma.leadPipelineStageHistory.count({ where: { leadId } }), 'History 0').toBe(0);
      // fixture 固有 ID で Customer/Timeline/Audit の孤児 0 を確認（broad cleanup 不使用）。
      const orphanCustomers = await prisma.customer.findMany({ where: { tenantId: t, name: before!.name }, select: { id: true } });
      expect(orphanCustomers.length, 'この lead 名の Customer 孤児 0').toBe(0);

      // retry（fault なし）→ ちょうど 1 組へ収束。
      const r = await convertLeadToCustomer(actor, leadId);
      expect(r.kind).toBe('created');
      const lead = await prisma.localBusinessLead.findUnique({ where: { id: leadId }, select: { customerId: true } });
      expect(await prisma.customer.count({ where: { id: lead!.customerId! } }), 'retry Customer 1').toBe(1);
      expect(await prisma.deal.count({ where: { tenantId: t, leadId } }), 'retry Deal 1').toBe(1);
      expect(await prisma.customerTimelineEvent.count({ where: { customerId: lead!.customerId! } }), 'retry Timeline 1').toBe(1);
      expect(await prisma.leadPipelineStageHistory.count({ where: { leadId } }), 'retry History 1').toBe(1);
      expect(await prisma.auditLog.count({ where: { tenantId: t, entityType: 'Customer', entityId: lead!.customerId! } }), 'retry Audit 1').toBe(1);
    } finally {
      await cleanupLead(t, leadId, campaignId);
    }
  });
}

test('AI 拒否（domain backstop）: actorIsAi は DB 接触前に forbidden（Customer/Deal/Timeline/History/Audit 0・lead 完全不変）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const campaignId = await makeCampaign(t);
  const leadId = await makeLead(t, campaignId);
  try {
    const r = await convertLeadToCustomer({ tenantId: t, userId: uid, actorIsAi: true }, leadId);
    expect(r.kind, 'AI/非人間は forbidden').toBe('forbidden');
    const lead = await prisma.localBusinessLead.findUnique({ where: { id: leadId } });
    expect(lead!.customerId).toBeNull();
    expect(lead!.dealId).toBeNull();
    expect(lead!.stage).toBe('NEW');
    expect(await prisma.deal.count({ where: { tenantId: t, leadId } })).toBe(0);
    expect(await prisma.leadPipelineStageHistory.count({ where: { leadId } })).toBe(0);
  } finally {
    await cleanupLead(t, leadId, campaignId);
  }
});

test('既存 link 整合 fail-closed（R2 P2-1）: 別tenant / dangling / customerのみ / dealのみ / 同一tenant別Lead backlink は inconsistent（越境0・重複0）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const actor = { tenantId: t, userId: uid };
  const campaignId = await makeCampaign(t);
  const foreignTenant = await prisma.tenant.create({ data: { name: `LCG-FOREIGN-${process.pid}-${Date.now()}` } });
  const foreignCustomer = await prisma.customer.create({ data: { tenantId: foreignTenant.id, name: 'foreign-customer' } });
  const foreignDeal = await prisma.deal.create({ data: { tenantId: foreignTenant.id, customerId: foreignCustomer.id, title: 'foreign-deal' } });
  const ownCustomer = await prisma.customer.create({ data: { tenantId: t, name: 'LCG-own-customer' } });
  // 同一 tenant で「別 Lead A を指す Deal D」を作り、Lead B にそれを誤 link する（backlink 不一致・P2-1）。
  const leadA = await makeLead(t, campaignId);
  const backlinkDeal = await prisma.deal.create({ data: { tenantId: t, customerId: ownCustomer.id, title: 'LCG-backlink-deal', leadId: leadA } });

  const leadIds: string[] = [leadA];
  const mk = async (data: { customerId?: string | null; dealId?: string | null }) => {
    const lead = await prisma.localBusinessLead.create({
      data: { tenantId: t, campaignId, name: `LCG-INC-${process.pid}-${Date.now()}-${leadIds.length}`.slice(0, 40), industry: '美容室', stage: 'NEW', priority: 50, customerId: data.customerId ?? null, dealId: data.dealId ?? null },
    });
    leadIds.push(lead.id);
    return lead.id;
  };
  try {
    const cases = [
      ['別tenant実在', await mk({ customerId: foreignCustomer.id, dealId: foreignDeal.id })],
      ['dangling', await mk({ customerId: 'cus_does_not_exist_00000000', dealId: 'deal_does_not_exist_0000' })],
      ['customerのみ', await mk({ customerId: ownCustomer.id, dealId: null })],
      ['dealのみ', await mk({ customerId: null, dealId: foreignDeal.id })],
      // 同一 tenant・同一 Customer だが Deal が別 Lead(A) を指す（backlink leadId 不一致）。
      ['別Lead backlink', await mk({ customerId: ownCustomer.id, dealId: backlinkDeal.id })],
    ] as const;
    for (const [label, id] of cases) {
      const r = await convertLeadToCustomer(actor, id);
      expect(r.kind, `${label}: inconsistent で fail-closed`).toBe('inconsistent');
      expect(await prisma.deal.count({ where: { tenantId: t, leadId: id } }), `${label}: 新規 Deal 0`).toBe(0);
    }
    // 別 tenant / backlink 先の実体は一切改変されない。
    expect(await prisma.customer.count({ where: { id: foreignCustomer.id, tenantId: foreignTenant.id } })).toBe(1);
    expect(await prisma.deal.count({ where: { id: foreignDeal.id, tenantId: foreignTenant.id } })).toBe(1);
    expect(await prisma.deal.count({ where: { id: backlinkDeal.id, leadId: leadA } }), 'backlink Deal は Lead A のまま不変').toBe(1);
    expect(await prisma.customer.count({ where: { id: ownCustomer.id } })).toBe(1);
  } finally {
    for (const id of leadIds) await prisma.localBusinessLead.deleteMany({ where: { id } });
    await prisma.deal.deleteMany({ where: { id: { in: [foreignDeal.id, backlinkDeal.id] } } });
    await prisma.customer.deleteMany({ where: { id: { in: [foreignCustomer.id, ownCustomer.id] } } });
    await prisma.tenant.deleteMany({ where: { id: foreignTenant.id } });
    await prisma.leadSearchCampaign.deleteMany({ where: { id: campaignId } });
  }
});
