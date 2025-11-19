import z from 'zod';

// (🗣️) Talk action schema

const actionTalkSchema = z.object({
	type: z.literal('talk'),
	content: z.string(),
	targets: z.array(z.string()),
});

// (🚶) Movement action schemas

const actionMoveFollowEntitySchema = z.object({
	type: z.literal('move-follow-entity'),
	entityId: z.string(),
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

const actionSaveLongTermMemorySchema = z.object({
	type: z.literal('save-long-term-memory'),
	value: z.string(),
	importance: z.number().min(0).max(1),
});

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

const actionAttackSchema = z.object({
	type: z.literal('attack'),
	entityId: z.string(),
});

// (🎬) MetaActions for npc control
const actionRequestActingAgainSchema = z.object({
	type: z.literal('@request-acting-again'),
	time: z.number().min(0),
});

export const actionsSchema = z.union([
	actionTalkSchema,

	actionMoveFollowEntitySchema,
	actionMoveStopSchema,
	actionMoveToPointSchema,
	actionJumpSchema,

	actionSetShortMemorySchema,
	actionRemoveShortMemorySchema,

	actionSetMoodSchema,
	actionRemoveMoodSchema,

	actionSaveLongTermMemorySchema,
	actionRetrieveLongTermMemorySchema,

	actionPickItemSchema,
	actionDropItemSchema,
	actionAttackSchema,

	actionRequestActingAgainSchema,
]);
