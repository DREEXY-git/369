// C19 広告改善案 承認ブリッジの transaction 正本（roadmap83 案A・人間承認済み 2026-07-12）。
// C21（content-review-bridge）と同型: 申請 = MarketingSuggestion.approvalStatus の CAS
// （none/rejected → pending）→ ApprovalRequest 作成 → 監査 → DataAccessLog を単一 $transaction で
// all-or-nothing。決定 = ApprovalRequest CAS → suggestion 更新 count===1 必須 → 監査。
// **広告の実変更・予算変更・出稿・外部送信・実 LLM・課金は一切行わない**（承認は社内状態のみ）。
// db は注入（実 prisma / テスト mock / 失敗注入 wrapper）。

import { suggestionStatusOnRequest, suggestionStatusOnDecision } from '@hokko/shared';

interface SuggestionTx {
  marketingSuggestion: { updateMany(args: unknown): Promise<{ count: number }> };
  approvalRequest: {
    create(args: unknown): Promise<{ id: string }>;
    updateMany(args: unknown): Promise<{ count: number }>;
  };
  auditLog: { create(args: unknown): Promise<unknown> };
  dataAccessLog: { create(args: unknown): Promise<unknown> };
}

export interface SuggestionBridgeDb {
  $transaction<T>(fn: (tx: SuggestionTx) => Promise<T>): Promise<T>;
}

export interface RequestSuggestionReviewInput {
  tenantId: string;
  requestedById: string;
  /** action 側で tenant スコープ取得済みの対象メタ（title のみ・detail 本文は渡さない）。 */
  suggestion: { id: string; title: string };
  actorIsAi: boolean;
}

export type RequestSuggestionReviewResult =
  | { outcome: 'requested'; approvalId: string }
  | { outcome: 'already' }
  | { outcome: 'forbidden' };

export async function requestSuggestionReviewCore(
  db: SuggestionBridgeDb,
  input: RequestSuggestionReviewInput,
): Promise<RequestSuggestionReviewResult> {
  if (input.actorIsAi) return { outcome: 'forbidden' }; // DB に触れる前に拒否
  const s = input.suggestion;
  return db.$transaction(async (tx) => {
    const claim = await tx.marketingSuggestion.updateMany({
      where: { id: s.id, tenantId: input.tenantId, approvalStatus: { in: ['none', 'rejected'] } },
      data: suggestionStatusOnRequest(),
    });
    if (claim.count === 0) return { outcome: 'already' as const };
    const req = await tx.approvalRequest.create({
      data: {
        tenantId: input.tenantId,
        type: 'ad_suggestion_review',
        requestedForAction: 'ad_suggestion_review',
        title: `広告改善案の承認申請: ${s.title}`,
        summary: '改善案を人間レビューに提出（広告の実変更・予算変更・外部送信は伴いません）',
        entityType: 'marketing_suggestion',
        entityId: s.id,
        requestedById: input.requestedById,
        riskLevel: 'LOW',
        status: 'PENDING',
        payload: { kind: 'ads_improvement' }, // メタのみ（detail 本文は入れない）
      },
    });
    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorId: input.requestedById,
        actorType: 'user',
        action: 'approval_request',
        entityType: 'marketing_suggestion',
        entityId: s.id,
        summary: `承認依頼: 広告改善案の承認申請: ${s.title}`,
        metadata: { approvalAction: 'ad_suggestion_review', riskLevel: 'LOW' },
      },
    });
    await tx.dataAccessLog.create({
      data: {
        tenantId: input.tenantId,
        actorId: input.requestedById,
        actorType: 'user',
        entityType: 'MarketingSuggestion',
        entityId: s.id,
        label: 'INTERNAL',
        action: 'read',
        purpose: 'ad_suggestion_review_request',
        metadata: { approvalId: req.id, fields: ['title'] },
      },
    });
    return { outcome: 'requested' as const, approvalId: req.id };
  });
}

export interface DecideSuggestionReviewInput {
  tenantId: string;
  approvalId: string;
  entityId: string | null;
  decision: 'approve' | 'reject';
  decidedById: string;
  note: string;
  approvalTitle: string;
  actorIsAi: boolean;
}

export type DecideSuggestionReviewResult = { outcome: 'decided' } | { outcome: 'already' } | { outcome: 'forbidden' };

export async function decideSuggestionReviewCore(
  db: SuggestionBridgeDb,
  input: DecideSuggestionReviewInput,
): Promise<DecideSuggestionReviewResult> {
  if (input.actorIsAi) return { outcome: 'forbidden' };
  if (!input.entityId) throw new Error('ad_suggestion_review approval without entityId');
  const status = input.decision === 'approve' ? 'APPROVED' : 'REJECTED';
  return db.$transaction(async (tx) => {
    const decided = await tx.approvalRequest.updateMany({
      where: { id: input.approvalId, tenantId: input.tenantId, status: 'PENDING' },
      data: { status, decidedById: input.decidedById, decidedAt: new Date(), decisionNote: input.note },
    });
    if (decided.count === 0) return { outcome: 'already' as const };
    const updated = await tx.marketingSuggestion.updateMany({
      where: { id: input.entityId, tenantId: input.tenantId, approvalStatus: 'pending' },
      data: suggestionStatusOnDecision(input.decision),
    });
    if (updated.count !== 1) {
      // 対象消失・別 tenant・状態不整合 → 決定ごと rollback（PENDING のまま人間が再判断できる）。
      throw new Error('suggestion-transition-failed');
    }
    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorId: input.decidedById,
        actorType: 'user',
        action: status === 'APPROVED' ? 'approve' : 'reject',
        entityType: 'ApprovalRequest',
        entityId: input.approvalId,
        summary: `${input.approvalTitle} を${status === 'APPROVED' ? '承認' : '却下'}`,
      },
    });
    return { outcome: 'decided' as const };
  });
}
