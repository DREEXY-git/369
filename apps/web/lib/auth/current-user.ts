import { redirect } from 'next/navigation';
import { canForRoles, type Action, type RoleKey } from '@hokko/shared';
import { readSession, type SessionPayload } from './session';

export type CurrentUser = SessionPayload;

export async function getCurrentUser(): Promise<CurrentUser | null> {
  return readSession();
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await readSession();
  if (!user) redirect('/login');
  return user;
}

export function hasPermission(user: CurrentUser, resource: string, action: Action): boolean {
  return canForRoles(user.roles, resource, action);
}

/** 権限が無ければダッシュボードへ。重要操作のサーバ側ガード。 */
export async function requirePermission(
  user: CurrentUser,
  resource: string,
  action: Action,
): Promise<void> {
  if (!hasPermission(user, resource, action)) {
    redirect('/dashboard?denied=1');
  }
}

export function primaryRole(roles: RoleKey[]): RoleKey {
  const order: RoleKey[] = [
    'OWNER',
    'EXECUTIVE',
    'ADMIN',
    'DEPARTMENT_MANAGER',
    'STAFF',
    'AI_AGENT',
    'AI_ASSISTANT',
    'EXTERNAL_EXPERT',
    'EXTERNAL_PARTNER',
    'READ_ONLY',
  ];
  for (const r of order) if (roles.includes(r)) return r;
  return roles[0] ?? 'READ_ONLY';
}

export const ROLE_LABEL: Record<RoleKey, string> = {
  OWNER: '社長',
  EXECUTIVE: '役員',
  ADMIN: '管理者',
  DEPARTMENT_MANAGER: '部署長',
  STAFF: '担当者',
  READ_ONLY: '閲覧のみ',
  EXTERNAL_EXPERT: '外部士業',
  EXTERNAL_PARTNER: '外部パートナー',
  AI_AGENT: 'AI社員',
  AI_ASSISTANT: 'AIアシスタント',
};
