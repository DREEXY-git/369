// 個人情報・機密情報マスキングユーティリティ。
// 外部LLM送信前の匿名化や、権限不足時の表示に使用する。

export function maskName(name: string): string {
  if (!name) return name;
  const chars = [...name.trim()];
  if (chars.length <= 1) return '〇';
  return chars[0] + '〇'.repeat(Math.max(1, chars.length - 1));
}

export function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return '***';
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const dot = domain.lastIndexOf('.');
  const tld = dot >= 0 ? domain.slice(dot) : '';
  const head = local[0] ?? '*';
  const dhead = domain[0] ?? '*';
  return `${head}***@${dhead}***${tld}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.length < 4) return '***';
  return `***-****-${digits.slice(-4)}`;
}

export function maskAddress(address: string): string {
  if (!address) return address;
  // 都道府県・市区町村までは残し、それ以降を伏せる
  const m = address.match(/^(.*?[都道府県])?(.*?[市区町村郡])?/);
  const prefix = (m?.[1] ?? '') + (m?.[2] ?? '');
  return prefix ? `${prefix}（以下マスキング）` : '（マスキング）';
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE_RE = /(?:0\d{1,4}[-\s]?\d{1,4}[-\s]?\d{3,4})/g;
const HEALTH_KEYWORDS = ['病名', '通院', '持病', 'うつ', '診断', '障害', '入院', '手術'];
const FAMILY_KEYWORDS = ['配偶者', '夫', '妻', '子供', '息子', '娘', '家族構成'];

/** 自由文中の PII をまとめてマスキング。LLM 送信前の既定処理。 */
export function maskText(text: string): string {
  let out = text.replace(EMAIL_RE, (m) => maskEmail(m)).replace(PHONE_RE, (m) => maskPhone(m));
  for (const kw of [...HEALTH_KEYWORDS, ...FAMILY_KEYWORDS]) {
    out = out.split(kw).join('〇〇');
  }
  return out;
}

export interface MaskOptions {
  name?: boolean;
  email?: boolean;
  phone?: boolean;
  address?: boolean;
  freeText?: boolean;
}

export function maskRecord<T extends Record<string, unknown>>(
  record: T,
  options: MaskOptions = { email: true, phone: true, freeText: true },
): T {
  const clone: Record<string, unknown> = { ...record };
  for (const [key, value] of Object.entries(clone)) {
    if (typeof value !== 'string') continue;
    const lower = key.toLowerCase();
    if (options.name && lower.includes('name')) clone[key] = maskName(value);
    else if (options.email && lower.includes('email')) clone[key] = maskEmail(value);
    else if (options.phone && lower.includes('phone')) clone[key] = maskPhone(value);
    else if (options.address && lower.includes('address')) clone[key] = maskAddress(value);
    else if (options.freeText) clone[key] = maskText(value);
  }
  return clone as T;
}
