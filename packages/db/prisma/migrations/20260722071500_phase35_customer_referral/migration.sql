-- Phase 3.5: 顧客紹介の記録・追跡（CustomerReferral）。紹介者→紹介先→成約 を記録。非破壊（追加のみ）。
-- status は String（received/in_progress/won/lost）＝ packages/shared の状態機械で検証。
-- tenantId はスカラ（Tenant への relation は張らない方針）。
CREATE TABLE "CustomerReferral" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "referrerName" TEXT NOT NULL,
    "referredName" TEXT NOT NULL,
    "referredContact" TEXT,
    "estimatedValue" DECIMAL(14,2),
    "status" TEXT NOT NULL DEFAULT 'received',
    "note" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomerReferral_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CustomerReferral_tenantId_status_idx" ON "CustomerReferral"("tenantId", "status");
