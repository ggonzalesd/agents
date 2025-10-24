/*
  Warnings:

  - A unique constraint covering the columns `[identifier]` on the table `Agent` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[identifier]` on the table `LongTermMemory` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[entityId]` on the table `Profile` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Agent_identifier_key" ON "Agent"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "LongTermMemory_identifier_key" ON "LongTermMemory"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_entityId_key" ON "Profile"("entityId");
