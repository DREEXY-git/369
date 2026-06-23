// 機密参照ログの専用ヘルパ群。Phase 1-2。
// すべて DataAccessLog を共通シンクに記録し、位置/録音は専用テーブルにも残す。
import { prisma, writeDataAccess, type DataAccessInput } from './db';
import type { ConfidentialityLabel } from '@hokko/shared';

type Base = Omit<DataAccessInput, 'action'>;

/** 機密データの閲覧（顧客/契約/請求/会計/人事/勤怠/議事録など）。 */
export function writeConfidentialViewLog(input: Base): Promise<void> {
  return writeDataAccess({ ...input, action: 'confidential_view' });
}

/** AI が業務データ（顧客/会計/ナレッジ等）を参照したログ。 */
export function writeAIDataAccess(input: Base): Promise<void> {
  return writeDataAccess({ ...input, action: 'ai_reference', actorType: input.actorType ?? 'ai_agent' });
}

/** エクスポート操作のログ。 */
export function writeExportAccess(input: Base): Promise<void> {
  return writeDataAccess({ ...input, action: 'export' });
}

/** 外部（士業など）共有のログ。 */
export function writeExternalSharingLog(
  input: Base & { recipient?: string },
): Promise<void> {
  return writeDataAccess({
    ...input,
    action: 'external_share',
    metadata: { ...(input.metadata ?? {}), recipient: input.recipient },
  });
}

/** 位置情報の閲覧ログ（専用テーブル＋共通シンク）。 */
export async function writeLocationAccess(input: {
  tenantId: string;
  actorId?: string | null;
  targetUserId?: string | null;
  purpose?: string;
  reason?: string;
  decision?: 'allow' | 'deny';
  withinBusinessHours?: boolean;
  consentStatus?: string;
  ip?: string | null;
}): Promise<void> {
  await prisma.locationAccessLog.create({
    data: {
      tenantId: input.tenantId,
      actorId: input.actorId ?? null,
      targetUserId: input.targetUserId ?? null,
      purpose: input.purpose ?? '',
      reason: input.reason ?? '',
      decision: input.decision ?? 'allow',
      withinBusinessHours: input.withinBusinessHours ?? true,
      consentStatus: input.consentStatus ?? '',
      ip: input.ip ?? null,
    },
  });
  await writeDataAccess({
    tenantId: input.tenantId,
    actorId: input.actorId,
    entityType: 'EmployeeLocation',
    entityId: input.targetUserId ?? null,
    action: 'location_view',
    purpose: input.purpose,
    policyDecision: input.decision,
    label: 'CONFIDENTIAL' as ConfidentialityLabel,
    ip: input.ip,
  });
}

/** 録音/通話データの閲覧ログ（専用テーブル＋共通シンク）。 */
export async function writeRecordingAccess(input: {
  tenantId: string;
  actorId?: string | null;
  recordingId?: string | null;
  meetingId?: string | null;
  purpose?: string;
  reason?: string;
  decision?: 'allow' | 'deny';
  consentStatus?: string;
  external?: boolean;
  ip?: string | null;
}): Promise<void> {
  await prisma.recordingAccessLog.create({
    data: {
      tenantId: input.tenantId,
      actorId: input.actorId ?? null,
      recordingId: input.recordingId ?? null,
      meetingId: input.meetingId ?? null,
      purpose: input.purpose ?? '',
      reason: input.reason ?? '',
      decision: input.decision ?? 'allow',
      consentStatus: input.consentStatus ?? '',
      external: input.external ?? false,
    },
  });
  await writeDataAccess({
    tenantId: input.tenantId,
    actorId: input.actorId,
    entityType: 'Recording',
    entityId: input.recordingId ?? input.meetingId ?? null,
    action: 'recording_view',
    purpose: input.purpose,
    policyDecision: input.decision,
    label: 'CONFIDENTIAL' as ConfidentialityLabel,
    ip: input.ip,
  });
}
