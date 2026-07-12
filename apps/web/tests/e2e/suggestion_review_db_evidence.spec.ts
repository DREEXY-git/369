import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { prisma } from '@hokko/db';
import {
  materializeSuggestionCore,
  requestSuggestionReviewCore,
  decideSuggestionReviewCore,
  type SuggestionBridgeDb,
} from '../../lib/suggestion-review-bridge';

// C19 承認ブリッジ（roadmap83 案A・人間承認済み 2026-07-12）の実 Prisma/PostgreSQL 証拠。
// v7.0 R2（Codex CODEX_C19_REVIEW_RESULT_V70 comment 4951281950 / inline r3566352032-36 対応）:
// - request 失敗注入で suggestion/ApprovalRequest/AuditLog/DataAccessLog の4モデル再取得＋実 retry
// - decision 側 AuditLog 失敗注入の rollback
// - decision Audit（entityId=approvalId）と title sentinel を含む metadata 検査
// - 外部作用 0 は OutreachSendLog（fixture tenant scope）に加え MarketingCampaign budget/spent/metrics の
//   before/after 比較
// v7.2 R2（CODEX_CHANGE_REQUEST_V72_C19 comment 4951705481 対応）: materialize を deterministic PK
// （フォーム発行の冪等キー = MarketingSuggestion.id）へ是正し、
// - ①同一キーの**並行**実体化が DB unique 制約で1件に収束（勝者 created・敗者 P2002→already）
// - ②materialize 監査失敗・**最終監査（ai_run）失敗**それぞれの rollback 後に同一キーの利用者 retry が
//   1件へ収束
// - ③suggestion / AuditLog / DataAccessLog の最終件数を実 DB re-fetch で検証（AIOutput を含む4モデルの
//   UI 経由 re-fetch は ads_suggestion_bridge.spec.ts）
// を実 PostgreSQL で証明する。並行冪等性の主張は「PK unique 制約が保証する範囲」に限定する。
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

/** 冪等キー（= MarketingSuggestion の deterministic PK）。action の検証と同じ ^c[a-z0-9]{20,32}$ 形式。 */
function newIdempotencyKey(): string {
  return `c${randomUUID().replace(/-/g, '').slice(0, 24)}`;
}

/** 実 prisma の transaction を使いつつ、指定モデルの create だけを故意に失敗させる test-only wrapper。 */
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
              ? { create: async () => { throw new Error('injected-auditLog-failure'); } }
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

/** materialize の**N 回目の auditLog.create だけ**を失敗させる test-only wrapper（それ以前は実 tx へ
 *  delegate）。nth=1 は materialize 監査、nth=2 は**最終監査（ai_run）**の失敗を注入する。 */
function failingAuditAt(nth: number): SuggestionBridgeDb {
  return {
    $transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
      return prisma.$transaction(async (tx) => {
        let auditCalls = 0;
        const wrapped = {
          marketingSuggestion: tx.marketingSuggestion,
          approvalRequest: tx.approvalRequest,
          auditLog: {
            create: async (args: unknown) => {
              auditCalls += 1;
              if (auditCalls === nth) throw new Error(`injected-audit-${nth}-failure`);
              return tx.auditLog.create(args as never);
            },
          },
          dataAccessLog: tx.dataAccessLog,
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

  test('7. 実体化は deterministic PK＋単一 transaction: materialize/最終(ai_run)監査失敗→孤児0→同一キー retry 1件収束', async () => {
    // v7.2 R2（CODEX_CHANGE_REQUEST_V72_C19 要求②）: materialize 監査失敗と**最終監査（ai_run）失敗**の
    // 両方について、rollback 後に**同一キー**の利用者 retry がちょうど1件へ収束することを実 DB で証明する。
    const aiOut = `c19-e2e-aioutput-${Date.now()}`;
    const probe = `c19-e2e-runaudit-${Date.now()}`;
    const input = (key: string, actorIsAi = false) => ({
      tenantId: tenantA,
      actorId: 'c19-human',
      actorIsAi,
      suggestionId: key,
      aiOutputId: aiOut,
      title: `c19 materialize ${aiOut}`,
      detail: MAT_DETAIL,
      campaignId: null,
      runAudit: { entityType: 'MarketingCampaign', entityId: probe, summary: '広告改善案の下書きを生成（テスト）' },
    });
    // 要求③: suggestion（PK 直照会）/ AuditLog（materialize・ai_run 別）/ DataAccessLog を毎回 re-fetch。
    const counts = async (key: string) => ({
      sug: await prisma.marketingSuggestion.count({ where: { id: key, tenantId: tenantA } }),
      mat: await prisma.auditLog.count({ where: { tenantId: tenantA, action: 'suggestion_materialize', entityId: aiOut } }),
      run: await prisma.auditLog.count({ where: { tenantId: tenantA, action: 'ai_run', entityId: probe } }),
      access: await prisma.dataAccessLog.count({ where: { tenantId: tenantA, entityId: { in: [key, aiOut, probe] } } }),
    });

    // (a) materialize 監査（1回目の auditLog.create）失敗 → suggestion ごと rollback（孤児 0・監査 0）。
    const key1 = newIdempotencyKey();
    await expect(materializeSuggestionCore(failingAuditAt(1), input(key1))).rejects.toThrow('injected-audit-1-failure');
    expect(await counts(key1)).toEqual({ sug: 0, mat: 0, run: 0, access: 0 });
    // 同一キーで実 retry → suggestion＋materialize 監査＋ai_run 監査が同時に確定しちょうど1件。
    const retry1 = await materializeSuggestionCore(prisma as unknown as SuggestionBridgeDb, input(key1));
    expect(retry1).toEqual({ outcome: 'created', suggestionId: key1 });
    expect(await counts(key1)).toEqual({ sug: 1, mat: 1, run: 1, access: 0 });

    // (b) **最終監査（ai_run＝2回目の auditLog.create）失敗** → suggestion・materialize 監査ごと rollback。
    const aiOut2 = `${aiOut}-b`;
    const probe2 = `${probe}-b`;
    const key2 = newIdempotencyKey();
    const input2 = { ...input(key2), aiOutputId: aiOut2, runAudit: { entityType: 'MarketingCampaign', entityId: probe2, summary: '広告改善案の下書きを生成（テスト）' } };
    const counts2 = async () => ({
      sug: await prisma.marketingSuggestion.count({ where: { id: key2, tenantId: tenantA } }),
      mat: await prisma.auditLog.count({ where: { tenantId: tenantA, action: 'suggestion_materialize', entityId: aiOut2 } }),
      run: await prisma.auditLog.count({ where: { tenantId: tenantA, action: 'ai_run', entityId: probe2 } }),
      access: await prisma.dataAccessLog.count({ where: { tenantId: tenantA, entityId: { in: [key2, aiOut2, probe2] } } }),
    });
    await expect(materializeSuggestionCore(failingAuditAt(2), input2)).rejects.toThrow('injected-audit-2-failure');
    expect(await counts2()).toEqual({ sug: 0, mat: 0, run: 0, access: 0 }); // 部分 commit 0（未監査 suggestion も 0）
    const retry2 = await materializeSuggestionCore(prisma as unknown as SuggestionBridgeDb, input2);
    expect(retry2).toEqual({ outcome: 'created', suggestionId: key2 });
    expect(await counts2()).toEqual({ sug: 1, mat: 1, run: 1, access: 0 });

    // (c) 成功後の同一キー再実体化（二重 submit / 成功後 retry）は fast-path で 'already'・全件数不変。
    const again = await materializeSuggestionCore(prisma as unknown as SuggestionBridgeDb, input(key1));
    expect(again).toEqual({ outcome: 'already', suggestionId: key1 });
    expect(await counts(key1)).toEqual({ sug: 1, mat: 1, run: 1, access: 0 });
    // (d) AI 主体は実体化も不可・全件数不変。
    expect((await materializeSuggestionCore(prisma as unknown as SuggestionBridgeDb, input(key1, true))).outcome).toBe('forbidden');
    expect(await counts(key1)).toEqual({ sug: 1, mat: 1, run: 1, access: 0 });
    // (e) detail 本文はどの監査へも複製されない（suggestion.detail のみに存在）。
    const audits = await prisma.auditLog.findMany({ where: { tenantId: tenantA, entityId: { in: [aiOut, probe] } } });
    expect(audits.length).toBeGreaterThanOrEqual(2);
    for (const a of audits) expect(JSON.stringify(a)).not.toContain(MAT_DETAIL);
  });

  test('7b. 同一冪等キーの並行実体化は PK unique 制約で1件に収束（勝者 created・敗者 already・部分 commit 0）', async () => {
    // v7.2 R2（要求①）: check-then-create ではなく DB の PK unique 制約による直列化を実 PostgreSQL で証明。
    // 主張範囲の限定: ここで証明するのは「同一キー並行で MarketingSuggestion（＋同 tx の監査）が1件に
    // 収束する」ことのみ。異なるキー同士の重複防止は主張しない（キーはフォーム描画ごとに発行）。
    const key = newIdempotencyKey();
    const aiOut = `c19-e2e-parallel-${Date.now()}`;
    const probe = `${aiOut}-run`;
    const input = {
      tenantId: tenantA,
      actorId: 'c19-human',
      actorIsAi: false,
      suggestionId: key,
      aiOutputId: aiOut,
      title: `c19 parallel ${aiOut}`,
      detail: MAT_DETAIL,
      campaignId: null,
      runAudit: { entityType: 'MarketingCampaign', entityId: probe, summary: '広告改善案の下書きを生成（並行テスト）' },
    };
    const results = await Promise.all([
      materializeSuggestionCore(prisma as unknown as SuggestionBridgeDb, input),
      materializeSuggestionCore(prisma as unknown as SuggestionBridgeDb, input),
    ]);
    expect(results.map((r) => r.outcome).sort()).toEqual(['already', 'created']);
    for (const r of results) {
      if (r.outcome === 'forbidden') throw new Error('unexpected forbidden');
      expect(r.suggestionId).toBe(key); // 勝者/敗者とも同一 suggestion へ収束
    }
    // 最終状態 re-fetch: suggestion はちょうど1行・監査も各1件（敗者の tx は丸ごと rollback）。
    expect(await prisma.marketingSuggestion.count({ where: { id: key } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { tenantId: tenantA, action: 'suggestion_materialize', entityId: aiOut } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { tenantId: tenantA, action: 'ai_run', entityId: probe } })).toBe(1);
    expect(await prisma.dataAccessLog.count({ where: { tenantId: tenantA, entityId: { in: [key, aiOut, probe] } } })).toBe(0);
  });

  test('7c. 他 tenant が使用済みの PK を指定しても already に収束し、他 tenant の行は不変・自 tenant に監査を残さない', async () => {
    // deterministic PK は全 tenant 横断で unique のため、悪意/誤りで他 tenant の既存 id を冪等キーに
    // 指定されても（存在シグナル以上の）上書き・複製が起きないことを証明する。
    const foreign = await makeSuggestion(tenantB);
    const aiOut = `c19-e2e-crosstenant-${Date.now()}`;
    const r = await materializeSuggestionCore(prisma as unknown as SuggestionBridgeDb, {
      tenantId: tenantA,
      actorId: 'c19-human',
      actorIsAi: false,
      suggestionId: foreign.id,
      aiOutputId: aiOut,
      title: 'c19 cross-tenant probe',
      detail: MAT_DETAIL,
      campaignId: null,
      runAudit: null,
    });
    expect(r.outcome).toBe('already'); // fast-path では見えず create の P2002 で収束（tenant スコープ読み）
    const after = await prisma.marketingSuggestion.findUnique({ where: { id: foreign.id } });
    expect(after?.tenantId).toBe(tenantB);
    expect(after?.title).toBe(foreign.title); // 上書きなし
    expect(after?.detail).toBe(foreign.detail);
    expect(JSON.stringify(after)).not.toContain(MAT_DETAIL);
    // 自 tenant 側に suggestion も監査も生まれない（rollback 済み）。
    expect(await prisma.marketingSuggestion.count({ where: { id: foreign.id, tenantId: tenantA } })).toBe(0);
    expect(await prisma.auditLog.count({ where: { tenantId: tenantA, entityId: aiOut } })).toBe(0);
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
      tenantId: tenantA, actorId: 'c19-human', actorIsAi: false, suggestionId: newIdempotencyKey(), aiOutputId: key,
      title: `広告改善案: ${campaign.name}`, detail: '入札調整の推奨（下書き）', campaignId: campaign.id,
      runAudit: { entityType: 'MarketingCampaign', entityId: campaign.id, summary: `広告改善案の下書きを生成: ${campaign.name}（実行なし・封印中）` },
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
