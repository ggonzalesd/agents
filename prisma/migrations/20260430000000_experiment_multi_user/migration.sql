-- Migration: experiment_multi_user
-- Changes:
--   1. Add AWAITING_FEEDBACK to ExperimentRunStatus enum
--   2. Remove AWAITING_FEEDBACK from ExperimentPhaseStatus enum
--   3. Remove rating/comment from UserExperimentPhase
--   4. Add rating/comment to UserExperiment

-- 1. Add AWAITING_FEEDBACK to ExperimentRunStatus
ALTER TYPE "ExperimentRunStatus" ADD VALUE IF NOT EXISTS 'AWAITING_FEEDBACK';

-- 2. Migrate any AWAITING_FEEDBACK phase statuses → COMPLETED (data safety)
UPDATE "UserExperimentPhase"
SET "status" = 'COMPLETED'::"ExperimentPhaseStatus"
WHERE "status" = 'AWAITING_FEEDBACK'::"ExperimentPhaseStatus";

-- 3. Recreate ExperimentPhaseStatus without AWAITING_FEEDBACK
ALTER TYPE "ExperimentPhaseStatus" RENAME TO "ExperimentPhaseStatus_old";
CREATE TYPE "ExperimentPhaseStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED');
ALTER TABLE "UserExperimentPhase"
  ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "UserExperimentPhase"
  ALTER COLUMN "status" TYPE "ExperimentPhaseStatus"
  USING "status"::text::"ExperimentPhaseStatus";
ALTER TABLE "UserExperimentPhase"
  ALTER COLUMN "status" SET DEFAULT 'PENDING'::"ExperimentPhaseStatus";
DROP TYPE "ExperimentPhaseStatus_old";

-- 4. Remove rating/comment from UserExperimentPhase
ALTER TABLE "UserExperimentPhase"
  DROP COLUMN IF EXISTS "rating",
  DROP COLUMN IF EXISTS "comment";

-- 5. Add rating/comment to UserExperiment
ALTER TABLE "UserExperiment"
  ADD COLUMN IF NOT EXISTS "rating" INTEGER,
  ADD COLUMN IF NOT EXISTS "comment" TEXT;
