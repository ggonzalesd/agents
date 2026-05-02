import type { Prisma } from '$/generated/prisma/client';

import { Option } from '#/utils/Option';
import { EXPERIMENT_CATALOG } from '#/experiments/guia-experimentacion-v4';

import prisma from '$/config/prisma.config';
import type { PrismaTransactionClient } from '$/config/prisma.config';

export const experimentStateInclude = {
	user: {
		select: {
			id: true,
			username: true,
			role: true,
		},
	},
	phases: {
		orderBy: {
			phaseIndex: 'asc' as const,
		},
		include: {
			attempts: {
				orderBy: {
					attemptNumber: 'asc' as const,
				},
			},
		},
	},
} satisfies Prisma.UserExperimentInclude;

export type UserExperimentState = Prisma.UserExperimentGetPayload<{
	include: typeof experimentStateInclude;
}>;

const getDb = (tx?: PrismaTransactionClient) => tx ?? prisma;

export const getAssignmentByUserId = async (
	{
		userId,
		experimentKey,
	}: {
		userId: string;
		experimentKey: string;
	},
	tx?: PrismaTransactionClient,
) => {
	const db = getDb(tx);
	const assignment = await db.experimentAssignment.findUnique({
		where: {
			userId_experimentKey: {
				userId,
				experimentKey,
			},
		},
	});

	return Option.of(assignment);
};

export const getAssignmentsByUserId = async (
	{ userId }: { userId: string },
	tx?: PrismaTransactionClient,
) => {
	const db = getDb(tx);
	return db.experimentAssignment.findMany({
		where: { userId, enabled: true },
	});
};

export const getExperimentByUserId = async (
	{
		userId,
		experimentKey,
	}: {
		userId: string;
		experimentKey: string;
	},
	tx?: PrismaTransactionClient,
) => {
	const db = getDb(tx);
	const experiment = await db.userExperiment.findUnique({
		where: {
			userId_experimentKey: {
				userId,
				experimentKey,
			},
		},
		include: experimentStateInclude,
	});

	return Option.of(experiment);
};

export const getExperimentsByUserId = async (
	{ userId }: { userId: string },
	tx?: PrismaTransactionClient,
) => {
	const db = getDb(tx);
	return db.userExperiment.findMany({
		where: { userId },
		include: experimentStateInclude,
		orderBy: { createdAt: 'asc' },
	});
};

export const getMountedExperimentsForRoom = async (
	{ roomId }: { roomId: string },
	tx?: PrismaTransactionClient,
) => {
	const db = getDb(tx);
	return db.userExperiment.findMany({
		where: {
			status: 'IN_PROGRESS',
			mountedRoomId: roomId,
			mountedAt: { not: null },
		},
		include: experimentStateInclude,
		orderBy: { mountedAt: 'asc' },
	});
};

export const getMountedExperiment = async (
	{
		roomId,
		userId,
		experimentKey,
	}: {
		roomId: string;
		userId: string;
		experimentKey: string;
	},
	tx?: PrismaTransactionClient,
) => {
	const db = getDb(tx);
	const experiment = await db.userExperiment.findFirst({
		where: {
			userId,
			experimentKey,
			status: 'IN_PROGRESS',
			mountedRoomId: roomId,
			mountedAt: { not: null },
		},
		include: experimentStateInclude,
	});

	return Option.of(experiment);
};

export const createExperimentForUser = async (
	{
		userId,
		experimentKey,
	}: {
		userId: string;
		experimentKey: string;
	},
	tx: PrismaTransactionClient,
) => {
	const catalogEntry = EXPERIMENT_CATALOG.find((e) => e.key === experimentKey);
	if (!catalogEntry) {
		throw new Error(`Experiment key '${experimentKey}' not found in catalog`);
	}

	return tx.userExperiment.create({
		data: {
			userId,
			experimentKey,
			phases: {
				create: catalogEntry.phases.map((phase) => ({
					phaseKey: phase.key,
					phaseIndex: phase.index,
				})),
			},
		},
		include: experimentStateInclude,
	});
};
