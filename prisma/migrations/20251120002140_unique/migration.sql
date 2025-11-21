-- CreateTable
CREATE TABLE "public"."ExperimentVariabilityResults" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "npcId" UUID NOT NULL,
    "delayInMs" INTEGER NOT NULL DEFAULT 0,
    "actionsGenerated" INTEGER NOT NULL DEFAULT 0,
    "failedActions" INTEGER NOT NULL DEFAULT 0,
    "successfulActions" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ExperimentVariabilityResults_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."ExperimentVariabilityResults" ADD CONSTRAINT "ExperimentVariabilityResults_npcId_fkey" FOREIGN KEY ("npcId") REFERENCES "public"."NPC"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
