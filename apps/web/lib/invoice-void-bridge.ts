// Wave2: 請求書VOID承認（invoice_void）の決定 transaction 正本。
// 未入金の誤発行請求書を、人間承認後に無効化（VOID）する。承認必須・AI不可・単一 $transaction で巻き戻し。
// quote-issue-bridge と同型:
//   承認 = ApprovalRequest CAS(PENDING→APPROVED) → Invoice を「未入金かつVOID可能」条件付きで VOID
//          （count===1 必須。承認確定〜実行の間に入金が入っていたら count!==1 で決定ごと rollback）
//          → Receivable を void → 入金予定/資金予定 FinanceEvent を ignored → 監査。
//   却下 = ApprovalRequest CAS(PENDING→REJECTED) → 監査（Invoice は不変）。
// 外部送信・課金・実LLM・削除は一切行わない（社内の請求ステータス訂正のみ）。
// db は注入（実 prisma / テスト mock / 失敗注入 wrapper）。

interface InvoiceVoidTx {
  approvalRequest: { updateMany(args: unknown): Promise<{ count: number }> };
  invoice: { updateMany(args: unknown): Promise<{ count: number }> };
  receivable: { updateMany(args: unknown): Promise<{ count: number }> };
  financeEvent: { updateMany(args: unknown): Promise<{ count: number }> };
  auditLog: { create(args: unknown): Promise<unknown> };
}

export interface InvoiceVoidBridgeDb {
  $transaction<T>(fn: (tx: InvoiceVoidTx) => Promise<T>): Promise<T>;
}

/** 承認確定〜実行の間に入金が入る等で VOID 不可になった場合に投げ、決定ごと rollback させる。 */
export class InvoiceVoidConflict extends Error {}

export interface DecideInvoiceVoidInput {
  tenantId: string;
  approvalId: string;
  /** 対象 Invoice の id（ApprovalRequest.entityId）。 */
  entityId: string | null;
  decision: 'approve' | 'reject';
  decidedById: string;
  note: string;
  /** 監査サマリ用（任意）。 */
  invoiceLabel?: string;
  /** AI ロールは（action 境界の拒否に加え）core でも決定不可（二重防御）。 */
  actorIsAi: boolean;
}

export type DecideInvoiceVoidResult = { outcome: 'decided' } | { outcome: 'already' } | { outcome: 'forbidden' };

/**
 * 請求書VOID承認の決定:
 *  - AI 主体は DB 接触前に拒否（forbidden・二重防御）。
 *  - ApprovalRequest を PENDING 限定 CAS で APPROVED/REJECTED（敗者は count===0 → 'already'・冪等）。
 *  - approve の勝者のみ: Invoice を「paidAmount=0 かつ VOID/PAID/DRAFT 以外」限定で VOID
 *    （count!==1 なら InvoiceVoidConflict で全 rollback＝入金済み等になっていたら無効化しない）。
 *    連動して Receivable を void、未 posted の入金予定/資金予定 FinanceEvent を ignored に。
 *  - 監査を同一 transaction で記録。
 */
export async function decideInvoiceVoidCore(
  db: InvoiceVoidBridgeDb,
  input: DecideInvoiceVoidInput,
): Promise<DecideInvoiceVoidResult> {
  if (input.actorIsAi) return { outcome: 'forbidden' };
  if (!input.entityId) throw new Error('invoice_void approval without entityId');
  const invoiceId = input.entityId;
  const status = input.decision === 'approve' ? 'APPROVED' : 'REJECTED';
  return db.$transaction(async (tx) => {
    const decided = await tx.approvalRequest.updateMany({
      where: { id: input.approvalId, tenantId: input.tenantId, status: 'PENDING' },
      data: { status, decidedById: input.decidedById, decidedAt: new Date(), decisionNote: input.note },
    });
    if (decided.count === 0) return { outcome: 'already' as const };

    if (input.decision === 'approve') {
      // 未入金かつ VOID/PAID/DRAFT 以外のときのみ VOID。承認確定後に入金が入っていたら count!==1 → 全 rollback。
      const voided = await tx.invoice.updateMany({
        where: { id: invoiceId, tenantId: input.tenantId, paidAmount: 0, status: { notIn: ['VOID', 'PAID', 'DRAFT'] } },
        data: { status: 'VOID' },
      });
      if (voided.count !== 1) throw new InvoiceVoidConflict('invoice not voidable');
      // 売掛を void（一覧・延滞・督促の対象から外れる）。
      await tx.receivable.updateMany({
        where: { invoiceId, tenantId: input.tenantId, status: { notIn: ['collected', 'void'] } },
        data: { status: 'void' },
      });
      // 未実績の入金予定/資金予定を無視扱いに（予定キャッシュフローから除外）。
      await tx.financeEvent.updateMany({
        where: { tenantId: input.tenantId, sourceId: invoiceId, type: { in: ['payment_expected', 'cashflow_expected'] }, status: { not: 'posted' } },
        data: { status: 'ignored' },
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorId: input.decidedById,
        actorType: 'user',
        action: input.decision === 'approve' ? 'invoice_void' : 'reject',
        entityType: 'Invoice',
        entityId: invoiceId,
        summary: `請求書VOID承認を${input.decision === 'approve' ? '承認（無効化）' : '却下'}${input.invoiceLabel ? `: ${input.invoiceLabel}` : ''}`,
      },
    });
    return { outcome: 'decided' as const };
  });
}
