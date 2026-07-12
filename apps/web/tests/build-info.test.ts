import { describe, expect, it } from 'vitest';
import { canViewBuildInfo, getBuildInfo } from '../lib/build-info';

// v6.2 WIP-3: build 識別バッジは OWNER / ADMIN の role key 本体だけ（admin:read 権限では広すぎる）。
describe('canViewBuildInfo（role 限定）', () => {
  it('OWNER は表示可', () => expect(canViewBuildInfo(['OWNER'])).toBe(true));
  it('ADMIN は表示可', () => expect(canViewBuildInfo(['ADMIN'])).toBe(true));
  it('OWNER を含む複数 role でも可', () => expect(canViewBuildInfo(['STAFF', 'OWNER'])).toBe(true));
  it('EXECUTIVE は非表示（admin:read を持ちうるが role は不可）', () =>
    expect(canViewBuildInfo(['EXECUTIVE'])).toBe(false));
  it('READ_ONLY は非表示', () => expect(canViewBuildInfo(['READ_ONLY'])).toBe(false));
  it('STAFF は非表示', () => expect(canViewBuildInfo(['STAFF'])).toBe(false));
  it('DEPARTMENT_MANAGER は非表示', () => expect(canViewBuildInfo(['DEPARTMENT_MANAGER'])).toBe(false));
  it('空 role は非表示', () => expect(canViewBuildInfo([])).toBe(false));
});

describe('getBuildInfo（非機密メタのみ）', () => {
  it('branch/project/token/secret を label に含めない・env と short SHA のみ', () => {
    const info = getBuildInfo();
    // label は "<Env> · <7桁 or unknown>" 形式。内部 URL や token を含まない。
    expect(info.label).toMatch(/·/);
    expect(info.shortSha.length).toBeLessThanOrEqual(7);
    expect(info.label).not.toMatch(/https?:\/\//);
    expect(info.label).not.toMatch(/token|secret|vercel\.app/i);
  });
});
