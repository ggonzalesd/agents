import type { z } from 'zod';

import * as UserRepository from '$/db/user.db';
import type { createUserRequestSchema } from '#/schema/user.schema';
import { HttpError } from '#/utils/HttpError';

export const getOneUser = async (userId: string) => {
	const user = await UserRepository.getUserById({ userId });

	return user.orElseThrow(() => HttpError.notFound('User not found'));
};

export const getAllUsers = async () => {
	return UserRepository.getAllUsers({});
};

export const createUser = async ({
	payload,
}: {
	payload: z.infer<typeof createUserRequestSchema>;
}) => {
	const existing = await UserRepository.getUserByUsername({
		username: payload.name,
	});

	if (existing.isSome()) {
		throw HttpError.conflict('Username already exists');
	}

	const user = await UserRepository.createFullUser({
		user: {
			username: payload.name,
			password: payload.password,
			display: payload.display,
			skin: payload.skin,
		},
		agent: {
			display: payload.display,
			identifier: payload.identifier,
			positionX: Number(payload.x),
			positionY: Number(payload.y),
			positionZ: Number(payload.z),
		},
	});

	return user.unwrap('Failed to create user');
};

export const updateUser = async ({
	userId,
	payload,
}: {
	userId: string;
	payload: Partial<z.infer<typeof createUserRequestSchema>>;
}) => {
	const user = await UserRepository.updateFullUser({
		userId,
		user:
			payload.display || payload.skin || payload.password
				? {
						display: payload.display,
						skin: payload.skin,
						password: payload.password,
					}
				: undefined,
		agent:
			payload.display ||
			payload.identifier ||
			payload.x ||
			payload.y ||
			payload.z
				? {
						display: payload.display,
						identifier: payload.identifier,
						positionX: payload.x ? Number(payload.x) : undefined,
						positionY: payload.y ? Number(payload.y) : undefined,
						positionZ: payload.z ? Number(payload.z) : undefined,
					}
				: undefined,
	});

	return user.unwrap('Failed to update user');
};
