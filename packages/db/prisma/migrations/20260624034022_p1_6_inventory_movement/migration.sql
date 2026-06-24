-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "fromLocationId" TEXT,
    "toLocationId" TEXT,
    "reservationId" TEXT,
    "eventId" TEXT,
    "beforeStatus" TEXT,
    "afterStatus" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "actorId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryMovement_tenantId_occurredAt_idx" ON "InventoryMovement"("tenantId", "occurredAt");

-- CreateIndex
CREATE INDEX "InventoryMovement_tenantId_type_idx" ON "InventoryMovement"("tenantId", "type");

-- CreateIndex
CREATE INDEX "InventoryMovement_assetId_idx" ON "InventoryMovement"("assetId");

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "ProductAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
