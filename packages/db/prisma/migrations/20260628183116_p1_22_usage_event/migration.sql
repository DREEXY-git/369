-- CreateTable
CREATE TABLE "UsageEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorId" TEXT,
    "actorType" TEXT NOT NULL DEFAULT 'user',
    "eventType" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "billing" TEXT NOT NULL DEFAULT 'usage_only',
    "unit" TEXT NOT NULL DEFAULT 'count',
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "sourceType" TEXT NOT NULL DEFAULT '',
    "sourceId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UsageEvent_tenantId_occurredAt_idx" ON "UsageEvent"("tenantId", "occurredAt");

-- CreateIndex
CREATE INDEX "UsageEvent_tenantId_eventType_idx" ON "UsageEvent"("tenantId", "eventType");

-- CreateIndex
CREATE INDEX "UsageEvent_tenantId_category_idx" ON "UsageEvent"("tenantId", "category");

-- CreateIndex
CREATE INDEX "UsageEvent_tenantId_billing_idx" ON "UsageEvent"("tenantId", "billing");

-- CreateIndex
CREATE INDEX "UsageEvent_tenantId_sourceType_sourceId_idx" ON "UsageEvent"("tenantId", "sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "UsageEvent_tenantId_idempotencyKey_key" ON "UsageEvent"("tenantId", "idempotencyKey");
