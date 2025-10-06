import type { registerRequestSchema } from '#/schema/auth.schema';
import { HttpError } from '#/utils/HttpError';

import sql from '$/config/db.config';

import { createUser, getUserByUsername } from '$/db/user.db';

export const createUserService = async (
	payload: ReturnType<typeof registerRequestSchema.parse>,
	options?: {
		role: 'USER' | 'ADMIN' | 'MODERATOR';
	},
	throws = true,
) => {
	const { username } = payload;

	const result = await sql.begin(async (sql) => {
		const users = await getUserByUsername(username, sql);

		if (throws && users.isSome())
			throw HttpError.badRequest(`Username '${username}' is already taken`);
		else if (users.isSome()) {
			return users;
		}

		const created = await createUser({
			...payload,
			role: options?.role ?? 'USER',
		});

		return created;
	});

	return result;
};
