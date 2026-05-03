import type { AgentDB } from '$/models/Agent.model';
import prisma from '$/config/prisma.config';
import type { PrismaTransactionClient } from '$/config/prisma.config';
import type { EntityDB } from '$/models/Entity.model';
import {
	ClassicNpcBehaviorType,
	type ClassicNPCDB,
	type ClassicNpcConfigDB,
} from '$/models/ClassicNPC.model';
import { HttpError } from '#/utils/HttpError';
import { Option } from '#/utils/Option';

export const CLASSIC_NPC_TABLE_NAME = 'ClassicNPC';

export type ClassicNPCWithRelations = {
	classicNpc: ClassicNPCDB;
	config: ClassicNpcConfigDB | null;
	entity: EntityDB;
	agent: AgentDB;
};

type ClassicNpcRow = {
	id: string;
	description: string;
	skinKey: string;
	config: {
		id: string;
		npcId: string;
		behaviorType: ClassicNpcBehaviorType;
		aggroRange: number;
		attackRange: number;
		detectionRange: number;
		attackDurationSec: number;
		attackCooldownMs: number;
		fleeHealthPercent: number | null;
		patrolRadius: number;
		extraConfig: unknown;
	} | null;
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
};

const classicNpcInclude = {
	config: true,
	entity: { include: { agent: true } },
} as const;

function mapClassicNpcResult(row: ClassicNpcRow): ClassicNPCWithRelations {
	return {
		classicNpc: {
			id: row.id,
			description: row.description,
			skinKey: row.skinKey,
		},
		config: row.config
			? {
				id: row.config.id,
				npcId: row.config.npcId,
				behaviorType: row.config.behaviorType,
				aggroRange: row.config.aggroRange,
				attackRange: row.config.attackRange,
				detectionRange: row.config.detectionRange,
				attackDurationSec: row.config.attackDurationSec,
				attackCooldownMs: row.config.attackCooldownMs,
				fleeHealthPercent: row.config.fleeHealthPercent,
				patrolRadius: row.config.patrolRadius,
				extraConfig: (row.config.extraConfig ?? {}) as ClassicNpcConfigDB['extraConfig'],
			}
			: null,
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

export const getClassicNPCById = async (
	{ npcId }: { npcId: string },
	tx?: PrismaTransactionClient,
): Promise<Option<ClassicNPCWithRelations>> => {
	const db = tx ?? prisma;
	const row = await db.classicNPC.findUnique({
		where: { id: npcId },
		include: classicNpcInclude,
	});

	if (!row) {
		return Option.none();
	}

	return Option.some(mapClassicNpcResult(row as ClassicNpcRow));
};

export const getAllClassicNPCs = async (
	_: Record<string, unknown>,
	tx?: PrismaTransactionClient,
): Promise<ClassicNPCWithRelations[]> => {
	const db = tx ?? prisma;
	const rows = await db.classicNPC.findMany({ include: classicNpcInclude });
	return rows.map((row) => mapClassicNpcResult(row as ClassicNpcRow));
};

export const createClassicNPC = async (
	{
		agent,
		entity,
		classicNpc,
		config,
	}: {
		agent: Omit<AgentDB, 'id' | 'rotation' | 'metadata' | 'createdAt'>;
		entity: Omit<EntityDB, 'id'>;
		classicNpc: Omit<ClassicNPCDB, 'id'>;
		config?: Omit<ClassicNpcConfigDB, 'id' | 'npcId'>;
	},
	tx?: PrismaTransactionClient,
): Promise<Option<ClassicNPCWithRelations>> => {
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

		await db.classicNPC.create({
			data: {
				id: createdAgent.id,
				description: classicNpc.description,
				skinKey: classicNpc.skinKey,
				config: config
					? {
						create: {
							behaviorType: config.behaviorType,
							aggroRange: config.aggroRange,
							attackRange: config.attackRange,
							detectionRange: config.detectionRange,
							attackDurationSec: config.attackDurationSec,
							attackCooldownMs: config.attackCooldownMs,
							fleeHealthPercent: config.fleeHealthPercent,
							patrolRadius: config.patrolRadius,
							extraConfig: config.extraConfig as never,
						},
					}
					: undefined,
			},
		});

		return getClassicNPCById({ npcId: createdAgent.id }, db);
	};

	if (tx) {
		return run(tx);
	}

	return prisma.$transaction((txClient) => run(txClient));
};

export const updateClassicNPC = async (
	{
		npcId,
		agent,
		entity,
		classicNpc,
		config,
	}: {
		npcId: string;
		agent?: Partial<
			Omit<AgentDB, 'id' | 'rotation' | 'metadata' | 'createdAt'>
		>;
		entity?: Partial<Omit<EntityDB, 'id'>>;
		classicNpc?: Partial<Omit<ClassicNPCDB, 'id'>>;
		config?: Partial<Omit<ClassicNpcConfigDB, 'id' | 'npcId'>>;
	},
	tx?: PrismaTransactionClient,
): Promise<Option<ClassicNPCWithRelations>> => {
	const run = async (db: PrismaTransactionClient) => {
		const existingNpc = await db.classicNPC.findUnique({ where: { id: npcId } });
		if (!existingNpc) {
			throw HttpError.notFound('Classic NPC not found');
		}

		if (agent) {
			await db.agent.update({ where: { id: npcId }, data: agent });
		}

		if (entity) {
			await db.entity.update({ where: { id: npcId }, data: entity });
		}

		if (classicNpc) {
			await db.classicNPC.update({ where: { id: npcId }, data: classicNpc });
		}

		if (config && Object.keys(config).length > 0) {
			await db.classicNpcConfig.upsert({
				where: { npcId },
				create: {
					npcId,
					behaviorType: config.behaviorType ?? ClassicNpcBehaviorType.PASSIVE,
					aggroRange: config.aggroRange ?? 10,
					attackRange: config.attackRange ?? 2,
					detectionRange: config.detectionRange ?? 15,
					attackDurationSec: config.attackDurationSec ?? 10,
					attackCooldownMs: config.attackCooldownMs ?? 1500,
					fleeHealthPercent: config.fleeHealthPercent ?? null,
					patrolRadius: config.patrolRadius ?? 8,
					extraConfig: (config.extraConfig ?? {}) as never,
				},
				update: {
					...config,
					extraConfig:
						config.extraConfig === undefined
							? undefined
							: (config.extraConfig as never),
				},
			});
		}

		return getClassicNPCById({ npcId }, db);
	};

	if (tx) {
		return run(tx);
	}

	return prisma.$transaction((txClient) => run(txClient));
};
