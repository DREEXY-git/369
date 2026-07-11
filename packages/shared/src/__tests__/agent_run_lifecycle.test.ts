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

// v6.3 P1 修正: quoted 値の内部 delimiter / 改行で打ち切らず、対応する閉じ引用符まで消費する。
// sentinel（元秘密・prefix/suffix）が出力へ一文字列として残らないことを直接 assert（[masked] の有無では判定しない）。
describe('maskRunError v6.3（escaped-quoted 値の内部 delimiter・改行の完全封鎖）', () => {
  const noLeak = (input: string, ...secrets: string[]) => {
    const out = maskRunError(input, 500);
    for (const s of secrets) expect(out, `leaked in: ${JSON.stringify(out)}`).not.toContain(s);
    return out;
  };
  it('P1-1: escaped quoted 値の内部 comma で suffix が残らない', () => {
    noLeak(String.raw`err {\"password\":\"abc,COMMASECRET\"}`, 'COMMASECRET');
  });
  it('P1-1: semicolon / brace / bracket も残らない', () => {
    noLeak(String.raw`{\"token\":\"a;SEMICOLONSECRET\"}`, 'SEMICOLONSECRET');
    noLeak(String.raw`{\"secret\":\"a}BRACESECRET\"}`, 'BRACESECRET');
    noLeak(String.raw`{\"password\":\"a]BRACKETSECRET\"}`, 'BRACKETSECRET');
  });
  it('P1-1: raw quoted 値の内部 comma / brace も残らない', () => {
    noLeak('{"password":"abc,COMMASECRET2"}', 'COMMASECRET2');
    noLeak('{"password":"a}BRACESECRET2"}', 'BRACESECRET2');
  });
  it('P1-2: quoted 値の改行 2 行目が残らない（LF）', () => {
    noLeak('{"password":"abc\nNEWLINESECRET"}', 'NEWLINESECRET');
  });
  it('P1-2: escaped quoted 値の改行も残らない', () => {
    noLeak('{\\"password\\":\\"abc\nNEWLINESECRET2\\"}', 'NEWLINESECRET2');
  });
  it('P1-2: CRLF / 複数改行 / 改行後 suffix も残らない', () => {
    noLeak('{"password":"abc\r\nCRLFSECRET"}', 'CRLFSECRET');
    noLeak('{"password":"a\n\nMULTISECRET"}', 'MULTISECRET');
    noLeak('{"token":"x\nSUFFSECRET,other"}', 'SUFFSECRET');
  });
  it('nested escaped JSON の comma も残らない', () => {
    noLeak(String.raw`{\"o\":{\"password\":\"a,NESTEDSECRET\"}}`, 'NESTEDSECRET');
  });
  it('unclosed quoted 値は fail-closed（末尾まで masked）', () => {
    noLeak('{"password":"abcUNCLOSEDSECRET', 'UNCLOSEDSECRET');
  });
  it('破損した連続 escaped quote（\\"a\\"b\\"...）でも suffix が残らない', () => {
    noLeak(String.raw`{\"password\":\"a\"b\"MULTIQSECRET\"}`, 'MULTIQSECRET');
  });
  it('escaped backslash + 閉じ引用符を正しく処理', () => {
    noLeak('{"password":"abc\\\\","x":1} SAFEWORD', 'abc');
  });
  it('100KB 級入力が bounded に終了（catastrophic backtracking なし）', () => {
    const big = `{"password":"${'x'.repeat(100000)}HUGESECRET"}`;
    const out = maskRunError(big, 200);
    expect(out).not.toContain('HUGESECRET');
    expect(out.length).toBeLessThanOrEqual(201);
    expect(out).not.toContain('\n');
  });
  it('quoted 値の後の benign 文脈は過剰マスクしない', () => {
    const out = maskRunError('config password: "sec-01" and then connected to host ok', 500);
    expect(out).toContain('connected to host ok');
    expect(out).not.toContain('sec-01');
  });
});

// v6.4 P1 修正: 実 backslash depth（個数）一致で同レベル引用符を判定（parity/次文字に依存しない）。
// 開始 depth 1（\") と内部 depth 3（\\\") を区別し、内部 quote 直後の delimiter/改行で誤終了しないこと。
describe('maskRunError v6.4（depth-matrix・内部 depth3 quote 直後 delimiter 完全封鎖）', () => {
  const noLeak = (input: string, ...secrets: string[]) => {
    const out = maskRunError(input, 500);
    for (const s of secrets) expect(out, `leaked in: ${JSON.stringify(out)}`).not.toContain(s);
    return out;
  };
  // 開始 depth 1、内部 quote depth 3、直後を各 delimiter にした depth-matrix（Codex 5/5 再現ケース）。
  const mk = (delim: string, sec: string) =>
    String.raw`{\"password\":\"abc\\\"` + delim + sec + String.raw`\"}`;
  it('depth3 内部 quote 直後 comma', () => noLeak(mk(',', 'INNERCOMMA63'), 'INNERCOMMA63'));
  it('depth3 内部 quote 直後 space', () => noLeak(mk(' ', 'INNERSPACE63'), 'INNERSPACE63'));
  it('depth3 内部 quote 直後 semicolon', () => noLeak(mk(';', 'INNERSEMI63'), 'INNERSEMI63'));
  it('depth3 内部 quote 直後 brace', () => noLeak(mk('}', 'INNERBRACE63'), 'INNERBRACE63'));
  it('depth3 内部 quote 直後 bracket', () => noLeak(mk(']', 'INNERBRACK63'), 'INNERBRACK63'));
  it('depth3 内部 quote 直後 LF', () => noLeak(mk('\n', 'INNERLF63'), 'INNERLF63'));
  it('空値→秘密（\\"\\",SECRET）は曖昧として fail-closed', () =>
    noLeak(String.raw`{\"password\":\"\",EMPTYTHENSECRET63\"}`, 'EMPTYTHENSECRET63'));
  it('normal 多フィールド JSON は over-mask で漏らさない', () =>
    noLeak('{"password":"secret63","user":"bob63"}', 'secret63'));
  it('単一 quoted 値の後の構造区切り以降の benign は保持する', () => {
    const out = maskRunError('{"password":"sec63"} then connected ok', 500);
    expect(out).not.toContain('sec63');
    expect(out).toContain('connected ok');
  });
  it('閉じ引用符直後に glued した秘密 suffix も一緒にマスク', () =>
    noLeak('log "password":"abc"GLUEDSECRET63 end', 'GLUEDSECRET63'));
  it('depth3 の秘密でも一行・maxLen を維持', () => {
    const out = maskRunError(mk(',', 'X'.repeat(400)), 200);
    expect(out.length).toBeLessThanOrEqual(201);
    expect(out).not.toContain('\n');
  });
});

// v6.5 P1 全面修正: 偽 closer を開始と同 depth に、本物の終端引用符を別 depth に置く「生成 matrix」
// （Codex 再監査で 84/84 sentinel 残存の攻撃クラス）を機械的に網羅する否定テスト。
// - 文字列固有パッチではなく、tail の構造検証で clean close 後の dangling quote を検出し fail-closed する。
// - sentinel（O0F144S64）と decoy 内の元秘密の両方が、出力に一文字も残らないことを直接 assert する。
describe('maskRunError v6.5（汎用 sentinel matrix・偽closer＋別depth終端 quote）', () => {
  const SENTINEL = 'O0F144S64'; // comma の外に置かれる本物の秘密
  const SENSITIVE_KEYS = ['password', 'token', 'authorization', 'api_key', 'secret', 'session'];
  const QUOTES = ['"', "'"];
  const DECOYS = ['abc', 'x', 'decoy']; // 偽 closer で閉じる短い値（この中身も秘密扱い）
  const TERMINALS = [String.raw`\"`, String.raw`\'`, String.raw`\\\"`, String.raw`\\"`]; // 別 depth の終端 quote
  const SEPS = [',', ', ', ',,', ' ,'];

  const matrix: string[] = [];
  for (const key of SENSITIVE_KEYS)
    for (const q of QUOTES)
      for (const decoy of DECOYS)
        for (const sep of SEPS)
          for (const term of TERMINALS) {
            matrix.push(`{${q}${key}${q}:${q}${decoy}${q}${sep}${SENTINEL}${term}}`); // 区切りあり
            matrix.push(`{${q}${key}${q}:${q}${decoy}${q}${SENTINEL}${term}}`); // glued
          }

  it(`matrix 全 ${matrix.length} 件で sentinel が 0 残存（direct maskRunError・8000/200 両方）`, () => {
    const leaks: string[] = [];
    for (const input of matrix) {
      for (const maxLen of [8000, 200]) {
        const out = maskRunError(input, maxLen);
        if (out.includes(SENTINEL)) leaks.push(`${input}  =>  ${out}`);
      }
    }
    expect(leaks, `残存例:\n${leaks.slice(0, 5).join('\n')}`).toEqual([]);
  });

  it('matrix 全件で decoy 内の元秘密（abc/x/decoy を秘密化）も 0 残存', () => {
    // decoy をユニークな秘密トークンに差し替え、値本体も漏れないことを確認する。
    const leaks: string[] = [];
    for (const key of SENSITIVE_KEYS)
      for (const q of QUOTES)
        for (const sep of SEPS)
          for (const term of TERMINALS) {
            const inner = 'INNERSECRET65';
            const input = `{${q}${key}${q}:${q}${inner}${q}${sep}${SENTINEL}${term}}`;
            const out = maskRunError(input, 8000);
            if (out.includes(inner) || out.includes(SENTINEL)) leaks.push(`${input}  =>  ${out}`);
          }
    expect(leaks, `残存例:\n${leaks.slice(0, 5).join('\n')}`).toEqual([]);
  });

  it('matrix は攻撃クラスを十分に張る（>= 80 件）', () => {
    expect(matrix.length).toBeGreaterThanOrEqual(80);
  });

  // 線形性（ReDoS/二次爆発なし）の粗い上限。長大入力でも実用時間内に返る。
  it('巨大入力でも線形・タイムアウトしない（8000 上限）', () => {
    const big = `{"password":"${'a'.repeat(20000)}",${SENTINEL}\\"}`;
    const started = performance.now();
    const out = maskRunError(big, 8000);
    const elapsed = performance.now() - started;
    expect(out).not.toContain(SENTINEL);
    expect(elapsed).toBeLessThan(1000);
  });
});

// v6.6 P1: 「引用符数が釣り合うだけの不正 tail（balanced-but-invalid）」を tail の文法検証で fail-closed する。
// 例 `{"password":"abc",O0F144S64"x"}`：偽 closer 後の `,O0F144S64"x"` は quote 均衡だが、正規の
// 次フィールド/配列要素/container 終端として解析できない。候補 closer を信頼せず末尾まで mask する。
describe('maskRunError v6.6（balanced-but-invalid tail・文法検証で fail-closed）', () => {
  const SENTINEL = 'O0F144S64';
  const KEYS = ['password', 'token', 'authorization', 'secret', 'session', 'api_key'];

  // 正規 record を separator/key/colon/quote 単位で壊す独立生成 matrix（quote 均衡だが文法的に不正）。
  const brokenMatrix: string[] = [];
  for (const k of KEYS) {
    const kq = `"${k}"`;
    brokenMatrix.push(`{${kq}:"abc",${SENTINEL}"x"}`); // colon 除去相当（bare→glued string）
    brokenMatrix.push(`{${kq}:"abc",${SENTINEL}}`); // key 除去（comma 後の bare 値）
    brokenMatrix.push(`{${kq}:"abc",${SENTINEL}"}`); // 片側 quote
    brokenMatrix.push(`{${kq}:"abc","${SENTINEL}""x"}`); // 二重 string glued（値の隣接）
    brokenMatrix.push(`{${kq}:"abc",${SENTINEL}\\"}`); // 別 depth escaped 終端
    brokenMatrix.push(`{${kq}:"abc", ${SENTINEL}"x"}`); // space 後 glued string
    brokenMatrix.push(`[${kq}:"abc",${SENTINEL}"x"]`); // bracket container
    brokenMatrix.push(`{${kq}:"abc"}${SENTINEL}"x"`); // container 終了直後 glued
    brokenMatrix.push(`{${kq}:"abc",42,${SENTINEL}"x"}`); // 正規 primitive の後に不正
  }

  it('exact Codex 新規 P1（direct・maxLen 8000/200）で sentinel 0', () => {
    for (const maxLen of [8000, 200]) {
      const out = maskRunError('{"password":"abc",O0F144S64"x"}', maxLen);
      expect(out, `maxLen=${maxLen}: ${out}`).not.toContain(SENTINEL);
    }
  });

  it(`broken matrix 全 ${brokenMatrix.length} 件で sentinel 0（direct・8000/200）`, () => {
    const leaks: string[] = [];
    for (const input of brokenMatrix) {
      for (const maxLen of [8000, 200]) {
        const out = maskRunError(input, maxLen);
        if (out.includes(SENTINEL)) leaks.push(`${input} => ${out}`);
      }
    }
    expect(leaks, `残存例:\n${leaks.slice(0, 6).join('\n')}`).toEqual([]);
  });

  it('正規の複数 field / primitive / nested / 末尾 prose は保持する（過剰マスクしない）', () => {
    const keep: [string, RegExp, string][] = [
      ['{"password":"abc","username":"bob"}', /"username":"bob"/, 'abc'],
      ['{"password":"abc","count":42}', /"count":42/, 'abc'],
      ['{"password":"abc","meta":{"a":"b"}}', /"meta":\{"a":"b"\}/, 'abc'],
      ['{"password":"abc","list":[1,2,3]}', /\[1,2,3\]/, 'abc'],
      ['{"password":"sec63"} then connected ok', /then connected ok/, 'sec63'],
      ['config password: "sec-01" and then connected to host ok', /connected to host ok/, 'sec-01'],
    ];
    for (const [input, keepRe, secret] of keep) {
      const out = maskRunError(input, 500);
      expect(out, `保持されず: ${out}`).toMatch(keepRe);
      expect(out, `秘密残存: ${out}`).not.toContain(secret);
      expect(out).toContain('[masked]');
    }
  });

  it('balanced-but-invalid でも一行・maxLen・線形（100KB 入力）', () => {
    const big = `{"password":"abc",${'Z'.repeat(30000)}"x"}`;
    const started = performance.now();
    const out = maskRunError(big, 200);
    expect(performance.now() - started).toBeLessThan(1000);
    expect(out.length).toBeLessThanOrEqual(201);
    expect(out).not.toContain('\n');
  });
});

// v6.7 P1: 「値の後の空白/改行/tab」を prose の逃げ道にしない。container 内では空白後の bare token も構造検証へ
// 回し、正規の次 field/array item/container 終端だけ保持、それ以外は末尾まで fail-closed。
// Codex 独立 matrix（6 keys × 2 quotes × 3 depths × 7 separators × 7 malformed tails）を機械的に張る。
describe('maskRunError v6.7（値後 whitespace/LF の malformed tail・container 構造検証）', () => {
  const SENTINEL = 'O0F144S66';
  const KEYS = ['password', 'token', 'authorization', 'secret', 'session', 'api_key'];
  const QUOTES = ['"', "'"];
  // depth: 0=raw、1=escaped 一段、2=escaped 二段（開始・閉じ引用符の前置 backslash）。
  const DEPTHS = ['', '\\', '\\\\\\'];
  const SEPS = [' ', '\n', '\r\n', '\t', '  ', ' \n ', '\t\n'];
  const TAILS = (q: string) => [
    `${SENTINEL}${q}x${q}`,
    `${SENTINEL}`,
    `${SENTINEL}${q}`,
    `${q}${SENTINEL}${q}${q}x${q}`,
    `${SENTINEL}\\${q}`,
    `${SENTINEL} ${q}x${q}`,
    `${SENTINEL}]`,
  ];

  const matrix: string[] = [];
  for (const key of KEYS)
    for (const q of QUOTES)
      for (const d of DEPTHS)
        for (const sep of SEPS)
          for (const tail of TAILS(q))
            matrix.push(`{${d}${q}${key}${d}${q}:${d}${q}abc${d}${q}${sep}${tail}}`);

  it(`matrix 件数 = 1764`, () => {
    expect(matrix.length).toBe(KEYS.length * QUOTES.length * DEPTHS.length * SEPS.length * 7);
    expect(matrix.length).toBe(1764);
  });

  it('matrix 全 1764 件で sentinel 0（direct・8000/200）', () => {
    const leaks: string[] = [];
    for (const input of matrix) {
      for (const maxLen of [8000, 200]) {
        const out = maskRunError(input, maxLen);
        if (out.includes(SENTINEL)) leaks.push(`${JSON.stringify(input)} => ${JSON.stringify(out)}`);
      }
    }
    expect(leaks, `残存 ${leaks.length}:\n${leaks.slice(0, 6).join('\n')}`).toEqual([]);
  });

  it('代表例（space / LF）が masked', () => {
    for (const input of ['{"password":"abc" O0F144S66"x"}', '{"password":"abc"\nO0F144S66"x"}']) {
      expect(maskRunError(input, 8000)).not.toContain(SENTINEL);
    }
  });

  it('container 外の純プローズ（quote 無し）は保持・quote を含むと fail-closed', () => {
    // 保持: container 外・quote 無しの後続文。
    const keep = maskRunError('config password: "sec-01" and then connected to host ok', 500);
    expect(keep).toContain('connected to host ok');
    expect(keep).not.toContain('sec-01');
    // container 外でも tail に quote を含めば安全境界を証明できない → fail-closed。
    const closed = maskRunError('password: "abc" O0F144S66"x"', 500);
    expect(closed).not.toContain('O0F144S66');
    // container 終端後の純プローズは保持。
    const afterClose = maskRunError('{"password":"sec63"} then connected ok', 500);
    expect(afterClose).toContain('then connected ok');
    expect(afterClose).not.toContain('sec63');
  });

  it('空白 tail でも一行・maxLen・線形（100KB）', () => {
    const big = `{"password":"abc" ${'Z'.repeat(30000)}"x"}`;
    const started = performance.now();
    const out = maskRunError(big, 200);
    expect(performance.now() - started).toBeLessThan(1000);
    expect(out.length).toBeLessThanOrEqual(201);
    expect(out).not.toContain('\n');
  });
});
