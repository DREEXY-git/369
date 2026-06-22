// 共有型。Prisma に依存させず、enum 文字列値だけを複製して純粋に保つ。

export const ROLE_KEYS = [
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
] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export const CONFIDENTIALITY_LABELS = [
  'NORMAL',
  'INTERNAL',
  'CONFIDENTIAL',
  'STRICT_SECRET',
  'HR_CONFIDENTIAL',
  'LEGAL_CONFIDENTIAL',
  'FINANCIAL_CONFIDENTIAL',
  'CUSTOMER_CONFIDENTIAL',
  'DINING_RECORD',
  'EXECUTIVE_ONLY',
] as const;
export type ConfidentialityLabel = (typeof CONFIDENTIALITY_LABELS)[number];

export type Action =
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'approve'
  | 'export'
  | 'ai_read'
  | 'external_send';

export type AlertSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export const LEAD_STAGES = [
  'NEW',
  'ANALYZED',
  'DRAFTED',
  'PENDING_APPROVAL',
  'READY',
  'SENT',
  'OPENED',
  'CLICKED',
  'REPLIED',
  'APPOINTMENT',
  'NEGOTIATING',
  'QUOTED',
  'WON',
  'LOST',
  'UNSUBSCRIBED',
  'EXCLUDED',
] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const DEAL_STAGES = [
  'CONTACT',
  'HEARING',
  'PROPOSAL',
  'QUOTE',
  'NEGOTIATION',
  'INTERNAL_REVIEW',
  'CONTRACT',
  'DELIVERY',
  'INVOICE',
  'FOLLOW_UP',
  'LOST',
] as const;
export type DealStage = (typeof DEAL_STAGES)[number];
