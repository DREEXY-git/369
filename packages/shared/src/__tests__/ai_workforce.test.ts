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

describe('freshnessLabel', () => {
  const now = new Date('2026-07-11T12:00:00Z');
  it('記録なし・分・時間・日', () => {
    expect(freshnessLabel(null, now)).toBe('記録なし');
    expect(freshnessLabel(new Date('2026-07-11T11:55:00Z'), now)).toBe('5分前');
    expect(freshnessLabel(new Date('2026-07-11T09:00:00Z'), now)).toBe('3時間前');
    expect(freshnessLabel(new Date('2026-07-09T09:00:00Z'), now)).toBe('2日前');
  });
});
