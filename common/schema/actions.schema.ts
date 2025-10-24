import z from 'zod';

const actionTalkSchema = z.object({
	type: z.literal('talk'),
	content: z.string(),
});

const actionMoveSchema = z.object({
	type: z.literal('follow-entity'),
	entityId: z.string(),
});

export const actionsSchema = z.union([actionTalkSchema, actionMoveSchema]);
