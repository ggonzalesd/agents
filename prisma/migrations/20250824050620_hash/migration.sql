-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "hash" UUID NOT NULL DEFAULT gen_random_uuid();
