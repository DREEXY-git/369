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

test('並行4本の同一遷移: FOR UPDATE＋CAS で直列化され勝者ちょうど1本（History/Audit 各1・敗者は already で書き込み0）', async () => {
  const ctx = await getCtx();
  const { lead, campaign } = await makeLead(ctx.tenantId, 'REPLIED');
  try {
    const results = await Promise.all(
      Array.from({ length: 4 }, () => updateLeadStage(humanOwner(ctx), { leadId: lead.id, stage: 'APPOINTMENT' })),
    );
    expect(results.filter((r) => r.ok).length, '勝者はちょうど1本').toBe(1);
    for (const r of results) {
      if (!r.ok) expect(r.reason, '敗者は lock 下再読取で already').toBe('already');
    }
    expect((await fullLead(lead.id))!.stage).toBe('APPOINTMENT');
    const c = await counts(ctx.tenantId, lead.id);
    expect(c.history, 'History はちょうど1（duplicate/lost 0）').toBe(1);
    expect(c.audit).toBe(1);
  } finally {
    await cleanup(ctx.tenantId, campaign.id, lead.id);
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
const fixtureUserIds: string[] = [];

test.describe('認証済み Action 対（OWNER肯定・AI+OWNER/READ_ONLY 否定）', () => {
  test.beforeAll(async () => {
    const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { tenantId: true, passwordHash: true } });
    if (!ceo) throw new Error('seed ceo not found');
    const ownerRole = await prisma.role.findFirst({ where: { tenantId: ceo.tenantId, key: 'OWNER' }, select: { id: true } });
    const readOnlyRole = await prisma.role.findFirst({ where: { tenantId: ceo.tenantId, key: 'READ_ONLY' }, select: { id: true } });
    if (!ownerRole || !readOnlyRole) throw new Error('seed roles not found');
    // AI+OWNER 誤設定 fixture: role は OWNER（leadmap:update あり）だがセッションは AI —
    // isAi 二重防御（Action の user.isAi !== false と domain の sessionIsAi !== false）を実 POST で証明する。
    const aiOwner = await prisma.user.create({
      data: { tenantId: ceo.tenantId, email: AI_OWNER_EMAIL, name: 'STAGE AI+OWNER fixture', passwordHash: ceo.passwordHash, isAiAgent: true },
    });
    fixtureUserIds.push(aiOwner.id);
    await prisma.userRole.create({ data: { tenantId: ceo.tenantId, userId: aiOwner.id, roleId: ownerRole.id } });
    const readOnly = await prisma.user.create({
      data: { tenantId: ceo.tenantId, email: READONLY_EMAIL, name: 'STAGE READ_ONLY fixture', passwordHash: ceo.passwordHash, isAiAgent: false },
    });
    fixtureUserIds.push(readOnly.id);
    await prisma.userRole.create({ data: { tenantId: ceo.tenantId, userId: readOnly.id, roleId: readOnlyRole.id } });
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

  test('認証済み Action 否定: 捕捉した実 POST を AI+OWNER / READ_ONLY セッションで replay しても denied（Lead不変・History/Audit 0）・同一 POST は人間 OWNER では成立（肯定対照）', async ({ page, browser }) => {
    const ctx = await getCtx();
    const { lead, campaign } = await makeLead(ctx.tenantId, 'REPLIED');
    let aiCtx: BrowserContext | null = null;
    let roCtx: BrowserContext | null = null;
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

      // 2) AI+OWNER セッション（role は leadmap:update を持つが isAi）で同一 POST を replay → 拒否。
      aiCtx = await browser.newContext();
      const aiPage = await aiCtx.newPage();
      await login(aiPage, AI_OWNER_EMAIL);
      const aiRes = await aiCtx.request.post(captured!.url, { headers: replayHeaders(captured!.headers), data: captured!.body });
      expect(aiRes.status(), 'AI replay もサーバーは応答する（500 ではなく拒否）').toBeLessThan(500);
      expect((await fullLead(lead.id))!.stage, 'AI+OWNER では変更されない').toBe('REPLIED');
      let c = await counts(ctx.tenantId, lead.id);
      expect(c.history).toBe(0);
      expect(c.audit).toBe(0);

      // 3) READ_ONLY（人間・leadmap:update なし）で replay → 拒否。
      roCtx = await browser.newContext();
      const roPage = await roCtx.newPage();
      await login(roPage, READONLY_EMAIL);
      const roRes = await roCtx.request.post(captured!.url, { headers: replayHeaders(captured!.headers), data: captured!.body });
      expect(roRes.status()).toBeLessThan(500);
      expect((await fullLead(lead.id))!.stage, 'READ_ONLY では変更されない').toBe('REPLIED');
      c = await counts(ctx.tenantId, lead.id);
      expect(c.history).toBe(0);
      expect(c.audit).toBe(0);

      // 4) 肯定対照: 同一 POST を人間 OWNER セッションで replay すると成立
      //    （捕捉 POST が本物であり、2)3) の不成立が guard によることを証明）。
      const okRes = await page.context().request.post(captured!.url, { headers: replayHeaders(captured!.headers), data: captured!.body });
      expect(okRes.status()).toBeLessThan(500);
      expect((await fullLead(lead.id))!.stage, '人間 OWNER の同一 POST は成立').toBe('APPOINTMENT');
      c = await counts(ctx.tenantId, lead.id);
      expect(c.history).toBe(1);
      expect(c.audit).toBe(1);
    } finally {
      await aiCtx?.close();
      await roCtx?.close();
      await cleanup(ctx.tenantId, campaign.id, lead.id);
    }
  });
});
