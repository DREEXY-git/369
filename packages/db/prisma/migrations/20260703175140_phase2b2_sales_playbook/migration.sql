-- CreateTable
CREATE TABLE "SalesPlaybookEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "playbookType" TEXT NOT NULL,
    "targetIndustry" TEXT,
    "targetSituation" TEXT,
    "objection" TEXT,
    "recommendedTalkTrack" TEXT,
    "doNotSay" TEXT,
    "relatedPolicyIds" TEXT[],
    "relatedProductCatalogItemIds" TEXT[],
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

    CONSTRAINT "SalesPlaybookEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesPlaybookEntry_tenantId_category_idx" ON "SalesPlaybookEntry"("tenantId", "category");

-- CreateIndex
CREATE INDEX "SalesPlaybookEntry_tenantId_label_idx" ON "SalesPlaybookEntry"("tenantId", "label");

-- CreateIndex
CREATE INDEX "SalesPlaybookEntry_tenantId_playbookType_idx" ON "SalesPlaybookEntry"("tenantId", "playbookType");
