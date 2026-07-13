// P3-Q2C-A 領収書（Receipt）発行の transaction 正本。convert-bridge と同型。
// Receipt+監査を単一 $transaction で確定（監査失敗でも領収書ごと rollback＝孤児 0）。
// Receipt.invoiceId @unique が「1請求→最大1領収書」の並行 barrier。invoiceId の P2002 のみ 'already' に収束、
// それ以外の unique 失敗は握りつぶさず再 throw。AI は DB 接触前に forbidden。
// **外部送信・課金・実支払・実 LLM は一切なし**（内部記録のみ）。db は注入可能。

interface ReceiptTx {
  receipt: { create(args: unknown): Promise<{ id: string }> };
  auditLog: { create(args: unknown): Promise<unknown> };
}

export interface ReceiptBridgeDb {
  $transaction<T>(fn: (tx: ReceiptTx) => Promise<T>): Promise<T>;
}

export interface IssueReceiptInput {
  tenantId: string;
  actorId: string;
  actorIsAi: boolean;
  invoiceId: string;
  invoiceNumber: string;
  receiptNumber: string;
  amount: number;
  method: string;
}

export type IssueReceiptResult =
  | { outcome: 'created'; receiptId: string }
  | { outcome: 'already' }
  | { outcome: 'forbidden' };

function isInvoiceIdUniqueViolation(e: unknown): boolean {
  if (typeof e !== 'object' || e === null) return false;
  const err = e as { code?: string; meta?: { target?: unknown } };
  if (err.code !== 'P2002') return false;
  return JSON.stringify(err.meta?.target ?? '').includes('invoiceId');
}

/**
 * 入金済み請求書から領収書を発行:
 *  - AI 主体は DB 接触前に forbidden。
 *  - Receipt + 監査（receipt_issue）を単一 $transaction で確定。
 *  - invoiceId の P2002（並行/再送の敗者）は 'already'（呼び出し側が既存へ収束）。
 *  - invoiceId 以外の unique 失敗は再 throw（誤収束しない）。
 */
export async function issueReceiptCore(
  db: ReceiptBridgeDb,
  input: IssueReceiptInput,
): Promise<IssueReceiptResult> {
  if (input.actorIsAi) return { outcome: 'forbidden' };
  try {
    return await db.$transaction(async (tx) => {
      const receipt = await tx.receipt.create({
        data: {
          tenantId: input.tenantId,
          invoiceId: input.invoiceId, // unique ＝ 1請求→最大1領収書の並行 barrier
          number: input.receiptNumber,
          amount: input.amount,
          method: input.method,
          issuedById: input.actorId,
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorId,
          actorType: 'user',
          action: 'receipt_issue',
          entityType: 'Receipt',
          entityId: receipt.id,
          summary: `請求書 ${input.invoiceNumber} の領収書 ${input.receiptNumber} を発行（${Math.round(input.amount).toLocaleString()}円・外部送信なし）`,
          metadata: { invoiceId: input.invoiceId },
        },
      });
      return { outcome: 'created' as const, receiptId: receipt.id };
    });
  } catch (e) {
    if (isInvoiceIdUniqueViolation(e)) return { outcome: 'already' };
    throw e;
  }
}
