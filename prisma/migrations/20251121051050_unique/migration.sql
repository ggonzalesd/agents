-- CreateTable
CREATE TABLE "public"."ExperimentHallucinationResults" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "npcId" UUID NOT NULL,
    "relatedInfoInMemory" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "llmHallucinationScore" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "ExperimentHallucinationResults_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."ExperimentHallucinationResults" ADD CONSTRAINT "ExperimentHallucinationResults_npcId_fkey" FOREIGN KEY ("npcId") REFERENCES "public"."NPC"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
