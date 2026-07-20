import { test, expect } from '@playwright/test';
import { prisma } from '@hokko/db';
import { convertLeadToCustomer, repairLeadLinks, type LeadConvertFailpoint } from '../../lib/domains/crm/lead-convert';

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
  const actor = { tenantId: t, userId: uid, roles: ['OWNER' as const] };
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
    const actor = { tenantId: t, userId: uid, roles: ['OWNER' as const] };
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

test('非人間 拒否（domain・roles必須 fail-closed）: AI_AGENT / AI_ASSISTANT / AI+OWNER混在 / roles空・欠落 はすべて forbidden（R3 High）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const campaignId = await makeCampaign(t);
  const leadId = await makeLead(t, campaignId);
  try {
    // domain は optional boolean を受けず roles（必須）を isHumanUser で fail-closed 判定する。
    // 純AI / アシスタント / AI+OWNER 混在 / 空配列、さらに JS 呼び出しで roles を欠落させた場合も forbidden。
    const nonHumanRoleSets: string[][] = [['AI_AGENT'], ['AI_ASSISTANT'], ['AI_AGENT', 'OWNER'], []];
    for (const roles of nonHumanRoleSets) {
      const r = await convertLeadToCustomer({ tenantId: t, userId: uid, roles: roles as never }, leadId);
      expect(r.kind, `roles=${JSON.stringify(roles)} は forbidden`).toBe('forbidden');
    }
    // fail-open 検出: roles を**省略**した呼び出し（型を破る JS 経由）も DB 接触前に forbidden。
    const omitted = await convertLeadToCustomer({ tenantId: t, userId: uid } as never, leadId);
    expect(omitted.kind, 'roles 欠落も fail-closed').toBe('forbidden');
    const lead = await prisma.localBusinessLead.findUnique({ where: { id: leadId } });
    expect(lead!.customerId).toBeNull();
    expect(lead!.dealId).toBeNull();
    expect(lead!.stage).toBe('NEW');
    expect(await prisma.deal.count({ where: { tenantId: t, leadId } })).toBe(0);
    expect(await prisma.leadPipelineStageHistory.count({ where: { leadId } })).toBe(0);
    // 人間（OWNER）は同一 domain 境界で成立する（対の正常系）。
    const ok = await convertLeadToCustomer({ tenantId: t, userId: uid, roles: ['OWNER'] }, leadId);
    expect(ok.kind).toBe('created');
  } finally {
    await cleanupLead(t, leadId, campaignId);
  }
});

test('既存 link 整合 fail-closed（R2 P2-1）: 別tenant / dangling / customerのみ / dealのみ / 同一tenant別Lead backlink は inconsistent（越境0・重複0）', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const actor = { tenantId: t, userId: uid, roles: ['OWNER' as const] };
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

// ---- Codex PR#60 R3 P2: repair（不整合 link の実効修復）の domain 証拠 ----

test('repair（R3 P2）: 5種の不整合を人間限定で修復し、切離し→正規1組収束・修復Audit 1・越境不変・retry冪等', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const human = { tenantId: t, userId: uid, roles: ['OWNER' as const] };
  const campaignId = await makeCampaign(t);
  const foreignTenant = await prisma.tenant.create({ data: { name: `LCR-FOREIGN-${process.pid}-${Date.now()}` } });
  const foreignCustomer = await prisma.customer.create({ data: { tenantId: foreignTenant.id, name: 'foreign-customer-r' } });
  const foreignDeal = await prisma.deal.create({ data: { tenantId: foreignTenant.id, customerId: foreignCustomer.id, title: 'foreign-deal-r' } });
  const ownCustomer = await prisma.customer.create({ data: { tenantId: t, name: 'LCR-own-customer' } });
  const leadA = await makeLead(t, campaignId);
  const backlinkDeal = await prisma.deal.create({ data: { tenantId: t, customerId: ownCustomer.id, title: 'LCR-backlink-deal', leadId: leadA } });

  const leadIds: string[] = [];
  const createdCustomerIds: string[] = [];
  const mk = async (data: { customerId?: string | null; dealId?: string | null }) => {
    const lead = await prisma.localBusinessLead.create({
      data: { tenantId: t, campaignId, name: `LCR-INC-${process.pid}-${Date.now()}-${leadIds.length}`.slice(0, 40), industry: '美容室', stage: 'NEW', priority: 50, customerId: data.customerId ?? null, dealId: data.dealId ?? null },
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
      ['別Lead backlink', await mk({ customerId: ownCustomer.id, dealId: backlinkDeal.id })],
    ] as const;
    for (const [label, id] of cases) {
      // 非人間は修復できない（人間限定・書込0）。
      const ai = await repairLeadLinks({ tenantId: t, userId: uid, roles: ['AI_AGENT' as const] as never }, id);
      expect(ai.kind, `${label}: AI は forbidden`).toBe('forbidden');
      // 人間の修復: 切離し→正規1組収束。
      const r = await repairLeadLinks(human, id);
      expect(r.kind, `${label}: repaired`).toBe('repaired');
      const lead = await prisma.localBusinessLead.findUnique({ where: { id }, select: { customerId: true, dealId: true } });
      expect(lead!.customerId, `${label}: 新規 Customer に再連携`).toBeTruthy();
      expect(lead!.dealId).toBeTruthy();
      createdCustomerIds.push(lead!.customerId!);
      // 相互 backlink 一致（整合済み）。
      expect(await prisma.deal.count({ where: { id: lead!.dealId!, tenantId: t, customerId: lead!.customerId!, leadId: id } }), `${label}: 相互ID一致`).toBe(1);
      // 修復 Audit ちょうど 1。
      expect(await prisma.auditLog.count({ where: { tenantId: t, entityType: 'LocalBusinessLead', entityId: id, action: 'lead_link_repair' } }), `${label}: 修復監査 1`).toBe(1);
      // retry は冪等（already・修復監査は増えない・Customer/Deal 追加なし）。
      const r2 = await repairLeadLinks(human, id);
      expect(r2.kind, `${label}: retry は already`).toBe('already');
      expect(await prisma.auditLog.count({ where: { tenantId: t, entityType: 'LocalBusinessLead', entityId: id, action: 'lead_link_repair' } })).toBe(1);
      expect(await prisma.deal.count({ where: { tenantId: t, leadId: id } }), `${label}: Deal 1 組のみ`).toBe(1);
    }
    // 越境実体・backlink 先は一切改変されない（内容・存在も戻り値に出ない）。
    expect(await prisma.customer.count({ where: { id: foreignCustomer.id, tenantId: foreignTenant.id } })).toBe(1);
    expect(await prisma.deal.count({ where: { id: foreignDeal.id, tenantId: foreignTenant.id, customerId: foreignCustomer.id } })).toBe(1);
    expect(await prisma.deal.count({ where: { id: backlinkDeal.id, leadId: leadA } }), 'backlink Deal は Lead A のまま不変').toBe(1);
    // link なしのリードは修復対象外（not-linked・書込なし）。
    const bare = await makeLead(t, campaignId);
    leadIds.push(bare);
    const nl = await repairLeadLinks(human, bare);
    expect(nl.kind).toBe('not-linked');
    expect(await prisma.auditLog.count({ where: { tenantId: t, entityType: 'LocalBusinessLead', entityId: bare, action: 'lead_link_repair' } })).toBe(0);
  } finally {
    for (const id of leadIds) {
      await prisma.leadPipelineStageHistory.deleteMany({ where: { leadId: id } });
      await prisma.auditLog.deleteMany({ where: { tenantId: t, entityType: 'LocalBusinessLead', entityId: id } });
      await prisma.deal.deleteMany({ where: { tenantId: t, leadId: id } });
      await prisma.localBusinessLead.deleteMany({ where: { id } });
    }
    for (const cid of createdCustomerIds) {
      await prisma.customerTimelineEvent.deleteMany({ where: { customerId: cid } });
      await prisma.auditLog.deleteMany({ where: { tenantId: t, entityType: 'Customer', entityId: cid } });
      await prisma.deal.deleteMany({ where: { customerId: cid } });
      await prisma.customer.deleteMany({ where: { id: cid } });
    }
    await prisma.localBusinessLead.deleteMany({ where: { id: leadA } });
    await prisma.deal.deleteMany({ where: { id: { in: [foreignDeal.id, backlinkDeal.id] } } });
    await prisma.customer.deleteMany({ where: { id: { in: [foreignCustomer.id, ownCustomer.id] } } });
    await prisma.tenant.deleteMany({ where: { id: foreignTenant.id } });
    await prisma.leadSearchCampaign.deleteMany({ where: { id: campaignId } });
  }
});

test('repair 競合（R3 P2）: 同一リードへの並行修復 2 本は FOR UPDATE 直列化で repaired 1 / already 1・修復Audit 1・1組収束', async () => {
  const t = await tenantId();
  const uid = await ceoUserId();
  const human = { tenantId: t, userId: uid, roles: ['OWNER' as const] };
  const campaignId = await makeCampaign(t);
  const lead = await prisma.localBusinessLead.create({
    data: { tenantId: t, campaignId, name: `LCR-RACE-${process.pid}-${Date.now()}`.slice(0, 40), industry: '美容室', stage: 'NEW', priority: 50, customerId: 'cus_dangling_race_000000', dealId: 'deal_dangling_race_0000' },
  });
  try {
    const barrier = makeBarrier(2);
    const [a, b] = await Promise.all([
      repairLeadLinks(human, lead.id, { __beforeLockForTest: barrier }),
      repairLeadLinks(human, lead.id, { __beforeLockForTest: barrier }),
    ]);
    const kinds = [a.kind, b.kind].sort();
    expect(kinds, '勝者 repaired 1 / 敗者 already 1').toEqual(['already', 'repaired']);
    expect(await prisma.auditLog.count({ where: { tenantId: t, entityType: 'LocalBusinessLead', entityId: lead.id, action: 'lead_link_repair' } }), '修復監査 1').toBe(1);
    expect(await prisma.deal.count({ where: { tenantId: t, leadId: lead.id } }), 'Deal 1 組のみ').toBe(1);
  } finally {
    const cur = await prisma.localBusinessLead.findUnique({ where: { id: lead.id }, select: { customerId: true } });
    await prisma.leadPipelineStageHistory.deleteMany({ where: { leadId: lead.id } });
    await prisma.auditLog.deleteMany({ where: { tenantId: t, entityType: 'LocalBusinessLead', entityId: lead.id } });
    await prisma.deal.deleteMany({ where: { tenantId: t, leadId: lead.id } });
    if (cur?.customerId) {
      await prisma.customerTimelineEvent.deleteMany({ where: { customerId: cur.customerId } });
      await prisma.auditLog.deleteMany({ where: { tenantId: t, entityType: 'Customer', entityId: cur.customerId } });
      await prisma.deal.deleteMany({ where: { customerId: cur.customerId } });
      await prisma.customer.deleteMany({ where: { id: cur.customerId } });
    }
    await prisma.localBusinessLead.deleteMany({ where: { id: lead.id } });
    await prisma.leadSearchCampaign.deleteMany({ where: { id: campaignId } });
  }
});
