-- C19 承認ブリッジ（roadmap83 案A・人間承認済み 2026-07-12）:
-- MarketingSuggestion に承認状態列を追加（none | pending | approved | rejected）。
-- C21 で実証済みの status CAS による原子的重複申請防止を C19 に適用するための最小の加法的変更。
-- AlterTable
ALTER TABLE "MarketingSuggestion" ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'none';

-- CreateIndex
CREATE INDEX "MarketingSuggestion_tenantId_approvalStatus_idx" ON "MarketingSuggestion"("tenantId", "approvalStatus");
