-- P3-Q2C: 見積→請求 変換のための Invoice.quoteId（生成元見積へのリンク）を非破壊追加。
-- null 許容（手入力 / InvoiceCandidate 由来は null）。@unique により「1見積→最大1請求」を保証し、
-- 並行変換の DB レベル直列化 barrier（敗者は P2002 → 既存請求へ収束）になる。
-- Postgres の unique index は NULL を相互に別扱いするため、quoteId=null の請求は複数存在できる。
ALTER TABLE "Invoice" ADD COLUMN "quoteId" TEXT;
CREATE UNIQUE INDEX "Invoice_quoteId_key" ON "Invoice"("quoteId");
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
