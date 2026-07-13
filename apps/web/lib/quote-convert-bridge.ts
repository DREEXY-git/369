// P3-Q2C hardening（Codex V75 Q2C P2-2/P2-4）: 見積→請求 変換の transaction 正本。
// 従来 action は Invoice+lineItems を作成した後 writeAudit を別実行しており、監査失敗時に
// 監査なしの請求書が残りうる（原子性ギャップ）。本 core は **Invoice+lineItems+監査を単一 $transaction**
// で all-or-nothing に確定する。P2002 は quoteId の unique 違反のときだけ 'already' に収束させ、
// それ以外の unique 失敗は握りつぶさず再 throw する（誤った冪等収束の防止・Codex P2-4）。
// **外部送信・実支払・課金・実 LLM は一切なし**（生成物は DRAFT 請求書の下書き）。db は注入可能。

interface ConvertTx {
  invoice: { create(args: unknown): Promise<{ id: string }> };
  auditLog: { create(args: unknown): Promise<unknown> };
}

export interface ConvertBridgeDb {
  $transaction<T>(fn: (tx: ConvertTx) => Promise<T>): Promise<T>;
}

export interface ConvertQuoteToInvoiceInput {
  tenantId: string;
  actorId: string;
  /** AI ロールは（action 境界の拒否に加え）core でも変換不可（二重防御）。 */
  actorIsAi: boolean;
  quoteId: string;
  quoteNumber: string;
  /** サーバ発番済みの請求書番号。 */
  invoiceNumber: string;
  /** tenant 検証済みの顧客/案件 id（不整合は action 側で null に落として渡す）。 */
  customerId: string | null;
  dealId: string | null;
  dueDate: Date;
  /** buildInvoiceDraftFromQuote の結果（サーバ権威計算）。 */
  draft: {
    subtotal: number;
    taxAmount: number;
    total: number;
    lineItems: { name: string; quantity: number; unitPrice: number; amount: number }[];
  };
}

export type ConvertQuoteToInvoiceResult =
  | { outcome: 'created'; invoiceId: string }
  | { outcome: 'already' }
  | { outcome: 'forbidden' };

/** Prisma P2002 が quoteId の unique 違反か（他の unique 失敗は 'already' に収束させない）。 */
function isQuoteIdUniqueViolation(e: unknown): boolean {
  if (typeof e !== 'object' || e === null) return false;
  const err = e as { code?: string; meta?: { target?: unknown } };
  if (err.code !== 'P2002') return false;
  // meta.target は ['quoteId'] または制約名文字列（'Invoice_quoteId_key'）。どちらでも quoteId を含む。
  return JSON.stringify(err.meta?.target ?? '').includes('quoteId');
}

/**
 * 承認確定済み見積 → DRAFT 請求書の atomic 変換:
 *  - AI 主体は DB 接触前に forbidden。
 *  - Invoice+lineItems+監査（invoice_create_from_quote）を単一 $transaction で確定
 *    （監査失敗でも請求書ごと rollback＝孤児 0・利用者 retry で収束）。
 *  - quoteId の P2002（並行変換の敗者）は 'already'（呼び出し側が既存へ収束）。
 *  - quoteId 以外の unique 失敗は再 throw（誤収束しない）。
 */
export async function convertQuoteToInvoiceCore(
  db: ConvertBridgeDb,
  input: ConvertQuoteToInvoiceInput,
): Promise<ConvertQuoteToInvoiceResult> {
  if (input.actorIsAi) return { outcome: 'forbidden' };
  try {
    return await db.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          tenantId: input.tenantId,
          customerId: input.customerId,
          dealId: input.dealId,
          quoteId: input.quoteId, // unique ＝ 1見積→最大1請求の並行 barrier
          number: input.invoiceNumber,
          status: 'DRAFT',
          dueDate: input.dueDate,
          subtotal: input.draft.subtotal,
          taxAmount: input.draft.taxAmount,
          total: input.draft.total,
          paidAmount: 0,
          lineItems: {
            create: input.draft.lineItems.map((i) => ({
              tenantId: input.tenantId,
              name: i.name,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              amount: i.amount,
            })),
          },
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorId,
          actorType: 'user',
          action: 'invoice_create_from_quote',
          entityType: 'Invoice',
          entityId: invoice.id,
          summary: `見積 ${input.quoteNumber} から請求書 ${input.invoiceNumber} を作成（DRAFT・${input.draft.total.toLocaleString()}円・外部送信なし）`,
          metadata: { quoteId: input.quoteId },
        },
      });
      return { outcome: 'created' as const, invoiceId: invoice.id };
    });
  } catch (e) {
    if (isQuoteIdUniqueViolation(e)) {
      // 並行変換の敗者（勝者が quoteId を占有・transaction は全 rollback 済み）。呼び出し側が既存へ収束。
      return { outcome: 'already' };
    }
    throw e; // quoteId 以外の unique / その他の失敗は握りつぶさない
  }
}
