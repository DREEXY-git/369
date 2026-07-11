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

// prose（非構造テキスト）tail の安全判定。文字列外に現れる escaped quote（`\"`/`\'`・別 depth の偽装終端）や
// 末尾で開きっぱなしの文字列があれば「破損」。純テキスト（quote 無し／均衡ペアのみ）なら安全。
function proseTailClean(s: string, from: number, end: number): boolean {
  let inStr = false;
  let strQuote = '';
  let i = from;
  while (i < end) {
    const c = s[i]!;
    if (c === '\\') {
      const next = s[i + 1];
      if (!inStr && (next === '"' || next === "'")) return false; // 文字列外の escaped quote = 偽装終端
      i += 2;
      continue;
    }
    if (c === '"' || c === "'") {
      if (!inStr) {
        inStr = true;
        strQuote = c;
      } else if (c === strQuote) {
        inStr = false;
        strQuote = '';
      }
    }
    i++;
  }
  return !inStr;
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

// container を出切った後（top-level を超えた）残りが安全な separator/prose かを判定。
// 直後が glued な非区切り（bare/quote/backslash）＝偽装の疑い → 破損。それ以外は prose として安全判定。
function afterContainerExitSafe(s: string, from: number, end: number): boolean {
  if (from < end) {
    const c = s[from]!;
    if (!/[\s,;:)}\]]/.test(c)) return false; // 例: `}O0F144S64` のような glued 継続は不正
  }
  return proseTailClean(s, from, end);
}

// 構造 tail（値の閉じ引用符直後）を bounded state machine で**文法的に**検証する。
// v6.6 P1 修正: quote 数の均衡だけを信頼する（`,O0F144S64"x"` を健全と誤判定する）規則を廃止し、
// 候補 closer は後続 tail が「正規の次フィールド / 配列要素 / container 終端 / record 終端」として
// 解析できる場合だけ採用する。曖昧・不正・途中切断・未知 tail は false（＝末尾まで fail-closed）。
// 状態: expectValue=false（EXPECT_SEP・値の直後）/ true（EXPECT_VALUE・区切りの直後）。depth は
// 値を含む container を 0 とし、出切ったら残りを prose として扱う。O(n)・ReDoS なし・文字列固有パッチなし。
function structuredTailValid(s: string, from: number, end: number): boolean {
  let i = from;
  let depth = 0;
  let expectValue = false; // 値の直後から開始（次は区切り/container 終端のはず）
  while (i < end) {
    const c = s[i]!;
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      i++;
      continue;
    }
    if (c === '\\') return false; // 構造内の裸 backslash（escaped quote 偽装終端含む）は破損
    if (c === ',') {
      if (expectValue) return false; // `,,` 等・値位置に区切り
      expectValue = true;
      i++;
      continue;
    }
    if (c === ':' || c === ';') {
      expectValue = true; // key:value / 文の区切り（lenient に値期待へ）
      i++;
      continue;
    }
    if (c === '{' || c === '[' || c === '(') {
      depth++;
      expectValue = true;
      i++;
      continue;
    }
    if (c === '}' || c === ']' || c === ')') {
      depth--;
      i++;
      if (depth < 0) return afterContainerExitSafe(s, i, end); // container を出切った → 残りは prose
      expectValue = false; // 閉じた後は値の直後扱い（次は区切り）
      continue;
    }
    if (c === '"' || c === "'") {
      if (!expectValue) return false; // 値位置でないのに string（値の隣接）= 破損
      const r = consumeQuotedString(s, i, end);
      if (r < 0) return false; // 未閉
      i = r;
      expectValue = false;
      continue;
    }
    // bare token
    if (!expectValue) return false; // 値位置でない bare = 破損
    let j = i;
    while (j < end && !/[\s,;:{}[\]()"'\\]/.test(s[j]!)) j++;
    if (!isJsonPrimitiveToken(s.slice(i, j))) return false; // 非プリミティブ bare = 秘密の疑い
    i = j;
    expectValue = false;
  }
  return depth === 0; // 途中切断（未閉 container・depth>0）は破損
}

// tail が値の終端として妥当か。最初の非空白が構造区切りなら文法検証、そうでなければ prose 安全判定。
function tailIsSafeContinuation(s: string, from: number, end: number): boolean {
  let k = from;
  while (k < end && /\s/.test(s[k]!)) k++;
  const firstNonWs = k < end ? s[k]! : '';
  if (firstNonWs && /[,;:)}\]]/.test(firstNonWs)) {
    return structuredTailValid(s, from, end);
  }
  return proseTailClean(s, from, end);
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
    const q = s[p]!; // 開始引用符文字（" または '）
    const openDepth = p - start; // 開始引用符の直前 backslash 個数（= 実 escape depth）
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
    if (!tailIsSafeContinuation(s, end, s.length)) return s.length;
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

