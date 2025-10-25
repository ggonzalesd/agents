import z from 'zod';

const actionTalkSchema = z.object({
	type: z.literal('talk'),
	content: z.string(),
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

export const actionsSchema = z.union([
	actionTalkSchema,
	actionMoveFollowEntitySchema,
	actionMoveStopSchema,
	actionJumpSchema,
]);
