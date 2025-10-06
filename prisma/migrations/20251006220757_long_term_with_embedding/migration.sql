CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "LongTermMemory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "text" TEXT NOT NULL,
    "model" VARCHAR(255) NOT NULL,
    "metadata" JSONB NOT NULL,
    "embedding" vector(256) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LongTermMemory_pkey" PRIMARY KEY ("id")
);
