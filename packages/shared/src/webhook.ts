// Webhook 署名（HMAC-SHA256）。node:crypto を使うため barrel(index) には公開しない。
// 利用側は '@hokko/shared/webhook' から import（サーバ/ワーカー専用）。
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * 署名を生成する。`${timestamp}.${body}` を HMAC-SHA256 で署名し16進で返す。
 * timestamp を含めることでリプレイ攻撃を緩和する。
 */
export function signWebhookPayload(secret: string, body: string, timestamp: number): string {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

/** ヘッダ値 `t=<unix>,v1=<hex>` を生成。 */
export function buildSignatureHeader(secret: string, body: string, timestamp: number): string {
  return `t=${timestamp},v1=${signWebhookPayload(secret, body, timestamp)}`;
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

export interface VerifyOptions {
  toleranceSec?: number; // 既定 300 秒
  now?: number; // テスト用（unix秒）
}

/**
 * 署名ヘッダ(`t=...,v1=...`)または生の署名を検証する。
 * - HMAC一致（定数時間比較）
 * - timestamp が許容範囲内（リプレイ防止）
 */
export function verifyWebhookSignature(
  secret: string,
  body: string,
  header: string,
  opts: VerifyOptions = {},
): boolean {
  const tolerance = opts.toleranceSec ?? 300;
  const nowSec = opts.now ?? Math.floor(Date.now() / 1000);

  let timestamp: number | undefined;
  let provided: string | undefined;
  if (header.includes('v1=')) {
    for (const part of header.split(',')) {
      const [k, v] = part.split('=');
      if (k === 't') timestamp = Number(v);
      if (k === 'v1') provided = v;
    }
  } else {
    provided = header;
  }
  if (!provided) return false;
  if (timestamp === undefined || !Number.isFinite(timestamp)) return false;
  if (Math.abs(nowSec - timestamp) > tolerance) return false;

  const expected = signWebhookPayload(secret, body, timestamp);
  return safeEqualHex(expected, provided);
}
