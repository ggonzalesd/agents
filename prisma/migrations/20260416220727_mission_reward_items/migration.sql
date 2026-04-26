/*
  Warnings:

  - You are about to drop the column `reward` on the `Mission` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Mission" DROP COLUMN "reward",
ADD COLUMN     "rewardItemQty" INTEGER DEFAULT 1,
ADD COLUMN     "rewardItemType" VARCHAR(50);
