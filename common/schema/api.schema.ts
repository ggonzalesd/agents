import { z } from 'zod';

import { loginTypeSchema, redeemTokenDtoSchema } from '#/schema/auth.schema';

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
			loginType: loginTypeSchema,
			validFrom: z.string(),
			validUntil: z.string(),
		}),
		user: userDtoSchema,
	}),
});

export const profileResSchema = apiResSchema.extend({
	data: z.object({
		user: userDtoSchema,
		agent: z.object({
			identifier: z.string(),
			display: z.string(),
			positionX: z.number(),
			positionY: z.number(),
			positionZ: z.number(),
		}),
		entity: z.object({
			life: z.number(),
			maxLife: z.number(),
			saturation: z.number(),
			maxSaturation: z.number(),
		}),
		banned: z.boolean(),
	}),
});

export const uploadSkinResSchema = apiResSchema.extend({
	data: z.object({
		url: z.string(),
		skinHash: z.string(),
	}),
});

export const redeemTokenResSchema = apiResSchema.extend({
	data: redeemTokenDtoSchema,
});

export const redeemTokenListResSchema = apiResSchema.extend({
	data: z.array(
		redeemTokenDtoSchema.extend({
			user: z.object({
				id: z.string(),
				username: z.string(),
				display: z.string().nullable(),
			}),
		}),
	),
});

export const refreshResSchema = apiResSchema.extend({
	data: z.object({
		token: z.string(),
	}),
});
