import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { prisma } from '@hokko/db';
import { decideAiGateCore, type GateBridgeDb } from '../../lib/ai-gate-bridge';

// v7.0 Lane P4（roadmap82）／v7.0 R2（Codex CODEX_P4_PREAUDIT_V70 comment 4951050657 対応）:
// AI 承認ゲート判断 Bridge の実 PostgreSQL 証拠＋実 UI E2E。
// R2 の追加証拠: approve=QUEUED（再開待ち・SUCCEEDED 偽装なし）、stale gate の人間再確認、
// downstream 失敗注入の全表 rollback、AI 誤権限の閲覧境界、reject/二重 submit UI、詳細ページ状態一致、
// metadata-only の負の fixture（input/output/error/reason sentinel 非複製）。
// 実 DB の最終状態 re-fetch で assert（mock 呼び出し回数では合格にしない）。
// fixture は本テストが作る合成データのみ・afterAll で fixture だけを削除する。

const SECRET_INPUT = 'GATE-SECRET-INPUT-V70';
const SECRET_OUTPUT = 'GATE-SECRET-OUTPUT-V70R2';
const SECRET_ERROR = 'GATE-SECRET-ERROR-V70R2';
const SECRET_REASON = 'GATE-SECRET-REASON-V70R2';

let tenantId = ''; // seed の ceo tenant（UI ログインに必要）— fixture 行は自前で作成・削除
let agentId = '';
const fixtureGateIds: string[] = [];
const fixtureRunIds: string[] = [];
const fixtureUserIds: string[] = [];

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

async function makeGate(opts: { runStatus?: string; runId?: 'none'; gateAgeMs?: number; reason?: string } = {}) {
  let runId: string | null = null;
  const task = `v70-p4-${Date.now()}-${Math.random()}`;
  if (opts.runId !== 'none') {
    const run = await prisma.aIAgentRun.create({
      data: {
        tenantId,
        agentId,
        task,
        status: (opts.runStatus ?? 'NEEDS_APPROVAL') as never,
        input: { note: SECRET_INPUT },
        output: { note: SECRET_OUTPUT },
        error: SECRET_ERROR,
        startedAt: new Date(),
        finishedAt: null,
      },
    });
    runId = run.id;
    fixtureRunIds.push(run.id);
  }
  const gate = await prisma.aIApprovalGate.create({
    data: {
      tenantId,
      runId,
      action: 'v70_p4_fixture',
      reason: opts.reason ?? '人間の判断待ち（fixture）',
      status: 'PENDING',
      ...(opts.gateAgeMs ? { createdAt: new Date(Date.now() - opts.gateAgeMs) } : {}),
    },
  });
  fixtureGateIds.push(gate.id);
  return { gateId: gate.id, runId, task };
}

function dec(gateId: string, decision: 'approve' | 'reject', extra: Partial<Parameters<typeof decideAiGateCore>[1]> = {}) {
  return { tenantId, gateId, decision, decidedById: 'v70-p4-approver', note: '', actorIsAi: false, ...extra };
}

/** 実 prisma の transaction を使いつつ、指定モデルの create だけを故意に失敗させる test-only wrapper
 *（Server Action から到達不能・findFirst/updateMany は実 tx へ delegate）。 */
function failingDb(failOn: 'aIAgentAction' | 'approvalRequest' | 'auditLog' | 'dataAccessLog'): GateBridgeDb {
  return {
    $transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
      return prisma.$transaction(async (tx) => {
        const failCreate = { create: async () => { throw new Error(`injected-${failOn}-failure`); } };
        const wrapped = {
          aIApprovalGate: tx.aIApprovalGate,
          aIAgentRun: tx.aIAgentRun,
          aIAgentAction: failOn === 'aIAgentAction' ? failCreate : tx.aIAgentAction,
          approvalRequest:
            failOn === 'approvalRequest' ? { ...failCreate, updateMany: (a: any) => tx.approvalRequest.updateMany(a) } : tx.approvalRequest,
          auditLog: failOn === 'auditLog' ? failCreate : tx.auditLog,
          dataAccessLog: failOn === 'dataAccessLog' ? failCreate : tx.dataAccessLog,
        };
        return fn(wrapped);
      });
    },
  };
}

/** 全表 re-fetch（gate/run/action/approval/audit/dataAccess）。 */
async function snapshot(gateId: string, runId: string | null) {
  return {
    gate: await prisma.aIApprovalGate.findUnique({ where: { id: gateId } }),
    run: runId ? await prisma.aIAgentRun.findUnique({ where: { id: runId } }) : null,
    actions: runId ? await prisma.aIAgentAction.count({ where: { runId } }) : 0,
    approvals: await prisma.approvalRequest.count({ where: { tenantId, type: 'ai_run_resume', entityId: gateId } }),
    audits: await prisma.auditLog.count({ where: { tenantId, entityType: 'AIApprovalGate', entityId: gateId } }),
    accesses: await prisma.dataAccessLog.count({ where: { tenantId, entityType: 'AIApprovalGate', entityId: gateId } }),
  };
}

test.describe('P4 AI承認ゲート判断 Bridge（実 PostgreSQL＋実 UI・v7.0 R2）', () => {
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
    if (fixtureUserIds.length) {
      await prisma.userRole.deleteMany({ where: { userId: { in: fixtureUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: fixtureUserIds } } });
    }
    await prisma.$disconnect();
  });

  test('approve（実DB）: gate APPROVED・run は QUEUED（承認済み・再開待ち・SUCCEEDED/finishedAt なし）・Action/ApprovalRequest 1:1', async () => {
    const { gateId, runId } = await makeGate();
    const r = await decideAiGateCore(prisma as unknown as GateBridgeDb, dec(gateId, 'approve'));
    expect(r.outcome).toBe('decided');
    const gate = await prisma.aIApprovalGate.findUnique({ where: { id: gateId } });
    expect(gate?.status).toBe('APPROVED');
    const run = await prisma.aIAgentRun.findUnique({ where: { id: runId! } });
    // v7.0 R2（Codex P2-3）: 実行証拠なしに SUCCEEDED としない。承認＝再開待ち（QUEUED）。
    expect(run?.status).toBe('QUEUED');
    expect(run?.humanReviewed).toBe(true);
    expect(run?.finishedAt).toBeNull(); // 実行完了の記録は作らない（startedAt は元の履歴のまま保持）
    const actions = await prisma.aIAgentAction.findMany({ where: { runId: runId! } });
    expect(actions.some((a) => a.summary.includes('再開待ち') && a.summary.includes('実行はまだ行われていません'))).toBe(true);
    expect(actions.some((a) => a.summary.includes('完了'))).toBe(false); // 承認・再開待ち・実行済みを混同しない
    const records = await prisma.approvalRequest.findMany({ where: { tenantId, type: 'ai_run_resume', entityId: gateId } });
    expect(records).toHaveLength(1); // 1:1
    expect(records[0]!.status).toBe('APPROVED');
    expect(records[0]!.summary).toContain('再開待ち');
    expect(records[0]!.decidedById).toBe('v70-p4-approver');
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
    expect(run?.status).toBe(gate?.status === 'APPROVED' ? 'QUEUED' : 'FAILED');
    expect(await prisma.approvalRequest.count({ where: { tenantId, type: 'ai_run_resume', entityId: gateId } })).toBe(1);
  });

  test('downstream 失敗注入（実DB）: Action/ApprovalRequest/Audit/DataAccess のどこで失敗しても全表 rollback・実 retry で確定', async () => {
    // v7.0 R2（comment 4951050657 EVIDENCE_GAP）: gate/run/action/approval/audit/access 全テーブルを再取得。
    for (const failOn of ['aIAgentAction', 'approvalRequest', 'auditLog', 'dataAccessLog'] as const) {
      const { gateId, runId } = await makeGate();
      const before = await snapshot(gateId, runId);
      await expect(decideAiGateCore(failingDb(failOn), dec(gateId, 'approve'))).rejects.toThrow(`injected-${failOn}-failure`);
      const after = await snapshot(gateId, runId);
      expect(after.gate?.status, `failOn=${failOn} gate`).toBe('PENDING');
      expect(after.run?.status, `failOn=${failOn} run`).toBe('NEEDS_APPROVAL');
      expect(after.run?.startedAt?.getTime(), `failOn=${failOn} run.startedAt 不変`).toBe(before.run?.startedAt?.getTime());
      expect(after.actions, `failOn=${failOn} actions`).toBe(0);
      expect(after.approvals, `failOn=${failOn} approvals`).toBe(0);
      expect(after.audits, `failOn=${failOn} audits`).toBe(0);
      expect(after.accesses, `failOn=${failOn} accesses`).toBe(0);
      // 実 retry: 同じ gate を人間が再判断でき、全レコードが確定する。
      expect((await decideAiGateCore(prisma as unknown as GateBridgeDb, dec(gateId, 'approve'))).outcome, `failOn=${failOn} retry`).toBe('decided');
      const done = await snapshot(gateId, runId);
      expect([done.gate?.status, done.run?.status, done.actions, done.approvals, done.audits, done.accesses], `failOn=${failOn} 確定`).toEqual([
        'APPROVED', 'QUEUED', 1, 1, 1, 1,
      ]);
    }
  });

  test('stale gate（実DB）: 24h超は approve しても何も変更されず、人間の明示再確認（confirmStale）でのみ承認できる', async () => {
    // v7.0 R2（Codex P2-2）: gate.createdAt 25h 前 → stale。
    const { gateId, runId } = await makeGate({ gateAgeMs: 25 * 60 * 60 * 1000 });
    const before = await snapshot(gateId, runId);
    const r = await decideAiGateCore(prisma as unknown as GateBridgeDb, dec(gateId, 'approve'));
    expect(r.outcome).toBe('stale');
    expect(await snapshot(gateId, runId)).toEqual(before); // 実 DB 完全不変
    // 明示再確認で承認できる（staleConfirmed が記録に残る）。
    expect((await decideAiGateCore(prisma as unknown as GateBridgeDb, dec(gateId, 'approve', { confirmStale: true }))).outcome).toBe('decided');
    const rec = await prisma.approvalRequest.findFirst({ where: { tenantId, type: 'ai_run_resume', entityId: gateId } });
    expect((rec?.payload as Record<string, unknown>).staleConfirmed).toBe(true);
    // reject は stale でも安全側として通る（startedAt null 系の fail-closed は DB 列が non-null のため
    // 実 DB では発生し得ない — mock 契約 tests/ai_gate_bridge.test.ts が防衛線として担保）。
    const { gateId: g2, runId: r2 } = await makeGate({ gateAgeMs: 25 * 60 * 60 * 1000 });
    expect((await decideAiGateCore(prisma as unknown as GateBridgeDb, dec(g2, 'reject'))).outcome).toBe('decided');
    expect((await prisma.aIAgentRun.findUnique({ where: { id: r2! } }))?.status).toBe('FAILED');
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

  test('AI 主体（実DB）: DB 接触前拒否・行数不変＋source order 証拠', async () => {
    const { gateId } = await makeGate();
    const before = await prisma.approvalRequest.count({ where: { tenantId, type: 'ai_run_resume' } });
    const r = await decideAiGateCore(prisma as unknown as GateBridgeDb, dec(gateId, 'approve', { actorIsAi: true }));
    expect(r.outcome).toBe('forbidden');
    expect((await prisma.aIApprovalGate.findUnique({ where: { id: gateId } }))?.status).toBe('PENDING');
    expect(await prisma.approvalRequest.count({ where: { tenantId, type: 'ai_run_resume' } })).toBe(before);
    // source evidence: actorIsAi guard が最初の db.$transaction より前（mock call-zero は tests/ai_gate_bridge.test.ts）。
    const src = readFileSync(resolve(dirname(test.info().file), '../../lib/ai-gate-bridge.ts'), 'utf8');
    const body = src.slice(src.indexOf('export async function decideAiGateCore'));
    expect(body.indexOf('if (input.actorIsAi)')).toBeGreaterThan(-1);
    expect(body.indexOf('if (input.actorIsAi)')).toBeLessThan(body.indexOf('db.$transaction'));
  });

  test('metadata-only（実DB・負の fixture）: run の input/output/error・gate の reason が決定レコード/監査/DataAccess/Action へ複製されない', async () => {
    const { gateId, runId } = await makeGate({ reason: `判断待ち ${SECRET_REASON}` });
    expect((await decideAiGateCore(prisma as unknown as GateBridgeDb, dec(gateId, 'approve'))).outcome).toBe('decided');
    const rows = [
      ...(await prisma.approvalRequest.findMany({ where: { tenantId, type: 'ai_run_resume', entityId: gateId } })),
      ...(await prisma.auditLog.findMany({ where: { tenantId, entityType: 'AIApprovalGate', entityId: gateId } })),
      ...(await prisma.dataAccessLog.findMany({ where: { tenantId, entityType: 'AIApprovalGate', entityId: gateId } })),
      ...(await prisma.aIAgentAction.findMany({ where: { runId: runId! } })),
    ];
    expect(rows.length).toBeGreaterThanOrEqual(4);
    for (const row of rows) {
      const json = JSON.stringify(row);
      for (const sentinel of [SECRET_INPUT, SECRET_OUTPUT, SECRET_ERROR, SECRET_REASON]) {
        expect(json, `決定系レコードに ${sentinel} が複製されている`).not.toContain(sentinel);
      }
    }
  });

  test('実 UI: /approvals から人間が承認 → gate が一覧から消え、AI 社員詳細で run が QUEUED（再開待ち）と表示される', async ({ page }) => {
    const { gateId, runId, task } = await makeGate();
    await login(page, 'ceo@ikezaki.local');
    await page.goto('/approvals');
    const item = page.getByTestId(`ai-gate-${gateId}`);
    await expect(item).toBeVisible();
    await expect(item.getByTestId(`ai-gate-agent-link-${gateId}`)).toHaveAttribute('href', `/ai-agents/${agentId}`);
    await expect(item.getByTestId(`ai-gate-stale-${gateId}`)).toHaveCount(0); // fresh gate に stale badge は出ない
    await item.getByTestId(`ai-gate-approve-${gateId}`).click();
    await expect(page.getByTestId(`ai-gate-${gateId}`)).toHaveCount(0); // PENDING 一覧から消える（既に /approvals のため URL では待たない）
    // 実 DB でも確定している（QUEUED = 再開待ち・実行なし）。
    expect((await prisma.aIApprovalGate.findUnique({ where: { id: gateId } }))?.status).toBe('APPROVED');
    expect((await prisma.aIAgentRun.findUnique({ where: { id: runId! } }))?.status).toBe('QUEUED');
    // Inbox→詳細の状態一致: AI 社員詳細で当該 run が QUEUED badge で見える（SUCCEEDED と混同しない）。
    await page.goto(`/ai-agents/${agentId}`);
    const runRow = page.locator('div, li').filter({ hasText: task }).first();
    await expect(runRow).toBeVisible();
    await expect(runRow.getByText('QUEUED', { exact: true }).first()).toBeVisible();
  });

  test('実 UI: 却下 → gate が消え run は FAILED・二重 submit（2タブ）は一方だけ確定', async ({ page, context }) => {
    const { gateId, runId } = await makeGate();
    await login(page, 'ceo@ikezaki.local');
    // 2 タブで同じ PENDING gate を表示（二重 submit の実 UI 再現）。
    const page2 = await context.newPage();
    await page.goto('/approvals');
    await page2.goto('/approvals');
    await expect(page.getByTestId(`ai-gate-${gateId}`)).toBeVisible();
    await expect(page2.getByTestId(`ai-gate-${gateId}`)).toBeVisible();
    // タブ1で却下 → タブ2で承認（後者は CAS の敗者＝already で何も起きない）。
    await page.getByTestId(`ai-gate-reject-${gateId}`).click();
    await expect(page.getByTestId(`ai-gate-${gateId}`)).toHaveCount(0);
    await page2.getByTestId(`ai-gate-approve-${gateId}`).click();
    await expect(page2.getByTestId(`ai-gate-${gateId}`)).toHaveCount(0);
    await page2.close();
    // 実 DB: 先勝ち（REJECTED/FAILED）のまま・決定レコードは 1 件だけ。
    expect((await prisma.aIApprovalGate.findUnique({ where: { id: gateId } }))?.status).toBe('REJECTED');
    expect((await prisma.aIAgentRun.findUnique({ where: { id: runId! } }))?.status).toBe('FAILED');
    expect(await prisma.approvalRequest.count({ where: { tenantId, type: 'ai_run_resume', entityId: gateId } })).toBe(1);
  });

  test('実 UI: stale gate は badge 表示・checkbox なし承認は不変＋banner・再確認 checkbox で承認できる', async ({ page }) => {
    const { gateId, runId } = await makeGate({ gateAgeMs: 25 * 60 * 60 * 1000 });
    await login(page, 'ceo@ikezaki.local');
    await page.goto('/approvals');
    await expect(page.getByTestId(`ai-gate-stale-${gateId}`)).toBeVisible();
    // checkbox を付けずに承認 → 何も変更されず banner が出る。
    await page.getByTestId(`ai-gate-approve-${gateId}`).click();
    await expect(page.getByTestId('stale-gate-banner')).toBeVisible();
    expect((await prisma.aIApprovalGate.findUnique({ where: { id: gateId } }))?.status).toBe('PENDING');
    expect((await prisma.aIAgentRun.findUnique({ where: { id: runId! } }))?.status).toBe('NEEDS_APPROVAL');
    // 再確認 checkbox を付けて承認 → 確定。
    await page.getByTestId(`ai-gate-confirm-stale-${gateId}`).check();
    await page.getByTestId(`ai-gate-approve-${gateId}`).click();
    await expect(page.getByTestId(`ai-gate-${gateId}`)).toHaveCount(0);
    expect((await prisma.aIApprovalGate.findUnique({ where: { id: gateId } }))?.status).toBe('APPROVED');
    expect((await prisma.aIAgentRun.findUnique({ where: { id: runId! } }))?.status).toBe('QUEUED');
  });

  test('実 UI: AI＋approval:approve 誤設定 fixture は /approvals をデータ取得前に遮断（gate 内容・判断フォーム非表示・DB 不変）', async ({ page }) => {
    // v7.0 R2（Codex P2-1）: 誤って承認権限が付いた AI ロールの閲覧境界。
    const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { passwordHash: true } });
    const ownerRole = await prisma.role.findFirst({ where: { tenantId, key: 'OWNER' }, select: { id: true } });
    if (!ceo || !ownerRole) throw new Error('seed fixture not found');
    const aiBoss = await prisma.user.create({
      data: { tenantId, email: 'ai-owner-misconfig@ikezaki.local', name: 'AI誤設定fixture', passwordHash: ceo.passwordHash, isAiAgent: true },
    });
    fixtureUserIds.push(aiBoss.id);
    await prisma.userRole.create({ data: { tenantId, userId: aiBoss.id, roleId: ownerRole.id } });

    const { gateId, runId } = await makeGate({ reason: `判断待ち ${SECRET_REASON}` });
    const before = await snapshot(gateId, runId);
    await login(page, 'ai-owner-misconfig@ikezaki.local');
    await page.goto('/approvals');
    // AccessDenied（データ取得前遮断）: gate の reason・判断フォーム・承認一覧が一切描画されない。
    await expect(page.getByText('承認一覧は人間の承認者のみ閲覧できます', { exact: false })).toBeVisible();
    await expect(page.getByTestId(`ai-gate-${gateId}`)).toHaveCount(0);
    await expect(page.getByTestId('ai-approval-gates')).toHaveCount(0);
    await expect(page.getByText(SECRET_REASON)).toHaveCount(0);
    expect(await page.locator(`[data-testid^="ai-gate-approve-"]`).count()).toBe(0);
    // DB は一切変化しない。
    expect(await snapshot(gateId, runId)).toEqual(before);
  });
});
