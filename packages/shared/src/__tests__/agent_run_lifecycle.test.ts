import { describe, expect, it } from 'vitest';
import {
  canTransitionRun,
  isTerminalRunStatus,
  shouldCreateRun,
  maskRunError,
  isStaleActiveRun,
  STALE_RUNNING_MS,
} from '../agent-run-lifecycle';

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
  // v5.8 High-1 否定テスト: 秘密値が一切残らないことを検証する（Codex 指摘の再発防止）。
  it('Authorization: Bearer の token 本体が残らない', () => {
    const m = maskRunError(new Error('request failed. Authorization: Bearer sk-live-SECRETVALUE9 was rejected'));
    expect(m).not.toContain('sk-live-SECRETVALUE9');
    expect(m).not.toContain('SECRETVALUE9');
  });
  it('裸の Bearer / Basic スキーム値が残らない', () => {
    const m = maskRunError(new Error('sent bearer AbC.def-123~tok and Basic QWxhZGRpbjpPcGVuU2VzYW1l'));
    expect(m).not.toContain('AbC.def-123~tok');
    expect(m).not.toContain('QWxhZGRpbjpPcGVuU2VzYW1l');
  });
  it('JWT（3 セグメント）が残らない', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJzZWNyZXQtdXNlciJ9.sflKxwRJSMeKKF2QT4fwpMeJf36POk6yJVadQssw5c';
    const m = maskRunError(new Error(`invalid token ${jwt} supplied`));
    expect(m).not.toContain('eyJzdWIi');
    expect(m).not.toContain('sflKxwRJSMeKKF2QT4fwpMeJf36POk6yJVadQssw5c');
    expect(m).toContain('[masked-jwt]');
  });
  it('Cookie / Set-Cookie ヘッダの値が残らない', () => {
    const m = maskRunError(new Error('upstream said set-cookie: session=deadbeefcafe123; Path=/; HttpOnly and Cookie: sid=topsecretsid'));
    expect(m).not.toContain('deadbeefcafe123');
    expect(m).not.toContain('topsecretsid');
  });
  it('quoted JSON の秘密値（ダブル/シングル引用）が残らない', () => {
    const m = maskRunError(new Error('payload {"apiKey":"AKSUPERSECRET01","password":"p@ss word!"} and {\'secret\': \'quoted-one\'}'));
    expect(m).not.toContain('AKSUPERSECRET01');
    expect(m).not.toContain('p@ss word!');
    expect(m).not.toContain('quoted-one');
  });
  it('改行で分割された値も残らず、保存文字列は 1 行になる', () => {
    const m = maskRunError(new Error('auth failed token=\nline-secret-value rest'));
    expect(m).not.toContain('line-secret-value');
    expect(m).not.toContain('\n');
  });
  it('代表的な鍵の生値（AKIA/ghp/xoxb）が残らない', () => {
    const m = maskRunError(new Error('leaked AKIA0123456789AB and ghp_abcdefghij0123456789 and xoxb-1234567890-abc'));
    expect(m).not.toContain('AKIA0123456789AB');
    expect(m).not.toContain('ghp_abcdefghij0123456789');
    expect(m).not.toContain('xoxb-1234567890-abc');
  });
});

// v5.9 High-1 全面修復の否定テスト（Codex 独立再現 3 経路＋指令 §5 の必須ケース）。
// 「秘密部分が一文字も残らない」ことを直接検証する。
describe('maskRunError v5.9（quoted JSON・折返しヘッダ・スキーム網羅）', () => {
  it('Codex再現1: quoted JSON Authorization（ApiKey スキーム）が残らない', () => {
    const m = maskRunError(new Error('failed with {"authorization":"ApiKey AK-SUPER-SECRET-01"}'));
    expect(m).not.toContain('AK-SUPER-SECRET-01');
    expect(m).not.toContain('ApiKey AK');
  });
  it('Codex再現2: quoted JSON Cookie が残らない', () => {
    const m = maskRunError(new Error('ctx {"cookie":"sid=SESSION-SECRET-99; theme=dark"}'));
    expect(m).not.toContain('SESSION-SECRET-99');
  });
  it('Codex再現3: 折返し Cookie（改行＋空白継続）が残らない', () => {
    const m = maskRunError(new Error('Cookie:\n sid=FOLDED-SECRET-42'));
    expect(m).not.toContain('FOLDED-SECRET-42');
  });
  it('CRLF・タブ継続・mixed case の折返しヘッダも残らない', () => {
    const m1 = maskRunError(new Error('CoOkIe:\r\n\tsid=CRLF-TAB-SECRET'));
    expect(m1).not.toContain('CRLF-TAB-SECRET');
    const m2 = maskRunError(new Error('AUTHORIZATION:\r\n  Bearer MIXED-CASE-SECRET'));
    expect(m2).not.toContain('MIXED-CASE-SECRET');
  });
  it('Authorization Bearer / Basic / ApiKey スキームの値が残らない', () => {
    const m = maskRunError(
      new Error('a: Authorization: Bearer br-SECRET-1 b: Authorization: Basic QmFzaWNTZWNyZXQ= c: authorization: ApiKey ak-SECRET-3'),
    );
    for (const leak of ['br-SECRET-1', 'QmFzaWNTZWNyZXQ=', 'ak-SECRET-3']) expect(m).not.toContain(leak);
  });
  it('token/password/secret/apiKey の quoted JSON 値が残らない', () => {
    const m = maskRunError(
      new Error('{"token":"tk-LEAK1","password":"pw LEAK2","secret":\'sc-LEAK3\',"apiKey":"key-LEAK4"}'),
    );
    for (const leak of ['tk-LEAK1', 'pw LEAK2', 'sc-LEAK3', 'key-LEAK4']) expect(m).not.toContain(leak);
  });
  it('URL 埋め込み認証情報（user:pass@）が残らない', () => {
    const m = maskRunError(new Error('connect https://alice:URLPASS99@db.example.com/x?apikey=QP-LEAK failed'));
    expect(m).not.toContain('URLPASS99');
    expect(m).not.toContain('QP-LEAK');
    expect(m).not.toContain('alice:');
  });
  it('出力は常に 1 行・最大長制限（改行に値を逃がせない）', () => {
    const m = maskRunError(new Error(`multi\nline\nCookie:\n sid=NL-SECRET\n${'z'.repeat(400)}`), 200);
    expect(m).not.toContain('\n');
    expect(m).not.toContain('NL-SECRET');
    expect(m.length).toBeLessThanOrEqual(201);
  });
});

// v6.1 追補: Codex 再監査で再現された残存 3 経路の否定テスト（red で再現 → 修正で green）。
// ①エスケープ引用符付き JSON の非スキーム値 ②改行直後に空白なしで値が続くヘッダ ③裸の session キー。
describe('maskRunError v6.1（escaped quote・改行直後値・裸 session）', () => {
  it('Codex再現A: \\"password\\" / \\"token\\"（エスケープ引用符・スキーム無し値）が残らない', () => {
    const m = maskRunError(new Error('log {\\"password\\":\\"P@ssEscaped9\\",\\"token\\":\\"TOKENESCAPED22\\"}'));
    expect(m).not.toContain('P@ssEscaped9');
    expect(m).not.toContain('TOKENESCAPED22');
  });
  it('Codex再現B-1: Cookie 改行直後（空白なし）+ session キーが残らない', () => {
    const m = maskRunError(new Error('Cookie:\nsession=NOSPACESECRET7'));
    expect(m).not.toContain('NOSPACESECRET7');
  });
  it('Codex再現B-2: Authorization 改行直後の裸トークンが残らない', () => {
    const m = maskRunError(new Error('Authorization:\nRAWTOKEN123456 rejected'));
    expect(m).not.toContain('RAWTOKEN123456');
  });
  it('Codex再現C: 裸の session=<値> が残らない', () => {
    const m = maskRunError(new Error('session=BARESESSIONVAL123 expired'));
    expect(m).not.toContain('BARESESSIONVAL123');
  });
  it('過剰マスクしない: 散文の "session started" は保持する', () => {
    const m = maskRunError(new Error('worker session started at step 3'));
    expect(m).toContain('session started');
  });
});

// v6.2 High 修正: bounded scanner。値内部の escaped quote で秘密 suffix が残らないことを、
// [masked] の有無ではなく「元秘密・prefix・suffix・sentinel が一文字列として残らない」で直接 assert する。
describe('maskRunError v6.2（bounded scanner・escaped quote 完全封鎖）', () => {
  const noLeak = (input: string, ...secrets: string[]) => {
    const out = maskRunError(input, 500);
    for (const sec of secrets) expect(out, `leaked in: ${JSON.stringify(out)}`).not.toContain(sec);
    return out;
  };
  it('受入例: 値内部 escaped quote の suffix が残らない', () => {
    noLeak('{"password":"abc\\"SECRET_TOKEN"}', 'SECRET_TOKEN');
  });
  it('outer quote だけが escaped（escaped key + value）', () => {
    noLeak('err {\\"password\\":\\"OUTERSECRET1\\"}', 'OUTERSECRET1');
  });
  it('escaped backslash then close', () => {
    noLeak('{"secret":"path\\\\"} trailing', 'path');
  });
  it('複数の escaped quote', () => {
    noLeak('{"password":"a\\"b\\"c\\"MULTISECRET3"}', 'MULTISECRET3');
  });
  it('nested object / array 内の password・token', () => {
    noLeak('{"outer":{"password":"NESTEDSECRET4"},"list":[{"token":"ARRSECRET5"}]}', 'NESTEDSECRET4', 'ARRSECRET5');
  });
  it('quote 後に秘密 suffix が続く入力', () => {
    noLeak('log "password":"abc"SUFFIXSECRET6 end', 'SUFFIXSECRET6');
  });
  it('single quote 値', () => {
    noLeak("{'password':'SQUOTE15val'}", 'SQUOTE15val');
  });
  it('複数 header（authorization / cookie）が両方残らない', () => {
    noLeak('authorization: Bearer HDR9\ncookie: sid=HDR10', 'HDR9', 'HDR10');
  });
  it('巨大入力でも一行・maxLen（catastrophic backtracking なし）', () => {
    const big = `{"password":"${'x'.repeat(5000)}SECRETBIG"}`;
    const out = maskRunError(big, 200);
    expect(out).not.toContain('SECRETBIG');
    expect(out.length).toBeLessThanOrEqual(201);
    expect(out).not.toContain('\n');
  });
  it('benign 文（日本語・英語）を過剰マスクしない', () => {
    const out = maskRunError('worker session started: 接続に失敗 ECONNREFUSED at step 3', 500);
    expect(out).toContain('ECONNREFUSED');
    expect(out).toContain('session started');
    expect(out).toContain('接続に失敗');
  });
});

// v6.2 WIP-2: stale 判定の単一正本 isStaleActiveRun（RUNNING/QUEUED × fresh/stale/null・terminal 除外）。
describe('isStaleActiveRun（pre/post 共通・表形式網羅）', () => {
  const now = new Date('2026-07-12T00:00:00Z');
  const fresh = new Date(now.getTime() - 60_000);
  const old = new Date(now.getTime() - (STALE_RUNNING_MS + 60_000));
  const table: [string, 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'NEEDS_APPROVAL', Date | null, boolean][] = [
    ['RUNNING fresh → 非stale', 'RUNNING', fresh, false],
    ['RUNNING stale → stale', 'RUNNING', old, true],
    ['RUNNING null → stale（安全側）', 'RUNNING', null, true],
    ['QUEUED fresh → 非stale', 'QUEUED', fresh, false],
    ['QUEUED stale → stale', 'QUEUED', old, true],
    ['QUEUED null → stale（安全側）', 'QUEUED', null, true],
    ['SUCCEEDED → 非active', 'SUCCEEDED', old, false],
    ['FAILED → 非active', 'FAILED', old, false],
    ['NEEDS_APPROVAL → 非active（crash 概念外）', 'NEEDS_APPROVAL', null, false],
  ];
  for (const [name, status, startedAt, expected] of table) {
    it(name, () => {
      expect(isStaleActiveRun({ status, startedAt }, now)).toBe(expected);
    });
  }
});
