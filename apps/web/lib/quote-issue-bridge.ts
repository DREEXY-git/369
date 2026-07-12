// P3-Q2C: 見積発行承認（quote_issue）の決定 transaction 正本。
// 従来 decideApprovalAction は quote_issue を汎用 CAS で APPROVED/REJECTED にするだけで、
// 対象 Quote は pending_approval のまま取り残されていた（承認しても何も起きない dangling half-slice）。
// 本 core は content-review / suggestion-review と同型で、決定を単一 $transaction で確定する:
//   ApprovalRequest CAS（PENDING→APPROVED/REJECTED）→ Quote 遷移 count===1 必須（pending_approval→approved/rejected）→ 監査。
// **外部送信・請求書化・課金・実 LLM は一切行わない**（見積の社内ステータス確定のみ）。
// db は注入（実 prisma / テスト mock / 失敗注入 wrapper）。

import { quoteStatusOnIssueDecision } from '@hokko/shared';

interface QuoteIssueTx {
  approvalRequest: {
    updateMany(args: unknown): Promise<{ count: number }>;
  };
  quote: {
    updateMany(args: unknown): Promise<{ count: number }>;
  };
  auditLog: { create(args: unknown): Promise<unknown> };
}

export interface QuoteIssueBridgeDb {
  $transaction<T>(fn: (tx: QuoteIssueTx) => Promise<T>): Promise<T>;
}

export interface DecideQuoteIssueInput {
  tenantId: string;
  approvalId: string;
  /** 対象 Quote の id（ApprovalRequest.entityId）。 */
  entityId: string | null;
  decision: 'approve' | 'reject';
  decidedById: string;
  note: string;
  approvalTitle: string;
  /** AI ロールは（action 境界の拒否に加え）core でも決定不可（二重防御）。 */
  actorIsAi: boolean;
}

export type DecideQuoteIssueResult = { outcome: 'decided' } | { outcome: 'already' } | { outcome: 'forbidden' };

/**
 * 見積発行承認の決定:
 *  - AI 主体は DB 接触前に拒否（forbidden）。
 *  - ApprovalRequest を PENDING 限定 CAS で APPROVED/REJECTED（敗者は count===0 → 'already'・冪等）。
 *  - 勝者は Quote を pending_approval 限定で approved/rejected へ遷移（count!==1 なら決定ごと rollback）。
 *  - 監査を同一 transaction で記録。
 * 承認しても請求書化・外部送信・課金は発生しない（Quote の社内ステータスのみ確定）。
 */
export async function decideQuoteIssueCore(
  db: QuoteIssueBridgeDb,
  input: DecideQuoteIssueInput,
): Promise<DecideQuoteIssueResult> {
  if (input.actorIsAi) return { outcome: 'forbidden' };
  if (!input.entityId) throw new Error('quote_issue approval without entityId');
  const status = input.decision === 'approve' ? 'APPROVED' : 'REJECTED';
  return db.$transaction(async (tx) => {
    const decided = await tx.approvalRequest.updateMany({
      where: { id: input.approvalId, tenantId: input.tenantId, status: 'PENDING' },
      data: { status, decidedById: input.decidedById, decidedAt: new Date(), decisionNote: input.note },
    });
    if (decided.count === 0) return { outcome: 'already' as const };
    const updated = await tx.quote.updateMany({
      where: { id: input.entityId, tenantId: input.tenantId, status: 'pending_approval' },
      data: quoteStatusOnIssueDecision(input.decision),
    });
    if (updated.count !== 1) {
      // 対象消失・別 tenant・状態不整合（既に別 submit が確定 等）→ 決定ごと rollback
      // （ApprovalRequest は PENDING のまま人間が再判断できる）。
      throw new Error('quote-issue-transition-failed');
    }
    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorId: input.decidedById,
        actorType: 'user',
        action: status === 'APPROVED' ? 'approve' : 'reject',
        entityType: 'ApprovalRequest',
        entityId: input.approvalId,
        summary: `${input.approvalTitle} を${status === 'APPROVED' ? '承認（発行確定）' : '却下'}`,
        metadata: { approvalAction: 'quote_issue', quoteId: input.entityId },
      },
    });
    return { outcome: 'decided' as const };
  });
}
