-- AlterTable
ALTER TABLE "AIOutput" ADD COLUMN     "citations" JSONB,
ADD COLUMN     "costEstimate" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "inputHash" TEXT,
ADD COLUMN     "model" TEXT NOT NULL DEFAULT 'fake',
ADD COLUMN     "outputText" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "purpose" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "safetyFlags" TEXT[],
ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "ContentAsset" ADD COLUMN     "aiOutputId" TEXT,
ADD COLUMN     "approvalStatus" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN     "campaignId" TEXT,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "label" "ConfidentialityLabel" NOT NULL DEFAULT 'INTERNAL',
ADD COLUMN     "safetyFlag" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "MarketingCampaign" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "kpiActual" JSONB,
ADD COLUMN     "kpiPlan" JSONB,
ADD COLUMN     "periodEnd" TIMESTAMP(3),
ADD COLUMN     "periodStart" TIMESTAMP(3),
ADD COLUMN     "purpose" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "target" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "GrowthEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "actorId" TEXT,
    "actorType" TEXT NOT NULL DEFAULT 'user',
    "entityType" TEXT,
    "entityId" TEXT,
    "amount" DECIMAL(16,2),
    "currency" TEXT NOT NULL DEFAULT 'JPY',
    "revenueImpact" DECIMAL(16,2),
    "costSaving" DECIMAL(16,2),
    "timeSavingMinutes" INTEGER,
    "metric" JSONB,
    "payload" JSONB,
    "domainEventId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrowthEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DXAssessment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL DEFAULT '',
    "findings" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DXAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DXOpportunity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assessmentId" TEXT,
    "title" TEXT NOT NULL,
    "problem" TEXT NOT NULL DEFAULT '',
    "solution" TEXT NOT NULL DEFAULT '',
    "estimatedTimeSavingMinutes" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostSaving" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "estimatedRevenueImpact" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'identified',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DXOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AISafetyLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorId" TEXT,
    "actorType" TEXT NOT NULL DEFAULT 'user',
    "purpose" TEXT NOT NULL DEFAULT '',
    "check" TEXT NOT NULL,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "severity" TEXT NOT NULL DEFAULT 'none',
    "patterns" TEXT[],
    "detail" TEXT NOT NULL DEFAULT '',
    "entityType" TEXT,
    "entityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AISafetyLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GrowthEvent_tenantId_occurredAt_idx" ON "GrowthEvent"("tenantId", "occurredAt");

-- CreateIndex
CREATE INDEX "GrowthEvent_tenantId_category_idx" ON "GrowthEvent"("tenantId", "category");

-- CreateIndex
CREATE INDEX "GrowthEvent_tenantId_type_idx" ON "GrowthEvent"("tenantId", "type");

-- CreateIndex
CREATE INDEX "DXAssessment_tenantId_idx" ON "DXAssessment"("tenantId");

-- CreateIndex
CREATE INDEX "DXAssessment_tenantId_status_idx" ON "DXAssessment"("tenantId", "status");

-- CreateIndex
CREATE INDEX "DXOpportunity_tenantId_status_idx" ON "DXOpportunity"("tenantId", "status");

-- CreateIndex
CREATE INDEX "DXOpportunity_tenantId_priority_idx" ON "DXOpportunity"("tenantId", "priority");

-- CreateIndex
CREATE INDEX "AISafetyLog_tenantId_createdAt_idx" ON "AISafetyLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AISafetyLog_tenantId_check_idx" ON "AISafetyLog"("tenantId", "check");

-- CreateIndex
CREATE INDEX "AIOutput_tenantId_createdAt_idx" ON "AIOutput"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "ContentAsset_tenantId_campaignId_idx" ON "ContentAsset"("tenantId", "campaignId");

-- CreateIndex
CREATE INDEX "ContentAsset_tenantId_approvalStatus_idx" ON "ContentAsset"("tenantId", "approvalStatus");

-- CreateIndex
CREATE INDEX "MarketingCampaign_tenantId_status_idx" ON "MarketingCampaign"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "DXOpportunity" ADD CONSTRAINT "DXOpportunity_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "DXAssessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
