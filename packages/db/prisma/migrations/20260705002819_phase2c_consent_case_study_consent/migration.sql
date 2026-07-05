-- CreateTable
CREATE TABLE "CaseStudyConsent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "caseStudyId" TEXT NOT NULL,
    "customerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'granted',
    "purpose" TEXT[],
    "evidence" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "grantedById" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseStudyConsent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaseStudyConsent_tenantId_idx" ON "CaseStudyConsent"("tenantId");

-- CreateIndex
CREATE INDEX "CaseStudyConsent_tenantId_caseStudyId_idx" ON "CaseStudyConsent"("tenantId", "caseStudyId");
