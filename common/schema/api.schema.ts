import { z } from 'zod';

export const apiResSchema = z.object({
	ok: z.boolean(),
	message: z.string(),
	data: z.any().optional(),
	error: z.string().optional(),
});

export const loginResSchema = apiResSchema.extend({
	data: z.object({
		token: z.string(),
		payload: z.object({
			id: z.string(),
			username: z.string(),
			hash: z.string(),
			role: z.enum(['ADMIN', 'USER', 'MODERATOR']).optional(),
		}),
	}),
});

export const profileResSchema = apiResSchema.extend({
	data: z.object({
		id: z.string(),
		username: z.string(),
		display: z.string().nullable(),
		createdAt: z.coerce.date(),
		role: z.enum(['ADMIN', 'USER', 'MODERATOR']).optional(),
	}),
});
