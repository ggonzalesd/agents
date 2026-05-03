-- Rename skinUrl to skinKey in NPC and ClassicNPC tables
ALTER TABLE "NPC" RENAME COLUMN "skinUrl" TO "skinKey";
ALTER TABLE "ClassicNPC" RENAME COLUMN "skinUrl" TO "skinKey";
