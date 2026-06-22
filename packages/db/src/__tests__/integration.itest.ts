import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { computeQuoteTotals, hasReservationConflict, isOverdue } from '@hokko/shared';
import { summarizeMeeting, generateOutreachDraft, getEmbeddingProvider } from '@hokko/ai';
import { rankByEmbedding } from '@hokko/shared';

const prisma = new PrismaClient();
let tenantId: string;
let userId: string;

beforeAll(async () => {
  const tenant = await prisma.tenant.create({ data: { name: `IT-${Date.now()}` } });
  tenantId = tenant.id;
  const role = await prisma.role.create({ data: { tenantId, key: 'OWNER', name: '社長', permissions: ['*'] } });
  const user = await prisma.user.create({
    data: { tenantId, email: `it-${Date.now()}@test.local`, name: 'IT', passwordHash: await bcrypt.hash('password123!', 10) },
  });
  userId = user.id;
  await prisma.userRole.create({ data: { tenantId, userId, roleId: role.id } });
});

afterAll(async () => {
  // テスト用テナントのデータをクリーンアップ
  const models = [
    'auditLog', 'outreachSendLog', 'outreachApproval', 'outreachDraft', 'leadPipelineStageHistory',
    'placeReview', 'placeDataSnapshot', 'websiteFinding', 'websiteScan', 'leadScore', 'leadInsight',
    'socialProfile', 'localBusinessContact', 'localBusinessLead', 'leadSearchCondition', 'leadSearchCampaign',
    'knowledgeChunk', 'knowledgeDocument', 'actionItem', 'decision', 'meetingMinutes', 'transcriptSegment',
    'transcript', 'recording', 'meeting', 'leaseReservationLine', 'leaseReservation', 'productAsset',
    'quoteLineItem', 'quote', 'payment', 'invoiceLineItem', 'invoice', 'approvalRequest',
    'dealStageHistory', 'deal', 'customerTimelineEvent', 'customer', 'userRole', 'user', 'role',
  ] as const;
  for (const m of models) {
    // @ts-expect-error dynamic model access
    await prisma[m].deleteMany({ where: { tenantId } }).catch(() => {});
  }
  await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
  await prisma.$disconnect();
});

describe('統合: 認証', () => {
  it('パスワードが検証できる', async () => {
    const u = await prisma.user.findFirst({ where: { id: userId } });
    expect(await bcrypt.compare('password123!', u!.passwordHash)).toBe(true);
  });
});

describe('統合: CRM・案件・見積・請求', () => {
  let customerId: string;
  let dealId: string;

  it('顧客を作成', async () => {
    const c = await prisma.customer.create({ data: { tenantId, name: 'テスト顧客', ownerId: userId } });
    customerId = c.id;
    expect(c.id).toBeTruthy();
  });

  it('案件を作成', async () => {
    const d = await prisma.deal.create({ data: { tenantId, customerId, title: 'テスト案件', amount: 1_000_000, cost: 700_000 } });
    dealId = d.id;
    expect(Number(d.amount)).toBe(1_000_000);
  });

  it('見積を作成し粗利を計算', async () => {
    const totals = computeQuoteTotals(1_000_000, 700_000, 10, 10);
    const q = await prisma.quote.create({
      data: { tenantId, dealId, number: 'IT-Q1', title: 'テスト見積', subtotal: 1_000_000, cost: 700_000, discountRate: 10, total: totals.total, grossMargin: totals.grossMargin, grossMarginRate: totals.grossMarginRate },
    });
    expect(Number(q.total)).toBe(990_000);
    expect(Number(q.grossMarginRate)).toBeCloseTo(22.2, 1);
  });

  it('請求を作成し延滞を判定', async () => {
    const inv = await prisma.invoice.create({
      data: { tenantId, customerId, number: 'IT-INV1', status: 'ISSUED', dueDate: new Date('2026-01-01'), total: 1_100_000 },
    });
    expect(isOverdue(inv.dueDate, inv.status, new Date('2026-06-22'))).toBe(true);
  });
});

describe('統合: 在庫・リース', () => {
  it('商品を作成し予約重複を検知', async () => {
    const asset = await prisma.productAsset.create({ data: { tenantId, code: 'IT-A1', name: 'テント', quantity: 10 } });
    const r1 = await prisma.leaseReservation.create({
      data: { tenantId, eventName: 'A', startAt: new Date('2026-07-01'), endAt: new Date('2026-07-03'), lines: { create: [{ tenantId, assetId: asset.id, quantity: 8 }] } },
      include: { lines: true },
    });
    const conflict = hasReservationConflict(
      { assetId: asset.id, quantity: 5, startAt: '2026-07-02', endAt: '2026-07-04' },
      r1.lines.map((l) => ({ assetId: l.assetId, quantity: l.quantity, startAt: r1.startAt, endAt: r1.endAt })),
      asset.quantity,
    );
    expect(conflict).toBe(true);
  });
});

describe('統合: 会議議事録AI', () => {
  it('テキストから議事録とアクションを生成', async () => {
    const transcript = '田中: テント10張りで進めることに決定しました。\n佐藤: 見積を金曜までに作成してお願いします。';
    const m = await prisma.meeting.create({ data: { tenantId, title: 'IT会議', type: 'social' } });
    const minutes = await summarizeMeeting({ title: 'IT会議', transcript });
    await prisma.meetingMinutes.create({ data: { tenantId, meetingId: m.id, summary3: minutes.summary3, ceoSummary: minutes.ceoSummary } });
    for (const ai of minutes.actionItems) {
      await prisma.actionItem.create({ data: { tenantId, meetingId: m.id, title: ai.title, priority: ai.priority } });
    }
    const tasks = await prisma.actionItem.count({ where: { tenantId, meetingId: m.id } });
    expect(minutes.decisions.length).toBeGreaterThan(0);
    expect(tasks).toBeGreaterThan(0);
  });
});

describe('統合: LeadMap キャンペーン→分析→営業メール→承認', () => {
  it('キャンペーン作成・リード・営業メール下書き・承認フロー', async () => {
    const campaign = await prisma.leadSearchCampaign.create({
      data: { tenantId, name: '札幌市 美容室', region: '札幌市', industry: '美容室', forSalesType: 'Web制作' },
    });
    const lead = await prisma.localBusinessLead.create({
      data: { tenantId, campaignId: campaign.id, name: 'テスト美容室', industry: '美容室', city: '札幌市', rating: 4.4, reviewCount: 80, priority: 72, stage: 'ANALYZED' },
    });
    const draftContent = await generateOutreachDraft({
      leadName: lead.name, industry: '美容室', city: '札幌市', salesType: 'Web制作',
      strengths: ['口コミ評価が高い'], opportunities: ['予約導線が弱い'],
    });
    expect(draftContent.body).toContain('テスト美容室');

    const draft = await prisma.outreachDraft.create({
      data: { tenantId, leadId: lead.id, subject: draftContent.subject, body: draftContent.body, status: 'DRAFT' },
    });
    // 承認申請
    const approval = await prisma.approvalRequest.create({
      data: { tenantId, type: 'outreach_send', title: '営業メール送信', entityType: 'OutreachDraft', entityId: draft.id, status: 'PENDING' },
    });
    await prisma.outreachDraft.update({ where: { id: draft.id }, data: { status: 'PENDING_APPROVAL' } });
    // 承認
    await prisma.approvalRequest.update({ where: { id: approval.id }, data: { status: 'APPROVED', decidedById: userId } });
    await prisma.outreachSendLog.create({
      data: { tenantId, draftId: draft.id, toAddress: 'x@example.jp', fromAddress: 'me@dreexy.jp', subject: draft.subject, body: draft.body, status: 'logged', provider: 'log', approvedById: userId },
    });
    const sentDraft = await prisma.outreachDraft.update({ where: { id: draft.id }, data: { status: 'SENT' } });
    expect(sentDraft.status).toBe('SENT');

    const logCount = await prisma.outreachSendLog.count({ where: { tenantId, draftId: draft.id } });
    expect(logCount).toBe(1);
  });
});

describe('統合: ナレッジ検索（Embedding）', () => {
  it('ナレッジ文書を登録し類似検索できる', async () => {
    const embedder = getEmbeddingProvider();
    const docs = [
      ['美容室の営業切り口', '口コミ評価が高い美容室には予約導線（LINE予約）の改善が刺さる。'],
      ['会計処理', '経費の仕訳を自動化する。'],
    ];
    for (const [title, body] of docs) {
      const doc = await prisma.knowledgeDocument.create({ data: { tenantId, title: title!, body: body! } });
      const [vec] = await embedder.embed([`${title} ${body}`]);
      await prisma.knowledgeChunk.create({ data: { tenantId, documentId: doc.id, text: `${title} ${body}`, embedding: vec! } });
    }
    const chunks = await prisma.knowledgeChunk.findMany({ where: { tenantId } });
    const [q] = await embedder.embed(['美容室に刺さる営業の切り口は？']);
    const ranked = rankByEmbedding(q!, chunks.map((c) => ({ embedding: c.embedding, text: c.text })), 1);
    expect(ranked[0]!.item.text).toContain('美容室');
  });
});

describe('統合: 監査ログ', () => {
  it('監査ログが記録される', async () => {
    await prisma.auditLog.create({ data: { tenantId, actorId: userId, action: 'create', entityType: 'Customer', summary: 'IT監査ログ' } });
    const count = await prisma.auditLog.count({ where: { tenantId } });
    expect(count).toBeGreaterThan(0);
  });
});
