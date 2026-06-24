// 外部送信前の安全処理。PII マスク済プレビューを作り AISafetyLog(pii_mask) に記録する。Phase 1-5。
// 重要: 本ヘルパは「送信」しない。実際の送信は承認ゲート（/approvals → executeApprovedAction）経由のみ。
//       AI は外部送信ツールを直接実行できない（assertAiToolAllowed で多重防御）。
import { prisma } from './db';
import { writeExternalSharingLog } from './audit';
import { maskPii, containsPii, type ConfidentialityLabel } from '@hokko/shared';

export interface PrepareExternalArgs {
  tenantId: string;
  actorId?: string | null;
  channel: string; // email | line | sms ...
  subject?: string;
  body: string;
  recipient?: string;
  entityType?: string;
  entityId?: string | null;
  purpose?: string;
  logSharing?: boolean;
}

export interface ExternalPayload {
  channel: string;
  subject?: string;
  maskedBody: string; // PII マスク済（承認プレビュー/外部LLM用）
  hadPii: boolean;
  safetyFlags: string[];
}

/**
 * 外部送信用ペイロードを準備。本文を maskPii でマスクし、PII 検出を AISafetyLog(pii_mask) に記録する。
 * AI は外部送信を直接実行できないため、本ヘルパは「承認申請用のマスク済プレビュー」を返すのみ。
 */
export async function prepareExternalPayload(args: PrepareExternalArgs): Promise<ExternalPayload> {
  const combined = `${args.subject ?? ''}\n${args.body}`;
  const hadPii = containsPii(combined);
  const maskedBody = maskPii(args.body);
  const safetyFlags = hadPii ? ['pii'] : [];
  await prisma.aISafetyLog.create({
    data: {
      tenantId: args.tenantId,
      actorId: args.actorId ?? null,
      actorType: 'user',
      purpose: args.purpose ?? `external_send:${args.channel}`,
      check: 'pii_mask',
      flagged: hadPii,
      severity: hadPii ? 'low' : 'none',
      patterns: hadPii ? ['pii-masked'] : [],
      detail: args.channel,
      entityType: args.entityType ?? null,
      entityId: args.entityId ?? null,
    },
  });
  if (args.logSharing && args.recipient) {
    await writeExternalSharingLog({
      tenantId: args.tenantId,
      actorId: args.actorId ?? null,
      entityType: args.entityType ?? 'OutreachDraft',
      entityId: args.entityId ?? null,
      label: 'INTERNAL' as ConfidentialityLabel,
      purpose: args.purpose ?? 'external_send_prepare',
      recipient: args.recipient,
    });
  }
  return { channel: args.channel, subject: args.subject, maskedBody, hadPii, safetyFlags };
}
