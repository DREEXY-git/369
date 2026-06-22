// 配信停止（抑止）リスト判定と、返信からの配信停止検知。

export interface SuppressionEntry {
  channel: string;
  value: string; // メール / ドメイン / 電話
}

export function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
}

/** メール（完全一致 or ドメイン一致）/その他チャネルで抑止対象かを判定。 */
export function isSuppressed(
  list: SuppressionEntry[],
  channel: string,
  value: string,
): boolean {
  const target = normalizeAddress(value);
  const domain = target.includes('@') ? target.slice(target.indexOf('@') + 1) : null;
  return list.some((e) => {
    if (e.channel !== channel) return false;
    const ev = normalizeAddress(e.value);
    if (ev === target) return true;
    // 抑止リストにドメインのみが登録されている場合
    if (domain && !ev.includes('@') && ev === domain) return true;
    return false;
  });
}

const UNSUBSCRIBE_PATTERNS = [
  '配信停止',
  '配信を停止',
  '今後の連絡は不要',
  '送らないで',
  '迷惑',
  'unsubscribe',
  'opt out',
  'opt-out',
  '退会',
];

/** 返信本文から配信停止希望を検知（SuppressionList 追加トリガ）。 */
export function detectUnsubscribeRequest(body: string): boolean {
  const text = body.toLowerCase();
  return UNSUBSCRIBE_PATTERNS.some((p) => text.includes(p.toLowerCase()));
}
