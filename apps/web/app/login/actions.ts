'use server';

import { redirect } from 'next/navigation';
import type { RoleKey } from '@hokko/shared';
import { prisma, writeAudit } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { signSession, setSessionCookie, clearSessionCookie } from '@/lib/auth/session';

export interface LoginState {
  error?: string;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) return { error: 'メールアドレスとパスワードを入力してください。' };

  // 認証処理（DB参照/書込）。インフラ失敗（DB未接続/未マイグレーション等）は
  // 生の500ではなく理由の分かるメッセージにして返す。redirect は try の外で行う。
  try {
    const user = await prisma.user.findFirst({
      where: { email, isActive: true },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return { error: 'メールアドレスまたはパスワードが正しくありません。' };
    }

    const roles = user.userRoles.map((ur) => ur.role.key as RoleKey);
    const token = await signSession({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      roles,
      isAi: user.isAiAgent,
    });
    await setSessionCookie(token);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await writeAudit({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'login',
      entityType: 'User',
      entityId: user.id,
      summary: `${user.name} がログインしました`,
    });
  } catch (e) {
    console.error('[loginAction] 認証処理に失敗:', e);
    return {
      error:
        'システムに接続できませんでした。データベース接続（環境変数 DATABASE_URL / DIRECT_URL）と初期化（マイグレーション/シード）をご確認ください。',
    };
  }

  redirect('/dashboard');
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect('/login');
}
