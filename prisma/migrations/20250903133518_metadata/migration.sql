/*
  Warnings:

  - Added the required column `metadata` to the `Agent` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Agent" ADD COLUMN     "metadata" JSONB NOT NULL;
