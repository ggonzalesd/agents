import type { Request, Response } from 'express';
import type z from 'zod';

import { jsonResponse } from '#/utils/HttpResponse';
import type { createUserRequestSchema } from '#/schema/user.schema';
import type { UserWithRelations } from '$/db/user.db';

import * as UserService from '$/services/user.service';

function mapUserToDto({ user, agent }: UserWithRelations) {
	return {
		id: user.id,
		name: user.username,
		password: user.password,
		identifier: agent.identifier,
		display: agent.display,
		x: agent.positionX.toString(),
		y: agent.positionY.toString(),
		z: agent.positionZ.toString(),
		skin: user.skin ?? '',
	};
}

export const getOneUserController = async (
	req: Request<{ id: string }>,
	res: Response,
) => {
	const { id } = req.params;

	const result = await UserService.getOneUser(id);

	res.status(200).json(
		jsonResponse.ok(mapUserToDto(result), {
			message: 'User retrieved successfully',
			status: 200,
		}),
	);
};

export const getAllUsersController = async (_req: Request, res: Response) => {
	const users = await UserService.getAllUsers();

	res.status(200).json(
		jsonResponse.ok(users.map(mapUserToDto), {
			message: 'All users retrieved successfully',
			status: 200,
		}),
	);
};

export const createUserController = async (req: Request, res: Response) => {
	const payload = req.body as z.infer<typeof createUserRequestSchema>;

	const result = await UserService.createUser({ payload });

	res.status(201).json(
		jsonResponse.ok(mapUserToDto(result), {
			message: 'User created successfully',
			status: 201,
		}),
	);
};

export const updateUserController = async (
	req: Request<{ id: string }>,
	res: Response,
) => {
	const { id } = req.params;
	const payload = req.body as Partial<z.infer<typeof createUserRequestSchema>>;

	const result = await UserService.updateUser({
		userId: id,
		payload,
	});

	res.status(200).json(
		jsonResponse.ok(mapUserToDto(result), {
			message: 'User updated successfully',
			status: 200,
		}),
	);
};
