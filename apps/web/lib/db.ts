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

/** 機密データ参照ログ（AI 参照も含む）。 */
export async function writeDataAccess(input: {
  tenantId: string;
  actorId?: string | null;
  actorType?: string;
  entityType: string;
  entityId?: string | null;
  label?: ConfidentialityLabel;
  purpose?: string;
}): Promise<void> {
  await prisma.dataAccessLog.create({
    data: {
      tenantId: input.tenantId,
      actorId: input.actorId ?? null,
      actorType: input.actorType ?? 'user',
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      label: (input.label ?? 'NORMAL') as any,
      purpose: input.purpose ?? '',
    },
  });
}
