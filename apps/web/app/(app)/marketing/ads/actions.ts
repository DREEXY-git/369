'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { requestSuggestionReviewCore, type SuggestionBridgeDb } from '@/lib/suggestion-review-bridge';
import { canRequestSuggestionApproval } from '@hokko/shared';

// C19 広告改善案 承認ブリッジ（roadmap83 案A・人間承認済み 2026-07-12）。
// review-only: 承認しても広告の実変更・予算変更・出稿・外部送信・実 LLM・課金は一切発生しない。
// DB 遷移の正本は lib/suggestion-review-bridge.ts（単一 transaction・CAS 重複防止）。

const CUID_RE = /^[a-z0-9]{20,40}$/i;

/** 改善案の承認申請（marketing:update かつ人間のみ・AI は境界で一律拒否）。 */
export async function requestAdSuggestionApprovalAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'marketing', 'update') || user.isAi) {
    redirect('/marketing/ads?denied=1');
  }

  const suggestionId = String(formData.get('suggestionId') ?? '').trim();
  if (!CUID_RE.test(suggestionId)) redirect('/marketing/ads?error=input');

  // tenant スコープで対象取得（別 tenant / 不存在は存在を漏らさず拒否）。メタのみ select。
  const suggestion = await prisma.marketingSuggestion.findFirst({
    where: { id: suggestionId, tenantId: user.tenantId },
    select: { id: true, title: true, approvalStatus: true },
  });
  if (!suggestion) redirect('/marketing/ads?error=notfound');

  // 事前判定（UX）。正本の重複防止は core の CAS。
  if (!canRequestSuggestionApproval(suggestion.approvalStatus)) {
    redirect('/marketing/ads?already=1');
  }

  let result;
  try {
    result = await requestSuggestionReviewCore(prisma as unknown as SuggestionBridgeDb, {
      tenantId: user.tenantId,
      requestedById: user.userId,
      actorIsAi: user.isAi,
      suggestion: { id: suggestion.id, title: suggestion.title },
    });
  } catch {
    redirect('/marketing/ads?error=request_failed');
  }
  if (result.outcome === 'forbidden') redirect('/marketing/ads?denied=1');
  if (result.outcome === 'already') redirect('/marketing/ads?already=1');

  revalidatePath('/marketing/ads');
  revalidatePath('/approvals');
  redirect(`/marketing/ads?requested=1&highlight=${suggestion.id}`);
}
