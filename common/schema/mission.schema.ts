import { z } from 'zod';

export const entityTypeSchema = z.enum(['USER', 'NPC']);

export const missionStatusSchema = z.enum([
	'OPEN',
	'IN_PROGRESS',
	'COMPLETED',
	'CANCELLED',
]);

export const acceptanceStatusSchema = z.enum([
	'ACTIVE',
	'COMPLETED',
	'FAILED',
	'ABANDONED',
]);

export const createMissionSchema = z.object({
	title: z.string().min(3).max(255),
	description: z.string().min(10).max(2000),
	rewardItemType: z.string().max(50).nullable().optional(),
	rewardItemQty: z.number().int().min(1).nullable().optional(),
});

export const acceptMissionSchema = z.object({
	missionId: z.string().uuid(),
});

export const completeMissionSchema = z.object({
	missionId: z.string().uuid(),
	acceptorId: z.string().uuid(),
});

export const abandonMissionSchema = z.object({
	missionId: z.string().uuid(),
});

export const missionResponseSchema = z.object({
	id: z.string().uuid(),
	creatorId: z.string().uuid(),
	creatorType: entityTypeSchema,
	title: z.string(),
	description: z.string(),
	rewardItemType: z.string().nullable(),
	rewardItemQty: z.number().int().nullable(),
	status: missionStatusSchema,
	createdAt: z.coerce.date(),
	completedAt: z.coerce.date().nullable(),
});

export const missionAcceptanceResponseSchema = z.object({
	id: z.string().uuid(),
	missionId: z.string().uuid(),
	acceptorId: z.string().uuid(),
	acceptorType: entityTypeSchema,
	status: acceptanceStatusSchema,
	acceptedAt: z.coerce.date(),
	completedAt: z.coerce.date().nullable(),
});

export type CreateMissionInput = z.infer<typeof createMissionSchema>;
export type AcceptMissionInput = z.infer<typeof acceptMissionSchema>;
export type CompleteMissionInput = z.infer<typeof completeMissionSchema>;
export type AbandonMissionInput = z.infer<typeof abandonMissionSchema>;
export type EntityType = z.infer<typeof entityTypeSchema>;
export type MissionStatus = z.infer<typeof missionStatusSchema>;
export type AcceptanceStatus = z.infer<typeof acceptanceStatusSchema>;

// API Response schemas
const apiResSchema = z.object({
	ok: z.boolean(),
	message: z.string(),
});

export const missionWithAcceptancesSchema = missionResponseSchema.extend({
	acceptances: z.array(missionAcceptanceResponseSchema),
});

export const getMissionResSchema = apiResSchema.extend({
	data: z.object({
		mission: missionWithAcceptancesSchema,
	}),
});

export const listMissionsResSchema = apiResSchema.extend({
	data: z.object({
		missions: z.array(missionResponseSchema),
	}),
});

export const listMissionsWithAcceptancesResSchema = apiResSchema.extend({
	data: z.object({
		missions: z.array(missionWithAcceptancesSchema),
	}),
});

export const createMissionResSchema = apiResSchema.extend({
	data: z.object({
		mission: missionResponseSchema,
	}),
});

export const acceptMissionResSchema = apiResSchema.extend({
	data: z.object({
		acceptance: missionAcceptanceResponseSchema,
	}),
});

export const completeMissionResSchema = apiResSchema.extend({
	data: z.object({
		mission: missionResponseSchema,
	}),
});

export const abandonMissionResSchema = apiResSchema.extend({
	data: z.object({
		acceptance: missionAcceptanceResponseSchema,
	}),
});

export type MissionResponse = z.infer<typeof missionResponseSchema>;
export type MissionWithAcceptances = z.infer<
	typeof missionWithAcceptancesSchema
>;
export type MissionAcceptanceResponse = z.infer<
	typeof missionAcceptanceResponseSchema
>;
