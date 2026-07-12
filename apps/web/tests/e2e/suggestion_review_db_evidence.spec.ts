import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { prisma } from '@hokko/db';
import {
  materializeSuggestionCore,
  requestSuggestionReviewCore,
  decideSuggestionReviewCore,
  type SuggestionBridgeDb,
} from '../../lib/suggestion-review-bridge';

// C19 承認ブリッジ（roadmap83 案A・人間承認済み 2026-07-12）の実 Prisma/PostgreSQL 証拠。
// v7.0 R2（Codex CODEX_C19_REVIEW_RESULT_V70 comment 4951281950 / inline r3566352032-36 対応）:
// - 実体化（生成→MarketingSuggestion）＋必須監査の単一 transaction・冪等性（孤児0→retry 1件）
// - request 失敗注入で suggestion/ApprovalRequest/AuditLog/DataAccessLog の4モデル再取得＋実 retry
// - decision 側 AuditLog 失敗注入の rollback
// - decision Audit（entityId=approvalId）と title sentinel を含む metadata 検査
// - 外部作用 0 は OutreachSendLog（fixture tenant scope）に加え MarketingCampaign budget/spent/metrics の
//   before/after 比較
// C21（content_review_db_evidence）と同一の規律: 実 DB 最終状態の re-fetch で assert・
// 失敗注入は実 $transaction の tx を包む test-only wrapper（Server Action から到達不能）。

const T_A = 'c19-dbevidence-tenant-A';
const T_B = 'c19-dbevidence-tenant-B';
const MAT_DETAIL = 'SECRET-MAT-DETAIL-C19R2-DO-NOT-COPY';
let tenantA = '';
let tenantB = '';

function assertLocalDatabaseUrl(): void {
  const url = process.env.DATABASE_URL ?? '';
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    host = '';
  }
  if (host !== 'localhost' && host !== '127.0.0.1') {
    throw new Error(`TEST_ENVIRONMENT_APPROVAL_REQUIRED: DATABASE_URL host="${host}"`);
  }
}

async function makeSuggestion(tenantId: string, approvalStatus = 'none') {
  return prisma.marketingSuggestion.create({
    data: { tenantId, title: `c19 evidence ${Date.now()}-${Math.random()}`, detail: 'CPA改善の推奨', approvalStatus },
  });
}

function reqInput(tenantId: string, s: { id: string; title: string }, actorIsAi = false) {
  return { tenantId, requestedById: 'c19-human', actorIsAi, suggestion: { id: s.id, title: s.title } };
}

function decInput(tenantId: string, approvalId: string, entityId: string | null, decision: 'approve' | 'reject', actorIsAi = false) {
  return { tenantId, approvalId, entityId, decision, decidedById: 'c19-approver', note: '', approvalTitle: 'c19 evidence', actorIsAi };
}

/** 実 prisma の transaction を使いつつ、指定モデルの create だけを故意に失敗させる test-only wrapper。
 *  auditLog は findFirst（materialize の冪等照会）を実 tx へ delegate したまま create のみ失敗させる。 */
function failingDb(failOn: 'approvalRequest' | 'auditLog' | 'dataAccessLog'): SuggestionBridgeDb {
  return {
    $transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
      return prisma.$transaction(async (tx) => {
        const wrapped = {
          marketingSuggestion: tx.marketingSuggestion,
          approvalRequest:
            failOn === 'approvalRequest'
              ? { ...tx.approvalRequest, create: async () => { throw new Error('injected-approvalRequest-failure'); } }
              : tx.approvalRequest,
          auditLog:
            failOn === 'auditLog'
              ? {
                  findFirst: (args: unknown) => tx.auditLog.findFirst(args as never),
                  create: async () => { throw new Error('injected-auditLog-failure'); },
                }
              : tx.auditLog,
          dataAccessLog:
            failOn === 'dataAccessLog'
              ? { create: async () => { throw new Error('injected-dataAccessLog-failure'); } }
              : tx.dataAccessLog,
        };
        return fn(wrapped);
      });
    },
  };
}

test.describe('C19 実 PostgreSQL transaction 証拠（roadmap83 案A・v7.0 R2）', () => {
  test.beforeAll(async () => {
    assertLocalDatabaseUrl();
    tenantA = (await prisma.tenant.create({ data: { name: T_A } })).id;
    tenantB = (await prisma.tenant.create({ data: { name: T_B } })).id;
  });

  test.afterAll(async () => {
    for (const t of [tenantA, tenantB]) {
      if (!t) continue;
      await prisma.dataAccessLog.deleteMany({ where: { tenantId: t } });
      await prisma.auditLog.deleteMany({ where: { tenantId: t } });
      await prisma.approvalRequest.deleteMany({ where: { tenantId: t } });
      await prisma.campaignMetric.deleteMany({ where: { tenantId: t } });
      await prisma.marketingCampaign.deleteMany({ where: { tenantId: t } });
      await prisma.marketingSuggestion.deleteMany({ where: { tenantId: t } });
      await prisma.tenant.deleteMany({ where: { id: t } });
    }
    await prisma.$disconnect();
  });

  test('1. 並行2申請は1件だけ成功し PENDING は1件のみ（実行ロック直列化）', async () => {
    const s = await makeSuggestion(tenantA);
    const results = await Promise.allSettled([
      requestSuggestionReviewCore(prisma as unknown as SuggestionBridgeDb, reqInput(tenantA, s)),
      requestSuggestionReviewCore(prisma as unknown as SuggestionBridgeDb, reqInput(tenantA, s)),
    ]);
    expect(results.map((r) => (r.status === 'fulfilled' ? r.value.outcome : 'error')).sort()).toEqual(['already', 'requested']);
    expect(await prisma.approvalRequest.count({ where: { tenantId: tenantA, entityId: s.id, status: 'PENDING' } })).toBe(1);
    expect((await prisma.marketingSuggestion.findUnique({ where: { id: s.id } }))?.approvalStatus).toBe('pending');
  });

  test('2. CAS 後の ApprovalRequest/監査/DataAccessLog 失敗で全 rollback（4モデル再取得・実 retry 1件収束）', async () => {
    // v7.0 R2（inline r3566352035）: 各 failOn で suggestion・ApprovalRequest・AuditLog・DataAccessLog を
    // すべて再取得して部分 commit 0 を証明し、コメントだけだった「再申請可能」を実 retry で証明する。
    for (const failOn of ['approvalRequest', 'auditLog', 'dataAccessLog'] as const) {
      const s = await makeSuggestion(tenantA);
      await expect(requestSuggestionReviewCore(failingDb(failOn), reqInput(tenantA, s))).rejects.toThrow(`injected-${failOn}-failure`);
      expect((await prisma.marketingSuggestion.findUnique({ where: { id: s.id } }))?.approvalStatus, `failOn=${failOn} suggestion`).toBe('none');
      expect(await prisma.approvalRequest.count({ where: { tenantId: tenantA, entityId: s.id } }), `failOn=${failOn} approvalRequest`).toBe(0);
      expect(await prisma.auditLog.count({ where: { tenantId: tenantA, entityId: s.id } }), `failOn=${failOn} auditLog`).toBe(0);
      expect(await prisma.dataAccessLog.count({ where: { tenantId: tenantA, entityId: s.id } }), `failOn=${failOn} dataAccessLog`).toBe(0);
      // rollback 後の実 retry が成功し、ちょうど1件の PENDING に収束する。
      const retry = await requestSuggestionReviewCore(prisma as unknown as SuggestionBridgeDb, reqInput(tenantA, s));
      expect(retry.outcome, `failOn=${failOn} retry`).toBe('requested');
      expect(await prisma.approvalRequest.count({ where: { tenantId: tenantA, entityId: s.id, status: 'PENDING' } }), `failOn=${failOn} retry PENDING`).toBe(1);
      expect(await prisma.auditLog.count({ where: { tenantId: tenantA, entityId: s.id } }), `failOn=${failOn} retry audit`).toBe(1);
    }
  });

  test('3. 並行 approve/reject は一方収束・二重決定は冪等・却下後は再申請可能', async () => {
    const s = await makeSuggestion(tenantA);
    const req = await requestSuggestionReviewCore(prisma as unknown as SuggestionBridgeDb, reqInput(tenantA, s));
    if (req.outcome !== 'requested') throw new Error('setup failed');
    const [a, b] = await Promise.allSettled([
      decideSuggestionReviewCore(prisma as unknown as SuggestionBridgeDb, decInput(tenantA, req.approvalId, s.id, 'approve')),
      decideSuggestionReviewCore(prisma as unknown as SuggestionBridgeDb, decInput(tenantA, req.approvalId, s.id, 'reject')),
    ]);
    expect([a, b].map((r) => (r.status === 'fulfilled' ? r.value.outcome : 'error')).sort()).toEqual(['already', 'decided']);
    const approval = await prisma.approvalRequest.findUnique({ where: { id: req.approvalId } });
    const after = await prisma.marketingSuggestion.findUnique({ where: { id: s.id } });
    expect(after?.approvalStatus).toBe(approval?.status === 'APPROVED' ? 'approved' : 'rejected'); // 分離ゼロ
    // 二重決定は冪等。
    const again = await decideSuggestionReviewCore(prisma as unknown as SuggestionBridgeDb, decInput(tenantA, req.approvalId, s.id, 'approve'));
    expect(again.outcome).toBe('already');
    // 却下勝ちの場合は再申請可能（won=approve の場合は不可）を状態機械どおりに確認。
    const retry = await requestSuggestionReviewCore(prisma as unknown as SuggestionBridgeDb, reqInput(tenantA, s));
    expect(retry.outcome).toBe(after?.approvalStatus === 'rejected' ? 'requested' : 'already');
  });

  test('4. decision 側 AuditLog 失敗で決定ごと rollback（approval は PENDING のまま・実 retry で確定）', async () => {
    // v7.0 R2（comment 4951281950 Evidence Gap）: decision 側の失敗注入 rollback 証拠。
    const s = await makeSuggestion(tenantA);
    const req = await requestSuggestionReviewCore(prisma as unknown as SuggestionBridgeDb, reqInput(tenantA, s));
    if (req.outcome !== 'requested') throw new Error('setup failed');
    await expect(
      decideSuggestionReviewCore(failingDb('auditLog'), decInput(tenantA, req.approvalId, s.id, 'approve')),
    ).rejects.toThrow('injected-auditLog-failure');
    const approval = await prisma.approvalRequest.findUnique({ where: { id: req.approvalId } });
    expect(approval?.status).toBe('PENDING'); // 決定 CAS が実 DB で巻き戻っている
    expect(approval?.decidedById).toBeNull();
    expect((await prisma.marketingSuggestion.findUnique({ where: { id: s.id } }))?.approvalStatus).toBe('pending'); // suggestion 側も不変
    expect(await prisma.auditLog.count({ where: { tenantId: tenantA, entityId: req.approvalId } })).toBe(0); // decision audit 0
    // 実 retry: 同じ approval を人間が再決定でき、今度は audit まで確定する。
    const retry = await decideSuggestionReviewCore(prisma as unknown as SuggestionBridgeDb, decInput(tenantA, req.approvalId, s.id, 'approve'));
    expect(retry.outcome).toBe('decided');
    expect((await prisma.approvalRequest.findUnique({ where: { id: req.approvalId } }))?.status).toBe('APPROVED');
    expect((await prisma.marketingSuggestion.findUnique({ where: { id: s.id } }))?.approvalStatus).toBe('approved');
    expect(await prisma.auditLog.count({ where: { tenantId: tenantA, entityId: req.approvalId } })).toBe(1);
  });

  test('5. 対象消失時は決定ごと rollback（approval だけ確定して残らない）', async () => {
    const s = await makeSuggestion(tenantA);
    const req = await requestSuggestionReviewCore(prisma as unknown as SuggestionBridgeDb, reqInput(tenantA, s));
    if (req.outcome !== 'requested') throw new Error('setup failed');
    await prisma.marketingSuggestion.delete({ where: { id: s.id } });
    await expect(
      decideSuggestionReviewCore(prisma as unknown as SuggestionBridgeDb, decInput(tenantA, req.approvalId, s.id, 'approve')),
    ).rejects.toThrow('suggestion-transition-failed');
    expect((await prisma.approvalRequest.findUnique({ where: { id: req.approvalId } }))?.status).toBe('PENDING');
  });

  test('6. cross-tenant 実在改善案は非開示・AI は DB 接触前拒否（行数不変＋source order 証拠）', async () => {
    const foreign = await makeSuggestion(tenantB);
    const r = await requestSuggestionReviewCore(prisma as unknown as SuggestionBridgeDb, reqInput(tenantA, foreign));
    expect(r.outcome).toBe('already'); // 不存在と同じ応答（存在シグナルなし）
    expect((await prisma.marketingSuggestion.findUnique({ where: { id: foreign.id } }))?.approvalStatus).toBe('none');

    const req = await requestSuggestionReviewCore(prisma as unknown as SuggestionBridgeDb, reqInput(tenantB, foreign));
    if (req.outcome !== 'requested') throw new Error('setup failed');
    expect(
      (await decideSuggestionReviewCore(prisma as unknown as SuggestionBridgeDb, decInput(tenantA, req.approvalId, foreign.id, 'approve'))).outcome,
    ).toBe('already');
    expect((await prisma.approvalRequest.findUnique({ where: { id: req.approvalId } }))?.status).toBe('PENDING');

    // AI 主体（権限誤設定想定）は行数不変。
    const s = await makeSuggestion(tenantA);
    const before = await prisma.approvalRequest.count({ where: { tenantId: tenantA } });
    expect((await requestSuggestionReviewCore(prisma as unknown as SuggestionBridgeDb, reqInput(tenantA, s, true))).outcome).toBe('forbidden');
    expect(await prisma.approvalRequest.count({ where: { tenantId: tenantA } })).toBe(before);
    // v7.0 R2（comment 4951281950 補足）: 「DB 接触前」の source evidence を併記。3つの core すべてで
    // actorIsAi の早期 return が最初の db.$transaction より前に位置する（mock call-zero 契約は
    // tests/suggestion_review_bridge.test.ts が別途担保）。
    const src = readFileSync(resolve(dirname(test.info().file), '../../lib/suggestion-review-bridge.ts'), 'utf8');
    for (const fn of ['materializeSuggestionCore', 'requestSuggestionReviewCore', 'decideSuggestionReviewCore']) {
      const body = src.slice(src.indexOf(`export async function ${fn}`));
      const guard = body.indexOf('if (input.actorIsAi)');
      const txn = body.indexOf('db.$transaction');
      expect(guard, `${fn}: actorIsAi guard 存在`).toBeGreaterThan(-1);
      expect(txn, `${fn}: $transaction 存在`).toBeGreaterThan(-1);
      expect(guard, `${fn}: guard が DB 接触より前`).toBeLessThan(txn);
    }
  });

  test('7. 実体化＋必須監査は単一 transaction: 監査失敗で孤児0→実 retry 1件・同一 aiOutputId は冪等', async () => {
    // v7.0 R2（P2 inline r3566352032）: 生成フローの suggestion 作成と監査の非原子・非冪等の是正証拠。
    const key = `c19-e2e-aioutput-${Date.now()}`;
    const title = `c19 materialize ${key}`;
    const input = (actorIsAi = false) => ({
      tenantId: tenantA,
      actorId: 'c19-human',
      actorIsAi,
      aiOutputId: key,
      title,
      detail: MAT_DETAIL,
      campaignId: null,
    });
    const counts = async () => ({
      sug: await prisma.marketingSuggestion.count({ where: { tenantId: tenantA, title } }),
      led: await prisma.auditLog.count({ where: { tenantId: tenantA, action: 'suggestion_materialize', entityId: key } }),
    });
    // 監査失敗 → suggestion ごと rollback（未監査の孤児 suggestion は 0）。
    await expect(materializeSuggestionCore(failingDb('auditLog'), input())).rejects.toThrow('injected-auditLog-failure');
    expect(await counts()).toEqual({ sug: 0, led: 0 });
    // 実 retry → ちょうど1件（suggestion と監査が同時に確定）。
    const created = await materializeSuggestionCore(prisma as unknown as SuggestionBridgeDb, input());
    expect(created.outcome).toBe('created');
    expect(await counts()).toEqual({ sug: 1, led: 1 });
    // 同一 aiOutputId の再実体化（二重 submit / retry 想定）は冪等に 'already'・行数不変。
    const again = await materializeSuggestionCore(prisma as unknown as SuggestionBridgeDb, input());
    expect(again.outcome).toBe('already');
    expect(await counts()).toEqual({ sug: 1, led: 1 });
    // AI 主体は実体化も不可・行数不変。
    expect((await materializeSuggestionCore(prisma as unknown as SuggestionBridgeDb, input(true))).outcome).toBe('forbidden');
    expect(await counts()).toEqual({ sug: 1, led: 1 });
    // detail 本文は監査へ複製されない（suggestion.detail のみに存在）。
    const led = await prisma.auditLog.findFirst({ where: { tenantId: tenantA, action: 'suggestion_materialize', entityId: key } });
    expect(JSON.stringify(led)).not.toContain(MAT_DETAIL);
  });

  test('8. detail 本文は request/decision 双方の承認・監査・DataAccessLog に複製されない（title の保存先は設計どおりに限定）', async () => {
    // v7.0 R2（inline r3566352036）: decision Audit（entityId=approvalId）も取得し、title sentinel で
    // 複製先が設計どおり（ApprovalRequest.title / 監査 summary のみ・payload / DataAccessLog metadata には
    // 入らない）であることを検証する。
    const TITLE_SENTINEL = 'TITLE-SENTINEL-C19R2';
    const DETAIL_SENTINEL = 'SECRET-DETAIL-C19-DO-NOT-COPY';
    const s = await prisma.marketingSuggestion.create({
      data: { tenantId: tenantA, title: `c19 title ${TITLE_SENTINEL}`, detail: DETAIL_SENTINEL, approvalStatus: 'none' },
    });
    const req = await requestSuggestionReviewCore(prisma as unknown as SuggestionBridgeDb, reqInput(tenantA, s));
    if (req.outcome !== 'requested') throw new Error('setup failed');
    // 実 action と同じく approvalTitle には ApprovalRequest.title（title sentinel を含む）が渡る。
    await decideSuggestionReviewCore(prisma as unknown as SuggestionBridgeDb, {
      ...decInput(tenantA, req.approvalId, s.id, 'approve'),
      approvalTitle: `広告改善案の承認申請: ${s.title}`,
    });
    const approvals = await prisma.approvalRequest.findMany({ where: { tenantId: tenantA, entityId: s.id } });
    const audits = await prisma.auditLog.findMany({ where: { tenantId: tenantA, entityId: { in: [s.id, req.approvalId] } } });
    const accesses = await prisma.dataAccessLog.findMany({ where: { tenantId: tenantA, entityId: { in: [s.id, req.approvalId] } } });
    const rows = [...approvals, ...audits, ...accesses];
    const decisionAudits = audits.filter((a) => a.entityId === req.approvalId);
    expect(decisionAudits.length, 'decision AuditLog を取得できている').toBeGreaterThanOrEqual(1);
    expect(rows.length).toBeGreaterThanOrEqual(4);
    for (const row of rows) {
      expect(JSON.stringify(row), '承認・監査・DataAccessLog に detail 本文が複製されている').not.toContain(DETAIL_SENTINEL);
    }
    // title sentinel の複製先は設計どおり: ApprovalRequest.title と監査 summary のみ。
    expect(approvals[0]?.title).toContain(TITLE_SENTINEL);
    expect(decisionAudits.some((a) => (a.summary ?? '').includes(TITLE_SENTINEL))).toBe(true);
    const payload = (await prisma.approvalRequest.findUnique({ where: { id: req.approvalId } }))?.payload as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(['kind']); // メタのみ
    expect(JSON.stringify(payload), 'payload に title が複製されている').not.toContain(TITLE_SENTINEL);
    for (const da of accesses) {
      expect(JSON.stringify(da.metadata ?? {}), 'DataAccessLog metadata に title が複製されている').not.toContain(TITLE_SENTINEL);
    }
    // 外部送信ログ（fixture tenant scope）は増えない。
    expect(await prisma.outreachSendLog.count({ where: { tenantId: { in: [tenantA, tenantB] } } })).toBe(0);
  });

  test('9. 外部作用 0: 承認しても MarketingCampaign の budget/spent/metrics が一切変化しない（before/after 実比較）', async () => {
    // v7.0 R2（comment 4951281950 P2/Low）: OutreachSendLog 0 に加え、広告の実変更・予算変更が
    // 起きないことを対象 campaign の実カラム before/after で証明する。
    const campaign = await prisma.marketingCampaign.create({
      data: { tenantId: tenantA, name: 'c19 external-effect probe', channel: 'ads', budget: 100000, spent: 42000 },
    });
    await prisma.campaignMetric.create({
      data: { tenantId: tenantA, campaignId: campaign.id, date: new Date('2026-07-01'), impressions: 1000, clicks: 100, conversions: 10, cost: 12345.67 },
    });
    const snapshot = async () => {
      const c = await prisma.marketingCampaign.findUnique({ where: { id: campaign.id }, include: { metrics: true } });
      return {
        budget: c?.budget.toString(),
        spent: c?.spent.toString(),
        status: c?.status,
        kpiActual: JSON.stringify(c?.kpiActual ?? null),
        metrics: (c?.metrics ?? []).map((m) => `${m.impressions}/${m.clicks}/${m.conversions}/${m.cost.toString()}`).sort(),
      };
    };
    const before = await snapshot();
    // 実体化（campaign 紐付き）→ 申請 → 承認 の1周。
    const key = `c19-e2e-campaign-probe-${Date.now()}`;
    const mat = await materializeSuggestionCore(prisma as unknown as SuggestionBridgeDb, {
      tenantId: tenantA, actorId: 'c19-human', actorIsAi: false, aiOutputId: key,
      title: `広告改善案: ${campaign.name}`, detail: '入札調整の推奨（下書き）', campaignId: campaign.id,
    });
    if (mat.outcome !== 'created') throw new Error('setup failed');
    const sug = { id: mat.suggestionId, title: `広告改善案: ${campaign.name}` };
    const req = await requestSuggestionReviewCore(prisma as unknown as SuggestionBridgeDb, reqInput(tenantA, sug));
    if (req.outcome !== 'requested') throw new Error('setup failed');
    await decideSuggestionReviewCore(prisma as unknown as SuggestionBridgeDb, decInput(tenantA, req.approvalId, sug.id, 'approve'));
    expect((await prisma.marketingSuggestion.findUnique({ where: { id: sug.id } }))?.approvalStatus).toBe('approved');
    // campaign の実カラムは before と完全一致（実変更・予算変更・metrics 改変 0）。
    expect(await snapshot()).toEqual(before);
    expect(await prisma.outreachSendLog.count({ where: { tenantId: { in: [tenantA, tenantB] } } })).toBe(0);
  });
});
