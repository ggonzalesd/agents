import type { registerRequestSchema } from '#/schema/auth.schema';
import { HttpError } from '#/utils/HttpError';

import sql from '$/config/db.config';

import { UserRepository } from '$/db/user.db';

export namespace AuthService {
	export const createUser = async (
		payload: ReturnType<typeof registerRequestSchema.parse>,
		options?: {
			role: 'USER' | 'ADMIN' | 'MODERATOR';
		},
		throws = true,
	) => {
		const { username } = payload;

		const result = await sql.begin(async (sql) => {
			const users = await UserRepository.getUserByUsername({ username }, sql);

			if (throws && users.isSome())
				throw HttpError.badRequest(`Username '${username}' is already taken`);
			else if (users.isSome()) {
				return users;
			}

			const created = await UserRepository.createUser({
				...payload,
				role: options?.role ?? 'USER',
			});

			return created;
		});

		return result;
	};
}
