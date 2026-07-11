import { describe, expect, it } from 'vitest';
import { deriveAgentState, freshnessLabel } from '../ai-workforce';

const base = { agentStatus: 'active', latestRun: null, pendingApprovalGates: 0, rejectedApprovalGates: 0 };

describe('deriveAgentState（証拠からの状態導出・捏造しない）', () => {
  it('active でない → offline', () => {
    expect(deriveAgentState({ ...base, agentStatus: 'disabled' }).state).toBe('offline');
  });
  it('実行記録なし → unknown（no telemetry）', () => {
    const d = deriveAgentState(base);
    expect(d.state).toBe('unknown');
    expect(d.reason).toContain('no telemetry');
  });
  it('PENDING 承認ゲート → waiting_approval（実行状態より優先）', () => {
    const d = deriveAgentState({ ...base, pendingApprovalGates: 2, latestRun: { status: 'RUNNING', startedAt: null, finishedAt: null, task: 't' } });
    expect(d.state).toBe('waiting_approval');
    expect(d.reason).toContain('2 件');
  });
  it('RUNNING → working / QUEUED → planning', () => {
    expect(deriveAgentState({ ...base, latestRun: { status: 'RUNNING', startedAt: null, finishedAt: null, task: 'a' } }).state).toBe('working');
    expect(deriveAgentState({ ...base, latestRun: { status: 'QUEUED', startedAt: null, finishedAt: null, task: 'a' } }).state).toBe('planning');
  });
  it('FAILED → error / FAILED＋却下ゲート → blocked（理由つき）', () => {
    expect(deriveAgentState({ ...base, latestRun: { status: 'FAILED', startedAt: null, finishedAt: null, task: 'a' } }).state).toBe('error');
    const d = deriveAgentState({ ...base, rejectedApprovalGates: 1, latestRun: { status: 'FAILED', startedAt: null, finishedAt: null, task: 'a' } });
    expect(d.state).toBe('blocked');
    expect(d.blockedReason).toBeTruthy();
  });
  it('SUCCEEDED → idle / NEEDS_APPROVAL → waiting_approval / 未知 status → unknown', () => {
    expect(deriveAgentState({ ...base, latestRun: { status: 'SUCCEEDED', startedAt: null, finishedAt: null, task: 'a' } }).state).toBe('idle');
    expect(deriveAgentState({ ...base, latestRun: { status: 'NEEDS_APPROVAL', startedAt: null, finishedAt: null, task: 'a' } }).state).toBe('waiting_approval');
    expect(deriveAgentState({ ...base, latestRun: { status: 'WEIRD', startedAt: null, finishedAt: null, task: 'a' } }).state).toBe('unknown');
  });
});

describe('deriveAgentState の stale 閾値（RUNNING を働いていると断定しない・roadmap74 §9）', () => {
  const now = new Date('2026-07-11T12:00:00Z');
  it('新鮮な RUNNING（閾値内）＋ now → working', () => {
    const d = deriveAgentState(
      { ...base, latestRun: { status: 'RUNNING', startedAt: new Date('2026-07-11T11:30:00Z'), finishedAt: null, task: 'a' } },
      now,
    );
    expect(d.state).toBe('working');
  });
  it('RUNNING が 2 時間超（stale）＋ now → unknown（クラッシュ残骸を作業中に見せない・stale フラグ true）', () => {
    const d = deriveAgentState(
      { ...base, latestRun: { status: 'RUNNING', startedAt: new Date('2026-07-11T09:00:00Z'), finishedAt: null, task: 'a' } },
      now,
    );
    expect(d.state).toBe('unknown');
    expect(d.reason).toContain('stale');
    expect(d.stale).toBe(true);
    // 実行記録なしの unknown は stale ではない（Inbox で区別する）。
    expect(deriveAgentState(base, now).stale).toBeUndefined();
  });
  it('RUNNING で startedAt 不明＋ now → unknown（実行中の証拠として扱わない）', () => {
    const d = deriveAgentState(
      { ...base, latestRun: { status: 'RUNNING', startedAt: null, finishedAt: null, task: 'a' } },
      now,
    );
    expect(d.state).toBe('unknown');
  });
  it('now 省略時は従来どおり working（後方互換・時刻非依存）', () => {
    expect(
      deriveAgentState({ ...base, latestRun: { status: 'RUNNING', startedAt: new Date('2026-07-11T00:00:00Z'), finishedAt: null, task: 'a' } })
        .state,
    ).toBe('working');
  });
});

describe('freshnessLabel', () => {
  const now = new Date('2026-07-11T12:00:00Z');
  it('記録なし・分・時間・日', () => {
    expect(freshnessLabel(null, now)).toBe('記録なし');
    expect(freshnessLabel(new Date('2026-07-11T11:55:00Z'), now)).toBe('5分前');
    expect(freshnessLabel(new Date('2026-07-11T09:00:00Z'), now)).toBe('3時間前');
    expect(freshnessLabel(new Date('2026-07-09T09:00:00Z'), now)).toBe('2日前');
  });
});
