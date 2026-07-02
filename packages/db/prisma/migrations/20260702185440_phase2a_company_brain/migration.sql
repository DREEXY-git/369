-- CreateTable
CREATE TABLE "CompanyPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "tags" TEXT[],
    "label" "ConfidentialityLabel" NOT NULL DEFAULT 'INTERNAL',
    "externalAiAllowed" BOOLEAN NOT NULL DEFAULT false,
    "sourceType" TEXT,
    "sourceNote" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "CompanyPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCatalogItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "targetPain" TEXT,
    "strengths" TEXT,
    "priceNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "tags" TEXT[],
    "label" "ConfidentialityLabel" NOT NULL DEFAULT 'INTERNAL',
    "externalAiAllowed" BOOLEAN NOT NULL DEFAULT false,
    "productAssetId" TEXT,
    "sourceType" TEXT,
    "sourceNote" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "ProductCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyPolicy_tenantId_status_idx" ON "CompanyPolicy"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CompanyPolicy_tenantId_category_idx" ON "CompanyPolicy"("tenantId", "category");

-- CreateIndex
CREATE INDEX "CompanyPolicy_tenantId_label_idx" ON "CompanyPolicy"("tenantId", "label");

-- CreateIndex
CREATE INDEX "ProductCatalogItem_tenantId_status_idx" ON "ProductCatalogItem"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ProductCatalogItem_tenantId_category_idx" ON "ProductCatalogItem"("tenantId", "category");

-- CreateIndex
CREATE INDEX "ProductCatalogItem_tenantId_label_idx" ON "ProductCatalogItem"("tenantId", "label");

-- CreateIndex
CREATE INDEX "ProductCatalogItem_tenantId_productAssetId_idx" ON "ProductCatalogItem"("tenantId", "productAssetId");
