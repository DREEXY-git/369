-- CreateTable
CREATE TABLE "FinanceEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT '',
    "sourceId" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'neutral',
    "amount" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'JPY',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "description" TEXT NOT NULL DEFAULT '',
    "payload" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalCandidate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT '',
    "sourceId" TEXT,
    "debitAccount" TEXT NOT NULL,
    "creditAccount" TEXT NOT NULL,
    "amount" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "aiOutputId" TEXT,
    "approvalId" TEXT,
    "journalEntryId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceCandidate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT '',
    "sourceId" TEXT,
    "title" TEXT NOT NULL DEFAULT '',
    "subtotal" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "dueAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "approvalId" TEXT,
    "invoiceId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinanceEvent_tenantId_type_idx" ON "FinanceEvent"("tenantId", "type");

-- CreateIndex
CREATE INDEX "FinanceEvent_tenantId_status_idx" ON "FinanceEvent"("tenantId", "status");

-- CreateIndex
CREATE INDEX "FinanceEvent_tenantId_dueAt_idx" ON "FinanceEvent"("tenantId", "dueAt");

-- CreateIndex
CREATE INDEX "JournalCandidate_tenantId_status_idx" ON "JournalCandidate"("tenantId", "status");

-- CreateIndex
CREATE INDEX "InvoiceCandidate_tenantId_status_idx" ON "InvoiceCandidate"("tenantId", "status");
