import { test, expect } from '@playwright/test';
import { prisma } from '@hokko/db';
import type { EmailProvider } from '@hokko/integrations';
import { requestOutreachApprovalCore } from '../../lib/domains/leadmap/outreach-request';
import { decideOutreachApprovalCore, type OutreachSendHooks } from '../../lib/domains/leadmap/outreach-send';

// Codex M1-b E-01 の実 PostgreSQL 証拠。営業メール送信承認（decideApprovalAction の outreach_send 分岐）の
// production-shared core（decideOutreachApprovalCore）を fault hook 付きで直接呼び、
//  (1) 決定 CAS 後の write-ahead SendLog・provider 送信・draft/lead 確定が **再開可能な状態機械** であること
//  (2) 各 crash window（SendLog後/provider前・provider後/log更新前・draft/lead更新前）で retry しても
//      provider 送信は最大1回（exactly-once）・最終的に整合へ収束すること
//  (3) 並行決定でも CAS winner 1・SendLog 1・provider 1・UsageEvent 1 に収束すること
//  (4) suppression 対象は provider 0・SendLog suppressed 1・draft APPROVED・lead EXCLUDED
// を、計装した fake email provider の呼び出し回数と実 DB 行の再取得で検証する。
// 実メール/実 SMTP/実 LLM/Secrets/Production は使わない（provider は計装 fake・EXTERNAL_SEND_ENABLED は
// 本テスト内でのみ true にし afterAll で復元）。fixture/cleanup は本テスト生成 ID に限定（seed 非削除）。

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

/** 送信回数を数える計装 fake provider（実 SMTP を使わない）。 */
function countingProvider(): { provider: EmailProvider; calls: () => number } {
  let calls = 0;
  const provider: EmailProvider = {
    name: 'fake-count',
    async send() {
      calls += 1;
      return { status: 'sent', provider: 'fake-count', id: `fk_${calls}` };
    },
  };
  return { provider, calls: () => calls };
}

let tenantId = '';
let userId = '';
let prevExternal: string | undefined;

interface Fixture {
  campaignId: string;
  leadId: string;
  draftId: string;
  approvalId: string;
}

async function setupPendingApproval(email: string | null, subject = '件名', body = '本文'): Promise<Fixture> {
  const campaign = await prisma.leadSearchCampaign.create({
    data: { tenantId, name: `M1B-E01-${stamp()}`, region: '札幌市', industry: 'テスト業種' },
    select: { id: true },
  });
  const lead = await prisma.localBusinessLead.create({
    data: { tenantId, campaignId: campaign.id, name: `M1B-E01-LEAD-${stamp()}`, industry: 'テスト業種', email, placeId: `pl${stamp()}` },
    select: { id: true },
  });
  const draft = await prisma.outreachDraft.create({
    data: { tenantId, leadId: lead.id, subject, body, status: 'DRAFT' },
    select: { id: true },
  });
  const req = await requestOutreachApprovalCore({ tenantId, userId, draftId: draft.id });
  expect(req.outcome, '申請は成功').toBe('requested');
  const approval = await prisma.approvalRequest.findFirst({
    where: { tenantId, type: 'outreach_send', entityType: 'OutreachDraft', entityId: draft.id, status: 'PENDING' },
    select: { id: true },
  });
  expect(approval, 'PENDING の ApprovalRequest が1件できる').not.toBeNull();
  return { campaignId: campaign.id, leadId: lead.id, draftId: draft.id, approvalId: approval!.id };
}

async function cleanup(fx: Fixture, suppressValue?: string) {
  const logs = await prisma.outreachSendLog.findMany({ where: { tenantId, draftId: fx.draftId }, select: { id: true } });
  await prisma.usageEvent.deleteMany({ where: { tenantId, sourceId: { in: logs.map((l) => l.id) } } });
  await prisma.auditLog.deleteMany({ where: { tenantId, entityId: { in: [fx.draftId, fx.approvalId, fx.leadId] } } });
  await prisma.approvalRequest.deleteMany({ where: { tenantId, entityType: 'OutreachDraft', entityId: fx.draftId } });
  // campaign 削除で lead→draft→sendLog→approval が cascade で消える。
  await prisma.leadSearchCampaign.deleteMany({ where: { id: fx.campaignId, tenantId } });
  if (suppressValue) await prisma.suppressionList.deleteMany({ where: { tenantId, value: suppressValue } });
}

/** 本テスト由来の送信状態を1か所で再取得（実 DB re-fetch）。 */
async function snapshot(fx: Fixture) {
  const [logs, draft, lead, approval] = await Promise.all([
    prisma.outreachSendLog.findMany({ where: { tenantId, draftId: fx.draftId }, select: { id: true, status: true, provider: true, subject: true, body: true } }),
    prisma.outreachDraft.findUnique({ where: { id: fx.draftId }, select: { status: true } }),
    prisma.localBusinessLead.findUnique({ where: { id: fx.leadId }, select: { stage: true } }),
    prisma.approvalRequest.findUnique({ where: { id: fx.approvalId }, select: { status: true, executionStatus: true } }),
  ]);
  const usage = await prisma.usageEvent.count({
    where: { tenantId, eventType: 'external_send.outreach', sourceId: { in: logs.map((l) => l.id) } },
  });
  return { logs, draft, lead, approval, usage };
}

test.beforeAll(async () => {
  assertLocalDatabaseUrl();
  const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { id: true, tenantId: true } });
  if (!ceo) throw new Error('seed 未整備: ceo@ikezaki.local が存在しません');
  tenantId = ceo.tenantId;
  userId = ceo.id;
  // 送信状態機械の provider 経路を実行するため本テスト内でのみ外部送信を有効化（provider は計装 fake）。
  prevExternal = process.env.EXTERNAL_SEND_ENABLED;
  process.env.EXTERNAL_SEND_ENABLED = 'true';
});

test.afterAll(async () => {
  if (prevExternal === undefined) delete process.env.EXTERNAL_SEND_ENABLED;
  else process.env.EXTERNAL_SEND_ENABLED = prevExternal;
  await prisma.$disconnect();
});

test('happy path: 承認決定で provider 1回・SendLog sent 1・UsageEvent 1・draft SENT・lead SENT・executed anchor', async () => {
  const fx = await setupPendingApproval('happy@example.jp');
  const c = countingProvider();
  try {
    const r = await decideOutreachApprovalCore(
      { tenantId, userId, approvalId: fx.approvalId, decision: 'approve', note: '' },
      { __emailProviderForTest: c.provider },
    );
    expect(r.outcome).toBe('sent');
    expect(c.calls(), 'provider は1回だけ').toBe(1);
    const s = await snapshot(fx);
    expect(s.logs.length, 'SendLog はちょうど1件').toBe(1);
    expect(s.logs[0]!.status).toBe('sent');
    expect(s.draft!.status).toBe('SENT');
    expect(s.lead!.stage).toBe('SENT');
    expect(s.approval!.status).toBe('APPROVED');
    expect(s.approval!.executionStatus, '実行完了 anchor').toBe('executed');
    expect(s.usage, 'UsageEvent 1').toBe(1);
  } finally {
    await cleanup(fx);
  }
});

test('W1 crash（SendLog後・provider前）: durable queued・provider 0 → retry で provider 1・sent へ収束', async () => {
  const fx = await setupPendingApproval('w1@example.jp');
  const c = countingProvider();
  const hooks: OutreachSendHooks = {
    __emailProviderForTest: c.provider,
    __faultAfterSendLogForTest: () => {
      throw new Error('injected-fault:after-sendlog');
    },
  };
  try {
    await expect(decideOutreachApprovalCore({ tenantId, userId, approvalId: fx.approvalId, decision: 'approve', note: '' }, hooks)).rejects.toThrow('after-sendlog');
    // durable 再開状態: SendLog は queued 1件のみ・provider 未呼出・draft/lead は未確定。
    let s = await snapshot(fx);
    expect(s.logs.length).toBe(1);
    expect(s.logs[0]!.status, 'write-ahead は queued で durable').toBe('queued');
    expect(c.calls(), 'W1 では provider を呼ばない').toBe(0);
    expect(s.draft!.status).toBe('PENDING_APPROVAL');
    expect(s.lead!.stage).toBe('PENDING_APPROVAL');
    expect(s.usage).toBe(0);
    expect(s.approval!.status, '決定 CAS は済（APPROVED）だが未実行').toBe('APPROVED');
    expect(s.approval!.executionStatus).not.toBe('executed');
    // retry（fault なし）: queued から provider を1回呼んで完走。二重送信も永久停止も起きない。
    const r = await decideOutreachApprovalCore({ tenantId, userId, approvalId: fx.approvalId, decision: 'approve', note: '' }, { __emailProviderForTest: c.provider });
    expect(r.outcome).toBe('sent');
    expect(c.calls(), 'retry で provider ちょうど1回').toBe(1);
    s = await snapshot(fx);
    expect(s.logs.length, 'SendLog は増えず1件').toBe(1);
    expect(s.logs[0]!.status).toBe('sent');
    expect(s.draft!.status).toBe('SENT');
    expect(s.lead!.stage).toBe('SENT');
    expect(s.usage).toBe(1);
    expect(s.approval!.executionStatus).toBe('executed');
  } finally {
    await cleanup(fx);
  }
});

test('W2 crash（provider後・log更新前）: durable sending・provider 1 → retry で再送せず sent へ収束', async () => {
  const fx = await setupPendingApproval('w2@example.jp');
  const c = countingProvider();
  const hooks: OutreachSendHooks = {
    __emailProviderForTest: c.provider,
    __faultAfterProviderForTest: () => {
      throw new Error('injected-fault:after-provider');
    },
  };
  try {
    await expect(decideOutreachApprovalCore({ tenantId, userId, approvalId: fx.approvalId, decision: 'approve', note: '' }, hooks)).rejects.toThrow('after-provider');
    let s = await snapshot(fx);
    expect(s.logs.length).toBe(1);
    expect(s.logs[0]!.status, 'provider 呼出済の durable 印は sending').toBe('sending');
    expect(c.calls(), 'provider は既に1回呼ばれている').toBe(1);
    expect(s.draft!.status).toBe('PENDING_APPROVAL');
    expect(s.usage).toBe(0);
    // retry: sending は「provider 呼出済」なので二度と呼ばない（exactly-once）→ sent へ確定。
    const r = await decideOutreachApprovalCore({ tenantId, userId, approvalId: fx.approvalId, decision: 'approve', note: '' }, { __emailProviderForTest: c.provider });
    expect(r.outcome).toBe('sent');
    expect(c.calls(), 'retry で provider は増えない（1のまま）').toBe(1);
    s = await snapshot(fx);
    expect(s.logs.length).toBe(1);
    expect(s.logs[0]!.status).toBe('sent');
    expect(s.draft!.status).toBe('SENT');
    expect(s.lead!.stage).toBe('SENT');
    expect(s.usage).toBe(1);
    expect(s.approval!.executionStatus).toBe('executed');
  } finally {
    await cleanup(fx);
  }
});

test('W3 crash（log確定後・draft/lead更新前）: SendLog sent・provider 1 → retry で再送せず draft/lead/usage を確定', async () => {
  const fx = await setupPendingApproval('w3@example.jp');
  const c = countingProvider();
  const hooks: OutreachSendHooks = {
    __emailProviderForTest: c.provider,
    __faultBeforeDraftLeadForTest: () => {
      throw new Error('injected-fault:before-draft-lead');
    },
  };
  try {
    await expect(decideOutreachApprovalCore({ tenantId, userId, approvalId: fx.approvalId, decision: 'approve', note: '' }, hooks)).rejects.toThrow('before-draft-lead');
    let s = await snapshot(fx);
    expect(s.logs.length).toBe(1);
    expect(s.logs[0]!.status, 'log は sent まで確定済').toBe('sent');
    expect(c.calls()).toBe(1);
    expect(s.draft!.status, 'draft/lead はまだ未確定（durable 再開点）').toBe('PENDING_APPROVAL');
    expect(s.lead!.stage).toBe('PENDING_APPROVAL');
    expect(s.usage, 'UsageEvent はまだ 0').toBe(0);
    // retry: terminal log を見て provider を呼ばず draft/lead/usage/executed を確定。
    const r = await decideOutreachApprovalCore({ tenantId, userId, approvalId: fx.approvalId, decision: 'approve', note: '' }, { __emailProviderForTest: c.provider });
    expect(r.outcome).toBe('sent');
    expect(c.calls(), 'retry で provider は増えない').toBe(1);
    s = await snapshot(fx);
    expect(s.draft!.status).toBe('SENT');
    expect(s.lead!.stage).toBe('SENT');
    expect(s.usage).toBe(1);
    expect(s.approval!.executionStatus).toBe('executed');
  } finally {
    await cleanup(fx);
  }
});

test('並行4決定: CAS winner 1・SendLog 1・provider 1・UsageEvent 1・draft SENT へ収束', async () => {
  const fx = await setupPendingApproval('concurrent@example.jp');
  const c = countingProvider();
  try {
    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        decideOutreachApprovalCore({ tenantId, userId, approvalId: fx.approvalId, decision: 'approve', note: '' }, { __emailProviderForTest: c.provider }),
      ),
    );
    // 少なくとも1本が sent。敗者は noop/sent（idempotent）だが provider は勝者のみ1回。
    expect(results.some((r) => r.outcome === 'sent'), '少なくとも1本は sent').toBe(true);
    expect(c.calls(), '並行でも provider はちょうど1回（exactly-once）').toBe(1);
    const s = await snapshot(fx);
    expect(s.logs.length, 'SendLog は1件のみ（write-ahead 行ロックで直列化）').toBe(1);
    expect(s.logs[0]!.status).toBe('sent');
    expect(s.usage, 'UsageEvent は1（idempotencyKey=SendLog id）').toBe(1);
    expect(s.draft!.status).toBe('SENT');
    expect(s.lead!.stage).toBe('SENT');
    // 決定監査は勝者1本のみ（重複なし）。
    const decisionAudits = await prisma.auditLog.count({ where: { tenantId, entityType: 'ApprovalRequest', entityId: fx.approvalId, action: 'approve' } });
    expect(decisionAudits, '決定監査は1件').toBe(1);
  } finally {
    await cleanup(fx);
  }
});

test('suppression: 抑止対象は provider 0・SendLog suppressed 1・draft APPROVED・lead EXCLUDED・UsageEvent 0', async () => {
  const target = `suppressed-${stamp()}@example.jp`;
  const fx = await setupPendingApproval(target);
  await prisma.suppressionList.create({ data: { tenantId, channel: 'email', value: target, reason: 'test 抑止' } });
  const c = countingProvider();
  try {
    const r = await decideOutreachApprovalCore(
      { tenantId, userId, approvalId: fx.approvalId, decision: 'approve', note: '' },
      { __emailProviderForTest: c.provider },
    );
    expect(r.outcome).toBe('suppressed');
    expect(c.calls(), '抑止対象へは provider を一切呼ばない').toBe(0);
    const s = await snapshot(fx);
    expect(s.logs.length).toBe(1);
    expect(s.logs[0]!.status).toBe('suppressed');
    expect(s.draft!.status, '抑止時 draft は APPROVED（SENT にしない）').toBe('APPROVED');
    expect(s.lead!.stage, '抑止時 lead は EXCLUDED').toBe('EXCLUDED');
    expect(s.usage, 'suppressed は課金対象外＝UsageEvent 0').toBe(0);
  } finally {
    await cleanup(fx, target);
  }
});

test('reject 決定: draft REJECTED・OutreachApproval REJECTED・SendLog 0・provider 0', async () => {
  const fx = await setupPendingApproval('reject@example.jp');
  const c = countingProvider();
  try {
    const r = await decideOutreachApprovalCore(
      { tenantId, userId, approvalId: fx.approvalId, decision: 'reject', note: '見送り' },
      { __emailProviderForTest: c.provider },
    );
    expect(r.outcome).toBe('rejected');
    expect(c.calls()).toBe(0);
    const s = await snapshot(fx);
    expect(s.logs.length, 'reject は送信ログを作らない').toBe(0);
    expect(s.draft!.status).toBe('REJECTED');
    const oa = await prisma.outreachApproval.findFirst({ where: { tenantId, draftId: fx.draftId }, select: { status: true } });
    expect(oa!.status).toBe('REJECTED');
  } finally {
    await cleanup(fx);
  }
});
