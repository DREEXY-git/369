import { describe, expect, it } from 'vitest';
import {
  requestContentReviewCore,
  decideContentReviewCore,
  type BridgeDb,
} from '../lib/content-review-bridge';

// v6.9（Codex review 4679634147・P1×3＋P2）: C21 承認ブリッジの transaction 契約テスト。
// mock db を注入し、(a) すべての DB 遷移が単一 $transaction callback 内で行われる（＝実 Prisma では
// all-or-nothing）、(b) 後段失敗で例外が伝播し rollback 契約が成立する、(c) 並行 CAS の敗者が副作用を
// 起こさない、(d) AI ロールは DB に触れる前に拒否される、(e) 全 where が tenantId でスコープされる、
// を決定論的に検証する（実 DB の並行実行は ephemeral E2E とレースしないここでの契約が正本）。

interface Call {
  model: string;
  op: string;
  args: any;
}

function makeMockDb(opts: {
  contentCasCount?: number | number[]; // updateMany の count（配列なら呼び出し順に消費）
  approvalCasCount?: number;
  createThrows?: boolean;
  auditThrows?: boolean;
  dataAccessThrows?: boolean;
} = {}) {
  const calls: Call[] = [];
  let txDepth = 0;
  const casCounts = Array.isArray(opts.contentCasCount)
    ? [...opts.contentCasCount]
    : [opts.contentCasCount ?? 1];
  const record = (model: string, op: string, args: any) => {
    expect(txDepth, `${model}.${op} が $transaction の外で呼ばれた`).toBeGreaterThan(0);
    calls.push({ model, op, args });
  };
  const tx = {
    contentAsset: {
      updateMany: async (args: any) => {
        record('contentAsset', 'updateMany', args);
        const c = casCounts.length > 1 ? casCounts.shift()! : casCounts[0]!;
        return { count: c };
      },
    },
    approvalRequest: {
      create: async (args: any) => {
        record('approvalRequest', 'create', args);
        if (opts.createThrows) throw new Error('injected: approvalRequest.create failed');
        return { id: 'apr_mock_1' };
      },
      updateMany: async (args: any) => {
        record('approvalRequest', 'updateMany', args);
        return { count: opts.approvalCasCount ?? 1 };
      },
    },
    auditLog: {
      create: async (args: any) => {
        record('auditLog', 'create', args);
        if (opts.auditThrows) throw new Error('injected: auditLog.create failed');
        return {};
      },
    },
    dataAccessLog: {
      create: async (args: any) => {
        record('dataAccessLog', 'create', args);
        if (opts.dataAccessThrows) throw new Error('injected: dataAccessLog.create failed');
        return {};
      },
    },
  };
  const db: BridgeDb = {
    async $transaction(fn) {
      txDepth += 1;
      try {
        return await fn(tx as any);
      } finally {
        txDepth -= 1;
      }
    },
  };
  return { db, calls };
}

const ASSET = {
  id: 'asset_1',
  title: 'LP 下書き',
  type: 'lp',
  campaignId: null,
  generatedByAi: true,
  label: 'INTERNAL',
};
const REQ = { tenantId: 't1', requestedById: 'u1', actorIsAi: false, asset: ASSET };
const DEC = {
  tenantId: 't1',
  approvalId: 'apr_1',
  entityId: 'asset_1',
  decision: 'approve' as const,
  decidedById: 'u1',
  note: '',
  approvalTitle: 'コンテンツ承認申請: LP 下書き',
  actorIsAi: false,
};

describe('requestContentReviewCore（申請の transaction 原子性）', () => {
  it('正常申請: CAS 勝者が ApprovalRequest＋監査＋DataAccessLog を同一 transaction で作成する', async () => {
    const { db, calls } = makeMockDb();
    const r = await requestContentReviewCore(db, REQ);
    expect(r).toEqual({ outcome: 'requested', approvalId: 'apr_mock_1' });
    expect(calls.map((c) => `${c.model}.${c.op}`)).toEqual([
      'contentAsset.updateMany',
      'approvalRequest.create',
      'auditLog.create',
      'dataAccessLog.create',
    ]);
    // 全 where/data が tenant スコープ・メタのみ（本文なし）。
    for (const c of calls) {
      const scope = c.args.where?.tenantId ?? c.args.data?.tenantId;
      expect(scope, `${c.model}.${c.op} に tenantId が無い`).toBe('t1');
    }
    const payload = calls[1]!.args.data.payload;
    expect(Object.keys(payload).sort()).toEqual(['campaignId', 'generatedByAi', 'type']);
    expect(JSON.stringify(calls[1]!.args.data)).not.toContain('body');
  });

  it('並行2申請: CAS 敗者（count 0）は ApprovalRequest を作らず already を返す', async () => {
    const { db, calls } = makeMockDb({ contentCasCount: [1, 0] });
    const [a, b] = await Promise.all([requestContentReviewCore(db, REQ), requestContentReviewCore(db, REQ)]);
    const outcomes = [a.outcome, b.outcome].sort();
    expect(outcomes).toEqual(['already', 'requested']);
    // ApprovalRequest.create は勝者の1回だけ（重複 PENDING ゼロ）。
    expect(calls.filter((c) => c.model === 'approvalRequest' && c.op === 'create')).toHaveLength(1);
  });

  it('ApprovalRequest 作成失敗: 例外が transaction から伝播し（=rollback）、後段の記録は走らない', async () => {
    const { db, calls } = makeMockDb({ createThrows: true });
    await expect(requestContentReviewCore(db, REQ)).rejects.toThrow('injected: approvalRequest.create failed');
    // CAS→create の後、audit/dataAccess は呼ばれない（transaction 全体が失敗＝孤児 pending_approval なし）。
    expect(calls.filter((c) => c.model === 'auditLog')).toHaveLength(0);
    expect(calls.filter((c) => c.model === 'dataAccessLog')).toHaveLength(0);
  });

  it('監査失敗・DataAccessLog 失敗も transaction ごと失敗する（部分 commit なし）', async () => {
    const { db: db1 } = makeMockDb({ auditThrows: true });
    await expect(requestContentReviewCore(db1, REQ)).rejects.toThrow('injected: auditLog.create failed');
    const { db: db2 } = makeMockDb({ dataAccessThrows: true });
    await expect(requestContentReviewCore(db2, REQ)).rejects.toThrow('injected: dataAccessLog.create failed');
  });

  it('AI ロール（権限誤設定でも）は DB に一切触れず forbidden', async () => {
    const { db, calls } = makeMockDb();
    const r = await requestContentReviewCore(db, { ...REQ, actorIsAi: true });
    expect(r).toEqual({ outcome: 'forbidden' });
    expect(calls).toHaveLength(0);
  });

  it('別 tenant の実在 asset: tenant スコープ CAS が 0 件 → already（作成なし・存在を漏らさない）', async () => {
    const { db, calls } = makeMockDb({ contentCasCount: 0 });
    const r = await requestContentReviewCore(db, { ...REQ, tenantId: 'attacker-tenant' });
    expect(r).toEqual({ outcome: 'already' });
    expect(calls[0]!.args.where.tenantId).toBe('attacker-tenant');
    expect(calls.filter((c) => c.model === 'approvalRequest')).toHaveLength(0);
  });
});

describe('decideContentReviewCore（決定の transaction 原子性・count===1 必須）', () => {
  it('approve: ApprovalRequest CAS→ContentAsset 更新（count===1）→監査が同一 transaction で確定', async () => {
    const { db, calls } = makeMockDb();
    const r = await decideContentReviewCore(db, DEC);
    expect(r).toEqual({ outcome: 'decided' });
    expect(calls.map((c) => `${c.model}.${c.op}`)).toEqual([
      'approvalRequest.updateMany',
      'contentAsset.updateMany',
      'auditLog.create',
    ]);
    expect(calls[0]!.args.where).toMatchObject({ id: 'apr_1', tenantId: 't1', status: 'PENDING' });
    expect(calls[1]!.args.where).toMatchObject({ id: 'asset_1', tenantId: 't1', status: 'pending_approval' });
    expect(calls[1]!.args.data).toMatchObject({ status: 'approved', approvalStatus: 'approved' });
  });

  it('reject: rejected へ遷移（再申請可能な状態）', async () => {
    const { db, calls } = makeMockDb();
    await decideContentReviewCore(db, { ...DEC, decision: 'reject' });
    expect(calls[1]!.args.data).toMatchObject({ status: 'rejected', approvalStatus: 'rejected' });
  });

  it('並行 approve/reject: CAS 敗者（count 0）は asset にも監査にも触れない（1回だけ反映）', async () => {
    const { db, calls } = makeMockDb({ approvalCasCount: 0 });
    const r = await decideContentReviewCore(db, DEC);
    expect(r).toEqual({ outcome: 'already' });
    expect(calls.filter((c) => c.model === 'contentAsset')).toHaveLength(0);
    expect(calls.filter((c) => c.model === 'auditLog')).toHaveLength(0);
  });

  it('対象消失/別 tenant/状態不整合（asset 更新 count 0）: throw → 決定ごと rollback（監査なし）', async () => {
    const { db, calls } = makeMockDb({ contentCasCount: 0 });
    await expect(decideContentReviewCore(db, DEC)).rejects.toThrow('content-asset-transition-failed');
    expect(calls.filter((c) => c.model === 'auditLog')).toHaveLength(0);
  });

  it('entityId 無しの content_review は決定しない（throw）', async () => {
    const { db, calls } = makeMockDb();
    await expect(decideContentReviewCore(db, { ...DEC, entityId: null })).rejects.toThrow('without entityId');
    expect(calls).toHaveLength(0);
  });

  it('AI ロール（approval:approve が誤設定で付与されていても）は DB に触れず forbidden', async () => {
    const { db, calls } = makeMockDb();
    const r = await decideContentReviewCore(db, { ...DEC, actorIsAi: true });
    expect(r).toEqual({ outcome: 'forbidden' });
    expect(calls).toHaveLength(0);
  });
});
