import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { prisma } from '@hokko/db';
import {
  requestContentReviewCore,
  decideContentReviewCore,
  type BridgeDb,
} from '../../lib/content-review-bridge';

// v7.0 Lane R2（Codex P2 thread r3565885993）: C21 承認ブリッジの**実 Prisma / PostgreSQL** transaction 証拠。
// mock の呼び出し回数ではなく、実 DB の最終状態を re-fetch して assert する。並行系は実競合
// （Promise.allSettled・PostgreSQL の行ロックが直列化 barrier）。失敗注入は「実 prisma.$transaction の
// tx を包む test-only wrapper」で行い、rollback は実 DB で検証する（この wrapper は本テストファイル内のみに
// 存在し、Server Action からは到達不能）。
// テスト環境境界（v7.0 指令 §3）: 接続前に DATABASE_URL の host が localhost/127.0.0.1 であることを機械確認。
// fixture は本テストが作る合成データのみ・終了後に fixture だけを削除する。

const SECRET_BODY = 'SECRET-BODY-V70-DO-NOT-PERSIST-IN-AUDIT';
const T_A = 'v70-dbevidence-tenant-A';
const T_B = 'v70-dbevidence-tenant-B';

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
    throw new Error(
      `TEST_ENVIRONMENT_APPROVAL_REQUIRED: DATABASE_URL host="${host}" は使い捨てローカル/CI service と機械確認できません`,
    );
  }
}

async function makeAsset(tenantId: string, status = 'draft', approvalStatus = 'none') {
  return prisma.contentAsset.create({
    data: { tenantId, type: 'lp', title: `v70 evidence ${Date.now()}-${Math.random()}`, body: SECRET_BODY, status, approvalStatus, generatedByAi: true },
  });
}

function reqInput(tenantId: string, asset: { id: string; title: string }, actorIsAi = false) {
  return {
    tenantId,
    requestedById: 'v70-human-user',
    actorIsAi,
    asset: { id: asset.id, title: asset.title, type: 'lp', campaignId: null, generatedByAi: true, label: 'INTERNAL' },
  };
}

function decInput(tenantId: string, approvalId: string, entityId: string | null, decision: 'approve' | 'reject', actorIsAi = false) {
  return { tenantId, approvalId, entityId, decision, decidedById: 'v70-human-approver', note: '', approvalTitle: 'v70 evidence', actorIsAi };
}

/** 実 prisma の transaction を使いつつ、指定モデルの create だけを故意に失敗させる test-only wrapper。 */
function failingDb(failOn: 'approvalRequest' | 'auditLog' | 'dataAccessLog'): BridgeDb {
  return {
    $transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
      return prisma.$transaction(async (tx) => {
        const wrapped = {
          contentAsset: tx.contentAsset,
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

test.describe('C21 実 PostgreSQL transaction 証拠（v7.0 Lane R2）', () => {
  test.beforeAll(async () => {
    assertLocalDatabaseUrl();
    const a = await prisma.tenant.create({ data: { name: T_A } });
    const b = await prisma.tenant.create({ data: { name: T_B } });
    tenantA = a.id;
    tenantB = b.id;
  });

  test.afterAll(async () => {
    // fixture のみ削除（tenant 単位・seed/他 tenant のデータには触れない）。
    for (const t of [tenantA, tenantB]) {
      if (!t) continue;
      await prisma.dataAccessLog.deleteMany({ where: { tenantId: t } });
      await prisma.auditLog.deleteMany({ where: { tenantId: t } });
      await prisma.approvalRequest.deleteMany({ where: { tenantId: t } });
      await prisma.contentAsset.deleteMany({ where: { tenantId: t } });
      await prisma.tenant.deleteMany({ where: { id: t } });
    }
    await prisma.$disconnect();
  });

  test('1. 同一 asset への並行2申請は実行ロック下で1件だけ成功し、PENDING は1件のみ', async () => {
    const asset = await makeAsset(tenantA);
    const results = await Promise.allSettled([
      requestContentReviewCore(prisma as unknown as BridgeDb, reqInput(tenantA, asset)),
      requestContentReviewCore(prisma as unknown as BridgeDb, reqInput(tenantA, asset)),
    ]);
    const outcomes = results.map((r) => (r.status === 'fulfilled' ? r.value.outcome : 'error')).sort();
    expect(outcomes).toEqual(['already', 'requested']);
    // 実 DB の最終状態 re-fetch: PENDING ApprovalRequest はちょうど1件・asset は pending_approval。
    const pendings = await prisma.approvalRequest.findMany({ where: { tenantId: tenantA, entityId: asset.id, status: 'PENDING' } });
    expect(pendings).toHaveLength(1);
    const after = await prisma.contentAsset.findUnique({ where: { id: asset.id } });
    expect(after?.status).toBe('pending_approval');
    expect(after?.approvalStatus).toBe('pending');
  });

  test('2. CAS 後の ApprovalRequest 作成失敗で全 rollback（孤児 pending_approval なし・再申請可能）', async () => {
    const asset = await makeAsset(tenantA);
    await expect(requestContentReviewCore(failingDb('approvalRequest'), reqInput(tenantA, asset))).rejects.toThrow(
      'injected-approvalRequest-failure',
    );
    const after = await prisma.contentAsset.findUnique({ where: { id: asset.id } });
    expect(after?.status).toBe('draft'); // CAS が実 DB で巻き戻っている
    expect(after?.approvalStatus).toBe('none');
    expect(await prisma.approvalRequest.count({ where: { tenantId: tenantA, entityId: asset.id } })).toBe(0);
    expect(await prisma.auditLog.count({ where: { tenantId: tenantA, entityId: asset.id } })).toBe(0);
    expect(await prisma.dataAccessLog.count({ where: { tenantId: tenantA, entityId: asset.id } })).toBe(0);
    // rollback 後は再申請が成功する。
    const retry = await requestContentReviewCore(prisma as unknown as BridgeDb, reqInput(tenantA, asset));
    expect(retry.outcome).toBe('requested');
  });

  test('3. Audit / DataAccessLog 失敗でも全 rollback（4テーブル再取得で部分 commit 0・再申請成功）', async () => {
    // v7.0 R2（EVIDENCE_GAP-1・comment 4951029653）: 各 failOn で asset・ApprovalRequest・AuditLog・
    // DataAccessLog の4テーブルすべてを実 DB re-fetch する。特に failOn=dataAccessLog では
    // 「直前に作成された AuditLog が rollback したこと」を auditLog.count===0 で証明する。
    for (const failOn of ['auditLog', 'dataAccessLog'] as const) {
      const asset = await makeAsset(tenantA);
      await expect(requestContentReviewCore(failingDb(failOn), reqInput(tenantA, asset))).rejects.toThrow(
        `injected-${failOn}-failure`,
      );
      const after = await prisma.contentAsset.findUnique({ where: { id: asset.id } });
      expect(after?.status, `failOn=${failOn}`).toBe('draft');
      expect(after?.approvalStatus, `failOn=${failOn}`).toBe('none');
      expect(await prisma.approvalRequest.count({ where: { tenantId: tenantA, entityId: asset.id } }), `failOn=${failOn} approvalRequest`).toBe(0);
      expect(await prisma.auditLog.count({ where: { tenantId: tenantA, entityId: asset.id } }), `failOn=${failOn} auditLog`).toBe(0);
      expect(await prisma.dataAccessLog.count({ where: { tenantId: tenantA, entityId: asset.id } }), `failOn=${failOn} dataAccessLog`).toBe(0);
      // rollback 後の実 retry が成功し、ちょうど1件の PENDING に収束する。
      const retry = await requestContentReviewCore(prisma as unknown as BridgeDb, reqInput(tenantA, asset));
      expect(retry.outcome, `failOn=${failOn} retry`).toBe('requested');
      expect(await prisma.approvalRequest.count({ where: { tenantId: tenantA, entityId: asset.id, status: 'PENDING' } }), `failOn=${failOn} retry PENDING`).toBe(1);
    }
  });

  test('4. 並行 approve/reject は一方だけ成功し、asset は勝者の決定と一致する', async () => {
    const asset = await makeAsset(tenantA);
    const req = await requestContentReviewCore(prisma as unknown as BridgeDb, reqInput(tenantA, asset));
    if (req.outcome !== 'requested') throw new Error('setup failed');
    const [ra, rb] = await Promise.allSettled([
      decideContentReviewCore(prisma as unknown as BridgeDb, decInput(tenantA, req.approvalId, asset.id, 'approve')),
      decideContentReviewCore(prisma as unknown as BridgeDb, decInput(tenantA, req.approvalId, asset.id, 'reject')),
    ]);
    const outs = [ra, rb].map((r) => (r.status === 'fulfilled' ? r.value.outcome : 'error')).sort();
    expect(outs).toEqual(['already', 'decided']);
    const approval = await prisma.approvalRequest.findUnique({ where: { id: req.approvalId } });
    const after = await prisma.contentAsset.findUnique({ where: { id: asset.id } });
    // 勝者の決定と asset 状態が一致（approve 勝ち→approved / reject 勝ち→rejected）。分離ゼロ。
    expect(approval?.status).toMatch(/^(APPROVED|REJECTED)$/);
    expect(after?.status).toBe(approval?.status === 'APPROVED' ? 'approved' : 'rejected');
    expect(after?.approvalStatus).toBe(approval?.status === 'APPROVED' ? 'approved' : 'rejected');
  });

  test('5. 二重 approve / 二重 reject は冪等（2回目は already・状態不変）', async () => {
    for (const decision of ['approve', 'reject'] as const) {
      const asset = await makeAsset(tenantA);
      const req = await requestContentReviewCore(prisma as unknown as BridgeDb, reqInput(tenantA, asset));
      if (req.outcome !== 'requested') throw new Error('setup failed');
      const first = await decideContentReviewCore(prisma as unknown as BridgeDb, decInput(tenantA, req.approvalId, asset.id, decision));
      expect(first.outcome).toBe('decided');
      const snap = await prisma.approvalRequest.findUnique({ where: { id: req.approvalId } });
      const second = await decideContentReviewCore(prisma as unknown as BridgeDb, decInput(tenantA, req.approvalId, asset.id, decision));
      expect(second.outcome).toBe('already');
      const snap2 = await prisma.approvalRequest.findUnique({ where: { id: req.approvalId } });
      expect(snap2?.decidedAt?.getTime()).toBe(snap?.decidedAt?.getTime()); // 2回目は何も書いていない
      expect(snap2?.status).toBe(snap?.status);
    }
  });

  test('6. 対象 asset 消失時は決定ごと rollback（approval だけ APPROVED になって残らない）', async () => {
    const asset = await makeAsset(tenantA);
    const req = await requestContentReviewCore(prisma as unknown as BridgeDb, reqInput(tenantA, asset));
    if (req.outcome !== 'requested') throw new Error('setup failed');
    await prisma.contentAsset.delete({ where: { id: asset.id } }); // 消失を再現
    await expect(
      decideContentReviewCore(prisma as unknown as BridgeDb, decInput(tenantA, req.approvalId, asset.id, 'approve')),
    ).rejects.toThrow('content-asset-transition-failed');
    const approval = await prisma.approvalRequest.findUnique({ where: { id: req.approvalId } });
    expect(approval?.status).toBe('PENDING'); // 実 DB で決定が巻き戻っている
    expect(approval?.decidedById).toBeNull();
  });

  test('7. cross-tenant 実在 asset は非開示（申請/決定とも benign な already と同一挙動・両 tenant 不変）', async () => {
    const foreign = await makeAsset(tenantB); // tenant B の実在 draft
    const r = await requestContentReviewCore(prisma as unknown as BridgeDb, reqInput(tenantA, foreign));
    expect(r.outcome).toBe('already'); // 存在シグナルを漏らさない（不存在と同じ応答）
    const after = await prisma.contentAsset.findUnique({ where: { id: foreign.id } });
    expect(after?.status).toBe('draft'); // B 側は不変
    expect(await prisma.approvalRequest.count({ where: { entityId: foreign.id } })).toBe(0);

    // B の正規 PENDING approval を A の approver は決定できない。
    const req = await requestContentReviewCore(prisma as unknown as BridgeDb, reqInput(tenantB, foreign));
    if (req.outcome !== 'requested') throw new Error('setup failed');
    const d = await decideContentReviewCore(prisma as unknown as BridgeDb, decInput(tenantA, req.approvalId, foreign.id, 'approve'));
    expect(d.outcome).toBe('already');
    const approval = await prisma.approvalRequest.findUnique({ where: { id: req.approvalId } });
    expect(approval?.status).toBe('PENDING');
  });

  test('8. AI 主体（権限誤設定想定）は実 DB 接触前に拒否され、行数が一切変化しない', async () => {
    // v7.0 R2（comment 4951029653 補足）: 行数不変（実 DB）に加えて、「DB 接触前」の source evidence を併記する。
    // core 双方で actorIsAi の早期 return が最初の db.$transaction より前に位置することを実ソースで assert
    // （mock db の call-zero 契約は tests/content_review_bridge.test.ts が別途担保）。
    const src = readFileSync(resolve(dirname(test.info().file), '../../lib/content-review-bridge.ts'), 'utf8');
    for (const fn of ['requestContentReviewCore', 'decideContentReviewCore']) {
      const body = src.slice(src.indexOf(`export async function ${fn}`));
      const guard = body.indexOf('if (input.actorIsAi)');
      const txn = body.indexOf('db.$transaction');
      expect(guard, `${fn}: actorIsAi guard 存在`).toBeGreaterThan(-1);
      expect(txn, `${fn}: $transaction 存在`).toBeGreaterThan(-1);
      expect(guard, `${fn}: guard が DB 接触より前`).toBeLessThan(txn);
    }
    const asset = await makeAsset(tenantA);
    const counts = async () => ({
      ap: await prisma.approvalRequest.count({ where: { tenantId: tenantA } }),
      au: await prisma.auditLog.count({ where: { tenantId: tenantA } }),
      da: await prisma.dataAccessLog.count({ where: { tenantId: tenantA } }),
    });
    const before = await counts();
    const r = await requestContentReviewCore(prisma as unknown as BridgeDb, reqInput(tenantA, asset, true));
    expect(r.outcome).toBe('forbidden');
    const req = await requestContentReviewCore(prisma as unknown as BridgeDb, reqInput(tenantA, asset));
    if (req.outcome !== 'requested') throw new Error('setup failed');
    const d = await decideContentReviewCore(prisma as unknown as BridgeDb, decInput(tenantA, req.approvalId, asset.id, 'approve', true));
    expect(d.outcome).toBe('forbidden');
    const after = await counts();
    expect(after.ap - before.ap).toBe(1); // 人間の正規申請1件のみ（AI 由来の行はゼロ）
    expect(after.au - before.au).toBe(1);
    expect(after.da - before.da).toBe(1);
    const approval = await prisma.approvalRequest.findUnique({ where: { id: req.approvalId } });
    expect(approval?.status).toBe('PENDING'); // AI の decide 試行は何も書いていない
  });

  test('9. 人間の正常系: 申請→承認、申請→却下→再申請が実 DB で成功する', async () => {
    const a1 = await makeAsset(tenantA);
    const r1 = await requestContentReviewCore(prisma as unknown as BridgeDb, reqInput(tenantA, a1));
    if (r1.outcome !== 'requested') throw new Error('setup failed');
    expect((await decideContentReviewCore(prisma as unknown as BridgeDb, decInput(tenantA, r1.approvalId, a1.id, 'approve'))).outcome).toBe('decided');
    expect((await prisma.contentAsset.findUnique({ where: { id: a1.id } }))?.approvalStatus).toBe('approved');

    const a2 = await makeAsset(tenantA);
    const r2 = await requestContentReviewCore(prisma as unknown as BridgeDb, reqInput(tenantA, a2));
    if (r2.outcome !== 'requested') throw new Error('setup failed');
    expect((await decideContentReviewCore(prisma as unknown as BridgeDb, decInput(tenantA, r2.approvalId, a2.id, 'reject'))).outcome).toBe('decided');
    expect((await prisma.contentAsset.findUnique({ where: { id: a2.id } }))?.status).toBe('rejected');
    const again = await requestContentReviewCore(prisma as unknown as BridgeDb, reqInput(tenantA, a2)); // 却下後は再申請可能
    expect(again.outcome).toBe('requested');
  });

  test('10. 既存 outreach 承認は非退行（content_review の決定は他 type の PENDING に触れない）', async () => {
    const outreach = await prisma.approvalRequest.create({
      data: { tenantId: tenantA, type: 'outreach_send', requestedForAction: 'outreach_send', title: 'v70 outreach 非退行 fixture', entityType: 'OutreachDraft', entityId: 'v70-fake-draft', status: 'PENDING' },
    });
    const asset = await makeAsset(tenantA);
    const req = await requestContentReviewCore(prisma as unknown as BridgeDb, reqInput(tenantA, asset));
    if (req.outcome !== 'requested') throw new Error('setup failed');
    await decideContentReviewCore(prisma as unknown as BridgeDb, decInput(tenantA, req.approvalId, asset.id, 'approve'));
    const after = await prisma.approvalRequest.findUnique({ where: { id: outreach.id } });
    expect(after?.status).toBe('PENDING'); // outreach 側は完全に不変（UI 経路の非退行は既存 E2E suite が担保）
    expect(after?.decidedById).toBeNull();
  });

  test('11. 本文（body）は request/decision 双方の承認・監査・DataAccessLog に複製されない（title の保存先は設計どおりに限定）', async () => {
    // v7.0 R2（EVIDENCE_GAP-2・comment 4951029653）: 主張を「本文非複製」へ限定し、取得漏れだった
    // decision AuditLog（entityId=approvalId）も含めて全行を re-fetch する。title は人間の承認一覧表示のため
    // ApprovalRequest.title / 監査 summary へ複製される**設計**なので、独立 title sentinel で
    // 「複製先が設計どおりの場所だけ」（payload / DataAccessLog metadata には入らない）を検証する。
    const TITLE_SENTINEL = 'TITLE-SENTINEL-V70R2';
    const asset = await prisma.contentAsset.create({
      data: {
        tenantId: tenantA,
        type: 'lp',
        title: `v70 title ${TITLE_SENTINEL}`,
        body: SECRET_BODY,
        status: 'draft',
        approvalStatus: 'none',
        generatedByAi: true,
      },
    });
    const req = await requestContentReviewCore(prisma as unknown as BridgeDb, reqInput(tenantA, asset));
    if (req.outcome !== 'requested') throw new Error('setup failed');
    // 実 action と同じく approvalTitle には asset title 由来の文字列が渡る（decision audit summary への複製経路を再現）。
    await decideContentReviewCore(
      prisma as unknown as BridgeDb,
      { ...decInput(tenantA, req.approvalId, asset.id, 'approve'), approvalTitle: `コンテンツ承認申請: ${asset.title}` },
    );
    const approvals = await prisma.approvalRequest.findMany({ where: { tenantId: tenantA, entityId: asset.id } });
    const audits = await prisma.auditLog.findMany({ where: { tenantId: tenantA, entityId: { in: [asset.id, req.approvalId] } } });
    const accesses = await prisma.dataAccessLog.findMany({ where: { tenantId: tenantA, entityId: { in: [asset.id, req.approvalId] } } });
    const rows = [...approvals, ...audits, ...accesses];
    // decision AuditLog（entityId=approvalId）が取得対象に実在することを確認（取得漏れの再発防止）。
    const decisionAudits = audits.filter((a) => a.entityId === req.approvalId);
    expect(decisionAudits.length, 'decision AuditLog を取得できている').toBeGreaterThanOrEqual(1);
    expect(rows.length).toBeGreaterThanOrEqual(4);
    // 本文 sentinel は request/decision 双方のどの行にも現れない。
    for (const row of rows) {
      expect(JSON.stringify(row), '承認・監査・DataAccessLog に本文が複製されている').not.toContain(SECRET_BODY);
    }
    // title sentinel の複製先は設計どおり: ApprovalRequest.title と監査 summary のみ。
    expect(approvals[0]?.title).toContain(TITLE_SENTINEL);
    expect(decisionAudits.some((a) => (a.summary ?? '').includes(TITLE_SENTINEL))).toBe(true);
    const payload = (await prisma.approvalRequest.findUnique({ where: { id: req.approvalId } }))?.payload as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(['campaignId', 'generatedByAi', 'type']); // メタのみ
    expect(JSON.stringify(payload), 'payload に title が複製されている').not.toContain(TITLE_SENTINEL);
    for (const da of accesses) {
      expect(JSON.stringify(da.metadata ?? {}), 'DataAccessLog metadata に title が複製されている').not.toContain(TITLE_SENTINEL);
    }
  });

  test('12. 外部作用 0: 承認経路に外部送信/CMS/実LLM/課金の呼び出しが存在せず、送信ログも増えない', async () => {
    // 静的検査: transaction 正本モジュールの import に外部作用モジュールへの参照が無い
    // （コメント中の日本語（「実 LLM」等）に誤反応しないよう import 行のみを検査・識別子は全文検査）。
    const src = readFileSync(resolve(dirname(test.info().file), '../../lib/content-review-bridge.ts'), 'utf8');
    const importLines = src.split('\n').filter((l) => /^\s*import\b/.test(l)).join('\n');
    for (const forbiddenModule of ['@hokko/integrations', 'openai', 'anthropic', 'nodemailer', 'stripe']) {
      expect(importLines.toLowerCase(), `forbidden import: ${forbiddenModule}`).not.toContain(forbiddenModule);
    }
    for (const forbiddenIdent of ['getEmailProvider', 'isExternalSendEnabled', 'getLLMProvider', 'fetch(']) {
      expect(src, `forbidden identifier: ${forbiddenIdent}`).not.toContain(forbiddenIdent);
    }
    // 実 DB 検査: 申請→承認の1周で OutreachSendLog が増えない。
    // v7.0 R2（EVIDENCE_GAP-3・comment 4951029653）: 並列 worker の他 spec と分離するため
    // グローバル件数ではなく本 spec 専有 fixture tenant（tenantA/tenantB）に scope して before/after 比較する。
    const countOwn = async () =>
      prisma.outreachSendLog.count({ where: { tenantId: { in: [tenantA, tenantB] } } });
    const before = await countOwn();
    expect(before).toBe(0); // 専有 tenant に送信ログは存在しない前提から開始
    const asset = await makeAsset(tenantA);
    const req = await requestContentReviewCore(prisma as unknown as BridgeDb, reqInput(tenantA, asset));
    if (req.outcome !== 'requested') throw new Error('setup failed');
    await decideContentReviewCore(prisma as unknown as BridgeDb, decInput(tenantA, req.approvalId, asset.id, 'approve'));
    expect(await countOwn()).toBe(0);
  });
});
