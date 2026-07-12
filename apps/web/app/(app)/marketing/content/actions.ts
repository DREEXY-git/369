'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { requestContentReviewCore, type BridgeDb } from '@/lib/content-review-bridge';
import { canRequestContentApproval } from '@hokko/shared';

// C21 SEO/Content 承認ブリッジ（Phase 3.5・roadmap81 §2）。
// AI 下書き(ContentAsset) → 内部 ApprovalRequest(content_review) → 人間 approve/reject（/approvals）。
// review-only: 公開・CMS 投稿・外部送信・実 LLM・課金・自動実行は一切行わない（社内承認状態のみ）。
// v6.9（Codex r3565885988）: CAS・ApprovalRequest 作成・監査・DataAccessLog を単一 transaction に一体化
// （後段失敗で孤児 `pending_approval` を残さない）。DB 遷移の正本は lib/content-review-bridge.ts。

// cuid の緩いシェイプ検証（Zod 相当の入力検証）。明らかに不正な id を早期に弾く。
const CUID_RE = /^[a-z0-9]{20,40}$/i;

/**
 * コンテンツ下書きの承認申請。
 * 認証 → marketing:update かつ人間 → 入力検証 → tenant scoped 取得 →
 * transaction（CAS → ApprovalRequest → 監査 → DataAccessLog）。失敗時は全体 rollback（再申請可能）。
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

  // 事前判定（UX）: pending_approval / approved は再申請不可。正本の重複防止は core の CAS。
  if (!canRequestContentApproval(asset.status)) {
    redirect('/marketing/content?already=1');
  }

  // 単一 transaction: CAS の勝者だけが ApprovalRequest＋監査＋DataAccessLog を作成。
  // 後段が失敗すれば全体 rollback ＝ asset は draft/rejected に戻り、孤児 pending_approval を残さない。
  let result;
  try {
    result = await requestContentReviewCore(prisma as unknown as BridgeDb, {
      tenantId: user.tenantId,
      requestedById: user.userId,
      actorIsAi: user.isAi,
      asset: {
        id: asset.id,
        title: asset.title,
        type: asset.type,
        campaignId: asset.campaignId ?? null,
        generatedByAi: asset.generatedByAi,
        label: String(asset.label),
      },
    });
  } catch {
    redirect('/marketing/content?error=request_failed');
  }
  if (result.outcome === 'forbidden') redirect('/marketing/content?denied=1');
  if (result.outcome === 'already') redirect('/marketing/content?already=1');

  revalidatePath('/marketing/content');
  revalidatePath('/approvals');
  redirect(`/marketing/content?requested=1&highlight=${asset.id}`);
}
