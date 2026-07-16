import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { prisma } from '@hokko/db';
import type { RoleKey } from '@hokko/shared';
import {
  updateLeadStage,
  MANUAL_STAGE_TRANSITIONS,
  type LeadStageActor,
} from '../../lib/domains/crm/lead-stage';

// P3-CRM（Codex CR CODEX_CHANGE_REQUEST_V90_P3_CRM_STAGE_MUTATION_R1 #4989708668）の実 PostgreSQL 証拠。
//  1. updateLeadStage は対象取得前に leadmap:update ∧ role 由来 human-only（sessionIsAi===false 厳密・
//     欠落/null/AI混在 fail-closed）を検証する。各 deny で Lead 全字段不変・History/Audit 0。
//  2. leadId/stage は runtime 検証（`as LeadStage` 廃止）・許容遷移は MANUAL_STAGE_TRANSITIONS で明示。
//  3. Lead CAS＋StageHistory＋Audit は単一 transaction（全書込点 fault で孤児 0）。
//     並行更新は FOR UPDATE＋CAS で直列化（勝者1本・lost/duplicate history 0）。
//  4. 認証済み Action 対（実 UI・実セッション）: OWNER 肯定、AI+OWNER / READ_ONLY の同一 POST replay 否定。
// 外部作用なし。cleanup は fixture 固有 id スコープのみ（broad cleanup なし）。

let seq = 0;
function stamp(): string {
  seq += 1;
  return `${process.pid}-${Date.now()}-${seq}`;
}

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

interface Ctx {
  tenantId: string;
  ceoId: string;
}
async function getCtx(): Promise<Ctx> {
  const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { id: true, tenantId: true } });
  expect(ceo, 'seed の CEO ユーザーが存在する').not.toBeNull();
  return { tenantId: ceo!.tenantId, ceoId: ceo!.id };
}

function humanOwner(ctx: Ctx): LeadStageActor {
  return { tenantId: ctx.tenantId, userId: ctx.ceoId, roles: ['OWNER'], sessionIsAi: false };
}

async function makeLead(tenantId: string, stage: string) {
  const s = stamp();
  const campaign = await prisma.leadSearchCampaign.create({
    data: { tenantId, name: `STAGE-CAMP-${s}`, region: '札幌市', industry: '美容室' },
  });
  const lead = await prisma.localBusinessLead.create({
    data: {
      tenantId,
      campaignId: campaign.id,
      name: `STAGE-LEAD-${s}`,
      industry: '美容室',
      stage: stage as never,
      priority: 60,
    },
  });
  return { lead, campaign };
}

async function counts(tenantId: string, leadId: string) {
  return {
    history: await prisma.leadPipelineStageHistory.count({ where: { tenantId, leadId } }),
    audit: await prisma.auditLog.count({ where: { tenantId, entityType: 'LocalBusinessLead', entityId: leadId } }),
  };
}

async function fullLead(leadId: string) {
  return prisma.localBusinessLead.findUnique({ where: { id: leadId } });
}

/** fixture 固有 cleanup（campaign cascade で lead/history も消える）。 */
async function cleanup(tenantId: string, campaignId: string, leadId: string) {
  await prisma.auditLog.deleteMany({ where: { tenantId, entityType: 'LocalBusinessLead', entityId: leadId } });
  await prisma.leadSearchCampaign.deleteMany({ where: { id: campaignId } });
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('OWNER肯定: 手動遷移チェーン REPLIED→APPOINTMENT→NEGOTIATING→QUOTED→WON が各1回成立（History各1・lost history 0・Audit同数）', async () => {
  const ctx = await getCtx();
  const { lead, campaign } = await makeLead(ctx.tenantId, 'REPLIED');
  try {
    const chain: Array<[string, string]> = [
      ['REPLIED', 'APPOINTMENT'],
      ['APPOINTMENT', 'NEGOTIATING'],
      ['NEGOTIATING', 'QUOTED'],
      ['QUOTED', 'WON'],
    ];
    for (const [from, to] of chain) {
      const r = await updateLeadStage(humanOwner(ctx), { leadId: lead.id, stage: to });
      expect(r.ok, `${from}→${to} は許容遷移`).toBe(true);
      if (r.ok) {
        expect(r.fromStage).toBe(from);
        expect(r.toStage).toBe(to);
      }
    }
    const after = await fullLead(lead.id);
    expect(after!.stage).toBe('WON');
    const c = await counts(ctx.tenantId, lead.id);
    expect(c.history, '遷移ごとに History ちょうど1（lost/duplicate history 0）').toBe(4);
    expect(c.audit, '遷移ごとに Audit ちょうど1').toBe(4);
    const rows = await prisma.leadPipelineStageHistory.findMany({
      where: { tenantId: ctx.tenantId, leadId: lead.id },
      orderBy: { createdAt: 'asc' },
      select: { fromStage: true, toStage: true, changedById: true },
    });
    expect(rows.map((h) => `${h.fromStage}->${h.toStage}`)).toEqual([
      'REPLIED->APPOINTMENT',
      'APPOINTMENT->NEGOTIATING',
      'NEGOTIATING->QUOTED',
      'QUOTED->WON',
    ]);
    for (const h of rows) expect(h.changedById).toBe(ctx.ceoId);
    // 終端からの手動変更は不可。
    const fromWon = await updateLeadStage(humanOwner(ctx), { leadId: lead.id, stage: 'LOST' });
    expect(fromWon.ok).toBe(false);
    if (!fromWon.ok) expect(fromWon.reason, 'WON は終端（手動変更不可）').toBe('invalid-transition');
  } finally {
    await cleanup(ctx.tenantId, campaign.id, lead.id);
  }
});

test('deny matrix: READ_ONLY・AI_AGENT・AI_ASSISTANT・AI+OWNER混在・sessionIsAi true/undefined/null・roles欠落/空 は全て forbidden（Lead全字段不変・History/Audit 0）', async () => {
  const ctx = await getCtx();
  const { lead, campaign } = await makeLead(ctx.tenantId, 'REPLIED');
  try {
    const before = await fullLead(lead.id);
    const denied: Array<[string, LeadStageActor]> = [
      ['READ_ONLY（人間・leadmap:update なし）', { tenantId: ctx.tenantId, userId: ctx.ceoId, roles: ['READ_ONLY'], sessionIsAi: false }],
      ['AI_AGENT', { tenantId: ctx.tenantId, userId: ctx.ceoId, roles: ['AI_AGENT'], sessionIsAi: true }],
      ['AI_ASSISTANT', { tenantId: ctx.tenantId, userId: ctx.ceoId, roles: ['AI_ASSISTANT'], sessionIsAi: true }],
      ['AI+OWNER 混在（AIセッション）', { tenantId: ctx.tenantId, userId: ctx.ceoId, roles: ['AI_AGENT', 'OWNER'], sessionIsAi: true }],
      ['AI+OWNER 混在（人間セッション・role混在も拒否）', { tenantId: ctx.tenantId, userId: ctx.ceoId, roles: ['AI_AGENT', 'OWNER'], sessionIsAi: false }],
      ['OWNER role だが AIセッション', { tenantId: ctx.tenantId, userId: ctx.ceoId, roles: ['OWNER'], sessionIsAi: true }],
      ['sessionIsAi 欠落（undefined）', { tenantId: ctx.tenantId, userId: ctx.ceoId, roles: ['OWNER'] }],
      ['sessionIsAi null', { tenantId: ctx.tenantId, userId: ctx.ceoId, roles: ['OWNER'], sessionIsAi: null }],
      ['roles 欠落', { tenantId: ctx.tenantId, userId: ctx.ceoId, sessionIsAi: false }],
      ['roles 空配列', { tenantId: ctx.tenantId, userId: ctx.ceoId, roles: [] as RoleKey[], sessionIsAi: false }],
    ];
    for (const [label, actor] of denied) {
      const r = await updateLeadStage(actor, { leadId: lead.id, stage: 'APPOINTMENT' });
      expect(r.ok, `${label} は拒否される`).toBe(false);
      if (!r.ok) expect(r.reason, `${label} は forbidden`).toBe('forbidden');
    }
    const after = await fullLead(lead.id);
    expect(after, 'Lead は全字段 deep-equal 不変').toEqual(before);
    const c = await counts(ctx.tenantId, lead.id);
    expect(c.history).toBe(0);
    expect(c.audit).toBe(0);
  } finally {
    await cleanup(ctx.tenantId, campaign.id, lead.id);
  }
});

test('runtime検証: 非enum/空/小文字 stage・空/超長 leadId は invalid-input（書き込み0・`as LeadStage` 廃止の実証）', async () => {
  const ctx = await getCtx();
  const { lead, campaign } = await makeLead(ctx.tenantId, 'REPLIED');
  try {
    const before = await fullLead(lead.id);
    for (const bad of ['HACKED', '', 'won', 'APPOINTMENT;DROP TABLE', 'appointment']) {
      const r = await updateLeadStage(humanOwner(ctx), { leadId: lead.id, stage: bad });
      expect(r.ok, `stage='${bad}' は拒否`).toBe(false);
      if (!r.ok) expect(r.reason).toBe('invalid-input');
    }
    for (const badId of ['', 'x'.repeat(65)]) {
      const r = await updateLeadStage(humanOwner(ctx), { leadId: badId, stage: 'APPOINTMENT' });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe('invalid-input');
    }
    expect(await fullLead(lead.id)).toEqual(before);
    const c = await counts(ctx.tenantId, lead.id);
    expect(c.history).toBe(0);
    expect(c.audit).toBe(0);
  } finally {
    await cleanup(ctx.tenantId, campaign.id, lead.id);
  }
});

test('許容遷移の明示: 自動化ステージ/飛び級/終端からの手動変更は invalid-transition・同一ステージ replay は already（書き込み0）', async () => {
  const ctx = await getCtx();
  const fixtures: Array<[string, string, 'invalid-transition' | 'already']> = [
    ['NEW', 'WON', 'invalid-transition'], // CR の決定的失敗条件（NEW→WON）そのもの
    ['NEW', 'APPOINTMENT', 'invalid-transition'],
    ['SENT', 'WON', 'invalid-transition'],
    ['REPLIED', 'WON', 'invalid-transition'], // 飛び級不可（チェーンのみ）
    ['LOST', 'APPOINTMENT', 'invalid-transition'], // 終端
    ['UNSUBSCRIBED', 'APPOINTMENT', 'invalid-transition'], // 配信停止の復活不可
    ['APPOINTMENT', 'APPOINTMENT', 'already'], // 同一 POST replay（冪等 no-op）
  ];
  for (const [from, to, reason] of fixtures) {
    const { lead, campaign } = await makeLead(ctx.tenantId, from);
    try {
      const before = await fullLead(lead.id);
      const r = await updateLeadStage(humanOwner(ctx), { leadId: lead.id, stage: to });
      expect(r.ok, `${from}→${to} は拒否`).toBe(false);
      if (!r.ok) expect(r.reason, `${from}→${to} は ${reason}`).toBe(reason);
      expect(await fullLead(lead.id), 'Lead 不変').toEqual(before);
      const c = await counts(ctx.tenantId, lead.id);
      expect(c.history).toBe(0);
      expect(c.audit).toBe(0);
    } finally {
      await cleanup(ctx.tenantId, campaign.id, lead.id);
    }
  }
  // 許容マップ自体の形も固定（緩和されたら fail）。
  expect(MANUAL_STAGE_TRANSITIONS).toEqual({
    REPLIED: ['APPOINTMENT', 'LOST'],
    APPOINTMENT: ['NEGOTIATING', 'LOST'],
    NEGOTIATING: ['QUOTED', 'LOST'],
    QUOTED: ['WON', 'LOST'],
  });
});

test('all-or-nothing: Lead更新後 / History後 の fault で全rollback（stage不変・History/Audit 0＝孤児0）→ retry がちょうど1組', async () => {
  const ctx = await getCtx();
  const { lead, campaign } = await makeLead(ctx.tenantId, 'REPLIED');
  try {
    // fault 1: CAS 直後（旧実装なら Lead だけ新 stage で残る＝CR の決定的失敗条件）。
    await expect(
      updateLeadStage(humanOwner(ctx), { leadId: lead.id, stage: 'APPOINTMENT' }, {
        __faultAfterUpdateForTest: () => {
          throw new Error('injected-fault:after-update');
        },
      }),
    ).rejects.toThrow('injected-fault:after-update');
    expect((await fullLead(lead.id))!.stage, 'Lead 更新も rollback される').toBe('REPLIED');
    let c = await counts(ctx.tenantId, lead.id);
    expect(c.history).toBe(0);
    expect(c.audit).toBe(0);

    // fault 2: History 直後（旧実装なら Lead+History が残り Audit 欠落）。
    await expect(
      updateLeadStage(humanOwner(ctx), { leadId: lead.id, stage: 'APPOINTMENT' }, {
        __faultAfterHistoryForTest: () => {
          throw new Error('injected-fault:after-history');
        },
      }),
    ).rejects.toThrow('injected-fault:after-history');
    expect((await fullLead(lead.id))!.stage).toBe('REPLIED');
    c = await counts(ctx.tenantId, lead.id);
    expect(c.history, 'History も rollback（孤児0）').toBe(0);
    expect(c.audit).toBe(0);

    // retry はちょうど1組で成功。
    const r = await updateLeadStage(humanOwner(ctx), { leadId: lead.id, stage: 'APPOINTMENT' });
    expect(r.ok).toBe(true);
    expect((await fullLead(lead.id))!.stage).toBe('APPOINTMENT');
    c = await counts(ctx.tenantId, lead.id);
    expect(c.history).toBe(1);
    expect(c.audit).toBe(1);
  } finally {
    await cleanup(ctx.tenantId, campaign.id, lead.id);
  }
});

test('真lock競合（v9.0 standard・retries=0 反復）: holder が row lock 保持中に waiter 4本が holder へ直接 block（pg_blocking_pids で backend PID 一意観測）→ 全waiter pending 確認後 release → 勝者1・History/Audit 各1', async () => {
  const ctx = await getCtx();
  // 反復（retries=0 のまま同一シナリオを複数回実測し、偶然の逐次化ではないことを固定する）。
  for (let iter = 0; iter < 2; iter++) {
    const { lead, campaign } = await makeLead(ctx.tenantId, 'REPLIED');
    let releaseHolder!: () => void;
    const holderGate = new Promise<void>((res) => (releaseHolder = res));
    try {
      // holder: 対象 Lead 行を FOR UPDATE で保持し、backend PID を得てから ready 通知。
      let holderReady!: (pid: number) => void;
      const ready = new Promise<number>((res) => (holderReady = res));
      const holder = prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM "LocalBusinessLead" WHERE id = ${lead.id} AND "tenantId" = ${ctx.tenantId} FOR UPDATE`;
          const pidRows = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid()::int AS pid`;
          holderReady(pidRows[0]!.pid);
          await holderGate;
        },
        { timeout: 30000 },
      );
      const holderPid = await ready;

      // waiters: holder が lock を保持したままの状態で起動（自然逐次化の余地なし）。
      const WAITERS = 4;
      const waiters = Array.from({ length: WAITERS }, () =>
        updateLeadStage(humanOwner(ctx), { leadId: lead.id, stage: 'APPOINTMENT' }),
      );

      // 全 waiter が holder の row lock に block されていることを pg_blocking_pids で観測する。
      // PostgreSQL は row lock の待機を queue 化するため、「holder へ直接 block」されるのは先頭 waiter
      // のみで、後続は先頭 waiter（tuple lock 保持）に block される。そこで waiter を backend PID で
      // 一意化し、(a) 待機 backend がちょうど WAITERS 本、(b) 各 waiter の blocking chain を辿ると
      // 必ず holder PID に到達、(c) 先頭 waiter は holder へ**直接** block、を全て観測する。
      let snapshot: Array<{ pid: number; blockers: number[] }> = [];
      const chainOk = (rows: Array<{ pid: number; blockers: number[] }>): boolean => {
        if (rows.length !== WAITERS) return false;
        const byPid = new Map(rows.map((r) => [r.pid, r.blockers]));
        if (byPid.has(holderPid)) return false; // holder 自身は block されない
        // 各 waiter から blocking graph を辿って holder へ到達できるか（lock queue が holder に根差す）。
        const reachesHolder = (pid: number, seen: Set<number>): boolean => {
          if (seen.has(pid)) return false;
          seen.add(pid);
          const blockers = byPid.get(pid) ?? [];
          if (blockers.includes(holderPid)) return true;
          return blockers.some((b) => reachesHolder(b, seen));
        };
        return rows.every((r) => r.blockers.length > 0 && reachesHolder(r.pid, new Set()));
      };
      for (let i = 0; i < 160; i++) {
        snapshot = await prisma.$queryRaw<Array<{ pid: number; blockers: number[] }>>`
          SELECT pid::int AS pid, pg_blocking_pids(pid)::int[] AS blockers
          FROM pg_stat_activity
          WHERE wait_event_type = 'Lock'
            AND query ILIKE '%FROM "LocalBusinessLead"%FOR UPDATE%'`;
        if (chainOk(snapshot)) break;
        await new Promise((res) => setTimeout(res, 25));
      }
      const waiterPids = snapshot.map((r) => r.pid);
      expect(new Set(waiterPids).size, `iter${iter}: 待機 waiter は一意 backend PID で ${WAITERS} 本`).toBe(WAITERS);
      expect(
        chainOk(snapshot),
        `iter${iter}: 全 waiter の blocking chain が holder(pid=${holderPid}) に根差す（snapshot=${JSON.stringify(snapshot)}）`,
      ).toBe(true);
      expect(
        snapshot.filter((r) => r.blockers.includes(holderPid)).length,
        `iter${iter}: 先頭 waiter は holder へ直接 block`,
      ).toBeGreaterThanOrEqual(1);

      // 全 waiter pending を確認してから release（finally でも保険 release）。
      releaseHolder();
      await holder;
      const results = await Promise.all(waiters);
      expect(results.filter((r) => r.ok).length, `iter${iter}: 勝者はちょうど1本`).toBe(1);
      for (const r of results) {
        if (!r.ok) expect(r.reason, '敗者は lock 下再読取で already').toBe('already');
      }
      // 最終状態は再 fetch で検証（green badge/戻り値だけに依存しない）。
      expect((await fullLead(lead.id))!.stage).toBe('APPOINTMENT');
      const c = await counts(ctx.tenantId, lead.id);
      expect(c.history, `iter${iter}: History はちょうど1（duplicate/lost 0）`).toBe(1);
      expect(c.audit).toBe(1);
      const rows = await prisma.leadPipelineStageHistory.findMany({
        where: { tenantId: ctx.tenantId, leadId: lead.id },
        select: { fromStage: true, toStage: true },
      });
      expect(rows).toEqual([{ fromStage: 'REPLIED', toStage: 'APPOINTMENT' }]);
    } finally {
      releaseHolder(); // timeout/失敗時も必ず解放（二重 resolve は no-op）
      await cleanup(ctx.tenantId, campaign.id, lead.id);
    }
  }
});

test('境界の否定: cross-tenant は実在 lead でも notfound・不存在 lead も notfound（書き込み0）', async () => {
  const ctx = await getCtx();
  const { lead, campaign } = await makeLead(ctx.tenantId, 'REPLIED');
  const s = stamp();
  const foreignTenant = await prisma.tenant.create({ data: { name: `STAGE-FOREIGN-${s}` } });
  try {
    const before = await fullLead(lead.id);
    const foreignActor: LeadStageActor = { tenantId: foreignTenant.id, userId: null, roles: ['OWNER'], sessionIsAi: false };
    const r = await updateLeadStage(foreignActor, { leadId: lead.id, stage: 'APPOINTMENT' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason, '別 tenant からは実在 id でも notfound').toBe('notfound');
    const r2 = await updateLeadStage(humanOwner(ctx), { leadId: 'lead_does_not_exist_000', stage: 'APPOINTMENT' });
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.reason).toBe('notfound');
    expect(await fullLead(lead.id)).toEqual(before);
    expect((await counts(ctx.tenantId, lead.id)).history).toBe(0);
  } finally {
    await cleanup(ctx.tenantId, campaign.id, lead.id);
    await prisma.tenant.delete({ where: { id: foreignTenant.id } });
  }
});

// ============================ 認証済み Action（実 UI・実セッション） ============================

const AI_OWNER_EMAIL = `ai-owner-stage-${process.pid}-${Date.now()}@ikezaki.local`;
const READONLY_EMAIL = `readonly-stage-${process.pid}-${Date.now()}@ikezaki.local`;
const AI_AGENT_EMAIL = `ai-agent-stage-${process.pid}-${Date.now()}@ikezaki.local`;
const AI_ASSISTANT_EMAIL = `ai-assistant-stage-${process.pid}-${Date.now()}@ikezaki.local`;
const MIXED_HUMAN_EMAIL = `mixed-human-stage-${process.pid}-${Date.now()}@ikezaki.local`;
const fixtureUserIds: string[] = [];

test.describe('認証済み Action 対（OWNER肯定・AI_AGENT/AI_ASSISTANT/AI+OWNER×2/READ_ONLY 否定）', () => {
  test.beforeAll(async () => {
    const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { tenantId: true, passwordHash: true } });
    if (!ceo) throw new Error('seed ceo not found');
    const roleId = async (key: RoleKey) => {
      const role = await prisma.role.findFirst({ where: { tenantId: ceo.tenantId, key }, select: { id: true } });
      if (!role) throw new Error(`seed role not found: ${key}`);
      return role.id;
    };
    const makeUser = async (email: string, name: string, isAiAgent: boolean, roleKeys: RoleKey[]) => {
      const user = await prisma.user.create({
        data: { tenantId: ceo.tenantId, email, name, passwordHash: ceo.passwordHash, isAiAgent },
      });
      fixtureUserIds.push(user.id);
      for (const key of roleKeys) {
        await prisma.userRole.create({ data: { tenantId: ceo.tenantId, userId: user.id, roleId: await roleId(key) } });
      }
    };
    // AI+OWNER（AIセッション）: role は OWNER（leadmap:update あり）だが isAiAgent=true —
    // isAi 二重防御（Action の user.isAi !== false と domain の sessionIsAi !== false）を実 POST で証明。
    await makeUser(AI_OWNER_EMAIL, 'STAGE AI+OWNER fixture', true, ['OWNER']);
    // READ_ONLY（人間・leadmap:update なし）: RBAC 側の fail-closed を実 POST で証明。
    await makeUser(READONLY_EMAIL, 'STAGE READ_ONLY fixture', false, ['READ_ONLY']);
    // R2 追加: pure AI_AGENT / pure AI_ASSISTANT（AIセッション・AI role）。
    await makeUser(AI_AGENT_EMAIL, 'STAGE AI_AGENT fixture', true, ['AI_AGENT']);
    await makeUser(AI_ASSISTANT_EMAIL, 'STAGE AI_ASSISTANT fixture', true, ['AI_ASSISTANT']);
    // R2 追加: AI_AGENT+OWNER mixed role かつ isAi=false（人間セッション）—
    // Action の isAi/hasPermission は通過し得るが、domain の isHumanUser（role 混在拒否）が最後の砦になる経路。
    await makeUser(MIXED_HUMAN_EMAIL, 'STAGE AI+OWNER mixed(isAi=false) fixture', false, ['AI_AGENT', 'OWNER']);
  });

  test.afterAll(async () => {
    if (fixtureUserIds.length) {
      await prisma.userRole.deleteMany({ where: { userId: { in: fixtureUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: fixtureUserIds } } });
    }
  });

  test('OWNER肯定（実UI）: フォームは許容遷移のみを提示し、送信で staged banner＋バッジ更新＋History 1', async ({ page }) => {
    const ctx = await getCtx();
    const { lead, campaign } = await makeLead(ctx.tenantId, 'REPLIED');
    try {
      await login(page, 'ceo@ikezaki.local');
      await page.goto(`/leadmap/leads/${lead.id}`);
      const select = page.locator('select[name="stage"]');
      await expect(select, '手動ステージ変更フォームが表示される').toBeVisible();
      const values = await select.locator('option').evaluateAll((opts) => opts.map((o) => (o as HTMLOptionElement).value).filter(Boolean));
      expect(values.sort(), 'REPLIED からの許容遷移のみ提示').toEqual(['APPOINTMENT', 'LOST'].sort());
      await select.selectOption('APPOINTMENT');
      await page.getByRole('button', { name: '変更', exact: true }).click();
      await page.waitForURL(/staged=1/);
      await expect(page.getByText('ステージを変更しました。')).toBeVisible();
      expect((await fullLead(lead.id))!.stage).toBe('APPOINTMENT');
      const c = await counts(ctx.tenantId, lead.id);
      expect(c.history).toBe(1);
      expect(c.audit).toBe(1);
    } finally {
      await cleanup(ctx.tenantId, campaign.id, lead.id);
    }
  });

  test('認証済み Action 否定マトリクス: 捕捉した実 POST を AI_AGENT / AI_ASSISTANT / AI+OWNER(isAi=true) / AI+OWNER mixed(isAi=false) / READ_ONLY の実セッションで replay しても denied（Lead不変・History/Audit 0）・同一 POST は人間 OWNER では成立（肯定対照）', async ({ page, browser }) => {
    const ctx = await getCtx();
    const { lead, campaign } = await makeLead(ctx.tenantId, 'REPLIED');
    const denyCtxs: BrowserContext[] = [];
    try {
      // 1) 人間 OWNER が実フォームから送信する POST を捕捉し、サーバー到達前に abort（Lead は REPLIED のまま）。
      await login(page, 'ceo@ikezaki.local');
      await page.goto(`/leadmap/leads/${lead.id}`);
      let captured: { url: string; headers: Record<string, string>; body: string } | null = null;
      await page.route('**/leadmap/leads/**', async (route) => {
        const req = route.request();
        if (req.method() === 'POST' && !captured) {
          captured = { url: req.url(), headers: await req.allHeaders(), body: req.postData() ?? '' };
          await route.abort();
          return;
        }
        await route.fallback();
      });
      await page.locator('select[name="stage"]').selectOption('APPOINTMENT');
      await page.getByRole('button', { name: '変更', exact: true }).click();
      await expect.poll(() => captured !== null, { timeout: 10000 }).toBe(true);
      await page.unrouteAll({ behavior: 'ignoreErrors' });
      expect((await fullLead(lead.id))!.stage, 'abort により未適用').toBe('REPLIED');

      const replayHeaders = (h: Record<string, string>) => {
        const out: Record<string, string> = {};
        for (const k of ['content-type', 'next-action', 'next-router-state-tree', 'accept', 'origin', 'referer']) {
          if (h[k]) out[k] = h[k];
        }
        return out;
      };

      // 2) 否定マトリクス（R1+R2 要求の全5主体）: 同一 POST を各実セッションで replay → すべて拒否。
      //    - AI_AGENT / AI_ASSISTANT: pure AI role・AIセッション（Action の isAi ガードで遮断）
      //    - AI+OWNER(isAi=true): role は leadmap:update 保持・AIセッション（isAi 二重防御）
      //    - AI+OWNER mixed(isAi=false): 人間セッション・role 混在 — domain の isHumanUser が最後の砦
      //    - READ_ONLY: 人間セッション・leadmap:update なし（RBAC）
      const before = await fullLead(lead.id);
      const denyEmails: Array<[string, string]> = [
        ['pure AI_AGENT', AI_AGENT_EMAIL],
        ['pure AI_ASSISTANT', AI_ASSISTANT_EMAIL],
        ['AI+OWNER（isAi=true）', AI_OWNER_EMAIL],
        ['AI+OWNER mixed（isAi=false）', MIXED_HUMAN_EMAIL],
        ['READ_ONLY（人間・権限なし）', READONLY_EMAIL],
      ];
      for (const [label, email] of denyEmails) {
        const denyCtx = await browser.newContext();
        denyCtxs.push(denyCtx);
        const denyPage = await denyCtx.newPage();
        await login(denyPage, email);
        const res = await denyCtx.request.post(captured!.url, { headers: replayHeaders(captured!.headers), data: captured!.body });
        expect(res.status(), `${label}: replay もサーバーは応答する（500 ではなく拒否）`).toBeLessThan(500);
        expect(await fullLead(lead.id), `${label}: Lead は全字段 deep-equal 不変`).toEqual(before);
        const c = await counts(ctx.tenantId, lead.id);
        expect(c.history, `${label}: History 0`).toBe(0);
        expect(c.audit, `${label}: Audit 0`).toBe(0);
      }

      // 3) 肯定対照: 同一 POST を人間 OWNER セッションで replay すると成立
      //    （捕捉 POST が本物であり、2) の不成立が guard によることを証明）。
      const okRes = await page.context().request.post(captured!.url, { headers: replayHeaders(captured!.headers), data: captured!.body });
      expect(okRes.status()).toBeLessThan(500);
      expect((await fullLead(lead.id))!.stage, '人間 OWNER の同一 POST は成立').toBe('APPOINTMENT');
      const c = await counts(ctx.tenantId, lead.id);
      expect(c.history).toBe(1);
      expect(c.audit).toBe(1);
    } finally {
      for (const dc of denyCtxs) await dc.close();
      await cleanup(ctx.tenantId, campaign.id, lead.id);
    }
  });
});
