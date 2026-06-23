import { prisma } from '@hokko/db';
import type { ConfidentialityLabel } from '@hokko/shared';

export { prisma };

export interface AuditInput {
  tenantId: string;
  actorId?: string | null;
  actorType?: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary?: string;
  metadata?: Record<string, unknown>;
}

/** 監査ログ。重要操作のたびに必ず記録する。 */
export async function writeAudit(input: AuditInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      tenantId: input.tenantId,
      actorId: input.actorId ?? null,
      actorType: input.actorType ?? 'user',
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      summary: input.summary ?? '',
      metadata: (input.metadata ?? undefined) as any,
    },
  });
}

export type DataAccessAction =
  | 'read'
  | 'ai_reference'
  | 'location_view'
  | 'recording_view'
  | 'export'
  | 'external_share'
  | 'confidential_view';

export interface DataAccessInput {
  tenantId: string;
  actorId?: string | null;
  actorType?: string;
  entityType: string;
  entityId?: string | null;
  label?: ConfidentialityLabel;
  action?: DataAccessAction;
  purpose?: string;
  policyDecision?: 'allow' | 'deny';
  consentGrantId?: string | null;
  sensitiveReasonId?: string | null;
  aiAgentId?: string | null;
  llmCallLogId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

/** 機密データ参照ログ（AI 参照・位置・録音・エクスポート・外部共有も含む）。 */
export async function writeDataAccess(input: DataAccessInput): Promise<void> {
  await prisma.dataAccessLog.create({
    data: {
      tenantId: input.tenantId,
      actorId: input.actorId ?? null,
      actorType: input.actorType ?? 'user',
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      label: (input.label ?? 'NORMAL') as any,
      action: input.action ?? 'read',
      purpose: input.purpose ?? '',
      policyDecision: input.policyDecision ?? null,
      consentGrantId: input.consentGrantId ?? null,
      sensitiveReasonId: input.sensitiveReasonId ?? null,
      aiAgentId: input.aiAgentId ?? null,
      llmCallLogId: input.llmCallLogId ?? null,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      metadata: (input.metadata ?? undefined) as any,
    },
  });
}
