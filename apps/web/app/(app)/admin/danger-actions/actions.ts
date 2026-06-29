'use server';

import { redirect } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeAudit } from '@/lib/db';
import { requireApprovalForDangerousAction, executeApprovedAction } from '@/lib/approval';
import { recordUsageEvent } from '@/lib/usage-events';

// 危険操作は「直接実行せず必ず ApprovalRequest を作る」標準パターン。
// 実行は承認後に executeApprovedAction 経由でのみ可能（承認の有効性を都度確認）。

export async function requestExportApprovalAction(formData: FormData) {
  const user = await requireUser();
  const scope = String(formData.get('scope') ?? 'customers');
  const gate = await requireApprovalForDangerousAction({
    tenantId: user.tenantId,
    action: 'data_export',
    title: `${scope} データのエクスポート`,
    targetType: 'Export',
    targetId: scope,
    requestedById: user.userId,
    riskLevel: 'HIGH',
    reason: 'データを外部に出力するため',
    payloadAfter: { format: 'csv', scope },
    external: true,
  });
  redirect(`/admin/danger-actions?requested=${gate.approvalId ?? ''}`);
}

export async function requestExternalSendApprovalAction(formData: FormData) {
  const user = await requireUser();
  const to = String(formData.get('to') ?? '');
  const gate = await requireApprovalForDangerousAction({
    tenantId: user.tenantId,
    action: 'customer_email_send',
    title: `顧客への外部送信: ${to || '(宛先未指定)'}`,
    targetType: 'ExternalSend',
    targetId: to || 'unspecified',
    requestedById: user.userId,
    riskLevel: 'HIGH',
    reason: '顧客へ外部メールを送信するため',
    payloadAfter: { to, channel: 'email' },
    external: true,
  });
  redirect(`/admin/danger-actions?requested=${gate.approvalId ?? ''}`);
}

export async function requestDeleteApprovalAction(formData: FormData) {
  const user = await requireUser();
  const target = String(formData.get('target') ?? '');
  const gate = await requireApprovalForDangerousAction({
    tenantId: user.tenantId,
    action: 'data_delete',
    title: `データ削除: ${target}`,
    targetType: 'Delete',
    targetId: target || 'unspecified',
    requestedById: user.userId,
    riskLevel: 'CRITICAL',
    reason: 'データ削除のため',
  });
  redirect(`/admin/danger-actions?requested=${gate.approvalId ?? ''}`);
}

export async function requestPermissionChangeApprovalAction(formData: FormData) {
  const user = await requireUser();
  const target = String(formData.get('target') ?? '');
  const gate = await requireApprovalForDangerousAction({
    tenantId: user.tenantId,
    action: 'permission_change',
    title: `権限変更: ${target}`,
    targetType: 'User',
    targetId: target || 'unspecified',
    requestedById: user.userId,
    approverRoleRequired: 'OWNER',
    riskLevel: 'HIGH',
    reason: '権限変更のため',
  });
  redirect(`/admin/danger-actions?requested=${gate.approvalId ?? ''}`);
}

export async function requestHighConfidentialAIApprovalAction(formData: FormData) {
  const user = await requireUser();
  const dataType = String(formData.get('dataType') ?? 'hr');
  const gate = await requireApprovalForDangerousAction({
    tenantId: user.tenantId,
    action: 'ai_high_confidential_send',
    title: `高機密データのAI送信: ${dataType}`,
    targetType: 'AIRequest',
    targetId: dataType,
    requestedById: user.userId,
    riskLevel: 'HIGH',
    reason: '高機密データを外部LLMへ送信するため',
    actorIsAi: true,
    external: true,
  });
  redirect(`/admin/danger-actions?requested=${gate.approvalId ?? ''}`);
}

/** 承認済みのエクスポートのみ実行（mock）。承認なし/失効では実行不可。 */
export async function executeApprovedExportAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'customer', 'export')) {
    redirect('/admin/danger-actions?error=forbidden');
  }
  const approvalId = String(formData.get('approvalId') ?? '');
  const req = await prisma.approvalRequest.findFirst({
    where: { id: approvalId, tenantId: user.tenantId },
  });
  if (!req) redirect('/admin/danger-actions?error=notfound');

  const r = await executeApprovedAction(approvalId, async () => {
    // mock: 実ファイルは外部に出さず ExportJob レコードのみ作成
    const job = await prisma.exportJob.create({
      data: {
        tenantId: user.tenantId,
        scope: String((req!.payloadAfter as any)?.scope ?? 'customers'),
        format: 'csv',
        status: 'completed',
        fileKey: `exports/mock-${Date.now()}.csv`,
      },
    });
    await writeAudit({
      tenantId: user.tenantId,
      actorId: user.userId,
      action: 'export',
      entityType: 'Export',
      entityId: job.id,
      summary: `承認済みエクスポートを実行（approval=${approvalId}）`,
    });
    // Phase 1-27: 非課金の利用量記録（admin export が1回発生したという事実のみ）。課金ではない・billing=usage_only 固定。
    // metadata は固定の非PII値のみ（req.payloadAfter の実値・顧客情報・CSV本文・件数・金額・secret は入れない）。
    // 記録失敗は承認済み export 本処理を壊さない（recordUsageEvent は例外を投げず ok:false を返すだけ）。
    await recordUsageEvent({
      tenantId: user.tenantId,
      actorId: user.userId,
      actorType: 'user',
      eventType: 'export.generated',
      category: 'export',
      billing: 'usage_only',
      unit: 'count',
      quantity: 1,
      sourceType: 'ExportJob',
      sourceId: job.id,
      idempotencyKey: `usage:export.generated:${job.id}`,
      metadata: { scope: 'admin_danger_actions_export', format: 'csv', source: 'admin_danger_actions' },
    });
    return job.id;
  });

  if (!r.executed) redirect(`/admin/danger-actions?error=${r.reason}`);
  redirect(`/admin/danger-actions?executed=${r.result}`);
}
