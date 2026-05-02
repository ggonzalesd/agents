DROP TABLE IF EXISTS "ExperimentHallucinationResults";
DROP TABLE IF EXISTS "ExperimentRetrievalResults";
DROP TABLE IF EXISTS "ExperimentVariabilityResults";

CREATE TYPE "ExperimentRunStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');
CREATE TYPE "ExperimentPhaseStatus" AS ENUM ('PENDING', 'ACTIVE', 'AWAITING_FEEDBACK', 'COMPLETED');
CREATE TYPE "ExperimentAttemptStatus" AS ENUM ('ACTIVE', 'FAILED', 'COMPLETED', 'ABORTED');

CREATE TABLE "ExperimentAssignment" (
	"id" UUID NOT NULL DEFAULT gen_random_uuid(),
	"userId" UUID NOT NULL,
	"experimentKey" VARCHAR(100) NOT NULL,
	"enabled" BOOLEAN NOT NULL DEFAULT true,
	"createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMPTZ(6) NOT NULL,

	CONSTRAINT "ExperimentAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserExperiment" (
	"id" UUID NOT NULL DEFAULT gen_random_uuid(),
	"userId" UUID NOT NULL,
	"experimentKey" VARCHAR(100) NOT NULL,
	"status" "ExperimentRunStatus" NOT NULL DEFAULT 'NOT_STARTED',
	"currentPhaseIndex" INTEGER NOT NULL DEFAULT 0,
	"mountedRoomId" VARCHAR(100),
	"mountedAt" TIMESTAMPTZ(6),
	"startedAt" TIMESTAMPTZ(6),
	"completedAt" TIMESTAMPTZ(6),
	"createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMPTZ(6) NOT NULL,

	CONSTRAINT "UserExperiment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserExperimentPhase" (
	"id" UUID NOT NULL DEFAULT gen_random_uuid(),
	"experimentId" UUID NOT NULL,
	"phaseKey" VARCHAR(100) NOT NULL,
	"phaseIndex" INTEGER NOT NULL,
	"status" "ExperimentPhaseStatus" NOT NULL DEFAULT 'PENDING',
	"attemptCount" INTEGER NOT NULL DEFAULT 0,
	"failureCount" INTEGER NOT NULL DEFAULT 0,
	"totalTimeMs" INTEGER NOT NULL DEFAULT 0,
	"currentAttemptNumber" INTEGER NOT NULL DEFAULT 0,
	"currentAttemptElapsedMs" INTEGER NOT NULL DEFAULT 0,
	"currentAttemptStartedAt" TIMESTAMPTZ(6),
	"mountedAt" TIMESTAMPTZ(6),
	"rating" INTEGER,
	"comment" TEXT,
	"completedAt" TIMESTAMPTZ(6),
	"createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMPTZ(6) NOT NULL,

	CONSTRAINT "UserExperimentPhase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserExperimentAttempt" (
	"id" UUID NOT NULL DEFAULT gen_random_uuid(),
	"phaseId" UUID NOT NULL,
	"attemptNumber" INTEGER NOT NULL,
	"status" "ExperimentAttemptStatus" NOT NULL DEFAULT 'ACTIVE',
	"failureCount" INTEGER NOT NULL DEFAULT 0,
	"elapsedMs" INTEGER NOT NULL DEFAULT 0,
	"startedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"endedAt" TIMESTAMPTZ(6),
	"createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMPTZ(6) NOT NULL,

	CONSTRAINT "UserExperimentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExperimentAssignment_userId_experimentKey_key" ON "ExperimentAssignment"("userId", "experimentKey");
CREATE INDEX "ExperimentAssignment_experimentKey_enabled_idx" ON "ExperimentAssignment"("experimentKey", "enabled");

CREATE UNIQUE INDEX "UserExperiment_userId_experimentKey_key" ON "UserExperiment"("userId", "experimentKey");
CREATE INDEX "UserExperiment_experimentKey_status_idx" ON "UserExperiment"("experimentKey", "status");
CREATE INDEX "UserExperiment_mountedRoomId_mountedAt_idx" ON "UserExperiment"("mountedRoomId", "mountedAt");

CREATE UNIQUE INDEX "UserExperimentPhase_experimentId_phaseKey_key" ON "UserExperimentPhase"("experimentId", "phaseKey");
CREATE INDEX "UserExperimentPhase_experimentId_phaseIndex_idx" ON "UserExperimentPhase"("experimentId", "phaseIndex");

CREATE UNIQUE INDEX "UserExperimentAttempt_phaseId_attemptNumber_key" ON "UserExperimentAttempt"("phaseId", "attemptNumber");
CREATE INDEX "UserExperimentAttempt_phaseId_status_idx" ON "UserExperimentAttempt"("phaseId", "status");

ALTER TABLE "ExperimentAssignment"
	ADD CONSTRAINT "ExperimentAssignment_userId_fkey"
	FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserExperiment"
	ADD CONSTRAINT "UserExperiment_userId_fkey"
	FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserExperimentPhase"
	ADD CONSTRAINT "UserExperimentPhase_experimentId_fkey"
	FOREIGN KEY ("experimentId") REFERENCES "UserExperiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserExperimentAttempt"
	ADD CONSTRAINT "UserExperimentAttempt_phaseId_fkey"
	FOREIGN KEY ("phaseId") REFERENCES "UserExperimentPhase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
