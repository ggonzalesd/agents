import { z } from 'zod';

import { EXPERIMENT_CATALOG } from '#/experiments/guia-experimentacion-v4';

export const experimentViewerModeSchema = z.enum(['OWNER', 'ADMIN_OBSERVER']);

export const experimentRunStatusSchema = z.enum([
	'NOT_STARTED',
	'IN_PROGRESS',
	'AWAITING_FEEDBACK',
	'COMPLETED',
]);

export const experimentPhaseStatusSchema = z.enum(['PENDING', 'ACTIVE', 'COMPLETED']);

export const experimentAttemptStatusSchema = z.enum([
	'ACTIVE',
	'FAILED',
	'COMPLETED',
	'ABORTED',
]);

export const submitExperimentFeedbackRequestSchema = z.object({
	experimentKey: z.string().min(1),
	rating: z.number().int().min(1).max(5),
	comment: z.string().trim().min(1).max(2000),
});

export const startExperimentRequestSchema = z.object({
	experimentKey: z.string().min(1),
});

export const experimentAttemptResponseSchema = z.object({
	attemptNumber: z.number().int().min(1),
	status: experimentAttemptStatusSchema,
	failureCount: z.number().int().min(0),
	elapsedMs: z.number().int().min(0),
	startedAt: z.string().nullable(),
	endedAt: z.string().nullable(),
});

export const experimentPhaseResponseSchema = z.object({
	phaseKey: z.string().min(1),
	componentKey: z.string().min(1),
	phaseIndex: z.number().int().min(0),
	title: z.string().min(1),
	description: z.string().min(1),
	status: experimentPhaseStatusSchema,
	attemptCount: z.number().int().min(0),
	failureCount: z.number().int().min(0),
	totalTimeMs: z.number().int().min(0),
	currentAttemptNumber: z.number().int().min(0),
	currentAttemptElapsedMs: z.number().int().min(0),
	currentAttemptStartedAt: z.string().nullable(),
	mountedAt: z.string().nullable(),
	completedAt: z.string().nullable(),
	attempts: z.array(experimentAttemptResponseSchema),
});

export const experimentStateResponseSchema = z.object({
	experimentKey: z.string().min(1),
	experimentTitle: z.string().min(1),
	assigned: z.boolean(),
	viewerMode: experimentViewerModeSchema.nullable(),
	canManage: z.boolean(),
	owner: z
		.object({
			userId: z.string().uuid(),
			username: z.string().min(1),
			role: z.enum(['USER', 'ADMIN', 'MODERATOR']),
		})
		.nullable(),
	status: experimentRunStatusSchema.nullable(),
	isMounted: z.boolean(),
	currentPhaseIndex: z.number().int().min(0).nullable(),
	totalPhases: z.number().int().min(0),
	completedPhases: z.number().int().min(0),
	rating: z.number().int().min(1).max(5).nullable(),
	comment: z.string().nullable(),
	phases: z.array(experimentPhaseResponseSchema),
});

export const experimentListItemSchema = z.object({
	experimentKey: z.string().min(1),
	experimentTitle: z.string().min(1),
	experimentDescription: z.string().min(1),
	status: experimentRunStatusSchema,
	canStart: z.boolean(),
	totalPhases: z.number().int().min(0),
	completedPhases: z.number().int().min(0),
});

const experimentApiResponseSchema = z.object({
	ok: z.boolean(),
	message: z.string(),
});

export const experimentStateApiResponseSchema = experimentApiResponseSchema.extend({
	data: z.object({
		experiment: experimentStateResponseSchema.nullable(),
	}),
});

export const experimentListApiResponseSchema = experimentApiResponseSchema.extend({
	data: z.object({
		experiments: z.array(experimentListItemSchema),
	}),
});

export const experimentAdminActiveApiResponseSchema = experimentApiResponseSchema.extend({
	data: z.object({
		experiments: z.array(experimentStateResponseSchema.nullable()),
	}),
});

export type ExperimentViewerMode = z.infer<typeof experimentViewerModeSchema>;
export type ExperimentRunStatus = z.infer<typeof experimentRunStatusSchema>;
export type ExperimentPhaseStatus = z.infer<typeof experimentPhaseStatusSchema>;
export type ExperimentAttemptStatus = z.infer<typeof experimentAttemptStatusSchema>;
export type SubmitExperimentFeedbackRequest = z.infer<
	typeof submitExperimentFeedbackRequestSchema
>;
export type StartExperimentRequest = z.infer<typeof startExperimentRequestSchema>;
export type ExperimentStateResponse = z.infer<typeof experimentStateResponseSchema>;
export type ExperimentListItem = z.infer<typeof experimentListItemSchema>;
// Keep for backward compat
export const EXPERIMENT_KEYS = EXPERIMENT_CATALOG.map((e) => e.key);
