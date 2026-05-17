import {
	EXPERIMENT_CATALOG,
	EXPERIMENT_ROOM_ID,
	getExperimentByKey,
	getExperimentPhaseByKey,
} from '#/experiments/guia-experimentacion-v4';
import type {
	ExperimentListItem,
	ExperimentStateResponse,
	ExperimentViewerMode,
	SubmitExperimentFeedbackRequest,
} from '#/schema/experiment.schema';
import { HttpError } from '#/utils/HttpError';

import prisma from '$/config/prisma.config';
import type { PrismaTransactionClient } from '$/config/prisma.config';
import * as UserExperimentRepository from '$/db/user-experiment.db';
import type { Role } from '$/models/Role.model';

export type ExperimentActor = {
	userId: string;
	username: string;
	role: Role;
};

const getCurrentPhase = (
	experiment: UserExperimentRepository.UserExperimentState,
) => {
	const phase = experiment.phases.find(
		(item) => item.phaseIndex === experiment.currentPhaseIndex,
	);

	if (!phase) {
		throw HttpError.server('Current experiment phase not found');
	}

	return phase;
};

const mapExperimentState = ({
	experiment,
	viewerMode,
	assigned,
	fallbackOwner,
}: {
	experiment: UserExperimentRepository.UserExperimentState | null;
	viewerMode: ExperimentViewerMode | null;
	assigned: boolean;
	fallbackOwner: ExperimentActor | null;
}): ExperimentStateResponse | null => {
	if (!experiment) {
		if (!assigned || !fallbackOwner || !viewerMode) {
			return null;
		}

		return null;
	}

	const catalogEntry = getExperimentByKey(experiment.experimentKey);

	return {
		id: experiment.id,
		experimentKey: experiment.experimentKey,
		experimentTitle: catalogEntry?.title ?? experiment.experimentKey,
		assigned,
		viewerMode,
		canManage: viewerMode === 'OWNER',
		owner: {
			userId: experiment.user.id,
			username: experiment.user.username,
			role: experiment.user.role,
		},
		status: experiment.status,
		isMounted: experiment.mountedAt !== null,
		currentPhaseIndex: experiment.currentPhaseIndex,
		totalPhases: catalogEntry?.phases.length ?? experiment.phases.length,
		completedPhases: experiment.phases.filter((phase) => phase.status === 'COMPLETED').length,
		rating: experiment.rating,
		comment: experiment.comment,
		phases: experiment.phases.map((phase) => {
			const phaseDefinition = getExperimentPhaseByKey(phase.phaseKey, experiment.experimentKey);
			return {
				id: phase.id,
				phaseKey: phase.phaseKey,
				componentKey: phaseDefinition?.componentKey ?? phase.phaseKey,
				phaseIndex: phase.phaseIndex,
				title: phaseDefinition?.title ?? phase.phaseKey,
				description: phaseDefinition?.description ?? phase.phaseKey,
				status: phase.status,
				attemptCount: phase.attemptCount,
				failureCount: phase.failureCount,
				totalTimeMs: phase.totalTimeMs,
				currentAttemptNumber: phase.currentAttemptNumber,
				currentAttemptElapsedMs: phase.currentAttemptElapsedMs,
				currentAttemptStartedAt:
					phase.currentAttemptStartedAt?.toISOString() ?? null,
				mountedAt: phase.mountedAt?.toISOString() ?? null,
				completedAt: phase.completedAt?.toISOString() ?? null,
				attempts: phase.attempts.map((attempt) => ({
					attemptNumber: attempt.attemptNumber,
					status: attempt.status,
					failureCount: attempt.failureCount,
					elapsedMs: attempt.elapsedMs,
					startedAt: attempt.startedAt.toISOString(),
					endedAt: attempt.endedAt?.toISOString() ?? null,
				})),
			};
		}),
	};
};

const pauseCurrentAttempt = async ({
	tx,
	phaseId,
	currentAttemptNumber,
	currentAttemptStartedAt,
	currentAttemptElapsedMs,
	totalTimeMs,
}: {
	tx: PrismaTransactionClient;
	phaseId: string;
	currentAttemptNumber: number;
	currentAttemptStartedAt: Date | null;
	currentAttemptElapsedMs: number;
	totalTimeMs: number;
}) => {
	const attempt =
		currentAttemptNumber > 0
			? await tx.userExperimentAttempt.findUnique({
					where: {
						phaseId_attemptNumber: {
							phaseId,
							attemptNumber: currentAttemptNumber,
						},
					},
				})
			: null;

	if (!currentAttemptStartedAt || currentAttemptNumber === 0 || !attempt) {
		return {
			deltaMs: 0,
			attempt,
			phasePatch: {
				currentAttemptStartedAt: null,
				mountedAt: null,
				totalTimeMs,
				currentAttemptElapsedMs,
			},
		};
	}

	const deltaMs = Math.max(0, Date.now() - currentAttemptStartedAt.getTime());

	await tx.userExperimentAttempt.update({
		where: { id: attempt.id },
		data: { elapsedMs: attempt.elapsedMs + deltaMs },
	});

	return {
		deltaMs,
		attempt,
		phasePatch: {
			currentAttemptStartedAt: null,
			mountedAt: null,
			totalTimeMs: totalTimeMs + deltaMs,
			currentAttemptElapsedMs: currentAttemptElapsedMs + deltaMs,
		},
	};
};

const createAttempt = async ({
	tx,
	phaseId,
	attemptNumber,
	startedAt,
}: {
	tx: PrismaTransactionClient;
	phaseId: string;
	attemptNumber: number;
	startedAt: Date;
}) => {
	await tx.userExperimentAttempt.create({
		data: {
			phaseId,
			attemptNumber,
			status: 'ACTIVE',
			startedAt,
		},
	});
};

const getOrCreateExperiment = async (
	userId: string,
	experimentKey: string,
	tx: PrismaTransactionClient,
) => {
	const experimentOp = await UserExperimentRepository.getExperimentByUserId(
		{ userId, experimentKey },
		tx,
	);

	if (experimentOp.isSome()) {
		return experimentOp.unwrap();
	}

	return UserExperimentRepository.createExperimentForUser({ userId, experimentKey }, tx);
};

const getExperimentForUserOrThrow = async (
	userId: string,
	experimentKey: string,
	tx?: PrismaTransactionClient,
) => {
	const experimentOp = await UserExperimentRepository.getExperimentByUserId(
		{ userId, experimentKey },
		tx,
	);

	return experimentOp.orElseThrow(() =>
		HttpError.notFound('No experiment found for current user'),
	);
};

export const mountExperimentForUser = async ({
	actor,
	experimentKey,
	roomId,
}: {
	actor: ExperimentActor;
	experimentKey: string;
	roomId: string;
}) => {
	const assignmentOp = await UserExperimentRepository.getAssignmentByUserId({
		userId: actor.userId,
		experimentKey,
	});

	if (assignmentOp.isNone() || !assignmentOp.unwrap().enabled) {
		throw HttpError.forbidden('Experiment is not assigned to this user');
	}

	return prisma.$transaction(async (tx) => {
		const experiment = await getOrCreateExperiment(actor.userId, experimentKey, tx);

		if (experiment.status === 'COMPLETED' || experiment.status === 'AWAITING_FEEDBACK') {
			throw HttpError.badRequest('Experiment is already completed');
		}

		const currentPhase = getCurrentPhase(experiment);
		const now = new Date();

		await tx.userExperiment.update({
			where: { id: experiment.id },
			data: {
				status: 'IN_PROGRESS',
				startedAt: experiment.startedAt ?? now,
				mountedAt: now,
				mountedRoomId: roomId,
			},
		});

		if (currentPhase.status === 'PENDING' || currentPhase.currentAttemptNumber === 0) {
			await tx.userExperimentPhase.update({
				where: { id: currentPhase.id },
				data: {
					status: 'ACTIVE',
					attemptCount: 1,
					currentAttemptNumber: 1,
					currentAttemptElapsedMs: 0,
					currentAttemptStartedAt: now,
					mountedAt: now,
				},
			});

			await createAttempt({
				tx,
				phaseId: currentPhase.id,
				attemptNumber: 1,
				startedAt: now,
			});
		} else if (
			currentPhase.status === 'ACTIVE' &&
			currentPhase.currentAttemptStartedAt === null
		) {
			await tx.userExperimentPhase.update({
				where: { id: currentPhase.id },
				data: {
					currentAttemptStartedAt: now,
					mountedAt: now,
				},
			});
		}

		return getExperimentForUserOrThrow(actor.userId, experimentKey, tx);
	});
};

export const unmountExperimentForUser = async ({
	userId,
	experimentKey,
	roomId,
}: {
	userId: string;
	experimentKey: string;
	roomId: string;
}) => {
	const experimentOp = await UserExperimentRepository.getExperimentByUserId({
		userId,
		experimentKey,
	});

	if (experimentOp.isNone()) {
		return null;
	}

	const experiment = experimentOp.unwrap();
	if (experiment.mountedRoomId !== roomId || experiment.mountedAt === null) {
		return experiment;
	}

	return prisma.$transaction(async (tx) => {
		const currentExperiment = await getExperimentForUserOrThrow(userId, experimentKey, tx);
		const currentPhase = getCurrentPhase(currentExperiment);

		if (currentPhase.status === 'ACTIVE') {
			const pause = await pauseCurrentAttempt({
				tx,
				phaseId: currentPhase.id,
				currentAttemptNumber: currentPhase.currentAttemptNumber,
				currentAttemptStartedAt: currentPhase.currentAttemptStartedAt,
				currentAttemptElapsedMs: currentPhase.currentAttemptElapsedMs,
				totalTimeMs: currentPhase.totalTimeMs,
			});

			await tx.userExperimentPhase.update({
				where: { id: currentPhase.id },
				data: pause.phasePatch,
			});
		}

		await tx.userExperiment.update({
			where: { id: currentExperiment.id },
			data: {
				mountedAt: null,
				mountedRoomId: null,
			},
		});

		return getExperimentForUserOrThrow(userId, experimentKey, tx);
	});
};

export const failCurrentAttemptFromWorld = async ({
	userId,
	experimentKey,
}: {
	userId: string;
	experimentKey: string;
}) => {
	return prisma.$transaction(async (tx) => {
		const experiment = await getExperimentForUserOrThrow(userId, experimentKey, tx);
		if (experiment.status !== 'IN_PROGRESS' || experiment.mountedAt === null) {
			throw HttpError.badRequest('Experiment is not mounted');
		}

		const currentPhase = getCurrentPhase(experiment);
		if (currentPhase.status !== 'ACTIVE') {
			throw HttpError.badRequest('Current phase is not active');
		}

		const pause = await pauseCurrentAttempt({
			tx,
			phaseId: currentPhase.id,
			currentAttemptNumber: currentPhase.currentAttemptNumber,
			currentAttemptStartedAt: currentPhase.currentAttemptStartedAt,
			currentAttemptElapsedMs: currentPhase.currentAttemptElapsedMs,
			totalTimeMs: currentPhase.totalTimeMs,
		});

		if (!pause.attempt) {
			throw HttpError.server('Current experiment attempt not found');
		}

		const now = new Date();
		await tx.userExperimentAttempt.update({
			where: { id: pause.attempt.id },
			data: {
				status: 'FAILED',
				failureCount: pause.attempt.failureCount + 1,
				endedAt: now,
			},
		});

		const nextAttemptNumber = currentPhase.currentAttemptNumber + 1;
		await tx.userExperimentPhase.update({
			where: { id: currentPhase.id },
			data: {
				status: 'ACTIVE',
				failureCount: currentPhase.failureCount + 1,
				attemptCount: nextAttemptNumber,
				currentAttemptNumber: nextAttemptNumber,
				currentAttemptElapsedMs: 0,
				currentAttemptStartedAt: now,
				mountedAt: now,
				totalTimeMs: pause.phasePatch.totalTimeMs,
			},
		});

		await createAttempt({
			tx,
			phaseId: currentPhase.id,
			attemptNumber: nextAttemptNumber,
			startedAt: now,
		});

		return getExperimentForUserOrThrow(userId, experimentKey, tx);
	});
};

export const resolveCurrentPhaseFromWorld = async ({
	userId,
	experimentKey,
}: {
	userId: string;
	experimentKey: string;
}) => {
	return prisma.$transaction(async (tx) => {
		const experiment = await getExperimentForUserOrThrow(userId, experimentKey, tx);
		if (experiment.status !== 'IN_PROGRESS' || experiment.mountedAt === null) {
			throw HttpError.badRequest('Experiment is not mounted');
		}

		const currentPhase = getCurrentPhase(experiment);
		if (currentPhase.status !== 'ACTIVE') {
			throw HttpError.badRequest('Current phase is not active');
		}

		const pause = await pauseCurrentAttempt({
			tx,
			phaseId: currentPhase.id,
			currentAttemptNumber: currentPhase.currentAttemptNumber,
			currentAttemptStartedAt: currentPhase.currentAttemptStartedAt,
			currentAttemptElapsedMs: currentPhase.currentAttemptElapsedMs,
			totalTimeMs: currentPhase.totalTimeMs,
		});

		if (!pause.attempt) {
			throw HttpError.server('Current experiment attempt not found');
		}

		const now = new Date();
		await tx.userExperimentAttempt.update({
			where: { id: pause.attempt.id },
			data: {
				status: 'COMPLETED',
				endedAt: now,
			},
		});

		await tx.userExperimentPhase.update({
			where: { id: currentPhase.id },
			data: {
				status: 'COMPLETED',
				totalTimeMs: pause.phasePatch.totalTimeMs,
				currentAttemptElapsedMs: pause.phasePatch.currentAttemptElapsedMs,
				currentAttemptStartedAt: null,
				mountedAt: null,
				completedAt: now,
			},
		});

		const catalogEntry = getExperimentByKey(experimentKey);

		if (!catalogEntry) {
			throw HttpError.server('Experiment catalog entry not found');
		}

		const currentCatalogIndex = currentPhase.phaseIndex;
		const isLastPhase = currentCatalogIndex === catalogEntry.phases.length - 1;

		if (isLastPhase) {
			await tx.userExperiment.update({
				where: { id: experiment.id },
				data: {
					status: 'AWAITING_FEEDBACK',
					mountedAt: null,
					mountedRoomId: null,
				},
			});
		} else {
			const nextPhaseIndex = currentCatalogIndex + 1;

			const nextPhase = experiment.phases.find(
				(phase) => phase.phaseIndex === nextPhaseIndex,
			);

			if (!nextPhase) {
				throw HttpError.server('Next experiment phase not found');
			}

			await tx.userExperimentPhase.update({
				where: { id: nextPhase.id },
				data: {
					status: 'ACTIVE',
					attemptCount: 1,
					currentAttemptNumber: 1,
					currentAttemptElapsedMs: 0,
					currentAttemptStartedAt: now,
					mountedAt: now,
				},
			});

			await createAttempt({
				tx,
				phaseId: nextPhase.id,
				attemptNumber: 1,
				startedAt: now,
			});

			await tx.userExperiment.update({
				where: { id: experiment.id },
				data: { currentPhaseIndex: nextPhaseIndex },
			});
		}

		return getExperimentForUserOrThrow(userId, experimentKey, tx);
	});
};

export const submitExperimentFeedback = async ({
	actor,
	payload,
}: {
	actor: ExperimentActor;
	payload: SubmitExperimentFeedbackRequest;
}) => {
	return prisma.$transaction(async (tx) => {
		const experiment = await getExperimentForUserOrThrow(
			actor.userId,
			payload.experimentKey,
			tx,
		);

		if (experiment.status !== 'AWAITING_FEEDBACK') {
			throw HttpError.badRequest('Experiment is not awaiting feedback');
		}

		const now = new Date();
		await tx.userExperiment.update({
			where: { id: experiment.id },
			data: {
				status: 'COMPLETED',
				rating: payload.rating,
				comment: payload.comment,
				completedAt: now,
				mountedAt: null,
				mountedRoomId: null,
			},
		});

		return getExperimentForUserOrThrow(actor.userId, payload.experimentKey, tx);
	});
};

export const resetExperiment = async ({
	actor,
	experimentKey,
}: {
	actor: ExperimentActor;
	experimentKey: string;
}) => {
	return prisma.$transaction(async (tx) => {
		const assignmentOp = await UserExperimentRepository.getAssignmentByUserId(
			{ userId: actor.userId, experimentKey },
			tx,
		);

		if (assignmentOp.isNone() || !assignmentOp.unwrap().enabled) {
			throw HttpError.forbidden('Experiment is not assigned to this user');
		}

		const experiment = await getExperimentForUserOrThrow(actor.userId, experimentKey, tx);
		const phaseIds = experiment.phases.map((phase) => phase.id);

		if (phaseIds.length > 0) {
			await tx.userExperimentAttempt.deleteMany({
				where: { phaseId: { in: phaseIds } },
			});
		}

		await tx.userExperimentPhase.updateMany({
			where: { experimentId: experiment.id },
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

		await tx.userExperiment.update({
			where: { id: experiment.id },
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
		});

		return getExperimentForUserOrThrow(actor.userId, experimentKey, tx);
	});
};

export const getExperimentStateForUser = async (
	actor: ExperimentActor,
	experimentKey: string,
) => {
	const assignmentOp = await UserExperimentRepository.getAssignmentByUserId({
		userId: actor.userId,
		experimentKey,
	});
	const experimentOp = await UserExperimentRepository.getExperimentByUserId({
		userId: actor.userId,
		experimentKey,
	});

	return mapExperimentState({
		experiment: experimentOp.raw(),
		viewerMode: assignmentOp.isSome() ? 'OWNER' : null,
		assigned: assignmentOp.map((value) => value.enabled).raw() ?? false,
		fallbackOwner: assignmentOp.isSome() ? actor : null,
	});
};

export const getAvailableExperimentsForUser = async (
	actor: ExperimentActor,
): Promise<ExperimentListItem[]> => {
	const assignments = await UserExperimentRepository.getAssignmentsByUserId({
		userId: actor.userId,
	});

	if (assignments.length === 0) {
		return [];
	}

	const experiments = await UserExperimentRepository.getExperimentsByUserId({
		userId: actor.userId,
	});

	const experimentMap = new Map(experiments.map((e) => [e.experimentKey, e]));

	return assignments.map((assignment) => {
		const catalogEntry = getExperimentByKey(assignment.experimentKey);
		const experiment = experimentMap.get(assignment.experimentKey);

		const status = experiment?.status ?? 'NOT_STARTED';
		const completedPhases = experiment?.phases.filter((p) => p.status === 'COMPLETED').length ?? 0;
		const totalPhases = catalogEntry?.phases.length ?? 0;

		return {
			experimentKey: assignment.experimentKey,
			experimentTitle: catalogEntry?.title ?? assignment.experimentKey,
			experimentDescription: catalogEntry?.description ?? '',
			status,
			canStart: status === 'NOT_STARTED' || status === 'IN_PROGRESS',
			totalPhases,
			completedPhases,
		};
	});
};

export const getActiveExperimentsForAdmin = async (roomId: string) => {
	const experiments = await UserExperimentRepository.getMountedExperimentsForRoom({ roomId });
	return experiments.map((experiment) =>
		mapExperimentState({
			experiment,
			viewerMode: 'ADMIN_OBSERVER',
			assigned: false,
			fallbackOwner: null,
		}),
	);
};

export const getAllExperimentsForAdmin = async () => {
	const experiments = await UserExperimentRepository.getAllExperiments();
	return experiments.map((experiment) =>
		mapExperimentState({
			experiment,
			viewerMode: 'ADMIN_OBSERVER',
			assigned: false,
			fallbackOwner: null,
		}),
	);
};

export const getExperimentStateForUserId = async (
	userId: string,
	experimentKey: string,
) => {
	const experimentOp = await UserExperimentRepository.getExperimentByUserId({
		userId,
		experimentKey,
	});

	return experimentOp.orElseThrow(() =>
		HttpError.notFound('No experiment found for user'),
	);
};

export const getDefaultExperimentRoomId = (): string => EXPERIMENT_ROOM_ID;

export const getAllExperimentKeys = (): string[] =>
	EXPERIMENT_CATALOG.map((e) => e.key);

export const getInProgressExperimentForUser = async (
	userId: string,
): Promise<{ experimentKey: string } | null> => {
	const experiments = await UserExperimentRepository.getExperimentsByUserId({ userId });
	const found = experiments.find((e) => e.status === 'IN_PROGRESS');
	return found ? { experimentKey: found.experimentKey } : null;
};
