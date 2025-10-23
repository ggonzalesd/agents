import z from 'zod';

const actionTalkSchema = z.object({
	type: z.literal('talk'),
	content: z.string(),
});

const actionMoveSchema = z.object({
	type: z.literal('move'),
	destination: z.object({
		x: z.number(),
		y: z.number(),
	}),
});

export const actionsSchema = z.union([actionTalkSchema, actionMoveSchema]);
