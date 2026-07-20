// PR#58 R3: 高額発注承認（purchase_order_issue）の決定 transaction 正本（Codex PR#58 R3 P2-2）。
// 従来 decideApprovalAction は purchase_order_issue を汎用 CAS で APPROVED/REJECTED にするだけで、
// 対象 PurchaseOrder の status='pending_approval' / approvalId は更新されなかった。そのため reject 後も
// PO は pending_approval のまま取り残され、confirmPurchaseOrder は非 draft を早期 return するため再申請不能に
// 閉塞していた（dangling pending_approval）。
// 本 core は quote-issue / content-review / suggestion-review と同型で、決定を単一 $transaction で確定する:
//   ApprovalRequest CAS（PENDING→APPROVED/REJECTED）→ PO の tenantId+status+approvalId 遷移 → 監査。
//   - reject: PO を pending_approval(この approval) 限定で **draft へ戻す**（approvalId=null・再申請可能）。dangling 0。
//   - approve: PO は pending_approval のまま（実際の ordered 化は executeApprovedPurchaseOrderIssue の CAS）。
//     approve 時も対象 PO が pending_approval かつ approvalId 一致であることを確認（stale/別 approval を排除）。
// **外部送信・課金・実 LLM・在庫移動は一切行わない**（発注の社内ステータス遷移のみ）。db は注入。

import { isHumanUser, type RoleKey } from '@hokko/shared';

interface PoIssueTx {
  approvalRequest: { updateMany(args: unknown): Promise<{ count: number }> };
  purchaseOrder: {
    updateMany(args: unknown): Promise<{ count: number }>;
    count(args: unknown): Promise<number>;
  };
  auditLog: { create(args: unknown): Promise<unknown> };
}

export interface PoIssueBridgeDb {
  $transaction<T>(fn: (tx: PoIssueTx) => Promise<T>): Promise<T>;
}

export interface DecidePoIssueInput {
  tenantId: string;
  approvalId: string;
  /** 対象 PurchaseOrder の id（ApprovalRequest.payloadAfter.purchaseOrderId ?? entityId）。 */
  purchaseOrderId: string | null;
  decision: 'approve' | 'reject';
  decidedById: string;
  note: string;
  approvalTitle: string;
  /** 決定主体のロール（**必須**）。AI role 混在・空roles は（action 境界の拒否に加え）core でも
   *  role 由来 fail-closed で決定不可（二重防御・自己申告 boolean を信頼しない・Codex R8）。 */
  decidedByRoles: RoleKey[];
  /** 署名 session 由来の AI フラグ（**必須**）。roles と独立のため両方を必要条件にする（Codex R9）。 */
  decidedBySessionIsAi: boolean;
}

export type DecidePoIssueResult = { outcome: 'decided' } | { outcome: 'already' } | { outcome: 'forbidden' };

/**
 * 高額発注承認の決定:
 *  - AI 主体は DB 接触前に拒否（forbidden）。
 *  - ApprovalRequest を PENDING 限定 CAS で APPROVED/REJECTED（敗者は count===0 → 'already'・冪等・approve/reject 競合は勝者 1 本）。
 *  - 勝者は PO を **status='pending_approval' AND approvalId=この approval** 限定で遷移:
 *      reject → draft（approvalId=null・再申請可能）／approve → 変更なし（存在確認のみ）。
 *      count!==1 なら決定ごと rollback（ApprovalRequest は PENDING のまま人間が再判断できる）。
 *  - 監査を同一 transaction で記録。承認しても在庫移動・外部送信・課金は発生しない。
 */
export async function decidePurchaseOrderIssueCore(
  db: PoIssueBridgeDb,
  input: DecidePoIssueInput,
): Promise<DecidePoIssueResult> {
  // decidedBySessionIsAi は**厳密に false のみ**通す — `=== true` 判定だと欠落/null/異型の
  // malformed runtime が人間扱いになる fail-open（Codex PR#58 R10）。
  if (input.decidedBySessionIsAi !== false || !Array.isArray(input.decidedByRoles) || !isHumanUser({ roles: input.decidedByRoles })) return { outcome: 'forbidden' };
  if (!input.purchaseOrderId) throw new Error('purchase_order_issue approval without purchaseOrderId');
  const status = input.decision === 'approve' ? 'APPROVED' : 'REJECTED';
  return db.$transaction(async (tx) => {
    const decided = await tx.approvalRequest.updateMany({
      where: { id: input.approvalId, tenantId: input.tenantId, status: 'PENDING' },
      data: { status, decidedById: input.decidedById, decidedAt: new Date(), decisionNote: input.note },
    });
    if (decided.count === 0) return { outcome: 'already' as const };

    if (input.decision === 'reject') {
      // 却下: PO を draft へ戻し approvalId を解除（dangling pending_approval を残さない・再申請可能）。
      const reverted = await tx.purchaseOrder.updateMany({
        where: { id: input.purchaseOrderId, tenantId: input.tenantId, status: 'pending_approval', approvalId: input.approvalId },
        data: { status: 'draft', approvalId: null },
      });
      if (reverted.count !== 1) throw new Error('po-issue-reject-transition-failed');
    } else {
      // 承認: 対象 PO が pending_approval かつ approvalId 一致であることを確認（stale/別 approval/対象消失を排除）。
      // ここでは status を変えない（ordered 化は executeApprovedPurchaseOrderIssue の CAS が担う）。
      const match = await tx.purchaseOrder.count({
        where: { id: input.purchaseOrderId, tenantId: input.tenantId, status: 'pending_approval', approvalId: input.approvalId },
      });
      if (match !== 1) throw new Error('po-issue-approve-target-mismatch');
    }

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorId: input.decidedById,
        actorType: 'user',
        action: status === 'APPROVED' ? 'approve' : 'reject',
        entityType: 'ApprovalRequest',
        entityId: input.approvalId,
        summary: `${input.approvalTitle} を${status === 'APPROVED' ? '承認' : '却下（発注を下書きへ差し戻し）'}`,
        metadata: { approvalAction: 'purchase_order_issue', purchaseOrderId: input.purchaseOrderId },
      },
    });
    return { outcome: 'decided' as const };
  });
}
