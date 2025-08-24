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

export const authPayloadSchema = z.object({
	id: z.uuid(),
	username: z.string().min(4).max(64),
	hash: z.uuid(),
	roles: z.array(z.string().min(2).max(100)),
});

export const revokeRequestSchema = z.object({
	id: z.uuid(),
	newPassword: z.string().min(4).max(72).optional(),
});
