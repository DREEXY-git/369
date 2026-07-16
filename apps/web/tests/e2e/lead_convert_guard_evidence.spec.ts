import { test, expect } from '@playwright/test';
import { prisma } from '@hokko/db';
import { convertLeadToCustomer } from '../../lib/domains/crm/lead-convert';

// Codex CODEX_CHANGE_REQUEST_V80_LEAD_CONVERT_R1（PR #49）の実 PostgreSQL 証拠。
// High: AI は実確定（Customer/Deal/Timeline/Lead更新/StageHistory/Audit）を持たず、DB 接触前に拒否する。
// P2: 既存 link は同一 tenant で Customer/Deal を検証し、別 tenant / dangling / 片側欠落は foreign ID を
//     返さず fail-closed（越境表示 0・新規重複 0）。
// P2/Evidence: 未変換 lead へ **真の barrier 並行** を発生させ、created 1 / already N・6書込各 1 を実測。
//     さらに各書込後の fault injection で全 rollback→retry でちょうど 1 組へ収束することを確認する。
// 外部作用なし（社内 CRM レコードのみ）。ブラウザ不使用（サービス関数直叩き）。

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

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('真の barrier 並行: 未変換 lead へ 3 本同時商談化 → created 1 / already 2・Customer/Deal/Timeline/History/Audit 各 1（Codex R1 P2/Evidence）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const campaignId = await makeCampaign(t);
  const leadId = await makeLead(t, campaignId);
  const actor = { tenantId: t, userId: uid };
  try {
    // 未変換 lead へ独立 3 request を barrier 同時開始（先行完了を待たない = 真の競合）。
    const results = await Promise.all([
      convertLeadToCustomer(actor, leadId),
      convertLeadToCustomer(actor, leadId),
      convertLeadToCustomer(actor, leadId),
    ]);
    const created = results.filter((r) => r.kind === 'created');
    const already = results.filter((r) => r.kind === 'already');
    expect(created.length, 'created はちょうど 1').toBe(1);
    expect(already.length, '残りは already に収束').toBe(2);
    // 全 request が同一 customerId を指す（FOR UPDATE 直列化＋ロック後再読取）。
    const cids = new Set(results.map((r) => (r.kind === 'created' || r.kind === 'already' ? r.customerId : 'x')));
    expect(cids.size, '全 request が同一 Customer に収束').toBe(1);

    const lead = await prisma.localBusinessLead.findUnique({ where: { id: leadId }, select: { customerId: true, dealId: true, stage: true, tenantId: true } });
    expect(lead!.customerId).toBeTruthy();
    expect(lead!.dealId).toBeTruthy();
    expect(lead!.stage).toBe('APPOINTMENT');
    // 6 書込は各ちょうど 1（重複作成なし）。
    expect(await prisma.customer.count({ where: { id: lead!.customerId! } }), 'Customer 1').toBe(1);
    expect(await prisma.deal.count({ where: { tenantId: t, leadId } }), 'Deal 1').toBe(1);
    expect(await prisma.customerTimelineEvent.count({ where: { customerId: lead!.customerId! } }), 'Timeline 1').toBe(1);
    expect(await prisma.leadPipelineStageHistory.count({ where: { leadId } }), 'StageHistory 1').toBe(1);
    expect(await prisma.auditLog.count({ where: { tenantId: t, entityType: 'Customer', entityId: lead!.customerId! } }), 'Audit 1').toBe(1);
    // tenant / 相互 ID 照合。
    const deal = await prisma.deal.findFirst({ where: { tenantId: t, leadId }, select: { tenantId: true, customerId: true, leadId: true } });
    expect(deal!.tenantId).toBe(t);
    expect(deal!.customerId).toBe(lead!.customerId);
    expect(deal!.leadId).toBe(leadId);
  } finally {
    await cleanupLead(t, leadId, campaignId);
  }
});

test('fault injection rollback: 全書込後・commit 前の例外で 6 書込を孤児化せず全 rollback し、retry で 1 組へ収束（Codex R1 P2）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const campaignId = await makeCampaign(t);
  const leadId = await makeLead(t, campaignId);
  const actor = { tenantId: t, userId: uid };
  try {
    // 1回目: commit 直前に例外注入 → 単一 tx なので全 rollback（Customer/Deal/… 孤児 0・lead 不変）。
    let threw = false;
    try {
      await convertLeadToCustomer(actor, leadId, { __faultBeforeCommitForTest: () => { throw new Error('injected-fault'); } });
    } catch {
      threw = true;
    }
    expect(threw, 'fault は呼び出し側へ伝播').toBe(true);
    const afterFault = await prisma.localBusinessLead.findUnique({ where: { id: leadId }, select: { customerId: true, dealId: true, stage: true } });
    expect(afterFault!.customerId, 'rollback 後 lead.customerId 不変').toBeNull();
    expect(afterFault!.dealId, 'rollback 後 lead.dealId 不変').toBeNull();
    expect(afterFault!.stage, 'rollback 後 stage 不変').toBe('NEW');
    expect(await prisma.deal.count({ where: { tenantId: t, leadId } }), 'rollback 後 Deal 孤児 0').toBe(0);
    expect(await prisma.leadPipelineStageHistory.count({ where: { leadId } }), 'rollback 後 History 孤児 0').toBe(0);

    // 2回目: 正常 retry → ちょうど 1 組。
    const r = await convertLeadToCustomer(actor, leadId);
    expect(r.kind).toBe('created');
    const lead = await prisma.localBusinessLead.findUnique({ where: { id: leadId }, select: { customerId: true } });
    expect(await prisma.customer.count({ where: { id: lead!.customerId! } })).toBe(1);
    expect(await prisma.deal.count({ where: { tenantId: t, leadId } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { tenantId: t, entityType: 'Customer', entityId: lead!.customerId! } })).toBe(1);
  } finally {
    await cleanupLead(t, leadId, campaignId);
  }
});

test('AI 拒否: actorIsAi は DB 接触前に forbidden（Customer/Deal/History を作らず lead 不変）（Codex R1 High）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const campaignId = await makeCampaign(t);
  const leadId = await makeLead(t, campaignId);
  try {
    const r = await convertLeadToCustomer({ tenantId: t, userId: uid, actorIsAi: true }, leadId);
    expect(r.kind, 'AI は forbidden').toBe('forbidden');
    const lead = await prisma.localBusinessLead.findUnique({ where: { id: leadId }, select: { customerId: true, dealId: true, stage: true } });
    expect(lead!.customerId, 'lead 不変（customer 未連携）').toBeNull();
    expect(lead!.dealId).toBeNull();
    expect(lead!.stage).toBe('NEW');
    expect(await prisma.deal.count({ where: { tenantId: t, leadId } }), 'Deal 0').toBe(0);
    expect(await prisma.leadPipelineStageHistory.count({ where: { leadId } }), 'History 0').toBe(0);
  } finally {
    await cleanupLead(t, leadId, campaignId);
  }
});

test('P2 fail-closed: 別 tenant 実在 / dangling / customerのみ / dealのみ の既存 link は inconsistent（越境表示 0・新規重複 0）（Codex R1 P2）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const actor = { tenantId: t, userId: uid };
  const campaignId = await makeCampaign(t);
  // 別 tenant の実在 Customer/Deal（越境参照の対象）。
  const foreignTenant = await prisma.tenant.create({ data: { name: `LCG-FOREIGN-${process.pid}-${Date.now()}` } });
  const foreignCustomer = await prisma.customer.create({ data: { tenantId: foreignTenant.id, name: 'foreign-customer' } });
  const foreignDeal = await prisma.deal.create({ data: { tenantId: foreignTenant.id, customerId: foreignCustomer.id, title: 'foreign-deal' } });
  // 同一 tenant の実在 Customer（customerのみ link の検証用）。
  const ownCustomer = await prisma.customer.create({ data: { tenantId: t, name: 'LCG-own-customer' } });

  const leadIds: string[] = [];
  const mk = async (data: { customerId?: string | null; dealId?: string | null }) => {
    const lead = await prisma.localBusinessLead.create({
      data: { tenantId: t, campaignId, name: `LCG-INC-${process.pid}-${Date.now()}-${leadIds.length}`.slice(0, 40), industry: '美容室', stage: 'NEW', priority: 50, customerId: data.customerId ?? null, dealId: data.dealId ?? null },
    });
    leadIds.push(lead.id);
    return lead.id;
  };
  try {
    // (a) 別 tenant 実在 customer+deal、(b) dangling（存在しない ID）、(c) customer のみ、(d) deal のみ。
    const foreignLead = await mk({ customerId: foreignCustomer.id, dealId: foreignDeal.id });
    const danglingLead = await mk({ customerId: 'cus_does_not_exist_00000000', dealId: 'deal_does_not_exist_0000' });
    const customerOnlyLead = await mk({ customerId: ownCustomer.id, dealId: null });
    const dealOnlyLead = await mk({ customerId: null, dealId: foreignDeal.id });

    for (const [label, id, foreignCid] of [
      ['別tenant実在', foreignLead, foreignCustomer.id],
      ['dangling', danglingLead, null],
      ['customerのみ', customerOnlyLead, null],
      ['dealのみ', dealOnlyLead, null],
    ] as const) {
      const r = await convertLeadToCustomer(actor, id);
      expect(r.kind, `${label}: inconsistent で fail-closed`).toBe('inconsistent');
      // foreign ID を返さない（越境 customerId を outcome にしない）。
      if (r.kind === 'already' || r.kind === 'created') expect(foreignCid && r.customerId !== foreignCid).toBeTruthy();
      // このリードから新規 Customer/Deal を作らない（重複 0）。
      expect(await prisma.deal.count({ where: { tenantId: t, leadId: id } }), `${label}: 新規 Deal 0`).toBe(0);
    }
    // 別 tenant の Customer/Deal は一切改変されない（越境書込 0）。
    expect(await prisma.customer.count({ where: { id: foreignCustomer.id, tenantId: foreignTenant.id } })).toBe(1);
    expect(await prisma.deal.count({ where: { id: foreignDeal.id, tenantId: foreignTenant.id } })).toBe(1);
    // own tenant の customerのみ link 先 Customer も改変されない。
    expect(await prisma.customer.count({ where: { id: ownCustomer.id } })).toBe(1);
  } finally {
    for (const id of leadIds) await prisma.localBusinessLead.deleteMany({ where: { id } });
    await prisma.deal.deleteMany({ where: { id: foreignDeal.id } });
    await prisma.customer.deleteMany({ where: { id: { in: [foreignCustomer.id, ownCustomer.id] } } });
    await prisma.tenant.deleteMany({ where: { id: foreignTenant.id } });
    await prisma.leadSearchCampaign.deleteMany({ where: { id: campaignId } });
  }
});
