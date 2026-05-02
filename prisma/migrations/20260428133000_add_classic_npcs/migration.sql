CREATE TYPE "BehaviorType" AS ENUM ('PASSIVE', 'NEUTRAL', 'AGGRESSIVE', 'EXPLORER', 'COLLECTOR', 'THIEF');

CREATE TYPE "DialogTrigger" AS ENUM ('PROXIMITY', 'INTERACT', 'QUEST_START', 'QUEST_COMPLETE');

CREATE TABLE "ClassicNPC" (
	"id" UUID NOT NULL,
	"description" TEXT NOT NULL,
	"skinUrl" TEXT NOT NULL,

	CONSTRAINT "ClassicNPC_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClassicNpcConfig" (
	"id" UUID NOT NULL DEFAULT gen_random_uuid(),
	"npcId" UUID NOT NULL,
	"behaviorType" "BehaviorType" NOT NULL DEFAULT 'PASSIVE',
	"aggroRange" DOUBLE PRECISION NOT NULL DEFAULT 10,
	"attackRange" DOUBLE PRECISION NOT NULL DEFAULT 2,
	"detectionRange" DOUBLE PRECISION NOT NULL DEFAULT 15,
	"attackDurationSec" INTEGER NOT NULL DEFAULT 10,
	"attackCooldownMs" INTEGER NOT NULL DEFAULT 1500,
	"fleeHealthPercent" DOUBLE PRECISION,
	"patrolRadius" DOUBLE PRECISION NOT NULL DEFAULT 8,
	"extraConfig" JSONB NOT NULL DEFAULT '{}',

	CONSTRAINT "ClassicNpcConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClassicNpcDialogTree" (
	"id" UUID NOT NULL DEFAULT gen_random_uuid(),
	"npcId" UUID NOT NULL,
	"triggerType" "DialogTrigger" NOT NULL,
	"key" VARCHAR(100),

	CONSTRAINT "ClassicNpcDialogTree_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClassicNpcDialogNode" (
	"id" UUID NOT NULL DEFAULT gen_random_uuid(),
	"treeId" UUID NOT NULL,
	"key" VARCHAR(100),
	"text" TEXT NOT NULL,

	CONSTRAINT "ClassicNpcDialogNode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClassicNpcDialogOption" (
	"id" UUID NOT NULL DEFAULT gen_random_uuid(),
	"nodeId" UUID NOT NULL,
	"text" TEXT NOT NULL,
	"nextNodeId" UUID,
	"actions" JSONB NOT NULL DEFAULT '[]',

	CONSTRAINT "ClassicNpcDialogOption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClassicNpcConfig_npcId_key" ON "ClassicNpcConfig"("npcId");
CREATE INDEX "ClassicNpcDialogTree_npcId_triggerType_idx" ON "ClassicNpcDialogTree"("npcId", "triggerType");
CREATE INDEX "ClassicNpcDialogNode_treeId_idx" ON "ClassicNpcDialogNode"("treeId");
CREATE INDEX "ClassicNpcDialogOption_nodeId_idx" ON "ClassicNpcDialogOption"("nodeId");

ALTER TABLE "ClassicNPC"
	ADD CONSTRAINT "ClassicNPC_id_fkey"
	FOREIGN KEY ("id") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClassicNpcConfig"
	ADD CONSTRAINT "ClassicNpcConfig_npcId_fkey"
	FOREIGN KEY ("npcId") REFERENCES "ClassicNPC"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClassicNpcDialogTree"
	ADD CONSTRAINT "ClassicNpcDialogTree_npcId_fkey"
	FOREIGN KEY ("npcId") REFERENCES "ClassicNPC"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClassicNpcDialogNode"
	ADD CONSTRAINT "ClassicNpcDialogNode_treeId_fkey"
	FOREIGN KEY ("treeId") REFERENCES "ClassicNpcDialogTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClassicNpcDialogOption"
	ADD CONSTRAINT "ClassicNpcDialogOption_nodeId_fkey"
	FOREIGN KEY ("nodeId") REFERENCES "ClassicNpcDialogNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
