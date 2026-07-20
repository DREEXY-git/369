import { test, expect, type Page, type Browser } from '@playwright/test';
import { prisma } from '@hokko/db';
import { formatJpy } from '@hokko/shared';

// M1-b hardening R2 — Codex E 監査（docs/audit/codex_m1b_E.md）の E-05 / E-06 に対する
// 実 route ＋ 実 PostgreSQL 証拠。round1 で実装済みの修正を、正常 seed だけの UI smoke ではなく
// 「越境した子行を意図的に結合した corrupted fixture」「認証済み AI/混在 role の実 POST」で実証する。
//
// E-05（cross-tenant child leakage）: 親子 tenant 整合は単一列 FK のため DB では強制されない。
//   tenant A の親（EventProject / Invoice / Meeting / OutreachDraft）へ tenant B 所属の子を直接 insert し、
//   (1) 旧 include（子に tenant 条件なし＝撤去済み barrier）は越境子を同乗させる RED を DB 実測、
//   (2) 修正後 include（子に tenantId 条件）＋実 route の DOM/集計は foreign marker が 0 件（GREEN）、
//   (3) 自 tenant の子は無回帰で表示、
//   (4) outreach 承認決定の updateMany は対象 tenant 行だけ更新し foreign OutreachApproval は PENDING のまま
//   を証明する。
//
// E-06（human-only guard の action wiring）: isHumanUser 純関数の unit はあるが、今回変更した
//   Server Action が DB 接触前に AI/混在 role を拒否することは未検証。AI role に業務 permission が付く
//   設計なので、認証済みの AI(only)/AI+OWNER(mixed) の実 POST を replay し、対象 table の増分 0 と、
//   人間 OWNER の positive control が「ちょうど 1 組」作成することを対で固定する。
//
// 外部作用なし: EXTERNAL_SEND 無効前提（実メール/実 LLM/Secrets/Production を一切使わない）。
// fixture/cleanup は本テストが作成した ID に限定（seed 非編集・共有データを広域 deleteMany しない）。
// 実行前提は他 evidence spec と同一（seed 済みローカル/CI 使い捨て PostgreSQL・retries=0）。

function assertLocalDatabaseUrl(): void {
  let host = '';
  try {
    host = new URL(process.env.DATABASE_URL ?? '').hostname;
  } catch {
    host = '';
  }
  if (host !== 'localhost' && host !== '127.0.0.1') {
    throw new Error(
      `TEST_ENVIRONMENT_APPROVAL_REQUIRED: DATABASE_URL host="${host}" は使い捨てローカル/CI service と機械確認できません`,
    );
  }
}

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

async function tenantId(): Promise<string> {
  const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { tenantId: true } });
  if (!ceo) throw new Error('seed 未整備: ceo@ikezaki.local が存在しません');
  return ceo.tenantId;
}

const STAMP = `${process.pid}-${Date.now()}`;

// =============================================================================
// E-05 — 親子 tenant 境界（cross-tenant child leakage）
// =============================================================================

// ---- Event 詳細（7 子コレクション） ----
const OWN_USAGE = `E05-OWN-USAGE-${STAMP}`;
const FGN_USAGE = `E05-XT-USAGE-${STAMP}`;
const OWN_COST_CAT = `E05-OWN-COST-${STAMP}`;
const FGN_COST_CAT = `E05-XT-COST-${STAMP}`;
const FGN_COST_AMT = 987_654_321; // foreign 原価（集計・DOM 双方に出てはならない sentinel 金額）
const OWN_COST_AMT = 1_234;
const OWN_PROP = `E05-OWN-PROPOSAL-${STAMP}`;
const FGN_PROP = `E05-XT-PROPOSAL-${STAMP}`;
const OWN_STAFF = `E05-OWN-STAFF-${STAMP}`;
const FGN_STAFF = `E05-XT-STAFF-${STAMP}`;
const FGN_RISK_TYPE = `E05-XT-RISKTYPE-${STAMP}`; // 未知 type はラベル未定義のため raw 描画＝DOM 検出可能
const FGN_LOGI_TYPE = `E05-XT-LOGITYPE-${STAMP}`;

// ---- Invoice 詳細（lineItems / payments） ----
const OWN_LI = `E05-OWN-LI-${STAMP}`;
const FGN_LI = `E05-XT-LI-${STAMP}`;
const FGN_LI_AMT = 876_543_210;
const OWN_PAY_METHOD = `E05-OWN-PAYM-${STAMP}`;
const FGN_PAY_METHOD = `E05-XT-PAYM-${STAMP}`;
const OWN_PAY_AMT = 2_000;
const FGN_PAY_AMT = 765_432_100;

// ---- Meeting 詳細（minutes / decisions / actionItems / transcripts / segments） ----
const OWN_SUM = `E05-OWN-SUMMARY-${STAMP}`;
const FGN_SUM = `E05-XT-SUMMARY-${STAMP}`;
const OWN_DEC = `E05-OWN-DECISION-${STAMP}`;
const FGN_DEC = `E05-XT-DECISION-${STAMP}`;
const OWN_ACT = `E05-OWN-ACTION-${STAMP}`;
const FGN_ACT = `E05-XT-ACTION-${STAMP}`;
const OWN_SEG = `E05-OWN-SEGMENT-${STAMP}`;
const FGN_SEG = `E05-XT-SEGMENT-${STAMP}`;

let tenantA = '';
let foreignTenantId = '';

// Event
let eventId = '';
const oEvt: Record<string, string> = {};
const fEvt: Record<string, string> = {};
// Invoice
let invoiceId = '';
let oLiId = '';
let fLiId = '';
let oPayId = '';
let fPayId = '';
// Meeting
let meetingId = '';
let oMinId = '';
let fMinId = '';
let oDecId = '';
let fDecId = '';
let oActId = '';
let fActId = '';
let oTransId = '';
let fTransId = '';
let oSegId = '';
let fSegId = '';
// outreach 承認決定（RED / GREEN 別 fixture）
let outreachCampaignId = '';
let outreachLeadId = '';
let redDraftId = '';
let greenDraftId = '';
let redOwnApprovalId = '';
let redForeignApprovalId = '';
let greenOwnApprovalId = '';
let greenForeignApprovalId = '';

test.describe('E-05 親子tenant境界（cross-tenant child leakage）', () => {
  test.beforeAll(async () => {
    assertLocalDatabaseUrl();
    tenantA = await tenantId();
    const foreign = await prisma.tenant.create({ data: { name: `m1b-e05-foreign-${STAMP}` } });
    foreignTenantId = foreign.id;

    // --- Event: tenant A の親 ＋ 7 種の own 子（無回帰）と foreign 子（越境） ---
    const event = await prisma.eventProject.create({
      data: { tenantId: tenantA, name: `E05-EVT-${STAMP}`, status: 'planned', revenue: 0, cost: 0 },
      select: { id: true },
    });
    eventId = event.id;
    oEvt.usage = (await prisma.eventProductUsage.create({ data: { tenantId: tenantA, eventId, assetName: OWN_USAGE, quantity: 1 }, select: { id: true } })).id;
    fEvt.usage = (await prisma.eventProductUsage.create({ data: { tenantId: foreignTenantId, eventId, assetName: FGN_USAGE, quantity: 9 }, select: { id: true } })).id;
    oEvt.cost = (await prisma.eventCost.create({ data: { tenantId: tenantA, eventId, category: OWN_COST_CAT, amount: OWN_COST_AMT }, select: { id: true } })).id;
    fEvt.cost = (await prisma.eventCost.create({ data: { tenantId: foreignTenantId, eventId, category: FGN_COST_CAT, amount: FGN_COST_AMT }, select: { id: true } })).id;
    // own snapshot を古く・foreign snapshot を新しく作る（take:1 desc で foreign が選ばれる RED を成立させる）。
    oEvt.snap = (await prisma.eventGrossProfitSnapshot.create({ data: { tenantId: tenantA, eventId, revenue: 100, cost: 40, gross: 60, marginRate: 60, createdAt: new Date(Date.now() - 3_600_000) }, select: { id: true } })).id;
    fEvt.snap = (await prisma.eventGrossProfitSnapshot.create({ data: { tenantId: foreignTenantId, eventId, revenue: 111000, cost: 222000, gross: -111000, marginRate: 0, createdAt: new Date() }, select: { id: true } })).id;
    oEvt.prop = (await prisma.eventNextProposal.create({ data: { tenantId: tenantA, eventId, proposal: OWN_PROP }, select: { id: true } })).id;
    fEvt.prop = (await prisma.eventNextProposal.create({ data: { tenantId: foreignTenantId, eventId, proposal: FGN_PROP }, select: { id: true } })).id;
    oEvt.staff = (await prisma.eventStaffAssignment.create({ data: { tenantId: tenantA, eventId, name: OWN_STAFF, role: 'staff', cost: 0 }, select: { id: true } })).id;
    fEvt.staff = (await prisma.eventStaffAssignment.create({ data: { tenantId: foreignTenantId, eventId, name: FGN_STAFF, role: 'staff', cost: 0 }, select: { id: true } })).id;
    oEvt.risk = (await prisma.eventRisk.create({ data: { tenantId: tenantA, eventId, type: 'weather', severity: 'low', status: 'open' }, select: { id: true } })).id;
    fEvt.risk = (await prisma.eventRisk.create({ data: { tenantId: foreignTenantId, eventId, type: FGN_RISK_TYPE, severity: 'high', status: 'open' }, select: { id: true } })).id;
    oEvt.logi = (await prisma.logisticsTask.create({ data: { tenantId: tenantA, eventId, type: 'delivery', title: `E05-OWN-LOGI-${STAMP}`, status: 'todo' }, select: { id: true } })).id;
    fEvt.logi = (await prisma.logisticsTask.create({ data: { tenantId: foreignTenantId, eventId, type: FGN_LOGI_TYPE, title: 'xt', status: 'todo' }, select: { id: true } })).id;

    // --- Invoice: tenant A の親 ＋ own/foreign lineItem・payment ---
    const invoice = await prisma.invoice.create({
      data: { tenantId: tenantA, number: `E05-INV-${STAMP}`, status: 'ISSUED', subtotal: 5000, taxAmount: 500, total: 5500, paidAmount: OWN_PAY_AMT },
      select: { id: true },
    });
    invoiceId = invoice.id;
    oLiId = (await prisma.invoiceLineItem.create({ data: { tenantId: tenantA, invoiceId, name: OWN_LI, quantity: 1, unitPrice: 5000, amount: 5000 }, select: { id: true } })).id;
    fLiId = (await prisma.invoiceLineItem.create({ data: { tenantId: foreignTenantId, invoiceId, name: FGN_LI, quantity: 1, unitPrice: FGN_LI_AMT, amount: FGN_LI_AMT }, select: { id: true } })).id;
    oPayId = (await prisma.payment.create({ data: { tenantId: tenantA, invoiceId, amount: OWN_PAY_AMT, method: OWN_PAY_METHOD }, select: { id: true } })).id;
    fPayId = (await prisma.payment.create({ data: { tenantId: foreignTenantId, invoiceId, amount: FGN_PAY_AMT, method: FGN_PAY_METHOD }, select: { id: true } })).id;

    // --- Meeting: tenant A の親 ＋ own/foreign minutes・decision・actionItem・transcript・segment ---
    const meeting = await prisma.meeting.create({
      data: { tenantId: tenantA, title: `E05-MTG-${STAMP}`, type: 'internal', label: 'INTERNAL' },
      select: { id: true },
    });
    meetingId = meeting.id;
    oMinId = (await prisma.meetingMinutes.create({ data: { tenantId: tenantA, meetingId, summary3: OWN_SUM, ceoSummary: 'own', createdAt: new Date(Date.now() - 3_600_000) }, select: { id: true } })).id;
    fMinId = (await prisma.meetingMinutes.create({ data: { tenantId: foreignTenantId, meetingId, summary3: FGN_SUM, ceoSummary: 'xt', createdAt: new Date() }, select: { id: true } })).id;
    oDecId = (await prisma.decision.create({ data: { tenantId: tenantA, meetingId, text: OWN_DEC }, select: { id: true } })).id;
    fDecId = (await prisma.decision.create({ data: { tenantId: foreignTenantId, meetingId, text: FGN_DEC }, select: { id: true } })).id;
    oActId = (await prisma.actionItem.create({ data: { tenantId: tenantA, meetingId, title: OWN_ACT }, select: { id: true } })).id;
    fActId = (await prisma.actionItem.create({ data: { tenantId: foreignTenantId, meetingId, title: FGN_ACT }, select: { id: true } })).id;
    const oTrans = await prisma.transcript.create({ data: { tenantId: tenantA, meetingId, fullText: 'own' }, select: { id: true } });
    oTransId = oTrans.id;
    const fTrans = await prisma.transcript.create({ data: { tenantId: foreignTenantId, meetingId, fullText: 'xt' }, select: { id: true } });
    fTransId = fTrans.id;
    oSegId = (await prisma.transcriptSegment.create({ data: { tenantId: tenantA, transcriptId: oTransId, speaker: 'A', startSec: 0, text: OWN_SEG }, select: { id: true } })).id;
    // foreign segment を own transcript にぶら下げる（親子どちらも越境しうる面を突く）。
    fSegId = (await prisma.transcriptSegment.create({ data: { tenantId: foreignTenantId, transcriptId: oTransId, speaker: 'B', startSec: 1, text: FGN_SEG }, select: { id: true } })).id;

    // --- outreach 承認決定: RED / GREEN 各 fixture（同一 draft に own(A)/foreign(B) の PENDING approval） ---
    const camp = await prisma.leadSearchCampaign.create({ data: { tenantId: tenantA, name: `E05-OA-CAMP-${STAMP}`, region: '札幌市', industry: '美容室' }, select: { id: true } });
    outreachCampaignId = camp.id;
    const lead = await prisma.localBusinessLead.create({ data: { tenantId: tenantA, campaignId: outreachCampaignId, name: `E05-OA-LEAD-${STAMP}`, industry: '美容室', stage: 'NEW' }, select: { id: true } });
    outreachLeadId = lead.id;
    const redDraft = await prisma.outreachDraft.create({ data: { tenantId: tenantA, leadId: outreachLeadId, subject: 'red', body: 'red', status: 'PENDING_APPROVAL' }, select: { id: true } });
    redDraftId = redDraft.id;
    const greenDraft = await prisma.outreachDraft.create({ data: { tenantId: tenantA, leadId: outreachLeadId, subject: 'green', body: 'green', status: 'PENDING_APPROVAL' }, select: { id: true } });
    greenDraftId = greenDraft.id;
    redOwnApprovalId = (await prisma.outreachApproval.create({ data: { tenantId: tenantA, draftId: redDraftId, status: 'PENDING' }, select: { id: true } })).id;
    redForeignApprovalId = (await prisma.outreachApproval.create({ data: { tenantId: foreignTenantId, draftId: redDraftId, status: 'PENDING' }, select: { id: true } })).id;
    greenOwnApprovalId = (await prisma.outreachApproval.create({ data: { tenantId: tenantA, draftId: greenDraftId, status: 'PENDING' }, select: { id: true } })).id;
    greenForeignApprovalId = (await prisma.outreachApproval.create({ data: { tenantId: foreignTenantId, draftId: greenDraftId, status: 'PENDING' }, select: { id: true } })).id;
  });

  test.afterAll(async () => {
    // cleanup は作成 ID（親 ID）限定。親 ID スコープは own/foreign 両方の子を含む＝seed 非破壊。
    if (eventId) {
      await prisma.eventProductUsage.deleteMany({ where: { eventId } });
      await prisma.eventCost.deleteMany({ where: { eventId } });
      await prisma.eventGrossProfitSnapshot.deleteMany({ where: { eventId } });
      await prisma.eventNextProposal.deleteMany({ where: { eventId } });
      await prisma.eventStaffAssignment.deleteMany({ where: { eventId } });
      await prisma.eventRisk.deleteMany({ where: { eventId } });
      await prisma.logisticsTask.deleteMany({ where: { eventId } });
      await prisma.eventProject.deleteMany({ where: { id: eventId } });
    }
    if (invoiceId) {
      await prisma.invoiceLineItem.deleteMany({ where: { invoiceId } });
      await prisma.payment.deleteMany({ where: { invoiceId } });
      await prisma.invoice.deleteMany({ where: { id: invoiceId } });
    }
    if (meetingId) {
      await prisma.transcriptSegment.deleteMany({ where: { transcriptId: { in: [oTransId, fTransId].filter(Boolean) } } });
      await prisma.transcript.deleteMany({ where: { meetingId } });
      await prisma.meetingMinutes.deleteMany({ where: { meetingId } });
      await prisma.decision.deleteMany({ where: { meetingId } });
      await prisma.actionItem.deleteMany({ where: { meetingId } });
      await prisma.meeting.deleteMany({ where: { id: meetingId } });
    }
    if (outreachCampaignId) {
      await prisma.outreachApproval.deleteMany({ where: { draftId: { in: [redDraftId, greenDraftId].filter(Boolean) } } });
      await prisma.outreachDraft.deleteMany({ where: { id: { in: [redDraftId, greenDraftId].filter(Boolean) } } });
      await prisma.localBusinessLead.deleteMany({ where: { id: outreachLeadId } });
      await prisma.leadSearchCampaign.deleteMany({ where: { id: outreachCampaignId } });
    }
    if (foreignTenantId) await prisma.tenant.deleteMany({ where: { id: foreignTenantId } });
    await prisma.$disconnect();
  });

  test('RED/GREEN実測（Event/Invoice/Meeting）: barrier無し旧includeは越境子を同乗・tenant条件付きincludeは0件', async () => {
    // --- Event ---
    const evtLegacy = await prisma.eventProject.findFirst({
      where: { id: eventId, tenantId: tenantA },
      include: {
        productUsages: true, costs: true,
        grossSnapshots: { orderBy: { createdAt: 'desc' }, take: 1 },
        nextProposals: true, staffAssignments: true, risks: true, logisticsTasks: true,
      },
    });
    const evtFixed = await prisma.eventProject.findFirst({
      where: { id: eventId, tenantId: tenantA },
      include: {
        productUsages: { where: { tenantId: tenantA } },
        costs: { where: { tenantId: tenantA } },
        grossSnapshots: { where: { tenantId: tenantA }, orderBy: { createdAt: 'desc' }, take: 1 },
        nextProposals: { where: { tenantId: tenantA } },
        staffAssignments: { where: { tenantId: tenantA } },
        risks: { where: { tenantId: tenantA } },
        logisticsTasks: { where: { tenantId: tenantA } },
      },
    });
    // RED: 旧経路（tenant 条件なし）は 7 子すべてで foreign を同乗させる。
    expect(evtLegacy!.productUsages.map((x) => x.id), 'usage 旧経路=foreign 同乗').toContain(fEvt.usage);
    expect(evtLegacy!.costs.map((x) => x.id), 'cost 旧経路=foreign 同乗').toContain(fEvt.cost);
    expect(evtLegacy!.grossSnapshots[0]!.id, 'snapshot take:1 旧経路=最新の foreign を選ぶ').toBe(fEvt.snap);
    expect(evtLegacy!.nextProposals.map((x) => x.id)).toContain(fEvt.prop);
    expect(evtLegacy!.staffAssignments.map((x) => x.id)).toContain(fEvt.staff);
    expect(evtLegacy!.risks.map((x) => x.id)).toContain(fEvt.risk);
    expect(evtLegacy!.logisticsTasks.map((x) => x.id)).toContain(fEvt.logi);
    // GREEN: 修正後（tenantId 条件付き）は foreign を 0 件・own のみ。
    expect(evtFixed!.productUsages.map((x) => x.id), 'usage GREEN=own のみ').toEqual([oEvt.usage]);
    expect(evtFixed!.costs.map((x) => x.id)).toEqual([oEvt.cost]);
    expect(evtFixed!.grossSnapshots[0]!.id, 'snapshot GREEN=own（foreign 除外）').toBe(oEvt.snap);
    expect(evtFixed!.nextProposals.map((x) => x.id)).toEqual([oEvt.prop]);
    expect(evtFixed!.staffAssignments.map((x) => x.id)).toEqual([oEvt.staff]);
    expect(evtFixed!.risks.map((x) => x.id)).toEqual([oEvt.risk]);
    expect(evtFixed!.logisticsTasks.map((x) => x.id)).toEqual([oEvt.logi]);

    // --- Invoice ---
    const invLegacy = await prisma.invoice.findFirst({ where: { id: invoiceId, tenantId: tenantA }, include: { lineItems: true, payments: { orderBy: { paidAt: 'desc' } } } });
    const invFixed = await prisma.invoice.findFirst({ where: { id: invoiceId, tenantId: tenantA }, include: { lineItems: { where: { tenantId: tenantA } }, payments: { where: { tenantId: tenantA }, orderBy: { paidAt: 'desc' } } } });
    expect(invLegacy!.lineItems.map((x) => x.id), 'lineItems 旧経路=foreign 同乗').toContain(fLiId);
    expect(invLegacy!.payments.map((x) => x.id), 'payments 旧経路=foreign 同乗').toContain(fPayId);
    expect(invFixed!.lineItems.map((x) => x.id), 'lineItems GREEN=own のみ').toEqual([oLiId]);
    expect(invFixed!.payments.map((x) => x.id), 'payments GREEN=own のみ').toEqual([oPayId]);

    // --- Meeting ---
    const mtgLegacy = await prisma.meeting.findFirst({
      where: { id: meetingId, tenantId: tenantA },
      include: { minutes: { orderBy: { createdAt: 'desc' }, take: 1 }, decisions: true, actionItems: true, transcripts: { include: { segments: { orderBy: { startSec: 'asc' } } } } },
    });
    const mtgFixed = await prisma.meeting.findFirst({
      where: { id: meetingId, tenantId: tenantA },
      include: {
        minutes: { where: { tenantId: tenantA }, orderBy: { createdAt: 'desc' }, take: 1 },
        decisions: { where: { tenantId: tenantA } },
        actionItems: { where: { tenantId: tenantA } },
        transcripts: { where: { tenantId: tenantA }, include: { segments: { where: { tenantId: tenantA }, orderBy: { startSec: 'asc' } } } },
      },
    });
    expect(mtgLegacy!.minutes[0]!.id, 'minutes take:1 旧経路=最新の foreign').toBe(fMinId);
    expect(mtgLegacy!.decisions.map((x) => x.id)).toContain(fDecId);
    expect(mtgLegacy!.actionItems.map((x) => x.id)).toContain(fActId);
    expect(mtgLegacy!.transcripts.flatMap((t) => t.segments).map((s) => s.id), 'segment 旧経路=foreign 同乗').toContain(fSegId);
    expect(mtgFixed!.minutes.map((x) => x.id), 'minutes GREEN=own のみ').toEqual([oMinId]);
    expect(mtgFixed!.decisions.map((x) => x.id)).toEqual([oDecId]);
    expect(mtgFixed!.actionItems.map((x) => x.id)).toEqual([oActId]);
    const fixedSegIds = mtgFixed!.transcripts.flatMap((t) => t.segments).map((s) => s.id);
    expect(fixedSegIds, 'segment GREEN=own を含む').toContain(oSegId);
    expect(fixedSegIds, 'segment GREEN=foreign を含まない').not.toContain(fSegId);
  });

  test('Event詳細 /operations/events/[id]: 7子コレクションに foreign marker 非表示・件数/原価集計に不算入・自tenant子は表示', async ({ page }) => {
    await login(page, 'ceo@ikezaki.local');
    await page.goto(`/operations/events/${eventId}`);
    await expect(page.getByRole('heading', { name: `E05-EVT-${STAMP}` })).toBeVisible();
    const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');

    // 自 tenant 子は無回帰で表示。
    expect(body.includes(OWN_USAGE), '自 usage 表示').toBe(true);
    expect(body.includes(OWN_COST_CAT), '自 cost 区分表示').toBe(true);
    expect(body.includes(OWN_PROP), '自 提案表示').toBe(true);
    expect(body.includes(OWN_STAFF), '自 人員表示').toBe(true);
    expect(body.includes(formatJpy(OWN_COST_AMT)), '自 原価金額表示').toBe(true);

    // foreign 子は DOM 全文に 0 件（表示にも集計にも同乗しない）。
    for (const [name, s] of [
      ['usage', FGN_USAGE], ['cost区分', FGN_COST_CAT], ['提案', FGN_PROP], ['人員', FGN_STAFF],
      ['risk型', FGN_RISK_TYPE], ['logistics型', FGN_LOGI_TYPE], ['原価金額', formatJpy(FGN_COST_AMT)],
    ] as const) {
      expect(body.includes(s), `foreign ${name} が DOM に 0 件`).toBe(false);
    }
    // 件数集計は自 tenant 子のみ（各 1 件）。foreign を数えた 2 は現れない。
    expect(body.includes('使用商品・備品（1点）'), 'usage 件数=自 tenant のみ').toBe(true);
    expect(body.includes('人員配置（1）'), '人員件数=自 tenant のみ').toBe(true);
    expect(body.includes('リスク（1）'), 'risk件数=自 tenant のみ').toBe(true);
    expect(body.includes('物流タスク（1）'), 'logistics件数=自 tenant のみ').toBe(true);
    expect(body.includes('使用商品・備品（2点）'), 'foreign を数えた件数は現れない').toBe(false);
  });

  test('Invoice詳細 /invoices/[id]: lineItems/payments に foreign 非表示・自tenant子は表示', async ({ page }) => {
    await login(page, 'ceo@ikezaki.local');
    await page.goto(`/invoices/${invoiceId}`);
    await expect(page.getByRole('heading', { name: `E05-INV-${STAMP}` })).toBeVisible();
    const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');

    // 自 tenant の明細・入金は表示（無回帰）。
    expect(body.includes(OWN_LI), '自 明細名表示').toBe(true);
    expect(body.includes(OWN_PAY_METHOD), '自 入金 method 表示').toBe(true);
    // foreign 明細/入金は DOM に 0 件（明細表・入金履歴のどちらにも同乗しない）。
    expect(body.includes(FGN_LI), 'foreign 明細名 0 件').toBe(false);
    expect(body.includes(formatJpy(FGN_LI_AMT)), 'foreign 明細金額 0 件').toBe(false);
    expect(body.includes(FGN_PAY_METHOD), 'foreign 入金 method 0 件').toBe(false);
    expect(body.includes(formatJpy(FGN_PAY_AMT)), 'foreign 入金金額 0 件').toBe(false);
  });

  test('Meeting詳細 /meetings/[id]: minutes/decisions/actionItems/transcripts/segments に foreign 非表示・自tenant子は表示', async ({ page }) => {
    await login(page, 'ceo@ikezaki.local');
    await page.goto(`/meetings/${meetingId}`);
    await expect(page.getByRole('heading', { name: `E05-MTG-${STAMP}` })).toBeVisible();
    const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');

    // 自 tenant の議事録・決定・アクションは表示（無回帰）。minutes は take:1・GREEN では own が選ばれる。
    expect(body.includes(OWN_SUM), '自 議事録要約表示').toBe(true);
    expect(body.includes(OWN_DEC), '自 決定事項表示').toBe(true);
    expect(body.includes(OWN_ACT), '自 アクション表示').toBe(true);
    // foreign 子は全 5 種で DOM に 0 件（録音同意の有無に依らず segment sentinel も現れない）。
    expect(body.includes(FGN_SUM), 'foreign 議事録要約 0 件').toBe(false);
    expect(body.includes(FGN_DEC), 'foreign 決定事項 0 件').toBe(false);
    expect(body.includes(FGN_ACT), 'foreign アクション 0 件').toBe(false);
    expect(body.includes(FGN_SEG), 'foreign 発言 segment 0 件').toBe(false);
  });

  test('outreach承認決定の updateMany: production shape は foreign OutreachApproval を PENDING のまま更新せず・legacy shape は越境更新（RED）', async () => {
    const decidedById = (await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { id: true } }))!.id;

    // GREEN: production（approvals/actions.ts:226-229）と同一の tenantId 付き updateMany。
    const green = await prisma.outreachApproval.updateMany({
      where: { draftId: greenDraftId, tenantId: tenantA, status: 'PENDING' },
      data: { status: 'APPROVED', approverId: decidedById, decidedAt: new Date(), note: 'green' },
    });
    expect(green.count, 'production shape は対象 tenant 行 1 件だけ更新').toBe(1);
    expect((await prisma.outreachApproval.findUnique({ where: { id: greenOwnApprovalId }, select: { status: true } }))!.status, '自 tenant 行=APPROVED').toBe('APPROVED');
    expect((await prisma.outreachApproval.findUnique({ where: { id: greenForeignApprovalId }, select: { status: true } }))!.status, 'foreign 行=PENDING のまま（越境更新なし）').toBe('PENDING');

    // RED: legacy（tenant 条件なし）updateMany は同一 draftId の foreign 行まで更新してしまう。
    const red = await prisma.outreachApproval.updateMany({
      where: { draftId: redDraftId, status: 'PENDING' },
      data: { status: 'APPROVED', approverId: decidedById, decidedAt: new Date(), note: 'red' },
    });
    expect(red.count, 'legacy shape は own+foreign の 2 行を更新（越境）').toBe(2);
    expect((await prisma.outreachApproval.findUnique({ where: { id: redForeignApprovalId }, select: { status: true } }))!.status, 'legacy は foreign 行も APPROVED に漏洩＝RED').toBe('APPROVED');
    expect((await prisma.outreachApproval.findUnique({ where: { id: redOwnApprovalId }, select: { status: true } }))!.status).toBe('APPROVED');
  });
});

// =============================================================================
// E-06 — human-only guard の action wiring（AI/mixed role の DB 不変・人間 positive control）
// =============================================================================
//
// 各 Server Action は `if (!isHumanUser({ roles }) || !hasPermission(...)) redirect('...?denied=1')` を
// **DB 接触前**に持つ。isHumanUser は roles に AI_AGENT/AI_ASSISTANT を 1 つでも含むと false（rbac.ts:156）。
// mixed（AI_AGENT+OWNER・isAiAgent=false）は全 permission を持つため、拒否は純粋に isHumanUser 由来＝
// human-only barrier を permission と独立に立証する。
//
// 実証形（lead_convert_ui_guard_evidence.spec.ts と同型の非空振り replay harness）:
//  1. 人間 OWNER(ceo) が実フォームを submit → その POST（url/headers/body）を捕捉。この submit が
//     positive control（ちょうど 1 組作成）を兼ねる。
//  2. AI(only)/AI+OWNER(mixed) の認証済み context を作り、捕捉 body の対象 ID を「別の未変更 fixture」へ
//     置換し、ceo の cookie は使わず AI context の cookie だけで同一 Action へ replay。
//  3. redirect が denied=1・置換先 fixture の関連 table 増分 0（DB 接触前拒否）を実測する。
//
// 直接駆動する 5 Action で E-06 oracle の全 table を被覆する:
//  GrowthEvent/Audit(createGrowthEvent) / InventoryMovement(createInventoryMovement) /
//  EventProductUsage(=Usage)+Movement+GrowthEvent+DomainEvent+Outbox(assignAssetToEvent) /
//  OutreachDraft+OutreachApproval+ApprovalRequest+Lead+Audit+AISafetyLog(requestOutreachApproval) /
//  OutreachDraft 編集(updateOutreachDraft)。
// 残る emitGrowthEventFromDomainAction / adjustInventoryQuantityAction は同一 isHumanUser guard idiom を
// 共有し、本境界証拠に含まれる（ApprovalRequest 不変は requestOutreachApproval が代表）。

async function roleId(t: string, key: string): Promise<string> {
  const r = await prisma.role.findFirst({ where: { tenantId: t, key: key as never }, select: { id: true } });
  if (!r) throw new Error(`seed 未整備: role ${key} が存在しません`);
  return r.id;
}

async function makeUser(t: string, email: string, roleKeys: string[], isAiAgent: boolean): Promise<string> {
  const ceo = (await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { passwordHash: true, departmentId: true } }))!;
  const u = await prisma.user.create({ data: { tenantId: t, email, name: email, passwordHash: ceo.passwordHash, isAiAgent, departmentId: ceo.departmentId }, select: { id: true } });
  for (const k of roleKeys) await prisma.userRole.create({ data: { tenantId: t, userId: u.id, roleId: await roleId(t, k) } });
  return u.id;
}

async function cleanupUser(userId: string) {
  await prisma.userRole.deleteMany({ where: { userId } });
  await prisma.dataAccessLog.deleteMany({ where: { actorId: userId } }).catch(() => {});
  await prisma.auditLog.deleteMany({ where: { actorId: userId } }).catch(() => {});
  await prisma.user.deleteMany({ where: { id: userId } });
}

interface Captured {
  url: string;
  headers: Record<string, string>;
  body: string;
}

/** 認証済み page で trigger（フォーム submit）を実行し、その Server Action POST を捕捉する。 */
async function captureActionPost(page: Page, expectUrlPart: string, trigger: () => Promise<void>): Promise<Captured> {
  const [req] = await Promise.all([
    page.waitForRequest((r) => r.method() === 'POST' && r.url().includes(expectUrlPart)),
    trigger(),
  ]);
  const headers = { ...req.headers() };
  delete headers['content-length'];
  return { url: req.url(), headers, body: req.postDataBuffer()!.toString('latin1') };
}

/** body 内に from が「ちょうど 1 回」現れることを assert してから to へ置換する（空振り replay の構造排除）。 */
function swapOnce(body: string, from: string, to: string): string {
  const occ = body.split(from).length - 1;
  expect(occ, `POST body に "${from}" がちょうど 1 回存在`).toBe(1);
  const next = body.replace(from, to);
  expect(next.includes(to), '置換先へ差し替え済み').toBe(true);
  expect(next.includes(from), '旧 ID は body に残らない').toBe(false);
  return next;
}

/** AI/mixed role の認証済み context を作り、捕捉 Action を replay して redirect を返す（context/user は都度破棄）。 */
async function replayAsRole(
  browser: Browser,
  t: string,
  roleKeys: string[],
  isAiAgent: boolean,
  captured: Captured,
  body: string,
): Promise<string> {
  const email = `m1b-ai-${roleKeys.join('-')}-${process.pid}-${Date.now()}-${Math.floor(performance.now())}@ikezaki.local`;
  const aiUserId = await makeUser(t, email, roleKeys, isAiAgent);
  const ctx = await browser.newContext();
  try {
    const p = await ctx.newPage();
    await login(p, email);
    const headers = { ...captured.headers };
    // 捕捉した OWNER の認証 header は再利用せず、AI context の session cookie だけで送る。
    delete headers['cookie'];
    delete headers['authorization'];
    const resp = await ctx.request.post(captured.url, { headers, data: Buffer.from(body, 'latin1'), maxRedirects: 0 });
    return resp.headers()['x-action-redirect'] ?? resp.headers()['location'] ?? '';
  } finally {
    await ctx.close();
    await cleanupUser(aiUserId);
  }
}

// AI(only) と AI+OWNER(mixed・isAiAgent=false=session不一致) の 2 系。両者とも isHumanUser=false で拒否されるべき。
const ROLE_VARIANTS: ReadonlyArray<{ label: string; roles: string[]; isAiAgent: boolean }> = [
  { label: 'AI_AGENT(only)', roles: ['AI_AGENT'], isAiAgent: true },
  { label: 'AI_AGENT+OWNER(mixed・isAiAgent=false)', roles: ['AI_AGENT', 'OWNER'], isAiAgent: false },
];

test.describe('E-06 human-only境界（AI/mixed role のDB不変・人間positive control）', () => {
  test.beforeAll(assertLocalDatabaseUrl);
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test('createGrowthEventAction: 人間OWNERは GrowthEvent/Audit 各1・AI/mixed は redirect denied=1 で 0 のまま', async ({ page, browser }) => {
    const t = await tenantId();
    const ownTitle = `E06-GROWTH-OWN-${STAMP}`;
    const aiTitles = ROLE_VARIANTS.map((v, i) => `E06-GROWTH-AI-${i}-${STAMP}`);
    try {
      await login(page, 'ceo@ikezaki.local');
      await page.goto('/growth/events');
      await page.getByPlaceholder('タイトル').fill(ownTitle);
      const captured = await captureActionPost(page, '/growth/events', () => page.getByRole('button', { name: '記録' }).click());

      // positive control: 人間 OWNER は GrowthEvent 1 + Audit 1（entityId=title）。
      await expect.poll(() => prisma.growthEvent.count({ where: { tenantId: t, title: ownTitle } }), { timeout: 10_000 }).toBe(1);
      expect(await prisma.auditLog.count({ where: { tenantId: t, entityType: 'GrowthEvent', entityId: ownTitle } }), 'human Audit 1').toBe(1);

      for (const [i, v] of ROLE_VARIANTS.entries()) {
        const body = swapOnce(captured.body, ownTitle, aiTitles[i]!);
        const redirect = await replayAsRole(browser, t, v.roles, v.isAiAgent, captured, body);
        expect(redirect, `${v.label}: Action 境界は denied=1 へ redirect`).toContain('denied=1');
        expect(await prisma.growthEvent.count({ where: { tenantId: t, title: aiTitles[i]! } }), `${v.label}: GrowthEvent 0`).toBe(0);
        expect(await prisma.auditLog.count({ where: { tenantId: t, entityType: 'GrowthEvent', entityId: aiTitles[i]! } }), `${v.label}: Audit 0`).toBe(0);
      }
    } finally {
      await prisma.growthEvent.deleteMany({ where: { tenantId: t, title: { in: [ownTitle, ...aiTitles] } } });
      await prisma.auditLog.deleteMany({ where: { tenantId: t, entityType: 'GrowthEvent', entityId: { in: [ownTitle, ...aiTitles] } } });
    }
  });

  test('createInventoryMovementAction: 人間OWNERは Movement 1・AI/mixed は denied=1 で対象 asset の Movement 0', async ({ page, browser }) => {
    const t = await tenantId();
    const ownAsset = await prisma.productAsset.create({ data: { tenantId: t, code: `E06O${STAMP}`.slice(0, 12), name: `E06-MV-OWN-${STAMP}`, quantity: 5, status: 'available', condition: 'good' }, select: { id: true } });
    const aiAsset = await prisma.productAsset.create({ data: { tenantId: t, code: `E06A${STAMP}`.slice(0, 12), name: `E06-MV-AI-${STAMP}`, quantity: 5, status: 'available', condition: 'good' }, select: { id: true } });
    try {
      await login(page, 'ceo@ikezaki.local');
      await page.goto('/operations/inventory-movements/new');
      const form = page.locator('form', { has: page.getByRole('button', { name: '記録する' }) });
      await form.locator('select[name="assetId"]').selectOption(ownAsset.id);
      await form.locator('select[name="type"]').selectOption('receive');
      const captured = await captureActionPost(page, '/operations/inventory-movements/new', () => page.getByRole('button', { name: '記録する' }).click());

      await expect.poll(() => prisma.inventoryMovement.count({ where: { tenantId: t, assetId: ownAsset.id } }), { timeout: 10_000 }).toBe(1);

      for (const v of ROLE_VARIANTS) {
        const body = swapOnce(captured.body, ownAsset.id, aiAsset.id);
        const redirect = await replayAsRole(browser, t, v.roles, v.isAiAgent, captured, body);
        expect(redirect, `${v.label}: denied=1`).toContain('denied=1');
        expect(await prisma.inventoryMovement.count({ where: { tenantId: t, assetId: aiAsset.id } }), `${v.label}: Movement 0`).toBe(0);
      }
    } finally {
      await prisma.inventoryMovement.deleteMany({ where: { assetId: { in: [ownAsset.id, aiAsset.id] } } });
      await prisma.productAsset.deleteMany({ where: { id: { in: [ownAsset.id, aiAsset.id] } } });
    }
  });

  test('assignAssetToEventAction: 人間OWNERは Usage/Movement/Growth/DomainEvent 各1・AI/mixed は denied=1 で全て0（Outbox含む）', async ({ page, browser }) => {
    const t = await tenantId();
    const ownEvt = await prisma.eventProject.create({ data: { tenantId: t, name: `E06-ASG-OWNEVT-${STAMP}`, status: 'planned' }, select: { id: true } });
    const aiEvt = await prisma.eventProject.create({ data: { tenantId: t, name: `E06-ASG-AIEVT-${STAMP}`, status: 'planned' }, select: { id: true } });
    const ownAsset = await prisma.productAsset.create({ data: { tenantId: t, code: `E06AO${STAMP}`.slice(0, 12), name: `E06-ASG-OWN-${STAMP}`, quantity: 10, status: 'available', condition: 'good' }, select: { id: true } });
    const aiAsset = await prisma.productAsset.create({ data: { tenantId: t, code: `E06AA${STAMP}`.slice(0, 12), name: `E06-ASG-AI-${STAMP}`, quantity: 10, status: 'available', condition: 'good' }, select: { id: true } });
    try {
      await login(page, 'ceo@ikezaki.local');
      await page.goto(`/operations/events/${ownEvt.id}`);
      const form = page.locator('form', { has: page.getByRole('button', { name: '割当', exact: true }) });
      await form.locator('select[name="assetId"]').selectOption(ownAsset.id);
      const captured = await captureActionPost(page, `/operations/events/${ownEvt.id}`, () => page.getByRole('button', { name: '割当', exact: true }).click());

      // positive control: Usage(=EventProductUsage)+reserve Movement+GrowthEvent+DomainEvent。
      await expect.poll(() => prisma.eventProductUsage.count({ where: { tenantId: t, eventId: ownEvt.id, assetId: ownAsset.id } }), { timeout: 10_000 }).toBe(1);
      expect(await prisma.inventoryMovement.count({ where: { tenantId: t, eventId: ownEvt.id } }), 'reserve Movement 1').toBeGreaterThanOrEqual(1);
      expect(await prisma.growthEvent.count({ where: { tenantId: t, entityType: 'EventProject', entityId: ownEvt.id, type: 'event.equipment.assigned' } }), 'GrowthEvent 1').toBe(1);
      expect(await prisma.domainEvent.count({ where: { tenantId: t, aggregateType: 'EventProject', aggregateId: ownEvt.id } }), 'DomainEvent 1').toBeGreaterThanOrEqual(1);

      for (const v of ROLE_VARIANTS) {
        let body = swapOnce(captured.body, ownEvt.id, aiEvt.id);
        body = swapOnce(body, ownAsset.id, aiAsset.id);
        const redirect = await replayAsRole(browser, t, v.roles, v.isAiAgent, captured, body);
        expect(redirect, `${v.label}: denied=1`).toContain('denied=1');
        expect(await prisma.eventProductUsage.count({ where: { tenantId: t, eventId: aiEvt.id } }), `${v.label}: Usage 0`).toBe(0);
        expect(await prisma.inventoryMovement.count({ where: { tenantId: t, eventId: aiEvt.id } }), `${v.label}: Movement 0`).toBe(0);
        expect(await prisma.growthEvent.count({ where: { tenantId: t, entityId: aiEvt.id } }), `${v.label}: GrowthEvent 0`).toBe(0);
        // DomainEvent 0 ⇒ OutboxMessage も 0（emitDomainEventInTx が同一 tx で対に作るため）。
        expect(await prisma.domainEvent.count({ where: { tenantId: t, aggregateType: 'EventProject', aggregateId: aiEvt.id } }), `${v.label}: DomainEvent 0（Outbox 0）`).toBe(0);
      }
    } finally {
      const domIds = (await prisma.domainEvent.findMany({ where: { aggregateType: 'EventProject', aggregateId: { in: [ownEvt.id, aiEvt.id] } }, select: { id: true } })).map((d) => d.id);
      if (domIds.length) await prisma.outboxMessage.deleteMany({ where: { eventId: { in: domIds } } });
      await prisma.domainEvent.deleteMany({ where: { aggregateType: 'EventProject', aggregateId: { in: [ownEvt.id, aiEvt.id] } } });
      await prisma.growthEvent.deleteMany({ where: { tenantId: t, entityType: 'EventProject', entityId: { in: [ownEvt.id, aiEvt.id] } } });
      await prisma.eventProductUsage.deleteMany({ where: { eventId: { in: [ownEvt.id, aiEvt.id] } } });
      await prisma.inventoryMovement.deleteMany({ where: { OR: [{ eventId: { in: [ownEvt.id, aiEvt.id] } }, { assetId: { in: [ownAsset.id, aiAsset.id] } }] } });
      await prisma.eventProject.deleteMany({ where: { id: { in: [ownEvt.id, aiEvt.id] } } });
      await prisma.productAsset.deleteMany({ where: { id: { in: [ownAsset.id, aiAsset.id] } } });
    }
  });

  test('requestOutreachApprovalAction: 人間OWNERは draft/approval/lead/audit を確定・AI/mixed は denied=1 で全て不変（AISafetyLog含む）', async ({ page, browser }) => {
    const t = await tenantId();
    const camp = await prisma.leadSearchCampaign.create({ data: { tenantId: t, name: `E06-RO-CAMP-${STAMP}`, region: '札幌市', industry: '美容室' }, select: { id: true } });
    const ownLead = await prisma.localBusinessLead.create({ data: { tenantId: t, campaignId: camp.id, name: `E06-RO-OWNLEAD-${STAMP}`, industry: '美容室', stage: 'NEW', email: `ro-own-${STAMP}@example.jp` }, select: { id: true } });
    const aiLead = await prisma.localBusinessLead.create({ data: { tenantId: t, campaignId: camp.id, name: `E06-RO-AILEAD-${STAMP}`, industry: '美容室', stage: 'NEW', email: `ro-ai-${STAMP}@example.jp` }, select: { id: true } });
    const ownDraft = await prisma.outreachDraft.create({ data: { tenantId: t, leadId: ownLead.id, subject: 'ro-own-subj', body: 'ro-own-body', status: 'DRAFT' }, select: { id: true } });
    const aiDraft = await prisma.outreachDraft.create({ data: { tenantId: t, leadId: aiLead.id, subject: 'ro-ai-subj', body: 'ro-ai-body', status: 'DRAFT' }, select: { id: true } });
    try {
      await login(page, 'ceo@ikezaki.local');
      await page.goto(`/leadmap/leads/${ownLead.id}/outreach`);
      const captured = await captureActionPost(page, `/leadmap/leads/${ownLead.id}/outreach`, () => page.getByRole('button', { name: '承認に出す（送信は承認後）' }).click());

      // positive control: draft→PENDING_APPROVAL・OutreachApproval 1・ApprovalRequest 1・lead PENDING・Audit 1。
      await expect.poll(async () => (await prisma.outreachDraft.findUnique({ where: { id: ownDraft.id }, select: { status: true } }))!.status, { timeout: 10_000 }).toBe('PENDING_APPROVAL');
      expect(await prisma.outreachApproval.count({ where: { tenantId: t, draftId: ownDraft.id } }), 'OutreachApproval 1').toBe(1);
      expect(await prisma.approvalRequest.count({ where: { tenantId: t, type: 'outreach_send', entityType: 'OutreachDraft', entityId: ownDraft.id } }), 'ApprovalRequest 1').toBe(1);
      expect((await prisma.localBusinessLead.findUnique({ where: { id: ownLead.id }, select: { stage: true } }))!.stage, 'lead PENDING_APPROVAL').toBe('PENDING_APPROVAL');
      expect(await prisma.auditLog.count({ where: { tenantId: t, entityType: 'ApprovalRequest', entityId: ownDraft.id } }), 'Audit 1').toBe(1);

      for (const v of ROLE_VARIANTS) {
        let body = swapOnce(captured.body, ownDraft.id, aiDraft.id);
        body = swapOnce(body, ownLead.id, aiLead.id);
        const redirect = await replayAsRole(browser, t, v.roles, v.isAiAgent, captured, body);
        expect(redirect, `${v.label}: denied=1`).toContain('denied=1');
        expect((await prisma.outreachDraft.findUnique({ where: { id: aiDraft.id }, select: { status: true } }))!.status, `${v.label}: draft DRAFT のまま`).toBe('DRAFT');
        expect(await prisma.outreachApproval.count({ where: { tenantId: t, draftId: aiDraft.id } }), `${v.label}: OutreachApproval 0`).toBe(0);
        expect(await prisma.approvalRequest.count({ where: { tenantId: t, entityType: 'OutreachDraft', entityId: aiDraft.id } }), `${v.label}: ApprovalRequest 0`).toBe(0);
        expect((await prisma.localBusinessLead.findUnique({ where: { id: aiLead.id }, select: { stage: true } }))!.stage, `${v.label}: lead NEW のまま`).toBe('NEW');
        expect(await prisma.auditLog.count({ where: { tenantId: t, entityType: 'ApprovalRequest', entityId: aiDraft.id } }), `${v.label}: Audit 0`).toBe(0);
        // prepareExternalPayload（AISafetyLog）は guard の後段のため、拒否時は AISafetyLog も 0。
        expect(await prisma.aISafetyLog.count({ where: { tenantId: t, entityType: 'OutreachDraft', entityId: aiDraft.id } }), `${v.label}: AISafetyLog 0`).toBe(0);
      }
    } finally {
      const draftIds = [ownDraft.id, aiDraft.id];
      await prisma.outreachApproval.deleteMany({ where: { draftId: { in: draftIds } } });
      await prisma.approvalRequest.deleteMany({ where: { entityType: 'OutreachDraft', entityId: { in: draftIds } } });
      await prisma.auditLog.deleteMany({ where: { tenantId: t, entityType: 'ApprovalRequest', entityId: { in: draftIds } } });
      await prisma.aISafetyLog.deleteMany({ where: { tenantId: t, entityType: 'OutreachDraft', entityId: { in: draftIds } } });
      await prisma.outreachDraft.deleteMany({ where: { id: { in: draftIds } } });
      await prisma.localBusinessLead.deleteMany({ where: { id: { in: [ownLead.id, aiLead.id] } } });
      await prisma.leadSearchCampaign.deleteMany({ where: { id: camp.id } });
    }
  });

  test('updateOutreachDraftAction: 人間OWNERは下書きを編集確定・AI/mixed は denied=1 で対象draftの subject/body 不変', async ({ page, browser }) => {
    const t = await tenantId();
    const camp = await prisma.leadSearchCampaign.create({ data: { tenantId: t, name: `E06-UO-CAMP-${STAMP}`, region: '札幌市', industry: '美容室' }, select: { id: true } });
    const ownLead = await prisma.localBusinessLead.create({ data: { tenantId: t, campaignId: camp.id, name: `E06-UO-OWNLEAD-${STAMP}`, industry: '美容室', stage: 'NEW', email: `uo-own-${STAMP}@example.jp` }, select: { id: true } });
    const aiLead = await prisma.localBusinessLead.create({ data: { tenantId: t, campaignId: camp.id, name: `E06-UO-AILEAD-${STAMP}`, industry: '美容室', stage: 'NEW', email: `uo-ai-${STAMP}@example.jp` }, select: { id: true } });
    const ownDraft = await prisma.outreachDraft.create({ data: { tenantId: t, leadId: ownLead.id, subject: 'uo-own-orig', body: 'uo-own-orig-body', status: 'DRAFT' }, select: { id: true } });
    const aiDraft = await prisma.outreachDraft.create({ data: { tenantId: t, leadId: aiLead.id, subject: 'uo-ai-orig', body: 'uo-ai-orig-body', status: 'DRAFT' }, select: { id: true } });
    const ownNewSubject = `E06-UO-NEWSUBJ-${STAMP}`;
    try {
      await login(page, 'ceo@ikezaki.local');
      await page.goto(`/leadmap/leads/${ownLead.id}/outreach`);
      const editForm = page.locator('form', { has: page.getByRole('button', { name: '下書きを保存' }) });
      await editForm.locator('input[name="subject"]').fill(ownNewSubject);
      await editForm.locator('textarea[name="body"]').fill('E06-UO-NEWBODY');
      const captured = await captureActionPost(page, `/leadmap/leads/${ownLead.id}/outreach`, () => page.getByRole('button', { name: '下書きを保存' }).click());

      // positive control: 人間 OWNER は subject が編集値へ確定。
      await expect.poll(async () => (await prisma.outreachDraft.findUnique({ where: { id: ownDraft.id }, select: { subject: true } }))!.subject, { timeout: 10_000 }).toBe(ownNewSubject);

      const aiBefore = await prisma.outreachDraft.findUnique({ where: { id: aiDraft.id } });
      for (const v of ROLE_VARIANTS) {
        let body = swapOnce(captured.body, ownDraft.id, aiDraft.id);
        body = swapOnce(body, ownLead.id, aiLead.id);
        const redirect = await replayAsRole(browser, t, v.roles, v.isAiAgent, captured, body);
        expect(redirect, `${v.label}: denied=1`).toContain('denied=1');
        const aiAfter = await prisma.outreachDraft.findUnique({ where: { id: aiDraft.id } });
        expect(aiAfter, `${v.label}: 対象 draft は subject/body/status とも before/after deep equality（DB接触前拒否）`).toEqual(aiBefore);
      }
    } finally {
      const draftIds = [ownDraft.id, aiDraft.id];
      await prisma.auditLog.deleteMany({ where: { tenantId: t, entityType: 'OutreachDraft', entityId: { in: draftIds } } });
      await prisma.outreachDraft.deleteMany({ where: { id: { in: draftIds } } });
      await prisma.localBusinessLead.deleteMany({ where: { id: { in: [ownLead.id, aiLead.id] } } });
      await prisma.leadSearchCampaign.deleteMany({ where: { id: camp.id } });
    }
  });
});
