/*
model LongTermMemory {
  id         String                      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  npcId      String                      @db.Uuid
  identifier String                      @unique @db.VarChar(255)
  text       String                      @db.Text
  metadata   Json                        @db.JsonB
  embedding  Unsupported("vector(3072)")
  createdAt  DateTime                    @default(now()) @db.Timestamp(6)

  NPC NPC @relation(fields: [npcId], references: [id])
}
*/

import type { LongTermMemoryDB } from '$/models/LongTermMemory.model';
import * as SQL from '$/utils/sql';

type RetrieveLongTermMemoryType = SQL.InferSqlBuilder<
	{
		npcIdentifier: string;
		queryEmbedding: number[];
		limit: number;
		importance: number;
	},
	LongTermMemoryDB[]
>;

export const retrieveLongTermMemory: RetrieveLongTermMemoryType =
	SQL.sqlBuilder(
		({ npcIdentifier, queryEmbedding, limit, importance }, sql) =>
			sql<LongTermMemoryDB[]>`SELECT * FROM "LongTermMemory"
			WHERE "npcId" = (
				SELECT id FROM "Agent" WHERE identifier = ${npcIdentifier}
			) AND importance >= ${importance}
			ORDER BY embedding <=> ${`[${queryEmbedding.join(',')}]`}::vector(3072)
			LIMIT ${limit}
		`,
	);

type SaveLongTermMemory = SQL.InferSqlBuilder<
	{
		npcIdentifier: string;
		text: string;
		metadata: object;
		embedding: number[];
		importance: number;
	},
	LongTermMemoryDB
>;

export const saveLongTermMemory: SaveLongTermMemory = SQL.sqlBuilder(
	({ npcIdentifier, text, metadata, embedding, importance }, sql) =>
		SQL.transaction(sql, async (tx) => {
			let identifier: string;
			let count = 0;
			let existingCount: number;

			do {
				identifier = Math.random()
					.toString(36)
					.substring(2, 5 + count);
				if (count < 5) count++;

				existingCount = await tx<
					{ count: number }[]
				>`SELECT COUNT(*) count FROM "LongTermMemory" WHERE identifier = ${identifier}`
					.then((result) => result[0].count)
					.then(Number);
			} while (existingCount > 0);

			const existingNPC = await tx<{ id: string }[]>`
				SELECT npc.id FROM "NPC" npc join "Agent" agent on npc.id = agent.id WHERE agent.identifier = ${npcIdentifier}
			`;

			if (existingNPC.length === 0) {
				throw new Error(`NPC with identifier ${npcIdentifier} not found`);
			}

			const results = await tx<
				LongTermMemoryDB[]
			>`INSERT INTO "LongTermMemory" ("npcId", identifier, text, metadata, embedding, importance)
				VALUES (
					(SELECT id FROM "Agent" WHERE identifier = ${npcIdentifier}),
					${identifier},
					${text},
					${JSON.stringify(metadata)}::jsonb,
					${`[${embedding.join(',')}]`}::vector(3072),
					${importance}
				)
				RETURNING *
		`;

			const result = results[0];

			if (!result) {
				throw new Error('Failed to insert LongTermMemory');
			}

			return result;
		}),
);
