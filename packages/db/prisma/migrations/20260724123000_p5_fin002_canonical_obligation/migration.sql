-- P5-FIN-002: Canonical Cashflow Obligation（予定入出金の永続正本）。非破壊（追加のみ・down migration なし）。
-- FIN-01（packages/shared/src/cashflow-obligation.ts）の versioned canonical identity を DB 正本へ接続する。
-- CashflowObligation / CashflowObligationAlias を追加し、FinanceEvent に nullable な cashflowObligationId を足す。
-- tenant 境界は composite FK（[tenantId, cashflowObligationId]/[tenantId, obligationId] → [tenantId, id]）で
-- DB 制約に含め、cross-tenant link を拒否する。cashflowObligationId が null のとき FK は非強制（MATCH SIMPLE）＝
-- 既存 FinanceEvent の挙動を維持する。tenantId はスカラ（Tenant への relation は張らない方針）。
-- AlterTable
ALTER TABLE "FinanceEvent" ADD COLUMN     "cashflowObligationId" TEXT;

-- CreateTable
CREATE TABLE "CashflowObligation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "identityVersion" TEXT NOT NULL DEFAULT 'v1',
    "namespace" TEXT NOT NULL,
    "preferredCanonicalKey" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'neutral',
    "currency" TEXT NOT NULL DEFAULT 'JPY',
    "scheduledAmount" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "remainingAmount" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "dueAt" TIMESTAMP(3),
    "lifecycleStatus" TEXT NOT NULL DEFAULT 'open',
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashflowObligation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashflowObligationAlias" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "identityVersion" TEXT NOT NULL DEFAULT 'v1',
    "namespace" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "canonicalKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashflowObligationAlias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CashflowObligation_tenantId_lifecycleStatus_idx" ON "CashflowObligation"("tenantId", "lifecycleStatus");

-- CreateIndex
CREATE INDEX "CashflowObligation_tenantId_dueAt_idx" ON "CashflowObligation"("tenantId", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "CashflowObligation_tenantId_id_key" ON "CashflowObligation"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "CashflowObligation_tenantId_preferredCanonicalKey_key" ON "CashflowObligation"("tenantId", "preferredCanonicalKey");

-- CreateIndex
CREATE INDEX "CashflowObligationAlias_tenantId_obligationId_idx" ON "CashflowObligationAlias"("tenantId", "obligationId");

-- CreateIndex
CREATE UNIQUE INDEX "CashflowObligationAlias_tenantId_identityVersion_namespace__key" ON "CashflowObligationAlias"("tenantId", "identityVersion", "namespace", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "CashflowObligationAlias_tenantId_canonicalKey_key" ON "CashflowObligationAlias"("tenantId", "canonicalKey");

-- CreateIndex
CREATE INDEX "FinanceEvent_tenantId_cashflowObligationId_idx" ON "FinanceEvent"("tenantId", "cashflowObligationId");

-- AddForeignKey
ALTER TABLE "FinanceEvent" ADD CONSTRAINT "FinanceEvent_tenantId_cashflowObligationId_fkey" FOREIGN KEY ("tenantId", "cashflowObligationId") REFERENCES "CashflowObligation"("tenantId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CashflowObligationAlias" ADD CONSTRAINT "CashflowObligationAlias_tenantId_obligationId_fkey" FOREIGN KEY ("tenantId", "obligationId") REFERENCES "CashflowObligation"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

