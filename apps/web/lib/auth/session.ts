import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import type { RoleKey } from '@hokko/shared';

export const SESSION_COOKIE = '369_session';
const ALG = 'HS256';

export interface SessionPayload {
  userId: string;
  tenantId: string;
  email: string;
  name: string;
  roles: RoleKey[];
  isAi: boolean;
}

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    // 開発時のフォールバック（本番では必ず SESSION_SECRET を設定）
    return new TextEncoder().encode('dev-only-insecure-session-secret-please-change');
  }
  return new TextEncoder().encode(s);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/** Server Action / Route Handler 内でのみ呼ぶ（Cookie 書き込み）。 */
export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}
