// ABAC / Policy Engine（純ロジック・DB非依存・決定的）。
// RBAC(ロール×アクション) の上に、属性ベースのアクセス制御を重ねる。
// 判定要素: tenant / role / department / ownership / confidentialityLabel /
//          dataType / purpose / consentStatus / businessHours / approvalStatus /
//          actorType / AI権限 / external共有 / retention状態。
//
// 本モジュールは「決定（allow/deny と要求事項）」のみを返す純関数。
// DBへの記録(PolicyDecisionLog/DataAccessLog) と例外送出は web 層の assert* が行う。

import type { RoleKey, ConfidentialityLabel } from './types';
import { canAccessLabel } from './labels';
import type { RetentionState } from './retention';

export type PolicyAction =
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'export'
  | 'approve'
  | 'ai_read'
  | 'external_send'
  | 'external_share'
  | 'view_confidential'
  | 'view_location'
  | 'view_recording';

export type ActorType = 'user' | 'ai_agent' | 'ai_assistant' | 'system';

export type ConsentStatus = 'granted' | 'withdrawn' | 'missing' | 'expired' | 'not_required';
export type ApprovalState = 'approved' | 'pending' | 'rejected' | 'none';

export interface PolicySubject {
  roles: RoleKey[];
  actorType: ActorType;
  userId?: string | null;
  departmentId?: string | null;
}

export interface PolicyResource {
  dataType: string; // customer | contract | invoice | accounting | hr | attendance | location | recording | knowledge ...
  label: ConfidentialityLabel;
  ownerId?: string | null;
  departmentId?: string | null;
  retentionState?: RetentionState;
}

export interface PolicyContext {
  purpose?: string;
  consentStatus?: ConsentStatus;
  approvalStatus?: ApprovalState;
  sensitiveAccessReasonProvided?: boolean;
  now?: Date;
  /** 営業時間外を拒否する操作（既定: view_location）。 */
  enforceBusinessHours?: boolean;
}

export interface PolicyDecision {
  allow: boolean;
  reason: string;
  policyId: string;
  matchedRules: string[];
  requiredApproval: boolean;
  requiredConsent: boolean;
  requiredSensitiveAccessReason: boolean;
}

const POLICY_ID = 'abac-v1';

const MANAGER_ROLES: RoleKey[] = ['OWNER', 'EXECUTIVE', 'ADMIN', 'DEPARTMENT_MANAGER'];
const AI_ROLES: RoleKey[] = ['AI_AGENT', 'AI_ASSISTANT'];

// AIアクターが構造的に実行できない操作（多重防御。CLAUDE.md の AI 制約）。
const AI_FORBIDDEN_ACTIONS: PolicyAction[] = [
  'external_send',
  'external_share',
  'delete',
  'approve',
  'export',
];

// 承認ゲートが必須の操作。
const APPROVAL_REQUIRED_ACTIONS: PolicyAction[] = ['external_send', 'external_share', 'export', 'delete'];

// 同意が必須のデータ種別/操作。
const CONSENT_REQUIRED_ACTIONS: PolicyAction[] = ['view_location', 'view_recording'];

const READ_LIKE: PolicyAction[] = [
  'read',
  'ai_read',
  'export',
  'view_confidential',
  'view_location',
  'view_recording',
  'external_share',
];

function isBusinessHours(now: Date): boolean {
  const h = now.getHours();
  const day = now.getDay(); // 0=日,6=土
  return day >= 1 && day <= 5 && h >= 8 && h < 20;
}

function isManager(roles: RoleKey[]): boolean {
  return roles.some((r) => MANAGER_ROLES.includes(r));
}

function isAiActor(subject: PolicySubject): boolean {
  return (
    subject.actorType === 'ai_agent' ||
    subject.actorType === 'ai_assistant' ||
    subject.roles.some((r) => AI_ROLES.includes(r))
  );
}

/**
 * ABAC 判定の中核。決定的な純関数。
 */
export function evaluatePolicy(
  subject: PolicySubject,
  resource: PolicyResource,
  action: PolicyAction,
  context: PolicyContext = {},
): PolicyDecision {
  const matched: string[] = [];
  const now = context.now ?? new Date();
  const requiredApproval = APPROVAL_REQUIRED_ACTIONS.includes(action);
  const requiredConsent = CONSENT_REQUIRED_ACTIONS.includes(action);

  const deny = (reason: string, extra: Partial<PolicyDecision> = {}): PolicyDecision => ({
    allow: false,
    reason,
    policyId: POLICY_ID,
    matchedRules: matched,
    requiredApproval,
    requiredConsent,
    requiredSensitiveAccessReason: false,
    ...extra,
  });

  // 1) retention: 失効データは閲覧系を拒否
  if (READ_LIKE.includes(action) && resource.retentionState === 'expired') {
    matched.push('retention-expired');
    return deny('retention-expired');
  }

  // 2) AIアクターの禁止操作
  const ai = isAiActor(subject);
  if (ai && AI_FORBIDDEN_ACTIONS.includes(action)) {
    matched.push('ai-forbidden-action');
    return deny('ai-forbidden-action');
  }

  // 3) 機密ラベル（閲覧/AI参照/エクスポート/外部共有/位置/録音）
  if (READ_LIKE.includes(action) || action === 'ai_read') {
    if (!canAccessLabel(subject.roles, resource.label)) {
      matched.push('label-denied');
      return deny('label-denied');
    }
    matched.push('label-ok');
  }

  // 4) 同意必須（位置/録音）
  if (requiredConsent) {
    if (context.consentStatus !== 'granted') {
      matched.push('consent-required');
      return deny('consent-required', { requiredSensitiveAccessReason: true });
    }
    matched.push('consent-ok');
  }

  // 5) 営業時間（位置情報、または明示指定時）
  if ((action === 'view_location' || context.enforceBusinessHours) && !isBusinessHours(now)) {
    matched.push('outside-business-hours');
    return deny('outside-business-hours', { requiredSensitiveAccessReason: true });
  }

  // 6) 承認ゲート（外部送信/共有/エクスポート/削除）
  if (requiredApproval && context.approvalStatus !== 'approved') {
    matched.push('approval-required');
    return deny('approval-required');
  }
  if (requiredApproval) matched.push('approval-ok');

  // 7) ownership / 機密の理由要求（非マネージャが他人の高機密を閲覧）
  let requiredReason = false;
  const isOwner = !!subject.userId && resource.ownerId === subject.userId;
  const highLabel =
    resource.label === 'CONFIDENTIAL' ||
    resource.label === 'STRICT_SECRET' ||
    resource.label === 'HR_CONFIDENTIAL' ||
    resource.label === 'FINANCIAL_CONFIDENTIAL' ||
    resource.label === 'LEGAL_CONFIDENTIAL' ||
    resource.label === 'EXECUTIVE_ONLY';
  if (
    (action === 'view_location' || action === 'view_recording' || action === 'view_confidential') &&
    !isManager(subject.roles) &&
    !isOwner
  ) {
    requiredReason = true;
    matched.push('reason-required');
    if (highLabel && !context.sensitiveAccessReasonProvided) {
      return deny('sensitive-reason-required', { requiredSensitiveAccessReason: true });
    }
  }

  // 8) 許可
  matched.push('allow');
  return {
    allow: true,
    reason: 'allow',
    policyId: POLICY_ID,
    matchedRules: matched,
    requiredApproval,
    requiredConsent,
    requiredSensitiveAccessReason: requiredReason,
  };
}
