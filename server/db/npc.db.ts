import { HttpError } from '#/utils/HttpError';
import { Option } from '#/utils/Option';
import type { AgentDB } from '$/models/Agent.model';
import type { EntityDB } from '$/models/Entity.model';
import type { NPCDB } from '$/models/NPC.model';
import prisma from '$/config/prisma.config';
import type { PrismaTransactionClient } from '$/config/prisma.config';

export const NPC_TABLE_NAME = 'NPC';

type NPCWithRelations = { npc: NPCDB; entity: EntityDB; agent: AgentDB };

function mapNPCResult(row: {
	id: string;
	description: string;
	skinUrl: string;
	model: string;
	entity: {
		id: string;
		life: number;
		maxLife: number;
		saturation: number;
		maxSaturation: number;
		agent: {
			id: string;
			identifier: string;
			display: string;
			positionX: number;
			positionY: number;
			positionZ: number;
			rotation: number;
			metadata: unknown;
			createdAt: Date;
		};
	};
}): NPCWithRelations {
	return {
		npc: {
			id: row.id,
			description: row.description,
			skinUrl: row.skinUrl,
			model: row.model,
		},
		entity: {
			id: row.entity.id,
			life: row.entity.life,
			maxLife: row.entity.maxLife,
			saturation: row.entity.saturation,
			maxSaturation: row.entity.maxSaturation,
		},
		agent: {
			id: row.entity.agent.id,
			identifier: row.entity.agent.identifier,
			display: row.entity.agent.display,
			positionX: row.entity.agent.positionX,
			positionY: row.entity.agent.positionY,
			positionZ: row.entity.agent.positionZ,
			rotation: row.entity.agent.rotation,
			metadata: (row.entity.agent.metadata ?? {}) as Record<string, unknown>,
			createdAt: row.entity.agent.createdAt,
		},
	};
}

const npcInclude = {
	entity: { include: { agent: true } },
} as const;

export const getNPCById = async (
	{ npcId }: { npcId: string },
	tx?: PrismaTransactionClient,
): Promise<Option<NPCWithRelations>> => {
	const db = tx ?? prisma;
	const row = await db.nPC.findUnique({
		where: { id: npcId },
		include: npcInclude,
	});
	if (!row) return Option.none();
	return Option.some(mapNPCResult(row));
};

export const updateNPC = async (
	{
		npcId,
		agent,
		entity,
		npc,
	}: {
		npcId: string;
		agent?: Partial<
			Omit<AgentDB, 'id' | 'rotation' | 'metadata' | 'createdAt'>
		>;
		entity?: Partial<Omit<EntityDB, 'id'>>;
		npc?: Partial<Omit<NPCDB, 'id'>>;
	},
	tx?: PrismaTransactionClient,
): Promise<Option<NPCWithRelations>> => {
	const run = async (db: PrismaTransactionClient) => {
		const existingNPC = await db.nPC.findUnique({ where: { id: npcId } });
		if (!existingNPC) throw HttpError.notFound('NPC not found');

		if (agent) {
			await db.agent.update({ where: { id: npcId }, data: agent });
		}
		if (entity) {
			await db.entity.update({ where: { id: npcId }, data: entity });
		}
		if (npc) {
			await db.nPC.update({ where: { id: npcId }, data: npc });
		}

		return getNPCById({ npcId }, db);
	};

	if (tx) return run(tx);
	return prisma.$transaction((txClient) => run(txClient));
};

export const getAllNPCs = async (
	_: Record<string, unknown>,
	tx?: PrismaTransactionClient,
): Promise<NPCWithRelations[]> => {
	const db = tx ?? prisma;
	const rows = await db.nPC.findMany({ include: npcInclude });
	return rows.map(mapNPCResult);
};

export const createNPC = async (
	{
		npc,
		entity,
		agent,
	}: {
		npc: Omit<NPCDB, 'id'>;
		entity: Omit<EntityDB, 'id'>;
		agent: Omit<AgentDB, 'id' | 'rotation' | 'metadata' | 'createdAt'>;
	},
	tx?: PrismaTransactionClient,
): Promise<Option<NPCWithRelations>> => {
	const run = async (db: PrismaTransactionClient) => {
		const createdAgent = await db.agent.create({
			data: {
				display: agent.display,
				identifier: agent.identifier,
				positionX: agent.positionX,
				positionY: agent.positionY,
				positionZ: agent.positionZ,
				rotation: 0,
				metadata: {},
			},
		});

		await db.entity.create({
			data: {
				id: createdAgent.id,
				life: entity.life,
				maxLife: entity.maxLife,
				saturation: entity.saturation,
				maxSaturation: entity.maxSaturation,
			},
		});

		const row = await db.nPC.create({
			data: {
				id: createdAgent.id,
				description: npc.description,
				skinUrl: npc.skinUrl,
				model: npc.model,
			},
			include: npcInclude,
		});

		return Option.some(mapNPCResult(row));
	};

	if (tx) return run(tx);
	return prisma.$transaction((txClient) => run(txClient));
};
