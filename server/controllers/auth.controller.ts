import type { Request, Response } from 'express';
import * as bcrypt from 'bcrypt';

import { HttpError } from '#/utils/HttpError';
import { jsonResponse } from '#/utils/HttpResponse';
import type {
	loginRequestSchema,
	registerRequestSchema,
	revokeRequestSchema,
} from '#/schema/auth.schema';

import sql from '$/config/db.config';

import { getAuth } from '$/utils/req.utils';
import type { AuthPayload } from '$/models/Payload.model';

import * as UserRepository from '$/db/user.db';
import * as JwtService from '$/services/jwt.service';
import * as AuthService from '$/services/auth.service';

export const authLoginController = async (req: Request, res: Response) => {
	const { password, username } = req.body as ReturnType<
		typeof loginRequestSchema.parse
	>;

	const userOption = await UserRepository.getUserByUsername({ username });
	const user = userOption.orElseThrow(
		HttpError.unauthorized('Invalid username or password'),
	);

	const isPasswordValid = bcrypt.compareSync(password, user.password);
	if (!isPasswordValid) {
		throw HttpError.unauthorized('Invalid username or password');
	}

	const payload: AuthPayload = {
		id: user.id,
		username: user.username,
		hash: user.hash,
		role: user.role,
	};

	const token = JwtService.signToken(payload);

	res.cookie('token', token, {
		httpOnly: true,
		sameSite: 'strict',
		secure: process.env.NODE_ENV === 'production',
	});

	const { password: _, hash: __, ...result } = user;

	res.json(
		jsonResponse.ok(
			{
				token,
				payload,
				user: result,
			},
			{ message: 'Login successful' },
		),
	);
};

export const authRegisterController = async (req: Request, res: Response) => {
	const payload = req.body as ReturnType<typeof registerRequestSchema.parse>;

	const newUser = await AuthService.createUser(payload, {
		role: 'USER',
	});

	res.status(201).json(
		jsonResponse.ok(newUser, {
			message: 'User registered successfully',
			status: 201,
		}),
	);
};

export const revokeTokensController = async (req: Request, res: Response) => {
	const body = req.body as ReturnType<typeof revokeRequestSchema.parse>;

	await sql.begin((sql) =>
		UserRepository.revokeUserHash(
			{
				id: body.id,
				withPassword: body.newPassword,
			},
			sql,
		),
	);

	res.json(
		jsonResponse.ok(null, {
			message: 'User tokens revoked successfully',
		}),
	);
};

export const profileAuthController = async (req: Request, res: Response) => {
	const { user } = getAuth(req);

	const { password: _, hash: __, ...result } = user;

	res.json(
		jsonResponse.ok(
			{ user: result },
			{
				message: 'User profile retrieved successfully',
			},
		),
	);
};
