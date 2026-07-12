// C21 コンテンツ承認ブリッジの transaction 正本（v6.9・Codex review 4679634147 対応）。
// Server Action から呼ばれる「申請」「決定」の DB 遷移を **単一 $transaction** に一体化し、
// - 申請: ContentAsset CAS → ApprovalRequest 作成 → 監査 → DataAccessLog を all-or-nothing に
//   （後段失敗で ApprovalRequest なしの孤児 `pending_approval` を残さない・thread r3565885988）。
// - 決定: ApprovalRequest CAS → ContentAsset 更新 `count===1` 必須 → 監査 を all-or-nothing に
//   （承認だけ確定して対象が pending のまま残る不整合を禁止・thread r3565885992）。
// 外部送信・メール等の副作用は本モジュールに存在しない（DB 状態遷移＋監査のみ・review-only）。
// db は注入（実 prisma / テスト mock）。失敗注入・並行 CAS の否定テストは tests/content_review_bridge.test.ts。

import { contentStatusOnRequest, contentStatusOnDecision } from '@hokko/shared';

interface BridgeTx {
  contentAsset: { updateMany(args: unknown): Promise<{ count: number }> };
  approvalRequest: {
    create(args: unknown): Promise<{ id: string }>;
    updateMany(args: unknown): Promise<{ count: number }>;
  };
  auditLog: { create(args: unknown): Promise<unknown> };
  dataAccessLog: { create(args: unknown): Promise<unknown> };
}

export interface BridgeDb {
  $transaction<T>(fn: (tx: BridgeTx) => Promise<T>): Promise<T>;
}

export interface RequestContentReviewInput {
  tenantId: string;
  requestedById: string;
  /** action 側で tenant スコープ取得済みの対象メタ（本文は渡さない）。 */
  asset: { id: string; title: string; type: string; campaignId: string | null; generatedByAi: boolean; label: string };
  /** AI ロールの申請は権限誤設定でも不可（不変条件）。 */
  actorIsAi: boolean;
}

export type RequestContentReviewResult =
  | { outcome: 'requested'; approvalId: string }
  | { outcome: 'already' }
  | { outcome: 'forbidden' };

/**
 * 承認申請: CAS（draft/rejected → pending_approval）の勝者だけが ApprovalRequest＋監査＋DataAccessLog を
 * 同一 transaction で作成する。どこかで失敗すれば全体 rollback ＝ asset は元状態に戻り再申請可能。
 */
export async function requestContentReviewCore(
  db: BridgeDb,
  input: RequestContentReviewInput,
): Promise<RequestContentReviewResult> {
  if (input.actorIsAi) return { outcome: 'forbidden' }; // DB に触れる前に拒否
  const a = input.asset;
  return db.$transaction(async (tx) => {
    const claim = await tx.contentAsset.updateMany({
      where: { id: a.id, tenantId: input.tenantId, status: { in: ['draft', 'rejected'] } },
      data: contentStatusOnRequest(),
    });
    if (claim.count === 0) return { outcome: 'already' as const };
    const req = await tx.approvalRequest.create({
      data: {
        tenantId: input.tenantId,
        type: 'content_review',
        requestedForAction: 'content_review',
        title: `コンテンツ承認申請: ${a.title}`,
        summary: `${a.type} の下書きを人間レビューに提出（公開・外部送信は伴いません）`,
        entityType: 'content_asset',
        entityId: a.id,
        requestedById: input.requestedById,
        riskLevel: 'LOW',
        status: 'PENDING',
        // payload はメタのみ（本文/PII/secret を入れない）。
        payload: { type: a.type, campaignId: a.campaignId, generatedByAi: a.generatedByAi },
      },
    });
    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorId: input.requestedById,
        actorType: 'user',
        action: 'approval_request',
        entityType: 'content_asset',
        entityId: a.id,
        summary: `承認依頼: コンテンツ承認申請: ${a.title}`,
        metadata: { approvalAction: 'content_review', riskLevel: 'LOW' },
      },
    });
    await tx.dataAccessLog.create({
      data: {
        tenantId: input.tenantId,
        actorId: input.requestedById,
        actorType: 'user',
        entityType: 'ContentAsset',
        entityId: a.id,
        label: a.label,
        action: 'read',
        purpose: 'content_review_request',
        metadata: { approvalId: req.id, fields: ['title', 'type', 'campaignId'] },
      },
    });
    return { outcome: 'requested' as const, approvalId: req.id };
  });
}

export interface DecideContentReviewInput {
  tenantId: string;
  approvalId: string;
  /** ApprovalRequest.entityId（対象 ContentAsset）。null は不正＝決定しない。 */
  entityId: string | null;
  decision: 'approve' | 'reject';
  decidedById: string;
  note: string;
  approvalTitle: string;
  /** AI ロールは承認権限が誤設定で付与されていても決定不可（不変条件）。 */
  actorIsAi: boolean;
}

export type DecideContentReviewResult = { outcome: 'decided' } | { outcome: 'already' } | { outcome: 'forbidden' };

/**
 * 決定: ApprovalRequest の PENDING 限定 CAS と ContentAsset の pending_approval 限定更新（`count===1` 必須）と
 * 監査を同一 transaction で確定する。asset 側が 0 件（対象消失/別 tenant/状態不整合）なら throw → 全体 rollback
 * ＝ ApprovalRequest は PENDING のまま（承認だけ確定する不整合を残さない）。
 */
export async function decideContentReviewCore(
  db: BridgeDb,
  input: DecideContentReviewInput,
): Promise<DecideContentReviewResult> {
  if (input.actorIsAi) return { outcome: 'forbidden' }; // DB に触れる前に拒否
  if (!input.entityId) throw new Error('content_review approval without entityId');
  const status = input.decision === 'approve' ? 'APPROVED' : 'REJECTED';
  return db.$transaction(async (tx) => {
    const decided = await tx.approvalRequest.updateMany({
      where: { id: input.approvalId, tenantId: input.tenantId, status: 'PENDING' },
      data: { status, decidedById: input.decidedById, decidedAt: new Date(), decisionNote: input.note },
    });
    if (decided.count === 0) return { outcome: 'already' as const }; // 並行 approve/reject の敗者
    const updated = await tx.contentAsset.updateMany({
      where: { id: input.entityId, tenantId: input.tenantId, status: 'pending_approval' },
      data: contentStatusOnDecision(input.decision),
    });
    if (updated.count !== 1) {
      // 対象消失・別 tenant・状態不整合 → 決定ごと rollback（PENDING のまま人間が再判断できる）。
      throw new Error('content-asset-transition-failed');
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
