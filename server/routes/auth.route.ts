import { Router } from 'express';

import * as bcrypt from 'bcrypt';

import sql from '$/config/db.config';

import {
	loginRequestSchema,
	registerRequestSchema,
} from '#/schema/auth.schema';
import { HttpError } from '#/utils/HttpError';
import { jsonResponse } from '#/utils/HttpResponse';
import type { UserDB } from '$/models/user.model';
import { parseMiddleware } from '$/middlewares/parse.middleware';
import { getUserByUsername } from '$/services/user.db';

const router = Router();

router.get('/', async (_, res) => {
	res.json({ message: 'Auth route works' });
});

router.post(
	'/login',
	parseMiddleware(loginRequestSchema, 'body'),
	async (req, res) => {
		const { password, username } = req.body as ReturnType<
			typeof loginRequestSchema.parse
		>;

		const user = (await getUserByUsername(username, sql)).orElseThrow(
			HttpError.unauthorized('Invalid username or password'),
		);

		const isPasswordValid = bcrypt.compareSync(password, user.password);
		if (!isPasswordValid) {
			throw HttpError.unauthorized('Invalid username or password');
		}

		res.json(jsonResponse.ok(user, { message: 'Login successful' }));
	},
);

router.post(
	'/register',
	parseMiddleware(registerRequestSchema, 'body'),
	async (req, res) => {
		const {
			display,
			password: _pass,
			username,
		} = req.body as ReturnType<typeof registerRequestSchema.parse>;

		const result = await sql.begin(async (sql) => {
			const exists =
				await sql`SELECT 1 FROM "User" WHERE "username" = ${username} LIMIT 1`;

			if (exists.length)
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
	},
);

export default router;
