// AI Agent Run の lifecycle 純ロジック（Phase 4 Stream B2・roadmap74）。
// 既存 enum RunStatus（QUEUED/RUNNING/SUCCEEDED/FAILED/NEEDS_APPROVAL）のみを使う（schema 変更なし）。
// - COMPLETED は SUCCEEDED として保存する（表示名の別名）。
// - BLOCKED は保存せず、AIApprovalGate（REJECTED）からの導出状態（ai-workforce.ts）。
// 遷移は許可表で固定し、terminal（SUCCEEDED/FAILED）から RUNNING へ戻す不正遷移を拒否する。
// retry は既存 run の巻き戻しではなく「新しい run」を作る（履歴の改竄をしない）。

export type RunLifecycleStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'NEEDS_APPROVAL';

/** 許可される遷移（from → to の集合）。表にない遷移はすべて拒否。 */
export const RUN_TRANSITIONS: Record<RunLifecycleStatus, readonly RunLifecycleStatus[]> = {
  QUEUED: ['RUNNING', 'FAILED'],
  RUNNING: ['SUCCEEDED', 'FAILED', 'NEEDS_APPROVAL'],
  // 承認後の再開は RUNNING、却下は FAILED（人間の判断を経由。AI が承認/却下することはない）。
  NEEDS_APPROVAL: ['RUNNING', 'FAILED'],
  SUCCEEDED: [],
  FAILED: [],
};

export function canTransitionRun(from: RunLifecycleStatus, to: RunLifecycleStatus): boolean {
  return (RUN_TRANSITIONS[from] ?? []).includes(to);
}

export function isTerminalRunStatus(s: RunLifecycleStatus): boolean {
  return RUN_TRANSITIONS[s]?.length === 0;
}

/**
 * 新しい run を作ってよいか（二重実行・クラッシュ後の暴走防止）。
 * - NEEDS_APPROVAL があれば作らない（人間の判断が先）。
 * - 「新鮮な（非 stale）」RUNNING/QUEUED があれば作らない（重複実行）。
 * - stale（クラッシュ残骸・startedAt 古い or null）は無視して新規作成を許可（残骸は巻き戻さない）。
 *
 * v6.2: staleness 判定は共有 `isStaleActiveRun` に一本化し、worker の作成後 rival 判定と**完全に同じ規則**にする
 * （RUNNING/QUEUED を同じ扱い・null=stale・同一 threshold・呼び出し側が渡す now を時刻基準にする）。
 */
export function shouldCreateRun(
  existing: { status: RunLifecycleStatus; startedAt: Date | null }[],
  now: Date,
  staleThresholdMs: number = STALE_RUNNING_MS,
): { create: boolean; reason: string } {
  for (const r of existing) {
    if (r.status === 'NEEDS_APPROVAL') {
      return { create: false, reason: '同一タスクが承認待ちです（人間の判断が先）' };
    }
  }
  for (const r of existing) {
    if ((r.status === 'RUNNING' || r.status === 'QUEUED') && !isStaleActiveRun(r, now, staleThresholdMs)) {
      return { create: false, reason: '同一タスクが実行中です（重複実行を防止）' };
    }
  }
  return { create: true, reason: 'ok' };
}

/** RUNNING がこの時間を超えて finishedAt を持たない場合、stale（実行中と断定できない）扱い。 */
export const STALE_RUNNING_MS = 2 * 60 * 60 * 1000;

/**
 * stale（クラッシュ残骸）判定の単一正本（v6.2）。作成前 gate（`shouldCreateRun`）と worker の作成後 rival 判定が
 * **同一 helper・同一 threshold・同一時刻基準**で判定するための共有関数。
 *
 * 規則（RUNNING と QUEUED を対象・NEEDS_APPROVAL/terminal は対象外）:
 * - `startedAt` が threshold より古い → stale（クラッシュ残骸）。
 * - `startedAt == null` → **安全側で stale とみなす**（実行中/新鮮と断定できないレコードで新規 run を恒久ブロック
 *   しないため。pre/post で逆判定にしない＝両方 stale 扱い）。
 * - fresh（threshold 内の startedAt）→ stale ではない＝二重実行防止の対象。
 */
export function isStaleActiveRun(
  run: { status: RunLifecycleStatus; startedAt: Date | null },
  now: Date,
  staleThresholdMs: number = STALE_RUNNING_MS,
): boolean {
  if (run.status !== 'RUNNING' && run.status !== 'QUEUED') return false;
  if (!run.startedAt) return true;
  return now.getTime() - run.startedAt.getTime() > staleThresholdMs;
}

/** @deprecated v6.2: `isStaleActiveRun` へ統一（RUNNING/QUEUED・null=stale）。後方互換のため残置。 */
export function isStaleRunningRun(
  run: { status: RunLifecycleStatus; startedAt: Date | null },
  now: Date,
  staleThresholdMs: number = STALE_RUNNING_MS,
): boolean {
  return isStaleActiveRun(run, now, staleThresholdMs);
}

// ── エラーメッセージ用の秘密マスク（v6.2: bounded scanner） ──────────────────────────
// 保存/監査/再throw に秘密（Authorization/Cookie/Bearer/JWT/API key/session/password/token/接続文字列）を
// 一文字も残さないための最終防波堤。prompt 全文・payload 本文は呼び出し側が渡さない前提。
//
// v6.2 全面再設計（High 修正）: JSON 全体への単純な `\"`/`\'` global unescape を**廃止**。
// これは値内部の escaped quote（`{"password":"abc\"SECRET"}`）で終端を壊し秘密 suffix を残すため。
// 代わりに quote/escape 状態を理解する bounded scanner で「機密キー→値」を消費する（catastrophic
// backtracking を起こす巨大 regex を使わない・線形走査）。
const MASK_SENSITIVE_KEYS =
  'proxy-authorization|authorization|set-cookie|cookie|api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|id[_-]?token|token|secret|password|passwd|pwd|credential|session[_-]?id|session|private[_-]?key|sid';

// ヘッダ形式（値がスキーム＋空白を含む＝行末まで消す）キー。正規化キー（小文字・-/_除去）で判定。
const HEADER_KEYS = new Set(['proxyauthorization', 'authorization', 'setcookie', 'cookie']);

// key（前後の引用符・エスケープ引用符を許容）＋区切り `:`/`=` を捕捉。値開始位置は match 終端。
const KEY_SEP_RE = new RegExp(
  '(?:\\\\*["\']?)\\b(' + MASK_SENSITIVE_KEYS + ')\\b(?:\\\\*["\']?)\\s*[:=]\\s*',
  'gi',
);

// index i の直前に連続する backslash の個数（= その位置の実 escape depth）。
function countBackslashesBefore(s: string, i: number): number {
  let n = 0;
  let j = i - 1;
  while (j >= 0 && s[j] === '\\') {
    n++;
    j--;
  }
  return n;
}

// v6.7 P1: unstructured prose（container 外の非構造テキスト）tail の安全判定。
// 「quote を含まない純テキストだけ」を安全とみなす（＝安全境界を証明できる範囲のみ保持）。
// 引用符（生・escaped 問わず）が現れたら prose では安全境界を証明できない → 呼び出し側で末尾まで fail-closed。
// これで v6.6 で残った「値の後に空白＋任意 bare token＋balanced quote」の漏洩（`"abc" O0F144S66"x"`）を塞ぐ。
function proseTailPureText(s: string, from: number, end: number): boolean {
  for (let i = from; i < end; i++) {
    const c = s[i]!;
    if (c === '"' || c === "'") return false;
  }
  return true;
}

// 位置 p（値の開始引用符）までの前置文字列を string-aware に走査し、未閉 container（`{`/`[`）の
// **スタック**を返す（top が値の直属 container）。これで tail 検証が object と array を区別できる。
// escaped JSON では string 追跡が完全ではないが、先頭の生 `{`/`[` は積まれるため「container 内」判定は
// 保守側で成立し（誤って prose 化しない）、tail 側で `\` を検出したら fail-closed になる。O(p)・線形。
function buildContainerStack(s: string, p: number): string[] {
  const stack: string[] = [];
  let inStr = false;
  let q = '';
  for (let i = 0; i < p; i++) {
    const c = s[i]!;
    if (inStr) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === q) inStr = false;
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = true;
      q = c;
      continue;
    }
    if (c === '{' || c === '[') stack.push(c);
    else if (c === '}' || c === ']') stack.pop();
  }
  return stack;
}

// bare token が JSON プリミティブ（number / true / false / null）か。これ以外の裸トークンは
// 秘密の疑いとして構造 tail では拒否する（`O0F144S64` のような英数字混在を通さない）。
function isJsonPrimitiveToken(t: string): boolean {
  return t === 'true' || t === 'false' || t === 'null' || /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(t);
}

// 開始引用符 s[i]=q から対応する閉じ引用符（even-backslash）まで消費し、閉じの次 index を返す。未閉なら -1。
function consumeQuotedString(s: string, i: number, end: number): number {
  const q = s[i]!;
  let k = i + 1;
  while (k < end) {
    if (s[k] === '\\') {
      k += 2;
      continue;
    }
    if (s[k] === q) return k + 1;
    k++;
  }
  return -1;
}

// container を出切った後（top-level を超えた）残りの安全判定。直後が glued な非区切り（bare/quote/backslash）は
// 偽装の疑い（`}O0F144S64`）→ 破損。それ以外は container 外＝quote を含まない純プローズのみ保持。
function afterContainerExit(s: string, from: number, end: number): boolean {
  if (from < end) {
    const c = s[from]!;
    if (!/[\s,;:)}\]]/.test(c)) return false; // 例: `}O0F144S64` のような glued 継続は不正
  }
  return proseTailPureText(s, from, end);
}

// v6.8 Grammar P1: mask した値の直後の tail を、**container stack 付き bounded single-pass parser**で
// JSON 文法として検証する。object は KEY→COLON→VALUE→COMMA_OR_END、array は VALUE→COMMA_OR_END を区別し、
// object の comma 後を array 同様の値位置として受理する v6.7 の誤りを塞ぐ（`,"secret"}` = key 無し value を拒否）。
// - 開始状態: 値を直属 container（stack top）の中で「値を出した直後」= AFTER_VALUE。
// - stack が空になった（値を含む container を全部閉じた）残りは container 外＝prose（`afterContainerExit`）。
// - 文法を確定できない字（構造内の裸 `\`・値位置でない token・key 位置の非 string 等）は false ＝末尾まで fail-closed。
// O(n)・8KB 走査上限（呼び出し側で担保）・ReDoS/再帰なし・文字列固有パッチなし。
function grammarTailValid(s: string, from: number, end: number, initialStack: string[]): boolean {
  const stack = initialStack.slice();
  let i = from;
  // AFTER_VALUE | OBJ_KEY | OBJ_COLON | VALUE
  let mode: 'AFTER_VALUE' | 'OBJ_KEY' | 'OBJ_COLON' | 'VALUE' = 'AFTER_VALUE';
  const skipWs = () => {
    while (i < end) {
      const c = s[i]!;
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r') i++;
      else break;
    }
  };
  while (i < end) {
    skipWs();
    if (i >= end) break;
    const c = s[i]!;
    if (c === '\\') return false; // 構造内の裸 backslash（escaped quote 偽装終端）= 破損

    if (mode === 'AFTER_VALUE') {
      if (stack.length === 0) return afterContainerExit(s, i, end); // 全 container を閉じ切った → prose
      const top = stack[stack.length - 1]!;
      if (top === '{') {
        if (c === ',') {
          i++;
          mode = 'OBJ_KEY';
          continue;
        }
        if (c === '}') {
          stack.pop();
          i++;
          // container を閉じ切った直後（skipWs 前）に prose 委譲＝`} then...` の空白は OK・`}glued` は不正。
          if (stack.length === 0) return afterContainerExit(s, i, end);
          mode = 'AFTER_VALUE';
          continue;
        }
        return false;
      }
      // array
      if (c === ',') {
        i++;
        mode = 'VALUE';
        continue;
      }
      if (c === ']') {
        stack.pop();
        i++;
        if (stack.length === 0) return afterContainerExit(s, i, end);
        mode = 'AFTER_VALUE';
        continue;
      }
      return false;
    }

    if (mode === 'OBJ_KEY') {
      if (c === '"' || c === "'") {
        const r = consumeQuotedString(s, i, end);
        if (r < 0) return false;
        i = r;
        mode = 'OBJ_COLON';
        continue;
      }
      if (c === '}') {
        // 末尾 comma 許容（`{"a":1,}`）＝ 空/末尾で閉じる。
        stack.pop();
        i++;
        if (stack.length === 0) return afterContainerExit(s, i, end);
        mode = 'AFTER_VALUE';
        continue;
      }
      return false; // object の key は quoted string 必須（bare/`{`/`[`/number は不可）
    }

    if (mode === 'OBJ_COLON') {
      if (c === ':') {
        i++;
        mode = 'VALUE';
        continue;
      }
      return false;
    }

    // mode === 'VALUE'
    if (c === '"' || c === "'") {
      const r = consumeQuotedString(s, i, end);
      if (r < 0) return false;
      i = r;
      mode = 'AFTER_VALUE';
      continue;
    }
    if (c === '{') {
      stack.push('{');
      i++;
      mode = 'OBJ_KEY'; // 直後 `}` は OBJ_KEY で空 object として許容
      continue;
    }
    if (c === '[') {
      stack.push('[');
      i++;
      mode = 'VALUE'; // 直後 `]` は下の array-close で空 array として許容
      continue;
    }
    if (c === ']') {
      // 空 array（`[]`）または末尾 comma（`[1,]`）。array 内でのみ有効。
      if (stack.length > 0 && stack[stack.length - 1] === '[') {
        stack.pop();
        i++;
        if (stack.length === 0) return afterContainerExit(s, i, end);
        mode = 'AFTER_VALUE';
        continue;
      }
      return false;
    }
    // bare token（値位置）: JSON プリミティブ（number/true/false/null）だけ許容。
    let j = i;
    while (j < end && !/[\s,;:{}[\]()"'\\]/.test(s[j]!)) j++;
    if (j === i || !isJsonPrimitiveToken(s.slice(i, j))) return false;
    i = j;
    mode = 'AFTER_VALUE';
  }
  // 走査終了: 未閉 container（stack 残）や値/key/colon 待ちのまま終端 → 途中切断＝破損。
  return stack.length === 0 && mode === 'AFTER_VALUE';
}

// tail が値の終端として妥当か。stack 空（container 外）は quote 無し純プローズのみ、
// container 内は grammar parser で文法検証（object/array 区別）。
function tailIsSafeContinuation(s: string, from: number, end: number, stack: string[]): boolean {
  if (stack.length === 0) return proseTailPureText(s, from, end);
  return grammarTailValid(s, from, end, stack);
}

// 値領域の終端 index を返す（quote/escape 状態を理解して消費する）。
function scanValueEnd(s: string, start: number, headerKey: boolean): number {
  // 先頭の backslash を数えて、実体の先頭文字が引用符かどうか（= quotedish）を判定。
  let p = start;
  while (p < s.length && s[p] === '\\') p++;
  const first = s[p];
  const quotedish = first === '"' || first === "'";

  if (quotedish) {
    // v6.6 P1 全面修正: clean close（開始と同 depth の最初の閉じ引用符）を「候補」とし、glued token を値へ
    // 取り込んだ上で、**残り tail を文法的に検証**する（`tailIsSafeContinuation`）。
    // - v6.5 は tail の quote 均衡だけを見ていたため `,O0F144S64"x"` のような balanced-but-invalid を健全と誤判定。
    // - v6.6 は候補 closer を「後続 tail が正規の次フィールド/配列要素/container 終端/record 終端として解析できる」
    //   場合だけ採用する。曖昧・不正・途中切断・未知 tail は **走査末尾まで fail-closed** で秘密 suffix を漏らさない。
    //   quote balance/parity/次文字/quote 個数/最後の quote 単独 heuristic には依存しない・O(n)・ReDoS なし。
    // - v6.7 は「値の後の空白/改行」を prose の逃げ道にしない。
    // - v6.8 Grammar P1: 値の直属 container（`{`/`[`）の**スタック**を前置から求め、tail を object/array 区別の
    //   grammar parser で検証する。object の comma 後は KEY→COLON→VALUE を要求し、key 無しの quoted/nested/array
    //   value（`,"secret"}` / `,{...}` / `,[...]`）を拒否＝末尾まで fail-closed。
    const q = s[p]!; // 開始引用符文字（" または '）
    const openDepth = p - start; // 開始引用符の直前 backslash 個数（= 実 escape depth）
    const containerStack = buildContainerStack(s, p); // 値の直属 container スタック（top が直属）
    let firstClose = -1;
    for (let k = p + 1; k < s.length; k++) {
      if (s[k] === q && countBackslashesBefore(s, k) === openDepth) {
        firstClose = k;
        break;
      }
    }
    // 同 depth の閉じ引用符が無い（unclosed）→ fail-closed。
    if (firstClose < 0) return s.length;
    // 閉じ引用符の直後に空白/構造区切りを挟まず続く glued token（`"abc"SUFFIXSECRET`）は値へ取り込む。
    let end = firstClose + 1;
    while (end < s.length && !/[\s,;:&)}\]]/.test(s[end]!)) end++;
    // 残り tail が値の終端として文法的に妥当でなければ、候補 closer を信頼せず末尾まで fail-closed。
    if (!tailIsSafeContinuation(s, end, s.length, containerStack)) return s.length;
    return end;
  }

  if (headerKey) {
    // ヘッダ値はスキーム＋空白（`Bearer xxx`・`a=b; c=d`）を含むので行末まで。
    let k = start;
    while (k < s.length && s[k] !== '\n') k++;
    return k;
  }

  // 非引用符のデータ値: 空白 or 区切りまで。
  let k = start;
  while (k < s.length && !/[\s,;&)}\]]/.test(s[k]!)) k++;
  return k;
}

function maskSensitiveKeyValues(s: string): string {
  let out = '';
  let last = 0;
  KEY_SEP_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = KEY_SEP_RE.exec(s)) !== null) {
    const valStart = m.index + m[0].length;
    if (valStart >= s.length) break;
    const keyNorm = m[1]!.toLowerCase().replace(/[_-]/g, '');
    const isHeader = HEADER_KEYS.has(keyNorm);
    const valEnd = scanValueEnd(s, valStart, isHeader);
    out += s.slice(last, valStart) + '[masked]';
    last = Math.max(valEnd, valStart + 1);
    KEY_SEP_RE.lastIndex = last;
  }
  out += s.slice(last);
  return out;
}

export function maskRunError(err: unknown, maxLen = 200): string {
  const rawFull = err instanceof Error ? err.message : String(err ?? 'unknown error');
  // 走査コストを線形上限に収める（保存は maxLen だが、走査対象も安全に切る）。
  const raw = rawFull.length > 8000 ? rawFull.slice(0, 8000) : rawFull;
  // ① 正規化（unescape はしない・quote 境界を壊さない）:
  //    CRLF→LF・折返しヘッダ unfold・`:`/`=` 直後改行の join。
  let s = raw
    .replace(/\r\n?/g, '\n')
    .replace(/\n[ \t]+/g, ' ')
    .replace(/([:=])[ \t]*\n+[ \t]*/g, '$1 ');

  // ② URL（埋め込み認証情報 user:pass@ ごと）。
  s = s.replace(/(postgres(ql)?|redis|https?|mongodb(\+srv)?|amqps?|mysql|ftp):\/\/\S+/gi, '[masked-url]');
  // ③ 機密キー→値（quote/escape 状態を理解する bounded scanner・escaped quote を安全に処理）。
  s = maskSensitiveKeyValues(s);
  // ④ キー名なしで裸出現する秘密（防御多重化・いずれも線形 regex）。
  s = s
    .replace(/\b(bearer|basic|apikey|api[_-]key)\s+[A-Za-z0-9._~+/=-]{6,}/gi, '$1 [masked]')
    .replace(/\beyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{2,}/g, '[masked-jwt]')
    .replace(/\b(sk|rk|pk)-[A-Za-z0-9-]{8,}/g, '[masked-key]')
    .replace(/\bAKIA[A-Z0-9]{10,}/g, '[masked-key]')
    .replace(/\bgh[pousr]_[A-Za-z0-9]{16,}/g, '[masked-key]')
    .replace(/\bxox[baprs]-[A-Za-z0-9-]{10,}/g, '[masked-key]')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[masked-email]')
    .replace(/\b\d{7,}\b/g, '[masked-number]')
    // ⑤ 保存は 1 行（改行に値を逃がさない）。
    .replace(/[\n]+/g, ' ');
  if (s.length > maxLen) s = `${s.slice(0, maxLen)}…`;
  return s;
}

