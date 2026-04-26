-- CreateTable
CREATE TABLE "public"."InventoryItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entityId" UUID NOT NULL,
    "slot" VARCHAR(50) NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryItem_entityId_idx" ON "public"."InventoryItem"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_entityId_slot_key" ON "public"."InventoryItem"("entityId", "slot");

-- AddForeignKey
ALTER TABLE "public"."InventoryItem" ADD CONSTRAINT "InventoryItem_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "public"."Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
