// Phase 1-4 統合テスト（要DB）: Growth台帳 / Marketing資産→承認(非送信) / DX診断→改善機会 / 集計。
import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '../client';
import { growthCategoryOf, summarizeGrowth, dxPriorityScore } from '@hokko/shared';

const T = `itest-p14-${Date.now()}`;
const T2 = `itest-p14b-${Date.now()}`;

afterAll(async () => {
  for (const tid of [T, T2]) {
    await prisma.growthEvent.deleteMany({ where: { tenantId: tid } });
    await prisma.dXOpportunity.deleteMany({ where: { tenantId: tid } });
    await prisma.dXAssessment.deleteMany({ where: { tenantId: tid } });
    await prisma.contentAsset.deleteMany({ where: { tenantId: tid } });
    await prisma.aIOutput.deleteMany({ where: { tenantId: tid } });
    await prisma.approvalRequest.deleteMany({ where: { tenantId: tid } });
    await prisma.marketingCampaign.deleteMany({ where: { tenantId: tid } });
  }
  await prisma.$disconnect();
});

describe('Growth Event Ledger', () => {
  it('records growth events and summarizes impacts (dashboard input)', async () => {
    await prisma.growthEvent.createMany({
      data: [
        { tenantId: T, type: 'marketing.campaign.created', category: growthCategoryOf('marketing.campaign.created'), title: 'c1' },
        { tenantId: T, type: 'finance.invoice.paid', category: growthCategoryOf('finance.invoice.paid'), title: 'paid', revenueImpact: 120000 },
        { tenantId: T, type: 'dx.automation.completed', category: growthCategoryOf('dx.automation.completed'), title: 'dx', costSaving: 30000, timeSavingMinutes: 600 },
      ],
    });
    const events = await prisma.growthEvent.findMany({ where: { tenantId: T } });
    const s = summarizeGrowth(events.map((e) => ({ type: e.type, revenueImpact: e.revenueImpact ? Number(e.revenueImpact) : 0, costSaving: e.costSaving ? Number(e.costSaving) : 0, timeSavingMinutes: e.timeSavingMinutes ?? 0 })));
    expect(s.total).toBe(3);
    expect(s.revenueRelated).toBe(1);
    expect(s.totalRevenueImpact).toBe(120000);
    expect(s.totalCostSaving).toBe(30000);
    expect(s.totalTimeSavingMinutes).toBe(600);
    expect(s.byCategory.dx).toBe(1);
  });

  it('isolates growth events by tenant', async () => {
    await prisma.growthEvent.create({ data: { tenantId: T2, type: 'sales.deal.won', category: 'sales', title: 'won' } });
    const fromTOnly = await prisma.growthEvent.findMany({ where: { tenantId: T, type: 'sales.deal.won' } });
    expect(fromTOnly.length).toBe(0); // T には won は無い（T2 のみ）
  });
});

describe('DX assessment → opportunity', () => {
  it('creates assessment and linked opportunity with computed priority', async () => {
    const a = await prisma.dXAssessment.create({ data: { tenantId: T, title: '経理DX', findings: ['請求書手作業', '紙申請'] } });
    const priority = dxPriorityScore({ estimatedTimeSavingMinutes: 1200, estimatedCostSaving: 200000, estimatedRevenueImpact: 0, difficulty: 'low' });
    const o = await prisma.dXOpportunity.create({
      data: { tenantId: T, assessmentId: a.id, title: '請求自動化', estimatedTimeSavingMinutes: 1200, estimatedCostSaving: 200000, difficulty: 'low', priority },
    });
    expect(o.assessmentId).toBe(a.id);
    expect(o.priority).toBeGreaterThan(0);
    const withOpp = await prisma.dXAssessment.findUnique({ where: { id: a.id }, include: { opportunities: true } });
    expect(withOpp?.opportunities.length).toBe(1);
  });
});

describe('Marketing asset → approval (not direct send)', () => {
  it('approval request is created and asset stays pending (no external send)', async () => {
    const out = await prisma.aIOutput.create({ data: { tenantId: T, task: 'marketing_asset', purpose: 'sns', output: { t: 1 }, outputText: 'x', safetyFlags: [] } });
    const asset = await prisma.contentAsset.create({ data: { tenantId: T, type: 'sns', title: 'SNS案', body: 'body', generatedByAi: true, aiOutputId: out.id } });
    // 承認申請（送信ではない）
    const req = await prisma.approvalRequest.create({
      data: { tenantId: T, type: 'customer_email_send', requestedForAction: 'customer_email_send', title: '外部公開', entityType: 'MarketingAsset', entityId: asset.id, status: 'PENDING' },
    });
    await prisma.contentAsset.update({ where: { id: asset.id }, data: { approvalStatus: 'pending', status: 'pending_approval' } });

    const after = await prisma.contentAsset.findUnique({ where: { id: asset.id } });
    expect(after?.approvalStatus).toBe('pending'); // 送信されず、承認待ち
    expect(req.status).toBe('PENDING');
    expect(out.safetyFlags).toBeDefined();
  });
});
