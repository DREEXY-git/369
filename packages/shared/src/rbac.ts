import type { Action, RoleKey } from './types';

/**
 * 権限は "<resource>:<action>" 形式の文字列。
 * - "*"               : 全権限
 * - "<resource>:*"    : そのリソースの全アクション
 * - "*:<action>"      : 全リソースの特定アクション
 */
export const RESOURCES = [
  'dashboard',
  'customer',
  'deal',
  'quote',
  'contract',
  'invoice',
  'finance',
  'hr',
  'inventory',
  'marketing',
  'meeting',
  'communication',
  'horenso',
  'ai',
  'knowledge',
  'backup',
  'expert',
  'subsidy',
  'leadmap',
  'approval',
  'audit',
  'admin',
] as const;
export type Resource = (typeof RESOURCES)[number];

const ALL_ACTIONS: Action[] = [
  'read',
  'create',
  'update',
  'delete',
  'approve',
  'export',
  'ai_read',
  'external_send',
];

function grant(resources: readonly string[], actions: Action[]): string[] {
  return resources.flatMap((r) => actions.map((a) => `${r}:${a}`));
}

const STAFF_RESOURCES = [
  'dashboard',
  'customer',
  'deal',
  'quote',
  'invoice',
  'inventory',
  'marketing',
  'meeting',
  'communication',
  'horenso',
  'knowledge',
  'leadmap',
] as const;

/**
 * ロール → 権限キー集合。
 * 重要な不変条件:
 *  - external_send / approve は人間の管理職以上のみ。AI も含めスタッフ単独では不可。
 *  - READ_ONLY は read / ai_read のみ。
 *  - AI_AGENT / AI_ASSISTANT は外部送信・承認・削除を持たない（必ず人間承認を挟む）。
 */
export const ROLE_PERMISSIONS: Record<RoleKey, string[]> = {
  OWNER: ['*'],
  EXECUTIVE: [
    ...grant(RESOURCES, ['read', 'ai_read', 'export']),
    ...grant(
      ['customer', 'deal', 'quote', 'contract', 'invoice', 'finance', 'leadmap', 'approval'],
      ['create', 'update', 'approve'],
    ),
    'leadmap:external_send',
    'communication:external_send',
  ],
  ADMIN: [
    ...grant(RESOURCES, ['read', 'ai_read']),
    ...grant(['admin', 'audit', 'backup', 'knowledge'], ['create', 'update', 'delete', 'export']),
    'approval:approve',
  ],
  DEPARTMENT_MANAGER: [
    ...grant(STAFF_RESOURCES, ['read', 'create', 'update', 'ai_read']),
    ...grant(['deal', 'quote', 'leadmap', 'approval'], ['approve']),
    'leadmap:external_send',
    'finance:read',
    'hr:read',
  ],
  STAFF: [...grant(STAFF_RESOURCES, ['read', 'create', 'update', 'ai_read'])],
  READ_ONLY: [...grant(RESOURCES, ['read', 'ai_read'])],
  EXTERNAL_EXPERT: ['contract:read', 'finance:read', 'hr:read', 'expert:read', 'expert:update'],
  EXTERNAL_PARTNER: ['deal:read', 'leadmap:read', 'meeting:read'],
  // AI は主体だが、外部送信・承認・削除は持たない。下書き(create)と参照(ai_read)まで。
  AI_AGENT: [
    ...grant(
      ['customer', 'deal', 'quote', 'meeting', 'knowledge', 'leadmap', 'marketing', 'horenso'],
      ['read', 'create', 'ai_read'],
    ),
    'finance:ai_read',
    'inventory:ai_read',
  ],
  AI_ASSISTANT: [
    ...grant(['customer', 'deal', 'meeting', 'knowledge', 'leadmap', 'horenso'], ['read', 'ai_read']),
    'customer:create',
    'meeting:create',
  ],
};

export function permissionsForRoles(roleKeys: RoleKey[]): Set<string> {
  const set = new Set<string>();
  for (const key of roleKeys) {
    for (const perm of ROLE_PERMISSIONS[key] ?? []) set.add(perm);
  }
  return set;
}

export function can(
  permissions: Iterable<string>,
  resource: Resource | string,
  action: Action,
): boolean {
  const set = permissions instanceof Set ? permissions : new Set(permissions);
  return (
    set.has('*') ||
    set.has(`${resource}:*`) ||
    set.has(`*:${action}`) ||
    set.has(`${resource}:${action}`)
  );
}

export function canForRoles(
  roleKeys: RoleKey[],
  resource: Resource | string,
  action: Action,
): boolean {
  return can(permissionsForRoles(roleKeys), resource, action);
}

/** AI 主体は外部送信・承認を構造的に禁止（多重防御）。 */
export function isAiRole(roleKey: RoleKey): boolean {
  return roleKey === 'AI_AGENT' || roleKey === 'AI_ASSISTANT';
}

export const ALL_ACTIONS_LIST = ALL_ACTIONS;
