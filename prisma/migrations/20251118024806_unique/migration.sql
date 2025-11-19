-- CreateTable
CREATE TABLE "ExperimentRetrievalResults" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "npcId" UUID NOT NULL,
    "queryMessage" TEXT NOT NULL,
    "resultsMessages" TEXT NOT NULL,
    "llmRetrievalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "ExperimentRetrievalResults_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ExperimentRetrievalResults" ADD CONSTRAINT "ExperimentRetrievalResults_npcId_fkey" FOREIGN KEY ("npcId") REFERENCES "NPC"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
