import z from 'zod';

// (🗣️) Talk action schema

const actionTalkSchema = z.object({
	type: z.literal('talk'),
	content: z.string(),
	targets: z.array(z.string()),
});

// (💭) Think action schema

const actionThinkSchema = z.object({
	type: z.literal('think'),
	content: z.string(),
});

// (🚶) Movement action schemas

const actionMoveFollowEntitySchema = z.object({
	type: z.literal('move-follow-entity'),
	entityId: z.string(),
});

const actionMoveCloseToEntitySchema = z.object({
	type: z.literal('move-close-to-entity'),
	entityId: z.string(),
});

const actionMoveAwayFromEntitySchema = z.object({
	type: z.literal('move-away-from-entity'),
	entityId: z.string(),
	distance: z.number().min(0.5).max(50),
});

const actionMoveStopSchema = z.object({
	type: z.literal('move-stop'),
});

const actionJumpSchema = z.object({
	type: z.literal('jump'),
});

const actionMoveToPointSchema = z.object({
	type: z.literal('move-to-point'),
	x: z.number(),
	z: z.number(),
});

// (😄) Mood action schemas

const actionSetMoodSchema = z.object({
	type: z.literal('set-mood'),
	mood: z.string(),
	value: z.number().min(0).max(100),
});

const actionRemoveMoodSchema = z.object({
	type: z.literal('remove-mood'),
	mood: z.string(),
});

// (🏎️) Short-term memory action schemas

const actionSetShortMemorySchema = z.object({
	type: z.literal('set-short-memory'),
	value: z.string().max(256),
});

const actionRemoveShortMemorySchema = z.object({
	type: z.literal('remove-short-memory'),
	key: z.string(),
});

// (💽) Long-term memory action schema

const actionRetrieveLongTermMemorySchema = z.object({
	type: z.literal('retrieve-long-term-memory'),
	value: z.string(),
	limit: z.number().min(1).max(10),
	importance: z.number().min(0).max(1),
});

// (🎁) Inventory action schemas
const actionPickItemSchema = z.object({
	type: z.literal('pick-item'),
	itemId: z.string(),
	slot: z.number().int(),
});

const actionDropItemSchema = z.object({
	type: z.literal('drop-item'),
	slot: z.number().int(),
});

const actionMoveItemSchema = z.object({
	type: z.literal('move-item'),
	fromSlot: z.number().int(),
	toSlot: z.number().int(),
});

const actionSplitItemSchema = z.object({
	type: z.literal('split-item'),
	fromSlot: z.number().int(),
	toSlot: z.number().int(),
	quantity: z.number().int().min(1),
});

const actionAttackSchema = z.object({
	type: z.literal('attack'),
	entityId: z.string(),
});

// (🎯) Attack-entity: aims at the target then attacks
const actionAttackEntitySchema = z.object({
	type: z.literal('attack-entity'),
	entityId: z.string(),
});

const actionAttackUntilResolvedSchema = z.object({
	type: z.literal('attack-until-resolved'),
	entityId: z.string(),
	maxAttacks: z.number().int().min(1).max(20).default(6),
	retryDelaySec: z.number().min(0.2).max(10).default(1),
});

// (👁️) Look-at action schemas

const actionLookAtPositionSchema = z.object({
	type: z.literal('look-at-position'),
	x: z.number(),
	z: z.number(),
});

const actionLookAtEntitySchema = z.object({
	type: z.literal('look-at-entity'),
	entityId: z.string(),
});

// (🎁) Give item to another entity action schema
const actionGiveItemToSchema = z.object({
	type: z.literal('give-item-to'),
	slot: z.number().int().min(0).max(35),
	targetEntityId: z.string(),
});

// (🍎) Consume item action schema
const actionConsumeItemSchema = z.object({
	type: z.literal('eat-item'),
	slot: z.number().int().min(0).max(35),
});

// (📜) Mission action schemas
const actionCreateMissionSchema = z.object({
	type: z.literal('create-mission'),
	title: z.string().min(3).max(255),
	description: z.string().min(10).max(2000),
	rewardItemType: z.string().max(50).optional(),
	rewardItemQty: z.number().int().min(1).optional(),
});

const actionAcceptMissionSchema = z.object({
	type: z.literal('accept-mission'),
	missionId: z.string(),
});

const actionCompleteMissionSchema = z.object({
	type: z.literal('complete-mission'),
	missionId: z.string(),
	acceptorId: z.string(),
});

const actionAbandonMissionSchema = z.object({
	type: z.literal('abandon-mission'),
	missionId: z.string(),
});

const actionCancelMissionSchema = z.object({
	type: z.literal('cancel-mission'),
	missionId: z.string(),
});

// (📡) Signal action schema
const actionSendSignalSchema = z.object({
	type: z.literal('send-signal'),
	key: z.string().min(1).max(64),
});

// (🎬) MetaActions for npc control
const actionRequestActingAgainSchema = z.object({
	type: z.literal('@request-acting-again'),
	time: z.number().min(3).max(120),
});

export const actionsSchema = z.union([
	actionTalkSchema,
	actionThinkSchema,

	actionMoveFollowEntitySchema,
	actionMoveStopSchema,
	actionMoveToPointSchema,
	actionMoveCloseToEntitySchema,
	actionMoveAwayFromEntitySchema,
	actionJumpSchema,

	actionSetShortMemorySchema,
	actionRemoveShortMemorySchema,

	actionSetMoodSchema,
	actionRemoveMoodSchema,

	actionRetrieveLongTermMemorySchema,

	actionPickItemSchema,
	actionDropItemSchema,
	actionMoveItemSchema,
	actionSplitItemSchema,
	actionGiveItemToSchema,
	actionAttackSchema,
	actionAttackEntitySchema,
	actionAttackUntilResolvedSchema,
	actionConsumeItemSchema,
	actionLookAtPositionSchema,
	actionLookAtEntitySchema,

	actionCreateMissionSchema,
	actionAcceptMissionSchema,
	actionCompleteMissionSchema,
	actionAbandonMissionSchema,
	actionCancelMissionSchema,

	actionSendSignalSchema,
	actionRequestActingAgainSchema,
]);
