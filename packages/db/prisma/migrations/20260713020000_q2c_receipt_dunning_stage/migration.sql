-- P3-Q2C A/C: 領収書(Receipt)テーブル追加 + 督促の多段(stage/scheduledAt)列追加。すべて非破壊（追加のみ）。
-- A: Receipt は 1請求→最大1領収書（invoiceId @unique が発行の並行 barrier）。外部送信・課金・実支払は伴わない。
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'bank',
    "issuedById" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Receipt_invoiceId_key" ON "Receipt"("invoiceId");
CREATE INDEX "Receipt_tenantId_idx" ON "Receipt"("tenantId");
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- C: 督促の多段化（既存 reminder は stage=1 の既定でそのまま有効）。
ALTER TABLE "CollectionReminder" ADD COLUMN "stage" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "CollectionReminder" ADD COLUMN "scheduledAt" TIMESTAMP(3);
