-- CreateTable
CREATE TABLE "CaseStudy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "industry" TEXT,
    "challenge" TEXT,
    "solution" TEXT,
    "outcome" TEXT,
    "anonymized" BOOLEAN NOT NULL DEFAULT true,
    "consentStatus" TEXT NOT NULL DEFAULT 'none',
    "consentRecordId" TEXT,
    "customerId" TEXT,
    "publishStatus" TEXT NOT NULL DEFAULT 'private',
    "tags" TEXT[],
    "label" "ConfidentialityLabel" NOT NULL DEFAULT 'INTERNAL',
    "externalAiAllowed" BOOLEAN NOT NULL DEFAULT false,
    "sourceType" TEXT,
    "sourceNote" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "CaseStudy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaseStudy_tenantId_idx" ON "CaseStudy"("tenantId");

-- CreateIndex
CREATE INDEX "CaseStudy_tenantId_label_idx" ON "CaseStudy"("tenantId", "label");

-- CreateIndex
CREATE INDEX "CaseStudy_tenantId_publishStatus_idx" ON "CaseStudy"("tenantId", "publishStatus");
