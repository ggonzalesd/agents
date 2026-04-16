import { z } from 'zod';

const usernameSchema = z
	.string()
	.min(4)
	.max(64)
	.regex(/^[a-z0-9_]+$/, {
		error: 'Only lowercase letters, numbers, and underscores',
	});

const passwordSchema = z.string().min(4).max(72);

const displayNameSchema = z.string().min(2).max(255);

export const loginRequestSchema = z.object({
	username: usernameSchema,
	password: passwordSchema,
});

export const registerRequestSchema = z.object({
	username: usernameSchema,
	password: passwordSchema,
	display: displayNameSchema,
});

export const LOGIN_TYPE = {
	CREDENTIALS: 'credentials',
	REDEEM_TOKEN: 'redeem-token',
} as const;

export type LoginType = (typeof LOGIN_TYPE)[keyof typeof LOGIN_TYPE];

export const loginTypeSchema = z.enum(['credentials', 'redeem-token']);

export const authPayloadSchema = z.object({
	id: z.uuid(),
	username: z.string().min(4).max(64),
	hash: z.uuid(),
	role: z.enum(['USER', 'ADMIN', 'MODERATOR']),
	loginType: loginTypeSchema,
	validFrom: z.string(),
	validUntil: z.string(),
});

export const revokeRequestSchema = z.object({
	id: z.uuid(),
	newPassword: z.string().min(4).max(72).optional(),
});

export const redeemTokenLoginRequestSchema = z.object({
	token: z.uuid(),
});

export const createRedeemTokenRequestSchema = z.object({
	userId: z.uuid(),
	validFrom: z.coerce.date(),
	validUntil: z.coerce.date(),
});

export const redeemTokenDtoSchema = z.object({
	id: z.string(),
	token: z.string(),
	userId: z.string(),
	validFrom: z.coerce.date(),
	validUntil: z.coerce.date(),
	createdAt: z.coerce.date(),
});
