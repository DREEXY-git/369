import { describe, expect, it } from 'vitest';
import { summarizeAgentRuns, buildExecutionReceipts, type RunStatRow } from '../control-plane';

// Phase 4 Control Plane（v7.2 Lane C）の純ロジック契約。
// 実測できない値は null=未計測（0 と混同しない）・承認済み再開待ちと実行済みを混同しない・
// 相関の欠落を隠さない・決定論。

const T0 = new Date('2026-07-12T10:00:00Z');
const T30 = new Date('2026-07-12T10:30:00Z');
const T60 = new Date('2026-07-12T11:00:00Z');

function row(over: Partial<RunStatRow>): RunStatRow {
  return { agentId: 'a1', status: 'SUCCEEDED', startedAt: T0, finishedAt: T30, humanReviewed: false, ...over };
}

describe('summarizeAgentRuns — 実測のみ・未計測は null', () => {
  it('成功/失敗/待機/承認待ち/再開待ちを区分し、実測時間は terminal＋両 timestamp のみ対象', () => {
    const stats = summarizeAgentRuns([
      row({}), // SUCCEEDED 30min
      row({ status: 'FAILED', startedAt: T0, finishedAt: T60 }), // FAILED 60min
      row({ status: 'QUEUED', humanReviewed: true, startedAt: T0, finishedAt: null }), // 承認済み再開待ち
      row({ status: 'QUEUED', humanReviewed: false, startedAt: null, finishedAt: null }),
      row({ status: 'NEEDS_APPROVAL', finishedAt: null }),
      row({ status: 'RUNNING', finishedAt: null }),
      row({ status: 'SUCCEEDED', startedAt: null, finishedAt: T30 }), // timestamp 不足 → 実測対象外
    ])['a1']!;
    expect(stats.total).toBe(7);
    expect(stats.succeeded).toBe(2);
    expect(stats.failed).toBe(1);
    expect(stats.queuedWaitingResume).toBe(1); // 承認済み・再開待ちは succeeded と混同しない
    expect(stats.queuedOther).toBe(1);
    expect(stats.needsApproval).toBe(1);
    expect(stats.running).toBe(1);
    expect(stats.measuredCount).toBe(2); // 実測は 2 run のみ（timestamp 不足は含めない）
    expect(stats.avgDurationMinutes).toBe(45);
    expect(stats.totalDurationMinutes).toBe(90);
  });

  it('実測できる run が無い agent は avg/total が null（0 分と混同しない）', () => {
    const stats = summarizeAgentRuns([row({ status: 'RUNNING', finishedAt: null })])['a1']!;
    expect(stats.measuredCount).toBe(0);
    expect(stats.avgDurationMinutes).toBeNull();
    expect(stats.totalDurationMinutes).toBeNull();
  });

  it('finished < started の壊れた記録は実測対象にしない（負の時間を作らない）', () => {
    const stats = summarizeAgentRuns([row({ startedAt: T60, finishedAt: T0 })])['a1']!;
    expect(stats.measuredCount).toBe(0);
    expect(stats.avgDurationMinutes).toBeNull();
  });

  it('決定論: 同一入力は同一出力・agent 別に分離される', () => {
    const rows = [row({}), row({ agentId: 'a2', status: 'FAILED' })];
    expect(summarizeAgentRuns(rows)).toEqual(summarizeAgentRuns([...rows]));
    expect(Object.keys(summarizeAgentRuns(rows)).sort()).toEqual(['a1', 'a2']);
  });
});

describe('buildExecutionReceipts — 相関と成果非捏造', () => {
  const approval = {
    id: 'apr1',
    entityId: 'gate1',
    status: 'APPROVED',
    decidedAt: T60,
    decidedById: 'u1',
    payload: { runId: 'run1', action: 'morning_report', staleConfirmed: false },
  };

  it('approve は「承認済み・再開待ち（実行なし）」— 実行済みと言わない', () => {
    const [r] = buildExecutionReceipts(
      [approval],
      [{ entityId: 'gate1', action: 'approve', createdAt: T60, metadata: { approvalId: 'apr1', runId: 'run1' } }],
      [{ runId: 'run1' }], // 相関には runId の存在だけを使う（summary 本文は渡さない・P2-3）
    );
    expect(r!.outcomeLabel).toBe('承認済み・再開待ち（実行なし）');
    expect(r!.correlated).toEqual({ approval: true, audit: true, runAction: true });
    expect(JSON.stringify(r)).not.toMatch(/実行済み|完了|SUCCEEDED/);
  });

  it('reject は「却下（run 終了・再開不可）」・runId null は「判断のみ」', () => {
    const rs = buildExecutionReceipts(
      [
        { ...approval, id: 'apr2', entityId: 'gate2', status: 'REJECTED', payload: { runId: 'run2', action: 'x' } },
        { ...approval, id: 'apr3', entityId: 'gate3', payload: { runId: null, action: 'orphan' } },
      ],
      [],
      [],
    );
    expect(rs.find((r) => r.gateId === 'gate2')!.outcomeLabel).toBe('却下（run 終了・再開不可）');
    expect(rs.find((r) => r.gateId === 'gate3')!.outcomeLabel).toBe('判断のみ（対象 run なし）');
  });

  it('audit / run action が見つからない場合は correlated=false として欠落を可視化（隠さない）', () => {
    const [r] = buildExecutionReceipts([approval], [], []);
    expect(r!.correlated.audit).toBe(false);
    expect(r!.correlated.runAction).toBe(false);
  });

  it('staleConfirmed は payload / audit metadata のどちらからでも伝播する', () => {
    const [a] = buildExecutionReceipts([{ ...approval, payload: { ...approval.payload, staleConfirmed: true } }], [], []);
    expect(a!.staleConfirmed).toBe(true);
    const [b] = buildExecutionReceipts(
      [approval],
      [{ entityId: 'gate1', action: 'approve', createdAt: T60, metadata: { approvalId: 'apr1', staleConfirmed: true } }],
      [],
    );
    expect(b!.staleConfirmed).toBe(true);
  });

  it('P2-2: APPROVED / REJECTED 以外（PENDING / CANCELLED 等）はレシート化しない（「却下」と誤表示しない）', () => {
    // Codex 独立 probe: buildExecutionReceipts([{status:'PENDING',...}],[],[]) が decision:'rejected' を
    // 返していた退行の否定テスト。非終局状態は decision を捏造せず、そもそも receipt に含めない。
    const rs = buildExecutionReceipts(
      [
        { ...approval, id: 'p', entityId: 'gP', status: 'PENDING', decidedAt: null, decidedById: null },
        { ...approval, id: 'c', entityId: 'gC', status: 'CANCELLED', decidedAt: null, decidedById: null },
        { ...approval, id: 'x', entityId: 'gX', status: 'SOMETHING_ELSE' },
        { ...approval, id: 'ok', entityId: 'gOK', status: 'APPROVED' },
      ],
      [],
      [],
    );
    // 終局の APPROVED だけが receipt になる。PENDING/CANCELLED/未知は 1 件も出さない。
    expect(rs.map((r) => r.gateId)).toEqual(['gOK']);
    expect(rs.some((r) => r.decision === 'rejected')).toBe(false);
    expect(JSON.stringify(rs)).not.toContain('gP');
    expect(JSON.stringify(rs)).not.toContain('gC');
  });

  it('decidedAt 降順で返る（決定論）', () => {
    const rs = buildExecutionReceipts(
      [
        { ...approval, id: 'a', entityId: 'g1', decidedAt: T0 },
        { ...approval, id: 'b', entityId: 'g2', decidedAt: T60 },
      ],
      [],
      [],
    );
    expect(rs.map((r) => r.gateId)).toEqual(['g2', 'g1']);
  });
});
