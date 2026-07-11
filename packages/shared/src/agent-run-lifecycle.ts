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
 * - 同一 agent×task に「新鮮な」RUNNING/QUEUED/NEEDS_APPROVAL があれば作らない（重複実行）。
 * - RUNNING が staleThresholdMs より古い場合はクラッシュ残骸とみなし、新規作成を許可する
 *   （古い run は巻き戻さず、そのまま履歴として残す）。
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
    if (r.status === 'RUNNING' || r.status === 'QUEUED') {
      const age = r.startedAt ? now.getTime() - r.startedAt.getTime() : Number.POSITIVE_INFINITY;
      if (age <= staleThresholdMs) {
        return { create: false, reason: '同一タスクが実行中です（重複実行を防止）' };
      }
      // stale RUNNING は残骸として無視（履歴は改竄しない）。
    }
  }
  return { create: true, reason: 'ok' };
}

/** RUNNING がこの時間を超えて finishedAt を持たない場合、stale（実行中と断定できない）扱い。 */
export const STALE_RUNNING_MS = 2 * 60 * 60 * 1000;

/**
 * エラーメッセージの保存用マスク。PII/Secrets/接続文字列らしきものを落とし、長さを制限する。
 * prompt 全文・payload 本文は呼び出し側がそもそも渡さないこと（ここは最後の防波堤）。
 *
 * v5.9 High-1 全面修復（Codex 再現3経路を含む）: 正規表現の継ぎ足しではなく
 * 「①正規化（CRLF 統一・折返しヘッダの unfold）→②キー種別ごとの全面 redact →③1行化」の順で処理する。
 * quoted JSON キー（"authorization" / "cookie" 等）・折返し Cookie・tab/mixed case も対象。
 */
const MASK_SENSITIVE_KEYS =
  'proxy-authorization|authorization|set-cookie|cookie|api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|id[_-]?token|token|secret|password|passwd|pwd|credential|session[_-]?id|private[_-]?key|sid';

export function maskRunError(err: unknown, maxLen = 200): string {
  const raw = err instanceof Error ? err.message : String(err ?? 'unknown error');
  // ① 正規化: CRLF/CR を LF に統一し、折返しヘッダ（改行＋空白/タブ継続）を 1 空白へ unfold。
  //    これで `Cookie:\n sid=...` のような複数行値も単一行のヘッダとして後段の redact に掛かる。
  let s = raw.replace(/\r\n?/g, '\n').replace(/\n[ \t]+/g, ' ');

  s = s
    // ② -1) URL（クエリ・埋め込み認証情報 user:pass@ ごと落とす）
    .replace(/(postgres(ql)?|redis|https?|mongodb(\+srv)?|amqps?|mysql|ftp):\/\/\S+/gi, '[masked-url]')
    // ② -2) quoted JSON キー: "key" / 'key' の値（quoted・非 quoted とも）を丸ごと redact。
    //        authorization / cookie を含む全キーが対象（Codex 再現 1・2 の遮断点）。
    .replace(
      new RegExp('(["\'])(' + MASK_SENSITIVE_KEYS + ')\\1\\s*[:=]\\s*("[^"]*"|\'[^\']*\'|[^\\s,;}\\]]+)', 'gi'),
      '$1$2$1:[masked]',
    )
    // ② -3) ヘッダ形式（非 quoted）: Authorization / Cookie 系は行末まで丸ごと redact
    //        （unfold 済みなので折返し値も同一行に居る＝Codex 再現 3 の遮断点。tab・mixed case は \s と i フラグで吸収）。
    .replace(/\b(proxy-authorization|authorization|set-cookie|cookie)\b\s*[:=][^\n]*/gi, '$1=[masked]')
    // ② -4) 汎用 key=value / key: value（非 quoted キー）
    .replace(
      new RegExp('\\b(' + MASK_SENSITIVE_KEYS + ')\\b(\\s*[:=]\\s*)("[^"]*"|\'[^\']*\'|[^\\s,;&)}\\]]+)', 'gi'),
      '$1$2[masked]',
    )
    // ② -5) スキーム付きトークン（キー名なしの裸出現）: Bearer / Basic / ApiKey <値>
    .replace(/\b(bearer|basic|apikey|api[_-]key)\s+[A-Za-z0-9._~+/=-]{6,}/gi, '$1 [masked]')
    // ② -6) JWT（base64url 3 セグメント）
    .replace(/\beyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{2,}/g, '[masked-jwt]')
    // ② -7) 代表的な鍵の生値（sk-/rk-/pk-/AKIA/ghp_/xox*）
    .replace(/\b(sk|rk|pk)-[A-Za-z0-9-]{8,}/g, '[masked-key]')
    .replace(/\bAKIA[A-Z0-9]{10,}/g, '[masked-key]')
    .replace(/\bgh[pousr]_[A-Za-z0-9]{16,}/g, '[masked-key]')
    .replace(/\bxox[baprs]-[A-Za-z0-9-]{10,}/g, '[masked-key]')
    // ② -8) メール・長い数値
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[masked-email]')
    .replace(/\b\d{7,}\b/g, '[masked-number]')
    // ③ 保存は 1 行に正規化（改行に隠れた値の逃げ道を残さない）
    .replace(/[\n]+/g, ' ');
  if (s.length > maxLen) s = `${s.slice(0, maxLen)}…`;
  return s;
}

