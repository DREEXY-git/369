import { test, expect } from '@playwright/test';
import { prisma } from '@hokko/db';
import {
  requestOutreachApprovalCore,
  updateOutreachDraftCore,
  applyUnsubscribeCore,
  type OutreachRequestHooks,
} from '../../app/(app)/leadmap/actions';
import { decideOutreachApprovalCore } from '../../app/(app)/approvals/actions';

// Codex M1-b E-04 の実 PostgreSQL 証拠。営業メール承認の申請・編集・配信停止の状態機械を
// production-shared core（requestOutreachApprovalCore / updateOutreachDraftCore / applyUnsubscribeCore /
// decideOutreachApprovalCore）で直接呼び、
//  (1) 申請: DRAFT→PENDING_APPROVAL の CAS を barrier に 5 書き込みを単一 transaction 化。並行4申請でも
//      承認セット（Draft PENDING / OutreachApproval 1 / ApprovalRequest 1 / Lead PENDING / Audit 1）は1組。
//      downstream 各段 fault で 5 表の増分 0、retry で 1 組へ収束。
//  (2) 編集: PENDING 下書きの編集で両 approval 種 REJECTED＋draft DRAFT＋Audit を同時確定。fault で元状態維持。
//  (3) 編集 vs 承認送信: 別実行で競合させ、送信 payload は承認時 snapshot に一致するか、編集が明示 conflict で
//      fail-closed（「承認内容≠送信内容」を作らない）。
//  (4) 配信停止: 再送で SuppressionList 1・Lead UNSUBSCRIBED（冪等）。lead 更新 fault で SuppressionList も
//      rollback（fail-closed）。tenant 別の同一 email は独立。
// を実 DB 行の再取得と実競合（Promise.all／CAS）で検証する。fixture/cleanup は本テスト生成 ID に限定。

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

let seq = 0;
function stamp(): string {
  seq += 1;
  return `${process.pid}-${Date.now()}-${seq}`;
}

let tenantId = '';
let userId = '';

interface DraftFixture {
  campaignId: string;
  leadId: string;
  draftId: string;
}

async function makeDraft(tid: string, subject = '元の件名', body = '元の本文'): Promise<DraftFixture> {
  const campaign = await prisma.leadSearchCampaign.create({
    data: { tenantId: tid, name: `M1B-E04-${stamp()}`, region: '札幌市', industry: 'テスト業種' },
    select: { id: true },
  });
  const lead = await prisma.localBusinessLead.create({
    data: { tenantId: tid, campaignId: campaign.id, name: `M1B-E04-LEAD-${stamp()}`, industry: 'テスト業種', email: `e04-${stamp()}@example.jp`, placeId: `pl${stamp()}` },
    select: { id: true },
  });
  const draft = await prisma.outreachDraft.create({
    data: { tenantId: tid, leadId: lead.id, subject, body, status: 'DRAFT' },
    select: { id: true },
  });
  return { campaignId: campaign.id, leadId: lead.id, draftId: draft.id };
}

async function cleanup(tid: string, fx: DraftFixture, suppressValue?: string) {
  const logs = await prisma.outreachSendLog.findMany({ where: { tenantId: tid, draftId: fx.draftId }, select: { id: true } });
  await prisma.usageEvent.deleteMany({ where: { tenantId: tid, sourceId: { in: logs.map((l) => l.id) } } });
  await prisma.auditLog.deleteMany({ where: { tenantId: tid, entityId: { in: [fx.draftId, fx.leadId] } } });
  const approvals = await prisma.approvalRequest.findMany({ where: { tenantId: tid, entityType: 'OutreachDraft', entityId: fx.draftId }, select: { id: true } });
  await prisma.auditLog.deleteMany({ where: { tenantId: tid, entityId: { in: approvals.map((a) => a.id) } } });
  await prisma.approvalRequest.deleteMany({ where: { tenantId: tid, entityType: 'OutreachDraft', entityId: fx.draftId } });
  await prisma.leadSearchCampaign.deleteMany({ where: { id: fx.campaignId, tenantId: tid } });
  if (suppressValue) await prisma.suppressionList.deleteMany({ where: { tenantId: tid, value: suppressValue } });
}

/** 申請系5表を実 DB から再取得。 */
async function requestSnapshot(tid: string, fx: DraftFixture) {
  const [draft, lead, approvalCount, requestCount, auditCount] = await Promise.all([
    prisma.outreachDraft.findUnique({ where: { id: fx.draftId }, select: { status: true } }),
    prisma.localBusinessLead.findUnique({ where: { id: fx.leadId }, select: { stage: true } }),
    prisma.outreachApproval.count({ where: { tenantId: tid, draftId: fx.draftId } }),
    prisma.approvalRequest.count({ where: { tenantId: tid, entityType: 'OutreachDraft', entityId: fx.draftId } }),
    prisma.auditLog.count({ where: { tenantId: tid, entityId: fx.draftId, action: 'create' } }),
  ]);
  return { draftStatus: draft!.status, leadStage: lead!.stage, approvalCount, requestCount, auditCount };
}

test.beforeAll(async () => {
  assertLocalDatabaseUrl();
  const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { id: true, tenantId: true } });
  if (!ceo) throw new Error('seed 未整備: ceo@ikezaki.local が存在しません');
  tenantId = ceo.tenantId;
  userId = ceo.id;
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('申請 happy: DRAFT→PENDING で OutreachApproval 1・ApprovalRequest 1・Lead PENDING・Audit 1', async () => {
  const fx = await makeDraft(tenantId);
  try {
    const r = await requestOutreachApprovalCore({ tenantId, userId, draftId: fx.draftId });
    expect(r.outcome).toBe('requested');
    const s = await requestSnapshot(tenantId, fx);
    expect(s.draftStatus).toBe('PENDING_APPROVAL');
    expect(s.approvalCount).toBe(1);
    expect(s.requestCount).toBe(1);
    expect(s.leadStage).toBe('PENDING_APPROVAL');
    expect(s.auditCount).toBe(1);
  } finally {
    await cleanup(tenantId, fx);
  }
});

test('並行4申請: DRAFT→PENDING CAS で承認セットはちょうど1組（重複 ApprovalRequest/OutreachApproval なし）', async () => {
  const fx = await makeDraft(tenantId);
  try {
    const results = await Promise.all(Array.from({ length: 4 }, () => requestOutreachApprovalCore({ tenantId, userId, draftId: fx.draftId })));
    const outcomes = results.map((r) => r.outcome).sort();
    expect(outcomes.filter((o) => o === 'requested').length, '勝者は1本のみ').toBe(1);
    expect(outcomes.filter((o) => o === 'already').length, '敗者は already（書き込みゼロ）').toBe(3);
    const s = await requestSnapshot(tenantId, fx);
    expect(s.draftStatus).toBe('PENDING_APPROVAL');
    expect(s.approvalCount, 'OutreachApproval 1').toBe(1);
    expect(s.requestCount, 'ApprovalRequest 1').toBe(1);
    expect(s.leadStage).toBe('PENDING_APPROVAL');
    expect(s.auditCount, '申請監査 1').toBe(1);
  } finally {
    await cleanup(tenantId, fx);
  }
});

test('申請 downstream 各段 fault: 5 表の増分 0（全 rollback）→ retry で 1 組へ収束', async () => {
  const hookNames: (keyof OutreachRequestHooks)[] = [
    '__faultAfterClaimForTest',
    '__faultAfterOutreachApprovalForTest',
    '__faultAfterApprovalRequestForTest',
    '__faultAfterLeadForTest',
    '__faultAfterAuditForTest',
  ];
  for (const hook of hookNames) {
    const fx = await makeDraft(tenantId);
    const opts: OutreachRequestHooks = {};
    opts[hook] = () => { throw new Error(`injected-fault:${hook}`); };
    try {
      await expect(
        requestOutreachApprovalCore({ tenantId, userId, draftId: fx.draftId }, opts),
      ).rejects.toThrow(`injected-fault:${hook}`);
      const s = await requestSnapshot(tenantId, fx);
      expect(s.draftStatus, `${hook}: draft は DRAFT のまま`).toBe('DRAFT');
      expect(s.approvalCount, `${hook}: OutreachApproval 0`).toBe(0);
      expect(s.requestCount, `${hook}: ApprovalRequest 0`).toBe(0);
      expect(s.leadStage, `${hook}: lead は NEW のまま`).toBe('NEW');
      expect(s.auditCount, `${hook}: 申請監査 0`).toBe(0);
      // rollback 後の retry がちょうど1組へ収束。
      const retry = await requestOutreachApprovalCore({ tenantId, userId, draftId: fx.draftId });
      expect(retry.outcome, `${hook}: retry 成功`).toBe('requested');
      const s2 = await requestSnapshot(tenantId, fx);
      expect(s2.requestCount, `${hook}: retry で ApprovalRequest 1`).toBe(1);
      expect(s2.approvalCount).toBe(1);
    } finally {
      await cleanup(tenantId, fx);
    }
  }
});

test('編集: PENDING 下書き編集で両 approval 種 REJECTED＋draft DRAFT＋本文差替＋Audit を同時確定', async () => {
  const fx = await makeDraft(tenantId, '承認された件名', '承認された本文');
  try {
    await requestOutreachApprovalCore({ tenantId, userId, draftId: fx.draftId });
    const r = await updateOutreachDraftCore({ tenantId, userId, draftId: fx.draftId, subject: '編集後の件名', body: '編集後の本文' });
    expect(r.outcome).toBe('edited');
    if (r.outcome === 'edited') expect(r.invalidated).toBe(true);
    const draft = await prisma.outreachDraft.findUnique({ where: { id: fx.draftId }, select: { status: true, subject: true, body: true } });
    expect(draft!.status, '編集で DRAFT へ戻る').toBe('DRAFT');
    expect(draft!.subject).toBe('編集後の件名');
    const req = await prisma.approvalRequest.findFirst({ where: { tenantId, entityType: 'OutreachDraft', entityId: fx.draftId }, select: { status: true } });
    expect(req!.status, 'ApprovalRequest は REJECTED（再申請要）').toBe('REJECTED');
    const oa = await prisma.outreachApproval.findFirst({ where: { tenantId, draftId: fx.draftId }, select: { status: true } });
    expect(oa!.status, 'OutreachApproval も REJECTED').toBe('REJECTED');
    const editAudit = await prisma.auditLog.count({ where: { tenantId, entityType: 'OutreachDraft', entityId: fx.draftId, action: 'update' } });
    expect(editAudit).toBe(1);
  } finally {
    await cleanup(tenantId, fx);
  }
});

test('編集 fault: 承認無効化の途中 fault で元状態（PENDING・本文）を維持（部分 commit なし）', async () => {
  const fx = await makeDraft(tenantId, '承認された件名', '承認された本文');
  try {
    await requestOutreachApprovalCore({ tenantId, userId, draftId: fx.draftId });
    await expect(
      updateOutreachDraftCore(
        { tenantId, userId, draftId: fx.draftId, subject: '編集後の件名', body: '編集後の本文' },
        { __faultAfterInvalidateRequestForTest: () => { throw new Error('injected-fault:edit'); } },
      ),
    ).rejects.toThrow('injected-fault:edit');
    const draft = await prisma.outreachDraft.findUnique({ where: { id: fx.draftId }, select: { status: true, subject: true } });
    expect(draft!.status, 'fault で PENDING_APPROVAL のまま').toBe('PENDING_APPROVAL');
    expect(draft!.subject, '本文は書き換わらない').toBe('承認された件名');
    const req = await prisma.approvalRequest.findFirst({ where: { tenantId, entityType: 'OutreachDraft', entityId: fx.draftId }, select: { status: true } });
    expect(req!.status, 'ApprovalRequest は PENDING のまま（無効化が rollback）').toBe('PENDING');
    const oa = await prisma.outreachApproval.findFirst({ where: { tenantId, draftId: fx.draftId }, select: { status: true } });
    expect(oa!.status).toBe('PENDING');
  } finally {
    await cleanup(tenantId, fx);
  }
});

test('編集 vs 承認送信の決定論: 送信 payload は承認時 snapshot と一致 OR 編集が明示 conflict（承認内容≠送信内容を作らない）', async () => {
  // 実競合を複数回起こし、どちらが勝っても不変条件が保たれることを実 DB で確認する。
  for (let i = 0; i < 6; i++) {
    const fx = await makeDraft(tenantId, `承認済み件名-${i}`, `承認済み本文-${i}`);
    try {
      await requestOutreachApprovalCore({ tenantId, userId, draftId: fx.draftId });
      const approval = await prisma.approvalRequest.findFirst({ where: { tenantId, entityType: 'OutreachDraft', entityId: fx.draftId, status: 'PENDING' }, select: { id: true } });
      const [editRes, sendRes] = await Promise.all([
        updateOutreachDraftCore({ tenantId, userId, draftId: fx.draftId, subject: `編集件名-${i}`, body: `編集本文-${i}` }),
        decideOutreachApprovalCore({ tenantId, userId, approvalId: approval!.id, decision: 'approve', note: '' }),
      ]);
      const logs = await prisma.outreachSendLog.findMany({ where: { tenantId, draftId: fx.draftId }, select: { subject: true, body: true } });
      const draft = await prisma.outreachDraft.findUnique({ where: { id: fx.draftId }, select: { status: true, subject: true } });

      if (logs.length > 0) {
        // 承認送信が勝った: 送信 payload は承認時 snapshot（= 元の内容）に一致し、編集は conflict。
        expect(sendRes.outcome, `iter ${i}: 送信勝ち`).not.toBe('rejected');
        expect(logs[0]!.subject, `iter ${i}: 送信件名は承認時内容`).toBe(`承認済み件名-${i}`);
        expect(logs[0]!.body, `iter ${i}: 送信本文は承認時内容`).toBe(`承認済み本文-${i}`);
        expect(editRes.outcome, `iter ${i}: 編集は fail-closed conflict`).toBe('conflict');
      } else {
        // 編集が勝った: 送信は行われず（rejected）、draft は編集内容で DRAFT。
        expect(editRes.outcome, `iter ${i}: 編集勝ち`).toBe('edited');
        expect(sendRes.outcome, `iter ${i}: 承認送信は却下扱い（送信なし）`).toBe('rejected');
        expect(draft!.status).toBe('DRAFT');
        expect(draft!.subject).toBe(`編集件名-${i}`);
      }
    } finally {
      await cleanup(tenantId, fx);
    }
  }
});

test('配信停止 冪等: 再送で SuppressionList 1・Lead UNSUBSCRIBED', async () => {
  const fx = await makeDraft(tenantId);
  const target = `unsub-${stamp()}@example.jp`;
  try {
    await applyUnsubscribeCore({ tenantId, leadId: fx.leadId, target });
    await applyUnsubscribeCore({ tenantId, leadId: fx.leadId, target });
    const count = await prisma.suppressionList.count({ where: { tenantId, channel: 'email', value: target } });
    expect(count, 'upsert で SuppressionList はちょうど1件').toBe(1);
    const lead = await prisma.localBusinessLead.findUnique({ where: { id: fx.leadId }, select: { stage: true } });
    expect(lead!.stage).toBe('UNSUBSCRIBED');
  } finally {
    await cleanup(tenantId, fx, target);
  }
});

test('配信停止 fault: lead 更新 fault で SuppressionList も rollback（抑止未記録のまま stage を進めない）', async () => {
  const fx = await makeDraft(tenantId);
  const target = `unsub-fault-${stamp()}@example.jp`;
  try {
    await expect(
      applyUnsubscribeCore({ tenantId, leadId: fx.leadId, target }, { __faultAfterSuppressionForTest: () => { throw new Error('injected-fault:unsub'); } }),
    ).rejects.toThrow('injected-fault:unsub');
    const count = await prisma.suppressionList.count({ where: { tenantId, channel: 'email', value: target } });
    expect(count, 'fault で SuppressionList は作られない（rollback）').toBe(0);
    const lead = await prisma.localBusinessLead.findUnique({ where: { id: fx.leadId }, select: { stage: true } });
    expect(lead!.stage, 'lead stage も進まない（fail-closed）').not.toBe('UNSUBSCRIBED');
  } finally {
    await cleanup(tenantId, fx, target);
  }
});

test('配信停止 cross-tenant: 同一 email でも tenant A/B は独立（互いに干渉しない）', async () => {
  const foreign = await prisma.tenant.create({ data: { name: `M1B-E04-FOREIGN-${stamp()}` }, select: { id: true } });
  const fxA = await makeDraft(tenantId);
  const fxB = await makeDraft(foreign.id);
  const target = `shared-${stamp()}@example.jp`;
  try {
    await applyUnsubscribeCore({ tenantId, leadId: fxA.leadId, target });
    // tenant A の抑止は tenant B には波及しない。
    expect(await prisma.suppressionList.count({ where: { tenantId, value: target } }), 'A に1件').toBe(1);
    expect(await prisma.suppressionList.count({ where: { tenantId: foreign.id, value: target } }), 'B には0件').toBe(0);
    const leadB = await prisma.localBusinessLead.findUnique({ where: { id: fxB.leadId }, select: { stage: true } });
    expect(leadB!.stage, 'B の lead は未変更').not.toBe('UNSUBSCRIBED');
    // B 側も独立に登録できる（同一 email が別 tenant で共存）。
    await applyUnsubscribeCore({ tenantId: foreign.id, leadId: fxB.leadId, target });
    expect(await prisma.suppressionList.count({ where: { tenantId, value: target } })).toBe(1);
    expect(await prisma.suppressionList.count({ where: { tenantId: foreign.id, value: target } })).toBe(1);
  } finally {
    await cleanup(tenantId, fxA, target);
    await cleanup(foreign.id, fxB, target);
    await prisma.tenant.deleteMany({ where: { id: foreign.id } });
  }
});
