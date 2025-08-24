import { z } from 'zod';

export const loginRequestSchema = z.object({
	username: z
		.string()
		.min(4)
		.max(64)
		.regex(/^[a-z0-9_]+$/, {
			error: 'Only lowercase letters, numbers, and underscores',
		}),
	password: z.string().min(8).max(64),
});
