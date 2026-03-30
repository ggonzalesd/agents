import { Option } from '#/utils/Option';
import type { EntityDB } from '$/models/Entity.model';
import prisma from '$/config/prisma.config';
import type { PrismaTransactionClient } from '$/config/prisma.config';

export const ENTITY_TABLE_NAME = 'Entity';

// * Get entity by ID
export const getEntityById = async (
	{ id }: { id: string },
	tx?: PrismaTransactionClient,
): Promise<Option<EntityDB>> => {
	const db = tx ?? prisma;
	const entity = await db.entity.findUnique({ where: { id } });
	return Option.of(entity as EntityDB | null);
};

// * Create entity
export const createEntity = async (
	{
		id,
		life,
		maxLife,
		saturation,
		maxSaturation,
	}: {
		id: string;
		life: number;
		maxLife: number;
		saturation: number;
		maxSaturation: number;
	},
	tx?: PrismaTransactionClient,
): Promise<Option<EntityDB>> => {
	const db = tx ?? prisma;
	const entity = await db.entity.create({
		data: { id, life, maxLife, saturation, maxSaturation },
	});
	return Option.of(entity as EntityDB);
};

// * Save entity
export const saveEntity = async (
	{
		identifier,
		data,
	}: {
		identifier: string;
		data: Pick<EntityDB, 'life' | 'saturation'>;
	},
	tx?: PrismaTransactionClient,
): Promise<Option<EntityDB>> => {
	const db = tx ?? prisma;

	const agent = await db.agent.findUnique({ where: { identifier } });
	if (!agent) return Option.none();

	const entity = await db.entity.update({
		where: { id: agent.id },
		data: { life: data.life, saturation: data.saturation },
	});

	return Option.of(entity as EntityDB);
};
