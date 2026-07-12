import { test, expect, type Page } from '@playwright/test';
import { prisma } from '@hokko/db';
import { decideAiGateCore, type GateBridgeDb } from '../../lib/ai-gate-bridge';

// v7.0 Lane P4（roadmap82）: AI 承認ゲート判断 Bridge の実 PostgreSQL 証拠＋実 UI E2E。
// 実 DB の最終状態 re-fetch で assert（mock 呼び出し回数では合格にしない）。
// fixture は本テストが作る合成データのみ・afterAll で fixture だけを削除する。

const SECRET_INPUT = 'GATE-SECRET-INPUT-V70';

let tenantId = ''; // seed の ceo tenant（UI ログインに必要）— fixture 行は自前で作成・削除
let agentId = '';
const fixtureGateIds: string[] = [];
const fixtureRunIds: string[] = [];

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

async function makeGate(opts: { runStatus?: string; runId?: 'none' } = {}) {
  let runId: string | null = null;
  if (opts.runId !== 'none') {
    const run = await prisma.aIAgentRun.create({
      data: {
        tenantId,
        agentId,
        task: `v70-p4-${Date.now()}-${Math.random()}`,
        status: (opts.runStatus ?? 'NEEDS_APPROVAL') as never,
        input: { note: SECRET_INPUT },
        startedAt: new Date(),
        finishedAt: null,
      },
    });
    runId = run.id;
    fixtureRunIds.push(run.id);
  }
  const gate = await prisma.aIApprovalGate.create({
    data: { tenantId, runId, action: 'v70_p4_fixture', reason: '人間の判断待ち（fixture）', status: 'PENDING' },
  });
  fixtureGateIds.push(gate.id);
  return { gateId: gate.id, runId };
}

function dec(gateId: string, decision: 'approve' | 'reject', actorIsAi = false) {
  return { tenantId, gateId, decision, decidedById: 'v70-p4-approver', note: '', actorIsAi };
}

test.describe('P4 AI承認ゲート判断 Bridge（実 PostgreSQL＋実 UI）', () => {
  test.beforeAll(async () => {
    const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { tenantId: true } });
    if (!ceo) throw new Error('seed ceo not found');
    tenantId = ceo.tenantId;
    const agent = await prisma.aIAgent.findFirst({ where: { tenantId }, select: { id: true } });
    if (!agent) throw new Error('seed agent not found');
    agentId = agent.id;
  });

  test.afterAll(async () => {
    await prisma.approvalRequest.deleteMany({ where: { tenantId, type: 'ai_run_resume', entityId: { in: fixtureGateIds } } });
    await prisma.auditLog.deleteMany({ where: { tenantId, entityType: 'AIApprovalGate', entityId: { in: fixtureGateIds } } });
    await prisma.dataAccessLog.deleteMany({ where: { tenantId, entityType: 'AIApprovalGate', entityId: { in: fixtureGateIds } } });
    await prisma.aIApprovalGate.deleteMany({ where: { id: { in: fixtureGateIds } } });
    await prisma.aIAgentAction.deleteMany({ where: { runId: { in: fixtureRunIds } } });
    await prisma.aIAgentRun.deleteMany({ where: { id: { in: fixtureRunIds } } });
    await prisma.$disconnect();
  });

  test('approve（実DB）: gate APPROVED・run SUCCEEDED(humanReviewed)・Action記録・ApprovalRequest 1:1', async () => {
    const { gateId, runId } = await makeGate();
    const r = await decideAiGateCore(prisma as unknown as GateBridgeDb, dec(gateId, 'approve'));
    expect(r.outcome).toBe('decided');
    const gate = await prisma.aIApprovalGate.findUnique({ where: { id: gateId } });
    expect(gate?.status).toBe('APPROVED');
    const run = await prisma.aIAgentRun.findUnique({ where: { id: runId! } });
    expect(run?.status).toBe('SUCCEEDED');
    expect(run?.humanReviewed).toBe(true);
    expect(run?.finishedAt).not.toBeNull();
    const actions = await prisma.aIAgentAction.findMany({ where: { runId: runId! } });
    expect(actions.some((a) => a.summary.includes('人間の承認により再開'))).toBe(true);
    const records = await prisma.approvalRequest.findMany({ where: { tenantId, type: 'ai_run_resume', entityId: gateId } });
    expect(records).toHaveLength(1); // 1:1
    expect(records[0]!.status).toBe('APPROVED');
    expect(records[0]!.decidedById).toBe('v70-p4-approver');
    // metadata-only: run.input の秘密が決定レコード/監査へ複製されていない。
    const audits = await prisma.auditLog.findMany({ where: { tenantId, entityType: 'AIApprovalGate', entityId: gateId } });
    for (const row of [...records, ...audits]) {
      expect(JSON.stringify(row)).not.toContain(SECRET_INPUT);
    }
  });

  test('reject（実DB）: run FAILED（terminal・再開不可）・二重 reject は冪等', async () => {
    const { gateId, runId } = await makeGate();
    expect((await decideAiGateCore(prisma as unknown as GateBridgeDb, dec(gateId, 'reject'))).outcome).toBe('decided');
    const run = await prisma.aIAgentRun.findUnique({ where: { id: runId! } });
    expect(run?.status).toBe('FAILED');
    const snap = await prisma.aIApprovalGate.findUnique({ where: { id: gateId } });
    // 二重 submit: already・状態不変。
    expect((await decideAiGateCore(prisma as unknown as GateBridgeDb, dec(gateId, 'reject'))).outcome).toBe('already');
    expect((await prisma.aIApprovalGate.findUnique({ where: { id: gateId } }))?.status).toBe(snap?.status);
    // 再開不可: reject 後に approve を試みても already（gate は PENDING でない）・run は FAILED のまま。
    expect((await decideAiGateCore(prisma as unknown as GateBridgeDb, dec(gateId, 'approve'))).outcome).toBe('already');
    expect((await prisma.aIAgentRun.findUnique({ where: { id: runId! } }))?.status).toBe('FAILED');
  });

  test('並行 approve/reject（実DB）: 一方だけ成功し gate と run が整合する', async () => {
    const { gateId, runId } = await makeGate();
    const [a, b] = await Promise.allSettled([
      decideAiGateCore(prisma as unknown as GateBridgeDb, dec(gateId, 'approve')),
      decideAiGateCore(prisma as unknown as GateBridgeDb, dec(gateId, 'reject')),
    ]);
    const outs = [a, b].map((r) => (r.status === 'fulfilled' ? r.value.outcome : 'error')).sort();
    expect(outs).toEqual(['already', 'decided']);
    const gate = await prisma.aIApprovalGate.findUnique({ where: { id: gateId } });
    const run = await prisma.aIAgentRun.findUnique({ where: { id: runId! } });
    expect(gate?.status).toMatch(/^(APPROVED|REJECTED)$/);
    expect(run?.status).toBe(gate?.status === 'APPROVED' ? 'SUCCEEDED' : 'FAILED');
    expect(await prisma.approvalRequest.count({ where: { tenantId, type: 'ai_run_resume', entityId: gateId } })).toBe(1);
  });

  test('run が既に terminal（実DB）: 判断ごと rollback（gate は PENDING のまま・記録ゼロ）', async () => {
    const { gateId } = await makeGate({ runStatus: 'SUCCEEDED' }); // terminal からの巻き戻しは禁止
    await expect(decideAiGateCore(prisma as unknown as GateBridgeDb, dec(gateId, 'approve'))).rejects.toThrow(
      'ai-run-transition-failed',
    );
    expect((await prisma.aIApprovalGate.findUnique({ where: { id: gateId } }))?.status).toBe('PENDING');
    expect(await prisma.approvalRequest.count({ where: { tenantId, type: 'ai_run_resume', entityId: gateId } })).toBe(0);
  });

  test('runId null の孤立 gate（実DB）: 判断のみで完結・cross-tenant は already 非開示', async () => {
    const { gateId } = await makeGate({ runId: 'none' });
    expect((await decideAiGateCore(prisma as unknown as GateBridgeDb, dec(gateId, 'approve'))).outcome).toBe('decided');
    // cross-tenant: 実在 gate を別 tenant の判断者は決定できない（不存在と同じ already）。
    const { gateId: g2 } = await makeGate();
    const r = await decideAiGateCore(prisma as unknown as GateBridgeDb, { ...dec(g2, 'approve'), tenantId: 'other-tenant-id' });
    expect(r.outcome).toBe('already');
    expect((await prisma.aIApprovalGate.findUnique({ where: { id: g2 } }))?.status).toBe('PENDING');
  });

  test('AI 主体（実DB）: DB 接触前拒否・行数不変', async () => {
    const { gateId } = await makeGate();
    const before = await prisma.approvalRequest.count({ where: { tenantId, type: 'ai_run_resume' } });
    const r = await decideAiGateCore(prisma as unknown as GateBridgeDb, dec(gateId, 'approve', true));
    expect(r.outcome).toBe('forbidden');
    expect((await prisma.aIApprovalGate.findUnique({ where: { id: gateId } }))?.status).toBe('PENDING');
    expect(await prisma.approvalRequest.count({ where: { tenantId, type: 'ai_run_resume' } })).toBe(before);
  });

  test('実 UI: /approvals から人間が承認 → gate が一覧から消え、AI 社員詳細へ deep link できる', async ({ page }) => {
    const { gateId } = await makeGate();
    await login(page, 'ceo@ikezaki.local');
    await page.goto('/approvals');
    const item = page.getByTestId(`ai-gate-${gateId}`);
    await expect(item).toBeVisible();
    await expect(item.getByTestId(`ai-gate-agent-link-${gateId}`)).toHaveAttribute('href', `/ai-agents/${agentId}`);
    await item.getByTestId(`ai-gate-approve-${gateId}`).click();
    await page.waitForURL('**/approvals');
    await expect(page.getByTestId(`ai-gate-${gateId}`)).toHaveCount(0); // PENDING 一覧から消える
    // 実 DB でも確定している。
    expect((await prisma.aIApprovalGate.findUnique({ where: { id: gateId } }))?.status).toBe('APPROVED');
  });
});
