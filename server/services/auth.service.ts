import type { registerRequestSchema } from '#/schema/auth.schema';
import { HttpError } from '#/utils/HttpError';

import prisma from '$/config/prisma.config';
import type { Role } from '$/generated/prisma/client';

import * as UserRepository from '$/db/user.db';

export const createUser = async (
	payload: ReturnType<typeof registerRequestSchema.parse>,
	options?: {
		role: Role;
	},
	throws = true,
) => {
	const { username } = payload;

	const result = await prisma.$transaction(async (tx) => {
		const users = await UserRepository.getUserByUsername({ username }, tx);

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
