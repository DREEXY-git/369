// ABAC 統合層。純エンジン(evaluatePolicy)＋ DB（同意照会・PolicyDecisionLog・DataAccessLog）。
// server action / page から呼び、許可されない場合は PolicyDenied を投げる。
import { prisma } from '../db';
import {
  writeConfidentialViewLog,
  writeAIDataAccess,
  writeExportAccess,
  writeExternalSharingLog,
  writeLocationAccess,
  writeRecordingAccess,
} from '../audit';
import {
  evaluatePolicy,
  evaluateConsent,
  type PolicyAction,
  type PolicyResource,
  type PolicyDecision,
  type ConsentStatus,
  type ConsentPurpose,
  type ConfidentialityLabel,
} from '@hokko/shared';
import type { CurrentUser } from '../auth/current-user';

export class PolicyDenied extends Error {
  decision: PolicyDecision;
  constructor(decision: PolicyDecision) {
    super(`access denied: ${decision.reason}`);
    this.name = 'PolicyDenied';
    this.decision = decision;
  }
}

function subjectOf(user: CurrentUser) {
  return {
    roles: user.roles,
    actorType: (user.isAi ? 'ai_agent' : 'user') as 'ai_agent' | 'user',
    userId: user.userId,
  };
}

export interface AccessOptions {
  resource: PolicyResource;
  action: PolicyAction;
  purpose?: string;
  consentStatus?: ConsentStatus;
  approvalStatus?: 'approved' | 'pending' | 'rejected' | 'none';
  sensitiveAccessReasonProvided?: boolean;
  targetId?: string | null;
  now?: Date;
}

/** 中核: ABAC 判定＋PolicyDecisionLog 記録。deny なら PolicyDenied を投げる。 */
export async function assertPolicyAccess(
  user: CurrentUser,
  opts: AccessOptions,
): Promise<PolicyDecision> {
  const decision = evaluatePolicy(subjectOf(user), opts.resource, opts.action, {
    purpose: opts.purpose,
    consentStatus: opts.consentStatus,
    approvalStatus: opts.approvalStatus,
    sensitiveAccessReasonProvided: opts.sensitiveAccessReasonProvided,
    now: opts.now,
  });

  await prisma.policyDecisionLog.create({
    data: {
      tenantId: user.tenantId,
      actorId: user.userId,
      actorType: user.isAi ? 'ai_agent' : 'user',
      resource: opts.resource.dataType,
      action: opts.action,
      label: (opts.resource.label ?? 'NORMAL') as any,
      decision: decision.allow ? 'allow' : 'deny',
      reason: decision.reason,
      policyId: decision.policyId,
      matchedRules: decision.matchedRules,
      purpose: opts.purpose ?? '',
      requiredApproval: decision.requiredApproval,
      requiredConsent: decision.requiredConsent,
      requiredReason: decision.requiredSensitiveAccessReason,
      targetId: opts.targetId ?? null,
    },
  });

  if (!decision.allow) throw new PolicyDenied(decision);
  return decision;
}

/** 投げない判定（画面のガード表示用）。 */
export async function evaluateAccess(
  user: CurrentUser,
  opts: AccessOptions,
): Promise<PolicyDecision> {
  try {
    return await assertPolicyAccess(user, opts);
  } catch (e) {
    if (e instanceof PolicyDenied) return e.decision;
    throw e;
  }
}

// ---- 同意の現在状態を取得 ----
export async function getConsentStatus(
  tenantId: string,
  purpose: ConsentPurpose,
  subject: { userId?: string | null; customerId?: string | null },
  now: Date = new Date(),
): Promise<ConsentStatus> {
  // 対象が特定できない場合は同意を確認できない → missing（厳格側）。
  if (!subject.userId && !subject.customerId) return 'missing';
  const grants = await prisma.consentGrant.findMany({
    where: {
      tenantId,
      purpose,
      ...(subject.userId ? { subjectUserId: subject.userId } : {}),
      ...(subject.customerId ? { customerId: subject.customerId } : {}),
    },
    select: { purpose: true, status: true, grantedAt: true, withdrawnAt: true, expiresAt: true },
  });
  const { status } = evaluateConsent(
    grants.map((g) => ({
      purpose: g.purpose as ConsentPurpose,
      status: g.status as 'granted' | 'withdrawn',
      grantedAt: g.grantedAt,
      withdrawnAt: g.withdrawnAt,
      expiresAt: g.expiresAt,
    })),
    purpose,
    now,
  );
  return status as ConsentStatus;
}

// ============ 用途別 assert（DataAccessLog も記録） ============

export async function assertCanViewConfidential(
  user: CurrentUser,
  res: { dataType: string; label: ConfidentialityLabel; entityType: string; entityId?: string | null; ownerId?: string | null; purpose?: string; reasonProvided?: boolean },
): Promise<void> {
  await assertPolicyAccess(user, {
    resource: { dataType: res.dataType, label: res.label, ownerId: res.ownerId },
    action: 'view_confidential',
    purpose: res.purpose,
    sensitiveAccessReasonProvided: res.reasonProvided,
    targetId: res.entityId,
  });
  await writeConfidentialViewLog({
    tenantId: user.tenantId,
    actorId: user.userId,
    entityType: res.entityType,
    entityId: res.entityId ?? null,
    label: res.label,
    purpose: res.purpose,
    policyDecision: 'allow',
  });
}

export async function assertCanAIReferenceData(
  user: CurrentUser,
  res: { dataType: string; label: ConfidentialityLabel; entityType: string; entityId?: string | null; purpose?: string; aiAgentId?: string | null; llmCallLogId?: string | null },
): Promise<void> {
  await assertPolicyAccess(user, {
    resource: { dataType: res.dataType, label: res.label },
    action: 'ai_read',
    purpose: res.purpose,
    targetId: res.entityId,
  });
  await writeAIDataAccess({
    tenantId: user.tenantId,
    actorId: user.userId,
    entityType: res.entityType,
    entityId: res.entityId ?? null,
    label: res.label,
    purpose: res.purpose,
    aiAgentId: res.aiAgentId,
    llmCallLogId: res.llmCallLogId,
    policyDecision: 'allow',
  });
}

export async function assertCanAccessKnowledge(
  user: CurrentUser,
  res: { label: ConfidentialityLabel; entityId?: string | null; purpose?: string; viaAI?: boolean },
): Promise<void> {
  await assertPolicyAccess(user, {
    resource: { dataType: 'knowledge', label: res.label },
    action: res.viaAI ? 'ai_read' : 'read',
    purpose: res.purpose,
    targetId: res.entityId,
  });
}

export async function assertCanExport(
  user: CurrentUser,
  res: { dataType: string; label?: ConfidentialityLabel; entityType: string; approvalStatus: 'approved' | 'pending' | 'none'; purpose?: string },
): Promise<void> {
  await assertPolicyAccess(user, {
    resource: { dataType: res.dataType, label: res.label ?? 'INTERNAL' },
    action: 'export',
    approvalStatus: res.approvalStatus,
    purpose: res.purpose,
  });
  await writeExportAccess({
    tenantId: user.tenantId,
    actorId: user.userId,
    entityType: res.entityType,
    label: res.label,
    purpose: res.purpose,
    policyDecision: 'allow',
  });
}

export async function assertCanSendExternal(
  user: CurrentUser,
  res: { dataType: string; label?: ConfidentialityLabel; approvalStatus: 'approved' | 'pending' | 'none' },
): Promise<void> {
  await assertPolicyAccess(user, {
    resource: { dataType: res.dataType, label: res.label ?? 'INTERNAL' },
    action: 'external_send',
    approvalStatus: res.approvalStatus,
  });
}

export async function assertCanShareWithExpert(
  user: CurrentUser,
  res: { dataType: string; label: ConfidentialityLabel; entityType: string; entityId?: string | null; approvalStatus: 'approved' | 'pending' | 'none'; recipient?: string },
): Promise<void> {
  await assertPolicyAccess(user, {
    resource: { dataType: res.dataType, label: res.label },
    action: 'external_share',
    approvalStatus: res.approvalStatus,
    targetId: res.entityId,
  });
  await writeExternalSharingLog({
    tenantId: user.tenantId,
    actorId: user.userId,
    entityType: res.entityType,
    entityId: res.entityId ?? null,
    label: res.label,
    recipient: res.recipient,
    policyDecision: 'allow',
  });
}

export async function assertCanViewLocation(
  user: CurrentUser,
  res: { targetUserId: string; purpose?: string; reasonProvided?: boolean; now?: Date },
): Promise<void> {
  const now = res.now ?? new Date();
  const consentStatus = await getConsentStatus(user.tenantId, 'location_tracking', { userId: res.targetUserId }, now);
  try {
    await assertPolicyAccess(user, {
      resource: { dataType: 'location', label: 'CONFIDENTIAL' },
      action: 'view_location',
      purpose: res.purpose,
      consentStatus,
      sensitiveAccessReasonProvided: res.reasonProvided,
      targetId: res.targetUserId,
      now,
    });
  } catch (e) {
    await writeLocationAccess({
      tenantId: user.tenantId,
      actorId: user.userId,
      targetUserId: res.targetUserId,
      purpose: res.purpose,
      decision: 'deny',
      consentStatus,
    });
    throw e;
  }
  await writeLocationAccess({
    tenantId: user.tenantId,
    actorId: user.userId,
    targetUserId: res.targetUserId,
    purpose: res.purpose,
    decision: 'allow',
    consentStatus,
  });
}

export async function assertCanViewRecording(
  user: CurrentUser,
  res: { recordingId?: string; meetingId?: string; subjectUserId?: string; customerId?: string; purpose?: string; external?: boolean },
): Promise<void> {
  const consentStatus = await getConsentStatus(
    user.tenantId,
    'recording',
    { userId: res.subjectUserId, customerId: res.customerId },
  );
  try {
    await assertPolicyAccess(user, {
      resource: { dataType: 'recording', label: 'CONFIDENTIAL' },
      action: 'view_recording',
      purpose: res.purpose,
      consentStatus,
      targetId: res.recordingId ?? res.meetingId,
    });
  } catch (e) {
    await writeRecordingAccess({
      tenantId: user.tenantId,
      actorId: user.userId,
      recordingId: res.recordingId,
      meetingId: res.meetingId,
      purpose: res.purpose,
      decision: 'deny',
      consentStatus,
      external: res.external,
    });
    throw e;
  }
  await writeRecordingAccess({
    tenantId: user.tenantId,
    actorId: user.userId,
    recordingId: res.recordingId,
    meetingId: res.meetingId,
    purpose: res.purpose,
    decision: 'allow',
    consentStatus,
    external: res.external,
  });
}
