'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeDataAccess } from '@/lib/db';
import { createApprovalRequest } from '@/lib/approval';
import { canRequestContentApproval } from '@hokko/shared';

// C21 SEO/Content 承認ブリッジ（Phase 3.5・roadmap81 §2）。
// AI 下書き(ContentAsset) → 内部 ApprovalRequest(content_review) → 人間 approve/reject（/approvals）。
// review-only: 公開・CMS 投稿・外部送信・実 LLM・課金・自動実行は一切行わない（社内承認状態のみ）。

// cuid の緩いシェイプ検証（Zod 相当の入力検証）。明らかに不正な id を早期に弾く。
const CUID_RE = /^[a-z0-9]{20,40}$/i;

/**
 * コンテンツ下書きの承認申請。
 * 認証 → marketing:update かつ人間 → 入力検証 → tenant scoped 取得 →
 * `ContentAsset.status`(draft/rejected → pending_approval) の**条件付き updateMany**で
 * 原子的に重複 PENDING を防止（CAS の勝者のみ ApprovalRequest を作成）。
 */
export async function requestContentApprovalAction(formData: FormData) {
  const user = await requireUser();
  // 申請は marketing 権限者（update）かつ人間のみ。AI ロールは wildcard 権限でも actions 側で一律拒否。
  if (!hasPermission(user, 'marketing', 'update') || user.isAi) {
    redirect('/marketing/content?denied=1');
  }

  const contentAssetId = String(formData.get('contentAssetId') ?? '').trim();
  if (!CUID_RE.test(contentAssetId)) {
    redirect('/marketing/content?error=input');
  }

  // tenant スコープで対象取得（別 tenant / 不存在は存在を漏らさず拒否）。メタのみ select（本文は取らない）。
  const asset = await prisma.contentAsset.findFirst({
    where: { id: contentAssetId, tenantId: user.tenantId },
    select: { id: true, title: true, type: true, campaignId: true, generatedByAi: true, label: true, status: true },
  });
  if (!asset) {
    redirect('/marketing/content?error=notfound');
  }

  // 事前判定（UX）: pending_approval / approved は再申請不可。正本の重複防止は下の CAS。
  if (!canRequestContentApproval(asset.status)) {
    redirect('/marketing/content?already=1');
  }

  // 原子的な重複 PENDING 防止: draft/rejected のみを pending_approval へ条件付き更新。
  // 同時実行でも最初の1件だけ count===1（行ロックで直列化）。以降は count===0（既に pending/approved）。
  // → ApprovalRequest を作るのは CAS の勝者のみ。check-then-create の TOCTOU を回避する。
  const claim = await prisma.contentAsset.updateMany({
    where: { id: asset.id, tenantId: user.tenantId, status: { in: ['draft', 'rejected'] } },
    data: { status: 'pending_approval', approvalStatus: 'pending' },
  });
  if (claim.count === 0) {
    // 既に承認申請中 / 承認済み。冪等 no-op（新規 ApprovalRequest を作らない）。
    redirect('/marketing/content?already=1');
  }

  // CAS の勝者のみ ApprovalRequest(content_review) を作成。payload はメタのみ（本文/PII/secret は入れない）。
  const { id: approvalId } = await createApprovalRequest({
    tenantId: user.tenantId,
    action: 'content_review',
    title: `コンテンツ承認申請: ${asset.title}`,
    summary: `${asset.type} の下書きを人間レビューに提出（公開・外部送信は伴いません）`,
    targetType: 'content_asset',
    targetId: asset.id,
    requestedById: user.userId,
    riskLevel: 'LOW',
    payload: { type: asset.type, campaignId: asset.campaignId ?? null, generatedByAi: asset.generatedByAi },
  });

  // 機密ラベル参照の記録（メタのみ・本文/PII/secret は複製しない）。
  await writeDataAccess({
    tenantId: user.tenantId,
    actorId: user.userId,
    entityType: 'ContentAsset',
    entityId: asset.id,
    label: asset.label as any,
    action: 'read',
    purpose: 'content_review_request',
    metadata: { approvalId, fields: ['title', 'type', 'campaignId'] },
  });

  revalidatePath('/marketing/content');
  revalidatePath('/approvals');
  redirect(`/marketing/content?requested=1&highlight=${asset.id}`);
}
