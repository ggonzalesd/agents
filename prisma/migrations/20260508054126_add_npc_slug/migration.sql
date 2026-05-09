/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `NPC` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."NPC" ADD COLUMN     "slug" VARCHAR(100);

-- CreateIndex
CREATE UNIQUE INDEX "NPC_slug_key" ON "public"."NPC"("slug");
