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
		SELECT * FROM "LongTermMemory"
		WHERE "npcId" = (
			SELECT id FROM "Agent" WHERE identifier = ${npcIdentifier}
		) AND importance >= ${importance}
		ORDER BY embedding <=> ${vectorStr}::vector(3072)
		LIMIT ${limit}
	`;
};

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
}): Promise<LongTermMemoryDB> => {
	return prisma.$transaction(async (tx) => {
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

		const vectorStr = `[${embedding.join(',')}]`;
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
			RETURNING *
		`;

		const result = results[0];

		if (!result) {
			throw new Error('Failed to insert LongTermMemory');
		}

		return result;
	});
};
