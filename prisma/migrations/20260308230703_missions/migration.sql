-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('USER', 'NPC');

-- CreateEnum
CREATE TYPE "MissionStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AcceptanceStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'FAILED', 'ABANDONED');

-- CreateTable
CREATE TABLE "Mission" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "creatorId" UUID NOT NULL,
    "creatorType" "EntityType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "reward" TEXT,
    "status" "MissionStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(6),

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionAcceptance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "missionId" UUID NOT NULL,
    "acceptorId" UUID NOT NULL,
    "acceptorType" "EntityType" NOT NULL,
    "status" "AcceptanceStatus" NOT NULL DEFAULT 'ACTIVE',
    "acceptedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(6),

    CONSTRAINT "MissionAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Mission_creatorId_creatorType_idx" ON "Mission"("creatorId", "creatorType");

-- CreateIndex
CREATE INDEX "Mission_status_idx" ON "Mission"("status");

-- CreateIndex
CREATE INDEX "MissionAcceptance_acceptorId_acceptorType_idx" ON "MissionAcceptance"("acceptorId", "acceptorType");

-- CreateIndex
CREATE UNIQUE INDEX "MissionAcceptance_missionId_acceptorId_acceptorType_key" ON "MissionAcceptance"("missionId", "acceptorId", "acceptorType");

-- AddForeignKey
ALTER TABLE "MissionAcceptance" ADD CONSTRAINT "MissionAcceptance_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
