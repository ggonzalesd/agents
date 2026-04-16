import type { LongTermMemoryDB } from '$/models/LongTermMemory.model';
import prisma from '$/config/prisma.config';

export const retrieveLongTermMemory = async ({
	npcIdentifier,
	queryEmbedding,
	limit,
	importance,
}: {
	npcIdentifier: string;
	queryEmbedding: number[];
	limit: number;
	importance: number;
}): Promise<LongTermMemoryDB[]> => {
	const vectorStr = `[${queryEmbedding.join(',')}]`;

	return prisma.$queryRaw<LongTermMemoryDB[]>`
		SELECT id, "npcId", identifier, text, metadata, importance, "createdAt",
			embedding::text as embedding
		FROM "LongTermMemory"
		WHERE "npcId" = (
			SELECT id FROM "Agent" WHERE identifier = ${npcIdentifier}
		) AND importance >= ${importance}
		ORDER BY
			(1.0 - (embedding <=> ${vectorStr}::vector(3072))) * 0.7
			+ (1.0 / (1.0 + EXTRACT(EPOCH FROM (NOW() - "createdAt")) / 86400.0)) * 0.3
		DESC
		LIMIT ${limit}
	`;
};

const DEDUP_SIMILARITY_THRESHOLD = 0.92;

export const saveLongTermMemory = async ({
	npcIdentifier,
	text,
	metadata,
	embedding,
	importance,
}: {
	npcIdentifier: string;
	text: string;
	metadata: object;
	embedding: number[];
	importance: number;
}): Promise<LongTermMemoryDB | null> => {
	return prisma.$transaction(async (tx) => {
		const vectorStr = `[${embedding.join(',')}]`;

		// Check for semantically similar existing memories
		const duplicates = await tx.$queryRaw<
			{ id: string; importance: number }[]
		>`
			SELECT id, importance
			FROM "LongTermMemory"
			WHERE "npcId" = (
				SELECT id FROM "Agent" WHERE identifier = ${npcIdentifier}
			)
			AND (1.0 - (embedding <=> ${vectorStr}::vector(3072))) > ${DEDUP_SIMILARITY_THRESHOLD}
			LIMIT 1
		`;

		if (duplicates.length > 0) {
			// Update importance if the new one is higher
			const existing = duplicates[0];
			if (importance > existing.importance) {
				await tx.$queryRaw`
					UPDATE "LongTermMemory"
					SET importance = ${importance}
					WHERE id = ${existing.id}::uuid
				`;
			}
			return null;
		}

		let identifier: string;
		let count = 0;
		let existingCount: number;

		do {
			identifier = Math.random()
				.toString(36)
				.substring(2, 5 + count);
			if (count < 5) count++;

			const result = await tx.$queryRaw<{ count: bigint }[]>`
				SELECT COUNT(*) as count FROM "LongTermMemory" WHERE identifier = ${identifier}
			`;
			existingCount = Number(result[0].count);
		} while (existingCount > 0);

		const existingNPC = await tx.nPC.findFirst({
			where: { entity: { agent: { identifier: npcIdentifier } } },
		});

		if (!existingNPC) {
			throw new Error(`NPC with identifier ${npcIdentifier} not found`);
		}

		const metadataJson = JSON.stringify(metadata);

		const results = await tx.$queryRaw<LongTermMemoryDB[]>`
			INSERT INTO "LongTermMemory" ("npcId", identifier, text, metadata, embedding, importance)
			VALUES (
				(SELECT id FROM "Agent" WHERE identifier = ${npcIdentifier}),
				${identifier},
				${text},
				${metadataJson}::jsonb,
				${vectorStr}::vector(3072),
				${importance}
			)
			RETURNING id, "npcId", identifier, text, metadata, importance, "createdAt",
				embedding::text as embedding
		`;

		const result = results[0];

		if (!result) {
			throw new Error('Failed to insert LongTermMemory');
		}

		return result;
	});
};
