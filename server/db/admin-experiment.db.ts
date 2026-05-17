import type { ExperimentRunStatus, ExperimentPhaseStatus } from '@prisma/client';

import prisma from '$/config/prisma.config';
import type { PrismaTransactionClient } from '$/config/prisma.config';
import { experimentStateInclude } from './user-experiment.db';

const getDb = (tx?: PrismaTransactionClient) => tx ?? prisma;

export const getAllAssignments = async (tx?: PrismaTransactionClient) => {
	const db = getDb(tx);
	return db.experimentAssignment.findMany({
		include: {
			user: {
				select: {
					id: true,
					username: true,
					role: true,
				},
			},
		},
		orderBy: [{ experimentKey: 'asc' }, { createdAt: 'asc' }],
	});
};

export const getAssignmentById = async (
	id: string,
	tx?: PrismaTransactionClient,
) => {
	const db = getDb(tx);
	return db.experimentAssignment.findUnique({
		where: { id },
		include: {
			user: {
				select: {
					id: true,
					username: true,
					role: true,
				},
			},
		},
	});
};

export const deleteAssignmentById = async (
	id: string,
	tx?: PrismaTransactionClient,
) => {
	const db = getDb(tx);
	const assignment = await db.experimentAssignment.delete({
		where: { id },
		include: {
			user: {
				select: {
					id: true,
					username: true,
					role: true,
				},
			},
		},
	});
	return assignment;
};

export const getExperimentById = async (
	id: string,
	tx?: PrismaTransactionClient,
) => {
	const db = getDb(tx);
	return db.userExperiment.findUnique({
		where: { id },
		include: experimentStateInclude,
	});
};

export const getPhaseById = async (
	id: string,
	tx?: PrismaTransactionClient,
) => {
	const db = getDb(tx);
	return db.userExperimentPhase.findUnique({
		where: { id },
		include: { attempts: { orderBy: { attemptNumber: 'asc' } } },
	});
};

export const updateExperimentById = async (
	id: string,
	data: {
		status?: ExperimentRunStatus;
		rating?: number | null;
		comment?: string | null;
		completedAt?: Date | null;
		mountedAt?: Date | null;
		mountedRoomId?: string | null;
	},
	tx?: PrismaTransactionClient,
) => {
	const db = getDb(tx);
	return db.userExperiment.update({
		where: { id },
		data,
		include: experimentStateInclude,
	});
};

export const updatePhaseById = async (
	id: string,
	data: {
		status?: ExperimentPhaseStatus;
		failureCount?: number;
		attemptCount?: number;
	},
	tx?: PrismaTransactionClient,
) => {
	const db = getDb(tx);
	return db.userExperimentPhase.update({
		where: { id },
		data,
	});
};

export const resetExperimentProgressDb = async (
	id: string,
	tx?: PrismaTransactionClient,
) => {
	const db = getDb(tx);

	const phaseIds = await db.userExperimentPhase.findMany({
		where: { experimentId: id },
		select: { id: true },
	});

	const flatPhaseIds = phaseIds.map((p) => p.id);

	if (flatPhaseIds.length > 0) {
		await db.userExperimentAttempt.deleteMany({
			where: { phaseId: { in: flatPhaseIds } },
		});
	}

	await db.userExperimentPhase.updateMany({
		where: { experimentId: id },
		data: {
			status: 'PENDING',
			attemptCount: 0,
			failureCount: 0,
			totalTimeMs: 0,
			currentAttemptNumber: 0,
			currentAttemptElapsedMs: 0,
			currentAttemptStartedAt: null,
			mountedAt: null,
			completedAt: null,
		},
	});

	return db.userExperiment.update({
		where: { id },
		data: {
			status: 'NOT_STARTED',
			currentPhaseIndex: 0,
			startedAt: null,
			completedAt: null,
			rating: null,
			comment: null,
			mountedAt: null,
			mountedRoomId: null,
		},
		include: experimentStateInclude,
	});
};

export const resetPhaseProgressDb = async (
	id: string,
	tx?: PrismaTransactionClient,
) => {
	const db = getDb(tx);

	await db.userExperimentAttempt.deleteMany({
		where: { phaseId: id },
	});

	return db.userExperimentPhase.update({
		where: { id },
		data: {
			status: 'PENDING',
			attemptCount: 0,
			failureCount: 0,
			totalTimeMs: 0,
			currentAttemptNumber: 0,
			currentAttemptElapsedMs: 0,
			currentAttemptStartedAt: null,
			mountedAt: null,
			completedAt: null,
		},
	});
};

export const deletePhaseById = async (
	id: string,
	tx?: PrismaTransactionClient,
) => {
	const db = getDb(tx);
	return db.userExperimentPhase.delete({
		where: { id },
	});
};

export const reindexPhasesAfterDelete = async (
	experimentId: string,
	deletedPhaseIndex: number,
	tx?: PrismaTransactionClient,
) => {
	const db = getDb(tx);
	await db.userExperimentPhase.updateMany({
		where: {
			experimentId,
			phaseIndex: { gt: deletedPhaseIndex },
		},
		data: {
			phaseIndex: { decrement: 1 },
		},
	});
};

export const getAllExperimentsForExport = async (
	tx?: PrismaTransactionClient,
) => {
	const db = getDb(tx);
	return db.userExperiment.findMany({
		include: {
			user: {
				select: {
					id: true,
					username: true,
					role: true,
				},
			},
			phases: {
				orderBy: { phaseIndex: 'asc' },
				include: {
					attempts: {
						orderBy: { attemptNumber: 'asc' },
					},
				},
			},
		},
		orderBy: [{ createdAt: 'desc' }],
	});
};