import z from 'zod';

const actionTalkSchema = z.object({
	type: z.literal('talk'),
	content: z.string(),
	targets: z.array(z.string()),
});

const actionMoveFollowEntitySchema = z.object({
	type: z.literal('follow-entity'),
	entityId: z.string(),
});

const actionMoveStopSchema = z.object({
	type: z.literal('move-stop'),
});

const actionJumpSchema = z.object({
	type: z.literal('jump'),
});

const actionSetShortMemorySchema = z.object({
	type: z.literal('set-short-memory'),
	value: z.string().max(256),
});

const actionRemoveShortMemorySchema = z.object({
	type: z.literal('remove-short-memory'),
	key: z.string(),
});

export const actionsSchema = z.union([
	actionTalkSchema,
	actionMoveFollowEntitySchema,
	actionMoveStopSchema,
	actionJumpSchema,
	actionSetShortMemorySchema,
	actionRemoveShortMemorySchema,
]);
