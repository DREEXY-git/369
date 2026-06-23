// 外部URLフェッチの安全ラッパ（SSRF対策・allowlist・timeout・size制限）。

const BLOCKED_HOST = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0|::1|\[::1\])/i;
const PRIVATE_172 = /^172\.(1[6-9]|2\d|3[0-1])\./;

export interface SafeFetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  allowlist?: string[]; // 空なら内部/予約レンジ以外を許可
}

export interface SafeFetchResult {
  ok: boolean;
  status: number;
  body: string;
  finalUrl: string;
  error?: string;
}

export function isUrlAllowed(url: string, allowlist: string[] = []): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  const host = u.hostname;
  if (BLOCKED_HOST.test(host) || PRIVATE_172.test(host)) return false;
  if (allowlist.length > 0) {
    return allowlist.some((d) => host === d || host.endsWith(`.${d}`));
  }
  return true;
}

export async function safeFetch(url: string, opts: SafeFetchOptions = {}): Promise<SafeFetchResult> {
  const timeoutMs = opts.timeoutMs ?? 8000;
  const maxBytes = opts.maxBytes ?? 2_000_000;
  if (!isUrlAllowed(url, opts.allowlist)) {
    return { ok: false, status: 0, body: '', finalUrl: url, error: 'URL is not allowed (SSRF guard)' };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'user-agent': 'IKEZAKI-OS-LeadMap-Scanner/0.1 (+compliance: public pages only)' },
    });
    const reader = res.body?.getReader();
    let received = 0;
    const chunks: Uint8Array[] = [];
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          received += value.length;
          if (received > maxBytes) {
            controller.abort();
            break;
          }
          chunks.push(value);
        }
      }
    }
    const body = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8');
    return { ok: res.ok, status: res.status, body, finalUrl: res.url || url };
  } catch (e) {
    return { ok: false, status: 0, body: '', finalUrl: url, error: (e as Error).message };
  } finally {
    clearTimeout(timer);
  }
}

export interface HtmlScan {
  ssl: boolean;
  mobile: boolean;
  hasBooking: boolean;
  hasLine: boolean;
  hasContactForm: boolean;
  hasRecruit: boolean;
  title: string;
  description: string;
  emails: string[];
  socialLinks: string[];
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/** 取得した HTML から営業に使える示唆を抽出（連絡先 + 改善余地のヒント）。 */
export function scanHtml(html: string, url: string): HtmlScan {
  const lower = html.toLowerCase();
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
  const emails = Array.from(new Set((html.match(EMAIL_RE) ?? []).slice(0, 5)));
  const socialLinks = Array.from(
    new Set(
      (html.match(/https?:\/\/(?:www\.)?(?:instagram|facebook|twitter|x|line|youtube)\.[^"'\s<>]+/gi) ??
        []).slice(0, 8),
    ),
  );
  return {
    ssl: url.startsWith('https://'),
    mobile: /viewport/.test(lower),
    hasBooking: /(予約|reserve|booking|reservation|ネット予約)/.test(lower),
    hasLine: /(line\.me|lin\.ee|line予約|@line)/.test(lower),
    hasContactForm: /(<form|お問い合わせ|contact|問い合わせ)/.test(lower),
    hasRecruit: /(採用|recruit|求人)/.test(lower),
    title: (titleMatch?.[1] ?? '').trim().slice(0, 120),
    description: (descMatch?.[1] ?? '').trim().slice(0, 200),
    emails,
    socialLinks,
  };
}
