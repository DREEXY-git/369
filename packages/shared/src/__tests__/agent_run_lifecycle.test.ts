import { describe, expect, it } from 'vitest';
import { canTransitionRun, isTerminalRunStatus, shouldCreateRun, maskRunError, STALE_RUNNING_MS } from '../agent-run-lifecycle';

describe('canTransitionRun（許可表・terminal 保護）', () => {
  it('正常系: QUEUED→RUNNING→SUCCEEDED / RUNNING→NEEDS_APPROVAL→RUNNING', () => {
    expect(canTransitionRun('QUEUED', 'RUNNING')).toBe(true);
    expect(canTransitionRun('RUNNING', 'SUCCEEDED')).toBe(true);
    expect(canTransitionRun('RUNNING', 'NEEDS_APPROVAL')).toBe(true);
    expect(canTransitionRun('NEEDS_APPROVAL', 'RUNNING')).toBe(true);
    expect(canTransitionRun('NEEDS_APPROVAL', 'FAILED')).toBe(true);
  });
  it('terminal（SUCCEEDED/FAILED）からはどこへも戻れない', () => {
    expect(isTerminalRunStatus('SUCCEEDED')).toBe(true);
    expect(isTerminalRunStatus('FAILED')).toBe(true);
    expect(canTransitionRun('SUCCEEDED', 'RUNNING')).toBe(false);
    expect(canTransitionRun('FAILED', 'RUNNING')).toBe(false);
    expect(canTransitionRun('FAILED', 'QUEUED')).toBe(false);
  });
  it('NEEDS_APPROVAL→SUCCEEDED の直接遷移は不可（承認後は必ず RUNNING を経由）', () => {
    expect(canTransitionRun('NEEDS_APPROVAL', 'SUCCEEDED')).toBe(false);
  });
});

describe('shouldCreateRun（二重実行・クラッシュ・retry）', () => {
  const now = new Date('2026-07-11T12:00:00Z');
  it('既存なし → 作成可', () => {
    expect(shouldCreateRun([], now).create).toBe(true);
  });
  it('新鮮な RUNNING あり → 重複実行を拒否', () => {
    const r = shouldCreateRun([{ status: 'RUNNING', startedAt: new Date(now.getTime() - 60_000) }], now);
    expect(r.create).toBe(false);
    expect(r.reason).toContain('重複');
  });
  it('NEEDS_APPROVAL あり → 人間の判断が先（作成拒否）', () => {
    expect(shouldCreateRun([{ status: 'NEEDS_APPROVAL', startedAt: null }], now).create).toBe(false);
  });
  it('stale RUNNING（クラッシュ残骸）→ 新規作成を許可（履歴は巻き戻さない）', () => {
    const old = new Date(now.getTime() - STALE_RUNNING_MS - 1);
    expect(shouldCreateRun([{ status: 'RUNNING', startedAt: old }], now).create).toBe(true);
  });
  it('terminal（SUCCEEDED/FAILED）のみ → retry は新 run として作成可', () => {
    expect(shouldCreateRun([{ status: 'FAILED', startedAt: null }, { status: 'SUCCEEDED', startedAt: null }], now).create).toBe(true);
  });
});

describe('maskRunError（PII/Secrets マスク・長さ制限）', () => {
  it('URL・メール・トークン・長数値をマスクし 200 字に制限する', () => {
    const msg = `connect failed postgres://user:pass@db:5432/x token=abc123SECRET mail to ceo@ikezaki.local acct 12345678 ${'x'.repeat(300)}`;
    const m = maskRunError(new Error(msg));
    expect(m).toContain('[masked-url]');
    expect(m).toContain('[masked-email]');
    expect(m).toContain('token=[masked]');
    expect(m).toContain('[masked-number]');
    expect(m.length).toBeLessThanOrEqual(201);
    expect(m).not.toContain('abc123SECRET');
  });
  it('Error 以外・null も安全に文字列化する', () => {
    expect(maskRunError(null)).toContain('unknown');
    expect(maskRunError('plain')).toBe('plain');
  });
});
