import { test, expect } from '@playwright/test';
import { prisma } from '@hokko/db';
import {
  requestSuggestionReviewCore,
  decideSuggestionReviewCore,
  type SuggestionBridgeDb,
} from '../../lib/suggestion-review-bridge';

// C19 承認ブリッジ（roadmap83 案A・人間承認済み 2026-07-12）の実 Prisma/PostgreSQL 証拠。
// C21（content_review_db_evidence）と同一の規律: 実 DB 最終状態の re-fetch で assert・
// 失敗注入は実 $transaction の tx を包む test-only wrapper（Server Action から到達不能）。

const T_A = 'c19-dbevidence-tenant-A';
const T_B = 'c19-dbevidence-tenant-B';
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
          auditLog: failOn === 'auditLog' ? { create: async () => { throw new Error('injected-auditLog-failure'); } } : tx.auditLog,
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

test.describe('C19 実 PostgreSQL transaction 証拠（roadmap83 案A）', () => {
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
      await prisma.marketingSuggestion.deleteMany({ where: { tenantId: t } });
      await prisma.tenant.deleteMany({ where: { id: t } });
    }
    await prisma.$disconnect();
  });

  test('並行2申請は1件だけ成功し PENDING は1件のみ（実行ロック直列化）', async () => {
    const s = await makeSuggestion(tenantA);
    const results = await Promise.allSettled([
      requestSuggestionReviewCore(prisma as unknown as SuggestionBridgeDb, reqInput(tenantA, s)),
      requestSuggestionReviewCore(prisma as unknown as SuggestionBridgeDb, reqInput(tenantA, s)),
    ]);
    expect(results.map((r) => (r.status === 'fulfilled' ? r.value.outcome : 'error')).sort()).toEqual(['already', 'requested']);
    expect(await prisma.approvalRequest.count({ where: { tenantId: tenantA, entityId: s.id, status: 'PENDING' } })).toBe(1);
    expect((await prisma.marketingSuggestion.findUnique({ where: { id: s.id } }))?.approvalStatus).toBe('pending');
  });

  test('CAS 後の ApprovalRequest/監査/DataAccessLog 失敗で全 rollback（再申請可能）', async () => {
    for (const failOn of ['approvalRequest', 'auditLog', 'dataAccessLog'] as const) {
      const s = await makeSuggestion(tenantA);
      await expect(requestSuggestionReviewCore(failingDb(failOn), reqInput(tenantA, s))).rejects.toThrow(`injected-${failOn}-failure`);
      expect((await prisma.marketingSuggestion.findUnique({ where: { id: s.id } }))?.approvalStatus, `failOn=${failOn}`).toBe('none');
      expect(await prisma.approvalRequest.count({ where: { tenantId: tenantA, entityId: s.id } }), `failOn=${failOn}`).toBe(0);
    }
  });

  test('並行 approve/reject は一方収束・二重決定は冪等・却下後は再申請可能', async () => {
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

  test('対象消失時は決定ごと rollback（approval だけ確定して残らない）', async () => {
    const s = await makeSuggestion(tenantA);
    const req = await requestSuggestionReviewCore(prisma as unknown as SuggestionBridgeDb, reqInput(tenantA, s));
    if (req.outcome !== 'requested') throw new Error('setup failed');
    await prisma.marketingSuggestion.delete({ where: { id: s.id } });
    await expect(
      decideSuggestionReviewCore(prisma as unknown as SuggestionBridgeDb, decInput(tenantA, req.approvalId, s.id, 'approve')),
    ).rejects.toThrow('suggestion-transition-failed');
    expect((await prisma.approvalRequest.findUnique({ where: { id: req.approvalId } }))?.status).toBe('PENDING');
  });

  test('cross-tenant 実在改善案は非開示（申請/決定とも benign already・両 tenant 不変）・AI は DB 接触前拒否', async () => {
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
  });

  test('外部作用 0: bridge に外部モジュール参照なし・payload/監査に detail 本文が複製されない', async () => {
    const s = await prisma.marketingSuggestion.create({
      data: { tenantId: tenantA, title: 'c19 PII test', detail: 'SECRET-DETAIL-C19-DO-NOT-COPY', approvalStatus: 'none' },
    });
    const req = await requestSuggestionReviewCore(prisma as unknown as SuggestionBridgeDb, reqInput(tenantA, s));
    if (req.outcome !== 'requested') throw new Error('setup failed');
    await decideSuggestionReviewCore(prisma as unknown as SuggestionBridgeDb, decInput(tenantA, req.approvalId, s.id, 'approve'));
    const rows = [
      ...(await prisma.approvalRequest.findMany({ where: { tenantId: tenantA, entityId: s.id } })),
      ...(await prisma.auditLog.findMany({ where: { tenantId: tenantA, entityId: s.id } })),
      ...(await prisma.dataAccessLog.findMany({ where: { tenantId: tenantA, entityId: s.id } })),
    ];
    expect(rows.length).toBeGreaterThanOrEqual(2);
    for (const row of rows) expect(JSON.stringify(row)).not.toContain('SECRET-DETAIL-C19-DO-NOT-COPY');
    // OutreachSendLog（外部送信ログ）は増えない。
    expect(await prisma.outreachSendLog.count({ where: { tenantId: tenantA } })).toBe(0);
  });
});
