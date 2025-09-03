import type { Request, Response } from 'express';
import * as bcrypt from 'bcrypt';

import sql from '$/config/db.config';

import { getUserByUsername, revokeUserHash } from '$/services/user.db';
import type { AuthPayload } from '$/models/Payload.model';
import { signToken } from '$/services/jwt.service';
import { getAuth } from '$/utils/req.utils';

import type {
	loginRequestSchema,
	registerRequestSchema,
	revokeRequestSchema,
} from '#/schema/auth.schema';
import { HttpError } from '#/utils/HttpError';
import { jsonResponse } from '#/utils/HttpResponse';

export const authLoginController = async (req: Request, res: Response) => {
	const { password, username } = req.body as ReturnType<
		typeof loginRequestSchema.parse
	>;

	const userOption = await getUserByUsername(username);
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

	const token = signToken(payload);

	res.cookie('token', token, {
		httpOnly: true,
		sameSite: 'strict',
		secure: process.env.NODE_ENV === 'production',
	});

	res.json(
		jsonResponse.ok(
			{
				token,
				payload,
			},
			{ message: 'Login successful' },
		),
	);
};

export const authRegisterController = async (req: Request, res: Response) => {
	const {
		display,
		password: _pass,
		username,
	} = req.body as ReturnType<typeof registerRequestSchema.parse>;

	const result = await sql.begin(async (sql) => {
		const users = await getUserByUsername(username, sql);

		if (users.isSome())
			throw HttpError.badRequest(`Username '${username}' is already taken`);

		const password = bcrypt.hashSync(_pass, 10);

		const result =
			await sql`INSERT INTO "User" ("display", "password", "username") VALUES (${display}, ${password}, ${username}) RETURNING *`;

		return result;
	});

	res.status(201).json(
		jsonResponse.ok(result, {
			message: 'User registered successfully',
			status: 201,
		}),
	);
};

export const revokeTokensController = async (req: Request, res: Response) => {
	const body = req.body as ReturnType<typeof revokeRequestSchema.parse>;

	await sql.begin(async (sql) =>
		revokeUserHash(body.id, body.newPassword, sql),
	);

	res.json(
		jsonResponse.ok(null, {
			message: 'User tokens revoked successfully',
		}),
	);
};

export const profileAuthController = async (req: Request, res: Response) => {
	const { user } = getAuth(req);

	const { password, hash, ...result } = user;

	res.json(
		jsonResponse.ok(
			{ ...result },
			{
				message: 'User profile retrieved successfully',
			},
		),
	);
};
