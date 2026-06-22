import type { ConfidentialityLabel, RoleKey } from './types.js';

// 機密ラベルごとの閲覧許可ロール。OWNER は常に許可。
const LABEL_ALLOWED_ROLES: Record<ConfidentialityLabel, RoleKey[]> = {
  NORMAL: [
    'OWNER',
    'EXECUTIVE',
    'ADMIN',
    'DEPARTMENT_MANAGER',
    'STAFF',
    'READ_ONLY',
    'EXTERNAL_EXPERT',
    'EXTERNAL_PARTNER',
    'AI_AGENT',
    'AI_ASSISTANT',
  ],
  INTERNAL: [
    'OWNER',
    'EXECUTIVE',
    'ADMIN',
    'DEPARTMENT_MANAGER',
    'STAFF',
    'READ_ONLY',
    'AI_AGENT',
    'AI_ASSISTANT',
  ],
  CONFIDENTIAL: ['OWNER', 'EXECUTIVE', 'ADMIN', 'DEPARTMENT_MANAGER', 'AI_AGENT'],
  CUSTOMER_CONFIDENTIAL: [
    'OWNER',
    'EXECUTIVE',
    'ADMIN',
    'DEPARTMENT_MANAGER',
    'STAFF',
    'AI_AGENT',
    'AI_ASSISTANT',
  ],
  STRICT_SECRET: ['OWNER', 'EXECUTIVE'],
  HR_CONFIDENTIAL: ['OWNER', 'EXECUTIVE', 'ADMIN'],
  LEGAL_CONFIDENTIAL: ['OWNER', 'EXECUTIVE', 'ADMIN', 'EXTERNAL_EXPERT'],
  FINANCIAL_CONFIDENTIAL: ['OWNER', 'EXECUTIVE', 'ADMIN', 'EXTERNAL_EXPERT'],
  DINING_RECORD: ['OWNER', 'EXECUTIVE'],
  EXECUTIVE_ONLY: ['OWNER', 'EXECUTIVE'],
};

export function canAccessLabel(roleKeys: RoleKey[], label: ConfidentialityLabel): boolean {
  if (roleKeys.includes('OWNER')) return true;
  const allowed = LABEL_ALLOWED_ROLES[label] ?? [];
  return roleKeys.some((r) => allowed.includes(r));
}

export const LABEL_BADGE: Record<ConfidentialityLabel, { text: string; tone: string }> = {
  NORMAL: { text: '通常', tone: 'slate' },
  INTERNAL: { text: '社内', tone: 'slate' },
  CONFIDENTIAL: { text: '機密', tone: 'amber' },
  STRICT_SECRET: { text: '極秘', tone: 'red' },
  HR_CONFIDENTIAL: { text: '人事機密', tone: 'purple' },
  LEGAL_CONFIDENTIAL: { text: '法務機密', tone: 'purple' },
  FINANCIAL_CONFIDENTIAL: { text: '財務機密', tone: 'purple' },
  CUSTOMER_CONFIDENTIAL: { text: '顧客機密', tone: 'blue' },
  DINING_RECORD: { text: '会食記録', tone: 'amber' },
  EXECUTIVE_ONLY: { text: '役員限定', tone: 'red' },
};
