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

// 値領域の終端 index を返す（quote/escape 状態を理解して消費する）。
function scanValueEnd(s: string, start: number, headerKey: boolean): number {
  // 先頭の backslash を数えて、実体の先頭文字が引用符かどうか（= quotedish）を判定。
  let p = start;
  while (p < s.length && s[p] === '\\') p++;
  const first = s[p];
  const quotedish = first === '"' || first === "'";

  if (quotedish) {
    // ログが正しい JSON とは限らず、引用符と backslash depth は攻撃者が任意に組み替えられる。
    // 「正しい閉じ引用符」を推測すると別 depth の偽終端で suffix が漏れるため、quoted/escaped-quoted
    // の機密値を検出した時点から入力末尾までを taint として消す。可観測性より秘密非残存を優先する
    // fail-closed 境界であり、depth・区切り・改行の組合せに依存しない。
    return s.length;
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
