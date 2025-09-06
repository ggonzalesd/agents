import { z } from 'zod';

const userDtoSchema = z.object({
	id: z.string(),
	username: z.string(),
	display: z.string().nullable(),
	createdAt: z.coerce.date(),
	skin: z.string().nullable(),
	role: z.enum(['ADMIN', 'USER', 'MODERATOR']).optional(),
});

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
		user: userDtoSchema,
	}),
});

export const profileResSchema = apiResSchema.extend({
	data: z.object({
		user: userDtoSchema,
	}),
});

export const uploadSkinResSchema = apiResSchema.extend({
	data: z.object({
		url: z.url(),
		signedUrl: z.url(),
	}),
});
